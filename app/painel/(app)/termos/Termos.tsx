"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Icone from "../../componentes/Icone";
import TermoDocumento from "../../../componentes/TermoDocumento";
import { centavosDe, reais, waLink } from "../../../lib/formato";
import type { ConteudoTermo } from "../../../lib/termoTexto";
import { criarTermo, reenviarTermo, cancelarTermo } from "./acoes";
import { verCpf, linkFicha, marcarEnviado } from "../pacientes/acoes";

export type ItemHist = { id: string; pac: string; tipo: string; enviado: string; status: "enviado" | "aceito" | "cancelado"; st: string; reg: string; como: string };
export type PacNovo = {
  id: string; tipo: "adulta" | "crianca"; nome: string; resp: string; respNome: string; respId: string | null;
  cpf: string; nasc: string; emerg: string; ficha: string; valor: string; tipoValor: "normal" | "social"; whatsapp: string;
};

type Props = {
  hist: ItemHist[];
  selId: string | null;
  doc: ConteudoTermo | null;
  pacientes: { id: string; n: string }[];
  novo: PacNovo | null;
  faltasPadrao: string;
  dataHoje: string;
  pendentes: number;
  tabInicial: "hist" | "novo";
  abaInicial: "form" | "doc";
};

type Envio = { link: string; para: string; texto: string; id?: string; tipo?: "ficha" | "termo"; ref?: string };

const pillDe = (s: ItemHist["status"]) => (s === "aceito" ? "pill p-ok" : s === "enviado" ? "pill p-av" : "pill p-ne");

function CaixaEnvio({ e, aoCopiar, aoEnviar }: { e: Envio; aoCopiar: () => void; aoEnviar: () => void }) {
  return (
    <div className="caixa ok" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <span style={{ fontSize: 14, color: "#3A1F25" }}>A mensagem já está pronta:</span>
      <div className="prev">{e.texto}</div>
      <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {e.para ? <a href={waLink(e.para, e.texto)} target="_blank" rel="noopener" className="bt" style={{ width: "auto" }} onClick={() => { if (e.tipo && e.ref) marcarEnviado(e.tipo, e.ref).then(aoEnviar); }}><Icone nome="whats" tam={18} />Abrir no WhatsApp</a> : <span style={{ fontSize: 13, color: "#A3322A" }}>Sem WhatsApp cadastrado: copie o link.</span>}
        <button type="button" className="mini2" onClick={() => navigator.clipboard?.writeText(e.link).then(aoCopiar)}>Copiar link</button>
      </span>
    </div>
  );
}

