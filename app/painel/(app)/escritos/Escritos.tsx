"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import Icone from "../../componentes/Icone";
import { supabaseNavegador } from "../../../lib/supabase/navegador";
import { TEMAS, ESTILO, palavrasDe, minutosDe, dataCurta, type Escrito } from "../../../lib/escritosBase";
import { novoEscrito, salvarEscrito, publicarEscrito, despublicarEscrito, excluirEscrito } from "./acoes";

type Campos = Pick<Escrito, "titulo" | "tema" | "palavra" | "resumo" | "capa_url" | "corpo">;
type Status = "pub" | "rasc" | "ag";
const ST_TXT: Record<Status, string> = { pub: "Publicado", rasc: "Rascunho", ag: "Agendado" };
const ST_CLS: Record<Status, string> = { pub: "pill p-ok", rasc: "pill p-av", ag: "pill p-on" };
const HORAS = Array.from({ length: 16 }, (_, i) => `${String(i + 6).padStart(2, "0")}:00`);

const statusDe = (e: Escrito, agora: number): Status => (!e.publicar_em ? "rasc" : new Date(e.publicar_em).getTime() > agora ? "ag" : "pub");
const quandoTxt = (e: Escrito, agora: number) => {
  const s = statusDe(e, agora);
  if (s === "pub") return `Publicado em ${dataCurta(e.publicar_em!)}`;
  if (s === "ag") { const d = new Date(new Date(e.publicar_em!).getTime() - 3 * 3600000); return `Agendado para ${dataCurta(e.publicar_em!)}, ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`; }
  return `Editado em ${dataCurta(e.atualizado_em)}`;
};
// Próxima segunda, 8h (sugestão para agendar).
const proximaSegunda = () => {
  const d = new Date(Date.now() - 3 * 3600000);
  const add = ((8 - d.getUTCDay()) % 7) || 7;
  d.setUTCDate(d.getUTCDate() + add);
  return d.toISOString().slice(0, 10);
};

function Miniatura({ e }: { e: Pick<Escrito, "capa_url" | "tema"> }) {
  // eslint-disable-next-line @next/next/no-img-element
  return e.capa_url ? <img className="th" src={e.capa_url} alt="" /> : <span className="th" style={{ background: (ESTILO[e.tema] || ESTILO.Ansiedade).fundo, display: "block" }} />;
}