export default function Termos({ hist, selId, doc, pacientes, novo, faltasPadrao, dataHoje, pendentes, tabInicial, abaInicial }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"hist" | "novo">(tabInicial);
  const [aba, setAba] = useState<"form" | "doc">(abaInicial);
  const [valor, setValor] = useState(novo?.valor || "");
  const [tipoValor, setTipoValor] = useState<"normal" | "social">(novo?.tipoValor || "normal");
  const [plat, setPlat] = useState("Google Meet");
  const [faltas, setFaltas] = useState(faltasPadrao);
  const [cpfAberto, setCpfAberto] = useState("");
  const [envio, setEnvio] = useState<Envio | null>(null);
  const [msg, setMsg] = useState<{ t: string; erro?: boolean } | null>(null);
  const [pend, iniciar] = useTransition();

  const ehHist = tab === "hist";
  const rec = hist.find((h) => h.id === selId) || hist[0];
  const inf = novo?.tipo === "crianca";
  const temCpf = !!novo?.cpf;
  const av = (r: { ok?: string; erro?: string }) => setMsg(r.erro ? { t: r.erro, erro: true } : r.ok ? { t: r.ok } : null);

  const previa: ConteudoTermo | null = novo
    ? {
        tipo: novo.tipo,
        nome: novo.nome,
        cpf: inf ? "" : novo.cpf,
        responsavel: inf ? { nome: novo.respNome, cpf: novo.cpf } : null,
        emergencia: novo.emerg,
        valor: centavosDe(valor) ? `${reais(centavosDe(valor))}${tipoValor === "social" ? " (valor social)" : ""}` : "",
        pagamento: "pix",
        plataforma: inf ? "" : plat,
        faltas,
        data: dataHoje,
      }
    : null;
  const mostrado = ehHist ? doc : previa;

  const irPara = (q: string) => router.push(`/painel/termos${q}`, { scroll: false });

  const enviar = () =>
    novo &&
    iniciar(async () => {
      const r = await criarTermo(novo.id, { valor, tipoValor, plataforma: plat, faltas });
      av(r);
      if (r.erro) return;
      setEnvio({ link: r.link!, para: r.para!, texto: r.texto!, id: r.id, tipo: "termo", ref: r.id });
    });

  const regNovo = "Sem assinatura: o aceite eletrônico pelo link fica registrado aqui, com data, hora e versão do termo.";

  return (
    <>
      <ol className="passos-t" aria-label="Como funciona">
        <li><b>1. Ficha de cadastro</b>A paciente recebe um link e preenche CPF, nascimento e contato de emergência.</li>
        <li><b>2. Novo termo</b>Você escolhe a paciente: os dados vêm do cadastro. Confere o valor e envia.</li>
        <li><b>3. Aceite</b>Ela lê e aceita pelo link, sem assinatura. O histórico registra data e hora.</li>
      </ol>
      <div className="tabs-t" role="tablist" aria-label="Termos">
        <button type="button" role="tab" aria-selected={ehHist} className={ehHist ? "on" : ""} onClick={() => { setTab("hist"); setAba("form"); setEnvio(null); setMsg(null); }}>Histórico {pendentes ? <b>{pendentes} pendente{pendentes > 1 ? "s" : ""}</b> : null}</button>
        <button type="button" role="tab" aria-selected={!ehHist} className={ehHist ? "" : "on"} onClick={() => { setTab("novo"); setAba("form"); setEnvio(null); setMsg(null); }}><Icone nome="mais" tam={16} />Novo termo</button>
      </div>
      <div className="abas" role="tablist" aria-label="Termo">
        <button type="button" className={aba === "form" ? "on" : ""} onClick={() => setAba("form")}>{ehHist ? "Lista" : "Preencher"}</button>
        <button type="button" className={aba === "doc" ? "on" : ""} onClick={() => setAba("doc")}>Ver documento</button>
      </div>

      <div className={`termo-g aba-${aba}`}>
        <div className="form-col">
          {ehHist ? (
            <section className="card hl-t">
              <h2 className="card-t"><Icone nome="termos" tam={20} />Termos enviados</h2>
              <span style={{ fontSize: 14, color: "#6B5A5E" }}>{hist.filter((h) => h.status === "aceito").length} aceitos · {pendentes} aguardando</span>
              {hist.map((x) => (
                <button key={x.id} type="button" className={x.id === rec?.id ? "pi on" : "pi"} onClick={() => { setAba("doc"); setEnvio(null); setMsg(null); irPara(`?t=${x.id}&aba=doc`); }}>
                  <span className="tx">
                    <span style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}><b>{x.pac}</b><span className={pillDe(x.status)}>{x.st}</span></span>
                    <span className="m">{x.tipo} · {x.enviado}</span>
                  </span>
                </button>
              ))}
              {!hist.length ? <span style={{ fontSize: 14, color: "#6B5A5E" }}>Nenhum termo enviado ainda.</span> : null}
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#8A7A7E", lineHeight: 1.5 }}>Não há assinatura: o paciente aceita pelo link e o painel registra data e hora. O status muda sozinho.</p>
            </section>
          ) : (
            <section className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <h2 className="card-t"><Icone nome="termos" tam={20} />Novo termo</h2>
              {!novo ? (
                <span style={{ fontSize: 14, color: "#5A3A41" }}>Nenhum paciente ativo. Cadastre em <Link href="/painel/pacientes?novo=1">Pacientes</Link>.</span>
              ) : (
                <>
                  <div className="fc"><span className="lb">Paciente</span>
                    <div className="seg">{pacientes.map((o) => <button key={o.id} type="button" className={o.id === novo.id ? "on" : ""} onClick={() => irPara(`?paciente=${o.id}`)}>{o.n}</button>)}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}><span className="rot">Do cadastro do paciente</span><span style={{ fontSize: 12, color: "#8A7A7E" }}>{novo.ficha}</span></div>
                    <div className="cad">
                      <div className="i"><span className="l">Nome completo</span><b>{novo.nome}</b></div>
                      {inf ? <div className="i"><span className="l">Responsável legal</span><b>{novo.resp || "Não cadastrado"}</b></div> : null}
                      <div>
                        <span className="l">{inf ? "CPF do responsável" : "CPF"}</span>
                        <b style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>{temCpf ? <span style={{ color: "#2F6A45" }}><Icone nome="escudo" tam={16} /></span> : null}{temCpf ? cpfAberto || novo.cpf : "Não preenchido"}</b>
                        {temCpf ? (
                          <> <button type="button" style={{ font: "inherit", fontSize: 12, fontWeight: 700, color: "#7A2335", background: "none", border: 0, cursor: "pointer", textDecoration: "underline" }} onClick={() => (cpfAberto ? setCpfAberto("") : iniciar(async () => { const r = await verCpf(inf ? novo.respId! : novo.id, inf ? "responsavel" : "paciente"); if (r.valor) setCpfAberto(r.valor); else av(r); }))}>{cpfAberto ? "Ocultar" : "Mostrar"}</button></>
                        ) : null}
                      </div>
                      <div><span className="l">{inf ? "Idade" : "Data de nascimento"}</span><b>{novo.nasc}</b></div>
                      <div className="i"><span className="l">Contato de emergência</span><b>{novo.emerg || "Não preenchido"}</b></div>
                    </div>
                    <Link href={`/painel/pacientes?id=${novo.id}`} style={{ fontSize: 13, fontWeight: 700, alignSelf: "flex-start" }}>Corrigir algum dado no cadastro do paciente →</Link>
                  </div>

                  {!temCpf ? (
                    <div className="alerta-cpf">
                      <b style={{ fontSize: 15, color: "#A3322A" }}>O cadastro ainda não tem CPF.</b>
                      <span style={{ fontSize: 14, color: "#5A3A41" }}>O termo só pode ser gerado depois que {inf ? "o responsável preencher" : "a paciente preencher"} a ficha de cadastro. Assim que a ficha chegar, os dados aparecem aqui sozinhos.</span>
                      {envio ? null : (
                        <button type="button" className="bt2" style={{ alignSelf: "flex-start", width: "auto" }} disabled={pend} onClick={() => iniciar(async () => { const r = await linkFicha(novo.id); if (r.erro) return av(r); setEnvio({ link: r.link!, para: r.para!, texto: r.texto!, tipo: "ficha", ref: r.ref }); })}><Icone nome="whats" tam={18} />Reenviar a ficha de cadastro</button>
                      )}
                    </div>
                  ) : null}

                  <span className="rot" style={{ marginTop: 4 }}>Combinados do atendimento</span>
                  <div className="fc-g">
                    <div className="fc"><label htmlFor="t-val">Valor da sessão</label><div className="valor-in"><span>R$</span><input id="t-val" type="text" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} /></div></div>
                    <div className="fc"><label htmlFor="t-tipo">Tipo de valor</label><select id="t-tipo" value={tipoValor} onChange={(e) => setTipoValor(e.target.value as "normal" | "social")}><option value="normal">Valor normal</option><option value="social">Valor social</option></select></div>
                  </div>
                  <div className="fc"><span className="lb">Pagamento</span><div className="seg"><button type="button" className="on">Pix</button></div></div>
                  {!inf ? <div className="fc"><label htmlFor="t-plat">Plataforma de vídeo</label><input id="t-plat" type="text" value={plat} onChange={(e) => setPlat(e.target.value)} /></div> : null}
                  <div className="fc"><label htmlFor="t-fal">Faltas e cancelamentos</label><textarea id="t-fal" value={faltas} onChange={(e) => setFaltas(e.target.value)} /><span style={{ fontSize: 13, color: "#8A7A7E" }}>Sua política padrão. Vale para todos os termos.</span></div>

                  {msg ? <div className={msg.erro ? "aviso erro" : "aviso ok"} role="status">{msg.t}</div> : null}
                  {envio ? (
                    <>
                      <CaixaEnvio e={envio} aoCopiar={() => av({ ok: "Link copiado." })} aoEnviar={() => router.refresh()} />
                      {envio.id ? <button type="button" className="mini2" style={{ alignSelf: "flex-start" }} onClick={() => { const id = envio.id; setTab("hist"); setAba("doc"); setEnvio(null); setMsg(null); irPara(`?t=${id}&aba=doc`); }}>Ver no histórico →</button> : null}
                    </>
                  ) : (
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button type="button" className="bt" onClick={enviar} disabled={!temCpf || pend} style={{ width: "auto" }}><Icone nome="whats" tam={18} />{pend ? "Gerando…" : "Enviar para a paciente aceitar"}</button>
                    </div>
                  )}
                </>
              )}
            </section>
          )}
        </div>

        <div className="doc-col">
          {ehHist && rec ? (
            <>
              <div className="leitura">
                <span style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><span className={pillDe(rec.status)}>{rec.st}</span><span>{rec.como} · somente leitura</span></span>
                <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" className="bt2" onClick={() => window.print()} style={{ width: "auto", minHeight: 40, padding: "8px 14px", fontSize: 14 }}><Icone nome="baixar" tam={16} />Baixar PDF</button>
                  {rec.status === "enviado" ? (
                    <>
                      <button type="button" className="bt2" disabled={pend} onClick={() => iniciar(async () => { const r = await reenviarTermo(rec.id); av(r); if (r.link) setEnvio({ link: r.link, para: r.para!, texto: r.texto!, tipo: "termo", ref: r.id }); })} style={{ width: "auto", minHeight: 40, padding: "8px 14px", fontSize: 14 }}><Icone nome="reenviar" tam={16} />Reenviar link</button>
                      <button type="button" className="bt3" disabled={pend} onClick={() => { if (window.confirm("Cancelar este termo? O link deixa de valer.")) iniciar(async () => { const r = await cancelarTermo(rec.id); av(r); setEnvio(null); router.refresh(); }); }} style={{ minHeight: 40, fontSize: 14 }}>Cancelar termo</button>
                    </>
                  ) : null}
                </span>
              </div>
              {msg ? <div className={msg.erro ? "aviso erro" : "aviso ok"} role="status">{msg.t}</div> : null}
              {envio ? <CaixaEnvio e={envio} aoCopiar={() => av({ ok: "Link copiado." })} aoEnviar={() => router.refresh()} /> : null}
            </>
          ) : null}

          {mostrado ? (
            <TermoDocumento
              c={mostrado}
              rodape={
                <div className="aceite-reg">
                  <span style={{ color: ehHist && rec?.status === "aceito" ? "#2F6A45" : "#8A4B12", flex: "0 0 auto" }}><Icone nome={ehHist && rec?.status === "aceito" ? "ok" : "escudo"} tam={18} /></span>
                  <span>{ehHist ? rec?.reg : regNovo}</span>
                </div>
              }
            />
          ) : (
            <section className="card"><span style={{ fontSize: 14, color: "#6B5A5E" }}>{ehHist ? "Quando você enviar um termo, ele aparece aqui." : "Escolha um paciente para ver o documento."}</span></section>
          )}
          <p style={{ margin: 0, fontSize: 13, color: "#8A7A7E", lineHeight: 1.5 }}>Modelo para revisão. Vale a Ritieli conferir o texto com as orientações do CRP antes de usar.</p>
        </div>
      </div>
    </>
  );
}