export default function Escritos({ todos, selId, agora }: { todos: Escrito[]; selId: string | null; agora: number }) {
  const router = useRouter();
  const [filtro, setFiltro] = useState<"todos" | Status>("todos");
  const sel = todos.find((e) => e.id === selId) || null;
  const [c, setC] = useState<Campos>(sel ? { titulo: sel.titulo, tema: sel.tema, palavra: sel.palavra, resumo: sel.resumo, capa_url: sel.capa_url, corpo: sel.corpo } : { titulo: "", tema: "Ansiedade", palavra: "", resumo: "", capa_url: null, corpo: "" });
  const [prev, setPrev] = useState(false);
  const [quando, setQuando] = useState<"agora" | "ag">(sel && statusDe(sel, agora) === "ag" ? "ag" : "agora");
  const [agData, setAgData] = useState(() => (sel?.publicar_em && statusDe(sel, agora) === "ag" ? new Date(new Date(sel.publicar_em).getTime() - 3 * 3600000).toISOString().slice(0, 10) : proximaSegunda()));
  const [agHora, setAgHora] = useState("08:00");
  const [conf, setConf] = useState(false);
  const [msg, setMsg] = useState<{ t: string; erro?: boolean } | null>(null);
  const [salvo, setSalvo] = useState<"" | "salvando" | "salvo">("");
  const [pend, iniciar] = useTransition();
  const sujo = useRef(false);
  const corpoRef = useRef<HTMLTextAreaElement>(null);
  const av = (r: { ok?: string; erro?: string }) => setMsg(r.erro ? { t: r.erro, erro: true } : r.ok ? { t: r.ok } : null);

  const st = sel ? statusDe(sel, agora) : "rasc";
  const lista = todos.filter((e) => filtro === "todos" || statusDe(e, agora) === filtro);
  const fotos = Array.from(new Set(todos.map((e) => e.capa_url).filter(Boolean) as string[]));
  const set = (o: Partial<Campos>) => { sujo.current = true; setC({ ...c, ...o }); };

  // Rascunho é salvo sozinho enquanto ela escreve. Texto publicado só muda ao tocar em "Atualizar texto".
  useEffect(() => {
    if (!sel || st !== "rasc" || !sujo.current) return;
    setSalvo("salvando");
    const t = setTimeout(async () => {
      const r = await salvarEscrito(sel.id, c);
      setSalvo(r.erro ? "" : "salvo");
      if (r.erro) av(r);
      else sujo.current = false;
    }, 1500);
    return () => clearTimeout(t);
  }, [c, sel, st]);

  const abrir = (id: string) => router.push(`/painel/escritos?id=${id}`, { scroll: false });
  const criar = () => iniciar(async () => { const r = await novoEscrito(); if (r.erro) return av(r); router.push(`/painel/escritos?id=${r.id}`, { scroll: false }); });

  const inserir = (antes: string, depois = "", modelo = "") => {
    const ta = corpoRef.current;
    const v = c.corpo;
    const ini = ta ? ta.selectionStart : v.length;
    const fim = ta ? ta.selectionEnd : v.length;
    const meio = v.slice(ini, fim) || modelo;
    const novo = v.slice(0, ini) + antes + meio + depois + v.slice(fim);
    set({ corpo: novo });
    requestAnimationFrame(() => { if (ta) { ta.focus(); const p = ini + antes.length; ta.setSelectionRange(p, p + meio.length); } });
  };
  const bloco = (prefixo: string, modelo: string) => {
    const ta = corpoRef.current;
    const ini = ta ? ta.selectionStart : c.corpo.length;
    const antes = c.corpo.slice(0, ini);
    const quebra = !antes || antes.endsWith("\n\n") ? "" : antes.endsWith("\n") ? "\n" : "\n\n";
    inserir(`${quebra}${prefixo}`, "\n\n", modelo);
  };

  const enviarFoto = (f: File | undefined) => f && iniciar(async () => {
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return av({ erro: "Use uma foto em JPG, PNG ou WebP." });
    if (f.size > 5e6) return av({ erro: "A foto passa de 5 MB. Use uma menor." });
    const sb = supabaseNavegador();
    const caminho = `capas/${crypto.randomUUID()}.${f.type.split("/")[1].replace("jpeg", "jpg")}`;
    const { error } = await sb.storage.from("escritos").upload(caminho, f, { contentType: f.type, cacheControl: "31536000" });
    if (error) return av({ erro: "Não deu para enviar a foto. Tente de novo." });
    set({ capa_url: sb.storage.from("escritos").getPublicUrl(caminho).data.publicUrl });
    av({ ok: "Foto enviada." });
  });

  const publicar = () => sel && iniciar(async () => {
    let q: string = "agora";
    if (quando === "ag") {
      const [a, m, d] = agData.split("-").map(Number);
      const [h, mi] = agHora.split(":").map(Number);
      q = new Date(Date.UTC(a, m - 1, d, h, mi) + 3 * 3600000).toISOString();
    }
    const r = await publicarEscrito(sel.id, c, q);
    av(r);
    if (!r.erro) { sujo.current = false; router.refresh(); }
  });
  const salvarManual = () => sel && iniciar(async () => { const r = await salvarEscrito(sel.id, c); av(r.erro ? r : { ok: st === "rasc" ? "Rascunho salvo." : "Alterações salvas." }); if (!r.erro) { sujo.current = false; router.refresh(); } });
  const despublicar = () => sel && iniciar(async () => { const r = await despublicarEscrito(sel.id); av(r); if (!r.erro) router.refresh(); });
  const excluir = () => sel && iniciar(async () => { const r = await excluirEscrito(sel.id); if (r.erro) return av(r); router.push("/painel/escritos", { scroll: false }); });

  const palavras = palavrasDe(c.corpo);
  const info = `${palavras} ${palavras === 1 ? "palavra" : "palavras"} · ${minutosDe(c.corpo)} min de leitura`;
  const rotPub = quando === "ag" ? "Agendar publicação" : st === "pub" ? "Atualizar texto" : "Publicar agora";

  return (
    <>
      <header className="topo"><div><h1>Seus <em>escritos.</em></h1><div className="data">Textos que aparecem na página Escritos do site</div></div><div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><a href="/escritos" target="_blank" rel="noopener" className="bt2"><Icone nome="site" tam={18} />Ver Escritos no site</a></div></header>
      <main className={sel ? "conteudo m-vendo" : "conteudo"}>
        <div className="barra" style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
          <div className="filtros" role="group" aria-label="Filtrar escritos">
            {([["todos", "Todos"], ["pub", "Publicados"], ["rasc", "Rascunhos"], ["ag", "Agendados"]] as const).map(([k, n]) => (
              <button key={k} type="button" className={filtro === k ? "fi on" : "fi"} aria-pressed={filtro === k} onClick={() => setFiltro(k)}>{n} <b>{k === "todos" ? todos.length : todos.filter((e) => statusDe(e, agora) === k).length}</b></button>
            ))}
          </div>
          <button type="button" className="bt" onClick={criar} disabled={pend}><Icone nome="mais" tam={18} />Novo escrito</button>
        </div>
        {msg ? <div className={msg.erro ? "aviso erro" : "aviso ok"} role="status">{msg.t}</div> : null}
        <div className="esc">
          <div className="ped-lista">
            {lista.map((e) => (
              <button key={e.id} type="button" className={e.id === sel?.id ? "pi on" : "pi"} onClick={() => abrir(e.id)}>
                <Miniatura e={e} />
                <span className="tx"><b style={{ fontSize: 15, lineHeight: 1.35 }}>{e.titulo || "Sem título"}</b><span style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}><span className={ST_CLS[statusDe(e, agora)]}>{ST_TXT[statusDe(e, agora)]}</span><span style={{ fontSize: 13, color: "#8A7A7E" }}>{e.tema} · {quandoTxt(e, agora).replace(/^(Publicado em|Editado em|Agendado para) /, "")}</span></span></span>
              </button>
            ))}
            {!lista.length ? <div className="card" style={{ textAlign: "center", color: "#6B5A5E" }}>{todos.length ? "Nenhum texto nesta lista." : "Nenhum texto ainda. Toque em Novo escrito para começar."}</div> : null}
            <p style={{ margin: "6px 4px 0", fontSize: 13, color: "#8A7A7E", lineHeight: 1.5 }}>Uma ideia: um texto por semana mantém o site vivo e ajuda quem chega pelo Instagram.</p>
          </div>

          {sel ? (
            <section className="card ed">
              <button type="button" className="bt3 voltar-m" onClick={() => router.push("/painel/escritos", { scroll: false })}><Icone nome="voltar" tam={18} /> Todos os escritos</button>
              <div className="ed-top">
                <span style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}><span className={ST_CLS[st]}>{ST_TXT[st]}</span><span style={{ fontSize: 13, color: "#8A7A7E" }}>{salvo === "salvando" ? "Salvando…" : salvo === "salvo" ? "Rascunho salvo" : quandoTxt(sel, agora)}</span></span>
                <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {st === "pub" && sel.slug ? <a href={`/escritos/${sel.slug}`} target="_blank" rel="noopener" className="bt2" style={{ width: "auto", minHeight: 40, padding: "8px 14px", fontSize: 14 }}><Icone nome="site" tam={16} />Abrir no site</a> : null}
                  <button type="button" className="bt2" onClick={() => setPrev(!prev)} style={{ width: "auto", minHeight: 40, padding: "8px 14px", fontSize: 14 }}><Icone nome="olho" tam={16} />{prev ? "Voltar a editar" : "Ver como fica no site"}</button>
                  <button type="button" className="bt3" onClick={() => setConf(true)} style={{ minHeight: 40, fontSize: 14, color: "#A3322A" }}><Icone nome="lixo" tam={16} />Excluir</button>
                </span>
              </div>
              {conf ? (
                <div className="caixa rec">
                  <b style={{ fontSize: 16 }}>Excluir “{(c.titulo || "Sem título").slice(0, 60)}”?</b>
                  <span style={{ fontSize: 14, color: "#5A3A41" }}>{st === "pub" ? "Ele sai da página Escritos e o link para de funcionar." : "O rascunho some do painel."} Essa ação não pode ser desfeita.</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}><button type="button" className="bt" onClick={excluir} disabled={pend} style={{ background: "#A3322A", width: "auto" }}>Excluir de vez</button><button type="button" className="bt3" onClick={() => setConf(false)}>Cancelar</button></div>
                </div>
              ) : null}

              {!prev ? (
                <>
                  <label style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }} htmlFor="e-tit">Título</label>
                  <input id="e-tit" className="tit-in" type="text" placeholder="Título do texto" value={c.titulo} maxLength={160} onChange={(e) => set({ titulo: e.target.value })} />
                  <div className="fc"><span className="lb">Tema</span><div className="seg">{TEMAS.map((t) => <button key={t} type="button" className={c.tema === t ? "on" : ""} onClick={() => set({ tema: t })}>{t}</button>)}</div></div>
                  <div className="fc"><span className="lb">Foto de capa</span>
                    <div className="fotos">
                      <button type="button" className={!c.capa_url ? "ft on" : "ft"} aria-pressed={!c.capa_url} onClick={() => set({ capa_url: null })} aria-label="Sem foto, só a cor do tema" style={{ background: (ESTILO[c.tema] || ESTILO.Ansiedade).fundo }} />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {fotos.map((f) => <button key={f} type="button" className={c.capa_url === f ? "ft on" : "ft"} aria-pressed={c.capa_url === f} onClick={() => set({ capa_url: f })} aria-label="Escolher esta foto"><img src={f} alt="" /></button>)}
                      {c.capa_url && !fotos.includes(c.capa_url) ? <button type="button" className="ft on" aria-pressed="true" aria-label="Foto escolhida">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={c.capa_url} alt="" /></button> : null}
                    </div>
                    <label className="bt3" style={{ alignSelf: "flex-start", fontSize: 14, color: "#7A2335", cursor: "pointer", display: "inline-flex", gap: 6, alignItems: "center" }}><Icone nome="mais" tam={16} />{pend ? "Enviando…" : "Enviar outra foto"}<input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={(e) => { enviarFoto(e.target.files?.[0]); e.target.value = ""; }} /></label>
                  </div>
                  <div className="fc-g">
                    <div className="fc"><label htmlFor="e-pal">Palavra sobre a foto</label><input id="e-pal" type="text" placeholder="Ex.: descanso" maxLength={30} value={c.palavra} onChange={(e) => set({ palavra: e.target.value })} /></div>
                    <div className="fc"><label htmlFor="e-res">Resumo <span style={{ fontWeight: 500, color: "#8A7A7E" }}>({c.resumo.length}/200)</span></label><input id="e-res" type="text" maxLength={200} placeholder="Uma ou duas frases que aparecem no card" value={c.resumo} onChange={(e) => set({ resumo: e.target.value })} /></div>
                  </div>
                  <div className="fc"><span className="lb">Texto</span>
                    <div>
                      <div className="tb" role="toolbar" aria-label="Formatação">
                        <button type="button" onClick={() => bloco("## ", "Subtítulo")}>Subtítulo</button>
                        <button type="button" onClick={() => inserir("**", "**", "destaque")}><b>N</b> Negrito</button>
                        <button type="button" onClick={() => inserir("_", "_", "ênfase")}><i>I</i> Itálico</button>
                        <button type="button" onClick={() => bloco("> ", "Uma frase para guardar.")}>“ Citação</button>
                        <button type="button" onClick={() => bloco("- ", "primeiro ponto\n- segundo ponto")}>• Lista</button>
                        <button type="button" onClick={() => bloco("1. ", "primeiro passo\n2. segundo passo")}>1. Passos</button>
                        <button type="button" onClick={() => bloco("!> ", "Inspire contando até 4 e solte devagar contando até 6.")}>✦ Experimente</button>
                      </div>
                      <textarea ref={corpoRef} className="corpo" aria-label="Texto" placeholder="Escreva aqui, no seu tempo. Deixe uma linha em branco entre os parágrafos." value={c.corpo} onChange={(e) => set({ corpo: e.target.value })} />
                    </div>
                    <span style={{ fontSize: 13, color: "#8A7A7E" }}>{info}</span>
                  </div>
                </>
              ) : (
                <>
                  <span className="rot">Como o card aparece em Escritos</span>
                  <div className="prev-card">
                    <div className="prev-capa" style={{ background: (ESTILO[c.tema] || ESTILO.Ansiedade).fundo }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {c.capa_url ? <><img src={c.capa_url} alt="" /><span className="veu" /></> : null}
                      <span className="w" style={c.capa_url ? undefined : { color: (ESTILO[c.tema] || ESTILO.Ansiedade).tinta }}>{c.palavra}</span>
                    </div>
                    <div style={{ padding: "20px 22px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
                      <span style={{ fontSize: 12, letterSpacing: ".1em", textTransform: "uppercase", fontWeight: 700, color: "#B0475D" }}>{c.tema}</span>
                      <b style={{ fontSize: 20, lineHeight: 1.3, color: "#3A1F25" }}>{c.titulo || "Sem título"}</b>
                      <span style={{ fontSize: 14, color: "#5A3A41" }}>{c.resumo}</span>
                      <span style={{ fontSize: 13, color: "#8A7A7E" }}>{info}</span>
                    </div>
                  </div>
                  <span className="rot">Início do texto</span>
                  <div style={{ whiteSpace: "pre-wrap", fontSize: 16, lineHeight: 1.75, color: "#3A1F25", background: "#F8F3F0", borderRadius: 16, padding: "18px 20px", maxHeight: 260, overflow: "auto" }}>{c.corpo}</div>
                  {st === "pub" && sel.slug ? <a href={`/escritos/${sel.slug}`} target="_blank" rel="noopener" style={{ fontSize: 14, fontWeight: 700 }}>Ver o texto completo no site →</a> : null}
                </>
              )}

              <div className="pub">
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div className="seg" role="group" aria-label="Quando publicar"><button type="button" className={quando === "agora" ? "on" : ""} onClick={() => setQuando("agora")}>{st === "pub" ? "Já está no ar" : "Publicar agora"}</button><button type="button" className={quando === "ag" ? "on" : ""} onClick={() => setQuando("ag")}>Agendar</button></div>
                  {quando === "ag" ? (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <input type="date" value={agData} min={new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10)} onChange={(e) => setAgData(e.target.value)} aria-label="Dia da publicação" style={{ width: "auto" }} />
                      <select value={agHora} onChange={(e) => setAgHora(e.target.value)} aria-label="Horário da publicação" style={{ width: "auto" }}>{HORAS.map((h) => <option key={h} value={h}>{h}</option>)}</select>
                    </div>
                  ) : null}
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  {st !== "rasc" ? <button type="button" className="bt3" onClick={despublicar} disabled={pend} style={{ fontSize: 14 }}>{st === "ag" ? "Cancelar agendamento" : "Tirar do site"}</button> : null}
                  {st !== "pub" ? <button type="button" className="bt2" onClick={salvarManual} disabled={pend}>{st === "rasc" ? "Salvar rascunho" : "Salvar alterações"}</button> : null}
                  <button type="button" className="bt" onClick={publicar} disabled={pend}>{pend ? "Salvando…" : rotPub}</button>
                </div>
              </div>
            </section>
          ) : (
            <section className="card ed" style={{ textAlign: "center", color: "#6B5A5E" }}>Escolha um texto na lista ou toque em <b>Novo escrito</b>.</section>
          )}
        </div>
      </main>
    </>
  );
}
