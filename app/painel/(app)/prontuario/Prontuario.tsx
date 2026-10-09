"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import Icone from "../../componentes/Icone";
import { supabaseNavegador } from "../../../lib/supabase/navegador";
import * as cofre from "./cofre";
import { salvarChave, registrarAcesso, salvarEvolucao, salvarCorrecao, salvarSecao, registrarAnexo, excluirAnexo } from "./acoes";

type Evo = { id: string; data: string; rotulo: string; cripto: string; reg: string; correcoes: { id: string; cripto: string; quando: string }[] };
type Props = {
  paciente: { id: string; nome: string; curto: string; tipo: "adulta" | "crianca"; desde: string; status: string };
  pacote: cofre.Pacote | null;
  evolucoes: Evo[];
  demanda: { cripto: string; quando: string; versoes: number } | null;
  encerramento: { cripto: string; quando: string } | null;
  anexos: { id: string; caminho: string; meta: string; tamanho: number; quando: string }[];
  acessos: { id: string; quando: string; acao: string; aparelho: string }[];
  sessoes: { id: string; data: string; rotulo: string }[];
  identificacao: [string, string][];
};
type Aba = "evo" | "dem" | "id" | "enc" | "anx" | "log";

const DS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const diaLongo = (iso: string) => { const [a, m, d] = iso.split("-").map(Number); return `${DS[new Date(Date.UTC(a, m - 1, d)).getUTCDay()]}, ${d} ${MS[m - 1]} ${a}`; };
const hojeISO = () => new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10);
const isoLocal = (iso: string) => new Date(new Date(iso).getTime() - 3 * 3600000).toISOString().slice(0, 10);
const MOTIVOS = ["Alta", "Interrupção pela paciente", "Encaminhamento", "Mudança de profissional"];
const tam = (b: number) => (b > 1e6 ? `${(b / 1e6).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`);
const tipoArq = (t: string) => (t.startsWith("image/") ? "Foto" : t === "application/pdf" ? "PDF" : "Arquivo");

function Lista({ itens }: { itens: string[] }) {
  return (
    <ul style={{ listStyle: "none", margin: "4px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 8, fontSize: 13, color: "#6B5A5E" }}>
      {itens.map((t) => <li key={t} style={{ display: "flex", gap: 8 }}><span style={{ color: "#2F6A45", flex: "0 0 auto" }}><Icone nome="ok" tam={16} /></span>{t}</li>)}
    </ul>
  );
}

export default function Prontuario(props: Props) {
  const { paciente, pacote } = props;
  const router = useRouter();
  const [aberto, setAberto] = useState(cofre.estaAberto());
  const [pend, iniciar] = useTransition();
  const [msg, setMsg] = useState<{ t: string; erro?: boolean } | null>(null);
  const av = (r: { ok?: string; erro?: string }) => setMsg(r.erro ? { t: r.erro, erro: true } : r.ok ? { t: r.ok } : null);

  // Trava / criação
  const [modo, setModo] = useState<"abrir" | "recuperar" | "criar" | "codigo">(pacote ? "abrir" : "criar");
  const [senha, setSenha] = useState("");
  const [senha2, setSenha2] = useState("");
  const [codigo, setCodigo] = useState("");
  const [novoCodigo, setNovoCodigo] = useState("");
  const [guardou, setGuardou] = useState(false);
  const [erroTrava, setErroTrava] = useState("");
  const [calculando, setCalculando] = useState(false);

  // Conteúdo aberto
  const [aba, setAba] = useState<Aba>("evo");
  const [evos, setEvos] = useState<{ id: string; data: string; rotulo: string; texto: string; reg: string; correcoes: { id: string; texto: string; quando: string }[] }[]>([]);
  const [dem, setDem] = useState({ demanda: "", objetivos: "" });
  const [enc, setEnc] = useState<{ motivo: string; sintese: string } | null>(null);
  const [encNovo, setEncNovo] = useState({ motivo: "", sintese: "" });
  const [anexos, setAnexos] = useState<{ id: string; caminho: string; nome: string; tipo: string; tamanho: number; quando: string }[]>([]);
  const [novo, setNovo] = useState({ sessao: props.sessoes[0]?.id || "", texto: "" });
  const [corr, setCorr] = useState<{ id: string; texto: string } | null>(null);
  const [troca, setTroca] = useState<{ atual: string; nova: string; nova2: string } | null>(null);
  const registrou = useRef(false);

  useEffect(() => cofre.aoMudar(setAberto), []);
  useEffect(() => {
    const t = () => cofre.tocar();
    window.addEventListener("pointerdown", t);
    window.addEventListener("keydown", t);
    return () => { window.removeEventListener("pointerdown", t); window.removeEventListener("keydown", t); };
  }, []);

  // Abre o conteúdo sempre que o cofre está aberto (e de novo quando chegam dados novos).
  useEffect(() => {
    if (!aberto) return;
    let vivo = true;
    (async () => {
      const e = await Promise.all(props.evolucoes.map(async (x) => ({
        id: x.id, data: x.data, rotulo: x.rotulo, reg: x.reg,
        texto: (await cofre.decifrar<{ texto: string }>(x.cripto))?.texto ?? "[não deu para abrir este registro]",
        correcoes: await Promise.all(x.correcoes.map(async (c) => ({ id: c.id, quando: c.quando, texto: (await cofre.decifrar<{ texto: string }>(c.cripto))?.texto ?? "[não deu para abrir]" }))),
      })));
      const d = props.demanda ? await cofre.decifrar<{ demanda: string; objetivos: string }>(props.demanda.cripto) : null;
      const en = props.encerramento ? await cofre.decifrar<{ motivo: string; sintese: string }>(props.encerramento.cripto) : null;
      const an = await Promise.all(props.anexos.map(async (a) => { const m = await cofre.decifrar<{ nome: string; tipo: string }>(a.meta); return { id: a.id, caminho: a.caminho, tamanho: a.tamanho, quando: a.quando, nome: m?.nome || "Arquivo", tipo: m?.tipo || "application/octet-stream" }; }));
      if (!vivo) return;
      setEvos(e);
      setDem(d || { demanda: "", objetivos: "" });
      setEnc(en);
      setAnexos(an);
    })();
    if (!registrou.current) {
      registrou.current = true;
      registrarAcesso(paciente.id, "Abriu").catch(() => {});
    }
    return () => { vivo = false; };
  }, [aberto, props.evolucoes, props.demanda, props.encerramento, props.anexos, paciente.id]);

  const calc = async (f: () => Promise<void>) => { setCalculando(true); setErroTrava(""); try { await f(); } finally { setCalculando(false); } };

  const abrirCofre = () => calc(async () => {
    if (!pacote) return;
    if (!(await cofre.abrir(senha, pacote))) return setErroTrava("Senha incorreta.");
    setSenha("");
  });
  const prepararCriacao = () => {
    if (senha.length < 10) return setErroTrava("Use pelo menos 10 caracteres.");
    if (senha !== senha2) return setErroTrava("As duas senhas não são iguais.");
    setErroTrava("");
    setNovoCodigo(cofre.novoCodigo());
    setModo("codigo");
  };
  const concluirCriacao = () => calc(async () => {
    const p = await cofre.criar(senha, novoCodigo);
    const r = await salvarChave(p, "criar");
    if (r.erro) { cofre.fechar(); return setErroTrava(r.erro); }
    setSenha(""); setSenha2(""); setNovoCodigo(""); setGuardou(false); setModo("abrir");
    router.refresh();
  });
  const recuperarCofre = () => calc(async () => {
    if (!pacote) return;
    if (senha.length < 10) return setErroTrava("A nova senha precisa ter pelo menos 10 caracteres.");
    if (senha !== senha2) return setErroTrava("As duas senhas não são iguais.");
    const p = await cofre.recuperar(codigo, senha, pacote);
    if (!p) return setErroTrava("Chave de recuperação incorreta.");
    const r = await salvarChave(p, "recuperar");
    if (r.erro) { cofre.fechar(); return setErroTrava(r.erro); }
    setSenha(""); setSenha2(""); setCodigo(""); setModo("abrir");
    router.refresh();
  });
  const imprimirCodigo = () => {
    const w = window.open("", "_blank", "width=600,height=500");
    if (!w) return;
    w.document.write(`<!doctype html><meta charset="utf-8"><title>Chave de recuperação do prontuário</title><body style="font-family:Arial,sans-serif;padding:40px;color:#3A1F25"><h1 style="font-size:20px">Chave de recuperação do prontuário</h1><p>Ritieli Hermes · guarde este papel num lugar seguro. Com ela você cria uma senha nova sem perder nenhum registro.</p><p style="font-family:monospace;font-size:26px;letter-spacing:2px;border:2px solid #7A2335;border-radius:12px;padding:18px;text-align:center">${novoCodigo}</p><p style="font-size:13px;color:#6B5A5E">Criada em ${new Date().toLocaleDateString("pt-BR")}. Não guarde esta chave no mesmo lugar da senha.</p><script>window.print()</script></body>`);
    w.document.close();
  };

  const salvarEvo = () => iniciar(async () => {
    const t = novo.texto.trim();
    if (!t) return av({ erro: "Escreva a evolução antes de salvar." });
    const s = props.sessoes.find((x) => x.id === novo.sessao);
    const r = await salvarEvolucao(paciente.id, { sessaoId: s?.id || null, data: s ? isoLocal(s.data) : hojeISO(), rotulo: s ? s.rotulo.split(" · ")[1].replace(/^s/, "S") : "", cripto: await cofre.cifrar({ texto: t }) });
    av(r);
    if (!r.erro) { setNovo({ ...novo, texto: "" }); router.refresh(); }
  });
  const salvarCorr = () => corr && iniciar(async () => {
    const t = corr.texto.trim();
    if (!t) return;
    const r = await salvarCorrecao(paciente.id, corr.id, await cofre.cifrar({ texto: t }));
    av(r);
    if (!r.erro) { setCorr(null); router.refresh(); }
  });
  const salvarDem = () => iniciar(async () => {
    const r = await salvarSecao(paciente.id, "demanda", await cofre.cifrar(dem));
    av(r);
    if (!r.erro) router.refresh();
  });
  const registrarEnc = () => iniciar(async () => {
    if (!encNovo.motivo) return av({ erro: "Escolha o motivo do encerramento." });
    const r = await salvarSecao(paciente.id, "encerramento", await cofre.cifrar(encNovo));
    av(r);
    if (!r.erro) router.refresh();
  });
  const anexar = (f: File | undefined) => f && iniciar(async () => {
    if (f.size > 15e6) return av({ erro: "O arquivo passa de 15 MB." });
    const dados = await cofre.cifrarArquivo(await f.arrayBuffer());
    const caminho = `${paciente.id}/${crypto.randomUUID()}`;
    const sb = supabaseNavegador();
    const { error } = await sb.storage.from("prontuario").upload(caminho, new Blob([dados as BlobPart], { type: "application/octet-stream" }), { contentType: "application/octet-stream" });
    if (error) return av({ erro: "Não deu para enviar o arquivo. Tente de novo." });
    const r = await registrarAnexo(paciente.id, { caminho, meta: await cofre.cifrar({ nome: f.name, tipo: f.type || "application/octet-stream" }), tamanho: dados.length });
    av(r);
    if (!r.erro) router.refresh();
  });
  const baixar = (a: (typeof anexos)[number]) => iniciar(async () => {
    const sb = supabaseNavegador();
    const { data, error } = await sb.storage.from("prontuario").download(a.caminho);
    if (error || !data) return av({ erro: "Não deu para baixar o arquivo." });
    const claro = await cofre.decifrarArquivo(await data.arrayBuffer()).catch(() => null);
    if (!claro) return av({ erro: "Não deu para abrir o arquivo." });
    const url = URL.createObjectURL(new Blob([claro], { type: a.tipo }));
    const link = document.createElement("a");
    link.href = url;
    link.download = a.nome;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    registrarAcesso(paciente.id, "Baixou anexo").catch(() => {});
  });
  const exportar = () => { registrarAcesso(paciente.id, "Exportou PDF").catch(() => {}); setTimeout(() => window.print(), 50); };
  const trocar = () => troca && pacote && calc(async () => {
    if (troca.nova.length < 10) return av({ erro: "A nova senha precisa ter pelo menos 10 caracteres." });
    if (troca.nova !== troca.nova2) return av({ erro: "As duas senhas novas não são iguais." });
    const p = await cofre.trocarSenha(troca.atual, troca.nova, pacote);
    if (!p) return av({ erro: "A senha atual está incorreta." });
    const r = await salvarChave(p, "trocar");
    av(r.erro ? r : { ok: "Senha do prontuário trocada. A chave de recuperação continua a mesma." });
    if (!r.erro) { setTroca(null); router.refresh(); }
  });

  const topo = (
    <header className="topo"><div><h1>Prontuário · <em>{paciente.curto}</em></h1><div className="data">Área protegida</div></div><div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><Link href={`/painel/pacientes?id=${paciente.id}`} className="bt2">← Voltar à ficha</Link></div></header>
  );

  // ---------- Fechado: criar senha, abrir ou recuperar ----------
  if (!aberto) {
    return (
      <>
        {topo}
        <main className="conteudo">
          <div className="trava">
            <span className="cad"><Icone nome="escudo" tam={28} /></span>
            {modo === "criar" ? (
              <>
                <div style={{ textAlign: "center" }}><h2 style={{ margin: 0, fontSize: 24, color: "#7A2335" }}>Crie a senha do prontuário</h2><p style={{ margin: "6px 0 0", color: "#5A3A41", fontSize: 15 }}>É diferente da senha do painel e vale para todos os prontuários. Ninguém além de você consegue ler o que for escrito aqui.</p></div>
                <div className="fc"><label htmlFor="c-s1">Senha do prontuário</label><input id="c-s1" type="password" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Pelo menos 10 caracteres" /></div>
                <div className="fc"><label htmlFor="c-s2">Repita a senha</label><input id="c-s2" type="password" autoComplete="new-password" value={senha2} onChange={(e) => setSenha2(e.target.value)} /></div>
                {erroTrava ? <span className="err">{erroTrava}</span> : null}
                <button type="button" className="bt" onClick={prepararCriacao} style={{ width: "100%" }}>Continuar</button>
                <Lista itens={["Criptografado de ponta a ponta: só você consegue ler.", "Se esquecer a senha, só a chave de recuperação abre de novo.", "Fecha sozinho após 10 minutos sem uso."]} />
              </>
            ) : modo === "codigo" ? (
              <>
                <div style={{ textAlign: "center" }}><h2 style={{ margin: 0, fontSize: 24, color: "#7A2335" }}>Sua chave de recuperação</h2><p style={{ margin: "6px 0 0", color: "#5A3A41", fontSize: 15 }}>Se um dia esquecer a senha, esta chave é o único jeito de abrir o prontuário de novo. Ela aparece só agora.</p></div>
                <div style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 21, letterSpacing: 1.5, textAlign: "center", background: "#F8F3F0", border: "2px solid #7A2335", borderRadius: 16, padding: "16px 12px", wordBreak: "break-word", color: "#3A1F25" }}>{novoCodigo}</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
                  <button type="button" className="bt2" style={{ width: "auto" }} onClick={imprimirCodigo}>Imprimir</button>
                  <button type="button" className="bt2" style={{ width: "auto" }} onClick={() => navigator.clipboard?.writeText(novoCodigo)}>Copiar</button>
                </div>
                <span style={{ fontSize: 13, color: "#8A4B12", background: "#FBF1E6", borderRadius: 12, padding: "10px 12px" }}>Guarde impressa ou anotada num lugar seguro, longe da senha. Sem a senha e sem esta chave, os registros não podem ser recuperados por ninguém.</span>
                <label className="ag-check" style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14 }}><input type="checkbox" checked={guardou} onChange={() => setGuardou(!guardou)} style={{ marginTop: 3 }} /><span>Guardei a chave de recuperação num lugar seguro.</span></label>
                {erroTrava ? <span className="err">{erroTrava}</span> : null}
                <button type="button" className="bt" onClick={concluirCriacao} disabled={!guardou || calculando} style={{ width: "100%" }}>{calculando ? "Criando…" : "Concluir e abrir o prontuário"}</button>
                <button type="button" className="bt3" onClick={() => { setModo("criar"); setGuardou(false); }}>Voltar</button>
              </>
            ) : modo === "recuperar" ? (
              <>
                <div style={{ textAlign: "center" }}><h2 style={{ margin: 0, fontSize: 24, color: "#7A2335" }}>Recuperar o acesso</h2><p style={{ margin: "6px 0 0", color: "#5A3A41", fontSize: 15 }}>Digite a chave de recuperação e crie uma senha nova. Nenhum registro se perde.</p></div>
                <div className="fc"><label htmlFor="r-cod">Chave de recuperação</label><input id="r-cod" type="text" autoComplete="off" autoCapitalize="characters" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX" style={{ fontFamily: "ui-monospace, Menlo, monospace" }} /></div>
                <div className="fc"><label htmlFor="r-s1">Nova senha do prontuário</label><input id="r-s1" type="password" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} /></div>
                <div className="fc"><label htmlFor="r-s2">Repita a nova senha</label><input id="r-s2" type="password" autoComplete="new-password" value={senha2} onChange={(e) => setSenha2(e.target.value)} /></div>
                {erroTrava ? <span className="err">{erroTrava}</span> : null}
                <button type="button" className="bt" onClick={recuperarCofre} disabled={calculando} style={{ width: "100%" }}>{calculando ? "Conferindo…" : "Criar senha nova e abrir"}</button>
                <button type="button" className="bt3" onClick={() => { setModo("abrir"); setErroTrava(""); }}>Voltar</button>
              </>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); abrirCofre(); }} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div style={{ textAlign: "center" }}><h2 style={{ margin: 0, fontSize: 24, color: "#7A2335" }}>Prontuário protegido</h2><p style={{ margin: "6px 0 0", color: "#5A3A41", fontSize: 15 }}>{paciente.curto} · Confirme que é você para abrir.</p></div>
                <div className="fc"><label htmlFor="p-senha">Senha do prontuário</label><input id="p-senha" type="password" autoComplete="current-password" value={senha} onChange={(e) => { setSenha(e.target.value); setErroTrava(""); }} placeholder="Senha do prontuário" autoFocus /></div>
                {erroTrava ? <span className="err">{erroTrava}</span> : null}
                <button type="submit" className="bt" disabled={calculando || !senha} style={{ width: "100%" }}><Icone nome="escudo" tam={18} />{calculando ? "Abrindo…" : "Abrir prontuário"}</button>
                <button type="button" className="bt3" onClick={() => { setModo("recuperar"); setSenha(""); setErroTrava(""); }}>Esqueci a senha</button>
                <Lista itens={["Criptografado de ponta a ponta: só você consegue ler.", "Fecha sozinho após 10 minutos sem uso.", "Cada abertura fica registrada em Acessos."]} />
              </form>
            )}
          </div>
        </main>
      </>
    );
  }

  // ---------- Aberto ----------
  const abas: [Aba, string][] = [["evo", "Evoluções"], ["dem", "Demanda e objetivos"], ["id", "Identificação"], ["enc", "Encerramento"], ["anx", "Anexos"], ["log", "Acessos"]];
  return (
    <>
      {topo}
      <main className="conteudo">
        <div className="faixa-ab">
          <span style={{ display: "flex", gap: 10, alignItems: "center" }}><span style={{ color: "#9FD3B0" }}><Icone nome="escudo" tam={18} /></span>Prontuário aberto · fecha sozinho em 10 min sem uso</span>
          <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button type="button" className="bt2" onClick={exportar}><Icone nome="baixar" tam={16} />Exportar PDF</button><button type="button" className="bt2" onClick={() => cofre.fechar()}>Fechar agora</button></span>
        </div>
        {msg ? <div className={msg.erro ? "aviso erro" : "aviso ok"} role="status">{msg.t}</div> : null}
        <div className="pr-g">
          <aside className="pr-l">
            <section className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <span style={{ width: 52, height: 52, borderRadius: "50%", background: "#F6E5E7", color: "#7A2335", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{paciente.nome.split(/\s+/).slice(0, 2).map((x) => x[0]?.toUpperCase()).join("")}</span>
              <b style={{ fontSize: 19 }}>{paciente.curto}</b>
              <span style={{ fontSize: 14, color: "#6B5A5E" }}>{paciente.tipo === "crianca" ? "Infantil · presencial" : "Online"} · desde {new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(paciente.desde + "T12:00:00Z"))}<br />{evos.length} {evos.length === 1 ? "evolução registrada" : "evoluções registradas"}</span>
              <Link href={`/painel/pacientes?id=${paciente.id}`} style={{ fontSize: 13, fontWeight: 700 }}>← Voltar à ficha</Link>
            </section>
            <nav className="abas-p" aria-label="Seções do prontuário">{abas.map(([k, n]) => <button key={k} type="button" className={aba === k ? "pa on" : "pa"} onClick={() => { setAba(k); setMsg(null); }}>{n}</button>)}</nav>
          </aside>
          <div style={{ display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>
            {aba === "evo" ? (
              <section className="card">
                <h2 className="card-t" style={{ marginBottom: 14 }}><Icone nome="escritos" tam={20} />Evoluções</h2>
                <div className="compor">
                  <div className="fc"><label htmlFor="p-ses">Sessão</label>
                    <select id="p-ses" value={novo.sessao} onChange={(e) => setNovo({ ...novo, sessao: e.target.value })}>
                      {props.sessoes.map((s) => <option key={s.id} value={s.id}>{s.rotulo}</option>)}
                      <option value="">Sem sessão vinculada · hoje</option>
                    </select>
                  </div>
                  <textarea aria-label="Nova evolução" placeholder="Como foi a sessão, o que foi trabalhado, tarefas combinadas…" value={novo.texto} onChange={(e) => setNovo({ ...novo, texto: e.target.value })} />
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}><span style={{ fontSize: 12, color: "#8A7A7E" }}>Depois de salva, a evolução não pode ser apagada, só corrigida com uma nota.</span><button type="button" className="bt" onClick={salvarEvo} disabled={pend} style={{ width: "auto" }}>{pend ? "Salvando…" : "Salvar evolução"}</button></div>
                </div>
                <div style={{ marginTop: 10 }}>
                  {evos.map((e) => (
                    <article className="evo" key={e.id}>
                      <div className="cab"><b>{diaLongo(e.data)}</b>{e.rotulo ? <span className="pill p-on">{e.rotulo}</span> : null}</div>
                      <p style={{ whiteSpace: "pre-wrap" }}>{e.texto}</p>
                      {e.correcoes.map((c) => <div className="corr" key={c.id} style={{ whiteSpace: "pre-wrap" }}>{c.texto}<span>{c.quando}</span></div>)}
                      <span className="reg"><Icone nome="escudo" tam={14} />{e.reg}</span>
                      {corr?.id === e.id ? (
                        <div className="compor">
                          <textarea aria-label="Correção" placeholder="O que precisa ser corrigido ou complementado?" value={corr.texto} onChange={(x) => setCorr({ id: e.id, texto: x.target.value })} style={{ minHeight: 80 }} />
                          <div style={{ display: "flex", gap: 8 }}><button type="button" className="bt" onClick={salvarCorr} disabled={pend} style={{ width: "auto", minHeight: 40, padding: "8px 16px", fontSize: 14 }}>Acrescentar correção</button><button type="button" className="bt3" onClick={() => setCorr(null)} style={{ fontSize: 14 }}>Cancelar</button></div>
                        </div>
                      ) : (
                        <button type="button" className="mini" style={{ alignSelf: "flex-start" }} onClick={() => setCorr({ id: e.id, texto: "" })}>Acrescentar correção</button>
                      )}
                    </article>
                  ))}
                  {!evos.length ? <p style={{ margin: "16px 0 4px", color: "#6B5A5E", fontSize: 14 }}>Nenhuma evolução ainda. A primeira aparece aqui assim que for salva.</p> : null}
                </div>
              </section>
            ) : null}

            {aba === "dem" ? (
              <section className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <h2 className="card-t"><Icone nome="termos" tam={20} />Demanda e objetivos</h2>
                <div className="fc"><label htmlFor="p-dem">Demanda (o que trouxe {paciente.tipo === "crianca" ? "a família" : "a paciente"})</label><textarea id="p-dem" className="ta" value={dem.demanda} onChange={(e) => setDem({ ...dem, demanda: e.target.value })} /></div>
                <div className="fc"><label htmlFor="p-obj">Objetivos do acompanhamento</label><textarea id="p-obj" className="ta" value={dem.objetivos} onChange={(e) => setDem({ ...dem, objetivos: e.target.value })} /></div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}><span style={{ fontSize: 12, color: "#8A7A7E" }}>{props.demanda ? `Última versão salva em ${props.demanda.quando}. As anteriores ficam guardadas.` : "Ainda não preenchido."}</span><button type="button" className="bt" onClick={salvarDem} disabled={pend} style={{ width: "auto" }}>Salvar</button></div>
              </section>
            ) : null}

            {aba === "id" ? (
              <section className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <h2 className="card-t"><Icone nome="pessoa" tam={20} />Identificação</h2>
                <div className="idg">{props.identificacao.map(([l, v]) => <div key={l}><span>{l}</span><b>{v}</b></div>)}</div>
                <span style={{ fontSize: 13, color: "#8A7A7E" }}>Esses dados vêm do cadastro. Para corrigir, use a ficha {paciente.tipo === "crianca" ? "do paciente" : "da paciente"}.</span>
              </section>
            ) : null}

            {aba === "enc" ? (
              <section className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <h2 className="card-t"><Icone nome="sair" tam={20} />Encaminhamento ou encerramento</h2>
                {enc ? (
                  <div className="corr" style={{ background: "#E7F1EA", borderLeftColor: "#8CC2A0", whiteSpace: "pre-wrap" }}><b>{enc.motivo}</b> · registrado em {props.encerramento?.quando}<br />{enc.sintese}</div>
                ) : (
                  <>
                    <span style={{ fontSize: 14, color: "#5A3A41" }}>Acompanhamento em andamento. Quando chegar a hora, registre aqui como foi o fechamento.</span>
                    <div className="fc"><span className="lb">Motivo</span><div className="seg">{MOTIVOS.map((m) => <button key={m} type="button" className={encNovo.motivo === m ? "on" : ""} onClick={() => setEncNovo({ ...encNovo, motivo: m })}>{m}</button>)}</div></div>
                    <div className="fc"><label htmlFor="p-enc">Síntese e encaminhamentos</label><textarea id="p-enc" className="ta" value={encNovo.sintese} onChange={(e) => setEncNovo({ ...encNovo, sintese: e.target.value })} placeholder="Como foi o processo, o que foi alcançado, para onde foi encaminhada…" /></div>
                    <button type="button" className="bt2" onClick={registrarEnc} disabled={pend} style={{ alignSelf: "flex-start", width: "auto" }}>Registrar encerramento</button>
                  </>
                )}
              </section>
            ) : null}

            {aba === "anx" ? (
              <section className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <h2 className="card-t"><Icone nome="termos" tam={20} />Anexos</h2>
                  <label className="bt2" style={{ width: "auto", minHeight: 40, padding: "8px 14px", fontSize: 14, cursor: "pointer" }}><Icone nome="mais" tam={16} />{pend ? "Enviando…" : "Anexar arquivo"}<input type="file" style={{ display: "none" }} onChange={(e) => { anexar(e.target.files?.[0]); e.target.value = ""; }} /></label>
                </div>
                {anexos.map((a) => (
                  <div className="anx" key={a.id}>
                    <button type="button" onClick={() => baixar(a)} style={{ font: "inherit", textAlign: "left", border: 0, background: "none", padding: 0, cursor: "pointer", color: "inherit", display: "flex", gap: 12, alignItems: "center", flex: 1, minWidth: 0 }}>
                      <span className="ai"><Icone nome="baixar" tam={18} /></span>
                      <span style={{ flex: 1, minWidth: 0 }}><b style={{ display: "block", fontSize: 15, wordBreak: "break-word" }}>{a.nome}</b><span style={{ fontSize: 13, color: "#8A7A7E" }}>{tipoArq(a.tipo)} · {tam(a.tamanho)} · {a.quando}</span></span>
                    </button>
                    <button type="button" aria-label={`Excluir o anexo ${a.nome}`} title="Excluir anexo" disabled={pend} onClick={() => { if (window.confirm(`Excluir o anexo "${a.nome}"?\n\nO arquivo é apagado de vez e não dá para recuperar.`)) iniciar(async () => { const r = await excluirAnexo(paciente.id, a.id); av(r); if (!r.erro) router.refresh(); }); }} style={{ flex: "0 0 auto", width: 40, height: 40, borderRadius: "50%", border: "1.5px solid #E2CCD0", background: "#FFFFFF", color: "#A3322A", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Icone nome="fechar" tam={16} /></button>
                  </div>
                ))}
                {!anexos.length ? <span style={{ fontSize: 14, color: "#6B5A5E" }}>Nenhum anexo ainda.</span> : null}
                <span style={{ fontSize: 13, color: "#8A7A7E" }}>Materiais de testes psicológicos ficam aqui, com o mesmo sigilo do prontuário. O arquivo é criptografado antes de sair do seu aparelho (até 15 MB).</span>
              </section>
            ) : null}

            {aba === "log" ? (
              <section className="card">
                <h2 className="card-t" style={{ marginBottom: 12 }}><Icone nome="olho" tam={20} />Acessos ao prontuário</h2>
                <table className="log"><thead><tr><th>Quando</th><th>Quem</th><th className="esc-m">Aparelho</th><th>O que fez</th></tr></thead>
                  <tbody>{props.acessos.map((a) => <tr key={a.id}><td>{a.quando}</td><td>Ritieli</td><td className="esc-m">{a.aparelho}</td><td>{a.acao}</td></tr>)}</tbody>
                </table>
                <p style={{ margin: "12px 0 0", fontSize: 13, color: "#8A7A7E" }}>Só você tem acesso. Se aparecer algo que não reconhece, troque a senha na hora.</p>
                {troca ? (
                  <div className="compor" style={{ marginTop: 14 }}>
                    <div className="fc"><label htmlFor="t-at">Senha atual do prontuário</label><input id="t-at" type="password" autoComplete="current-password" value={troca.atual} onChange={(e) => setTroca({ ...troca, atual: e.target.value })} /></div>
                    <div className="fc-g">
                      <div className="fc"><label htmlFor="t-n1">Nova senha</label><input id="t-n1" type="password" autoComplete="new-password" value={troca.nova} onChange={(e) => setTroca({ ...troca, nova: e.target.value })} /></div>
                      <div className="fc"><label htmlFor="t-n2">Repita a nova senha</label><input id="t-n2" type="password" autoComplete="new-password" value={troca.nova2} onChange={(e) => setTroca({ ...troca, nova2: e.target.value })} /></div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}><button type="button" className="bt" onClick={trocar} disabled={calculando} style={{ width: "auto" }}>{calculando ? "Trocando…" : "Trocar senha"}</button><button type="button" className="bt3" onClick={() => setTroca(null)}>Cancelar</button></div>
                  </div>
                ) : (
                  <button type="button" className="mini" style={{ marginTop: 12 }} onClick={() => setTroca({ atual: "", nova: "", nova2: "" })}>Trocar a senha do prontuário</button>
                )}
              </section>
            ) : null}

            <p style={{ margin: 0, fontSize: 12, color: "#8A7A7E" }}>Guardado por no mínimo 5 anos após o encerramento, como pede a Resolução CFP 001/2009. A paciente pode pedir acesso ao que foi registrado.</p>
          </div>
        </div>

        {/* Versão para imprimir / salvar em PDF: o prontuário inteiro */}
        <div className="pr-print">
          <h1>Prontuário psicológico · {paciente.nome}</h1>
          <p>Ritieli Hermes · Psicóloga · CRP 07/46564 · gerado em {new Date().toLocaleDateString("pt-BR")}</p>
          <h2>Identificação</h2>
          {props.identificacao.map(([l, v]) => <p key={l}><b>{l}:</b> {v}</p>)}
          <h2>Demanda e objetivos</h2>
          <p><b>Demanda:</b> {dem.demanda || "—"}</p>
          <p><b>Objetivos:</b> {dem.objetivos || "—"}</p>
          <h2>Evoluções</h2>
          {[...evos].reverse().map((e) => (
            <div key={e.id} style={{ marginBottom: 12 }}>
              <p><b>{diaLongo(e.data)}{e.rotulo ? ` · ${e.rotulo}` : ""}</b></p>
              <p style={{ whiteSpace: "pre-wrap" }}>{e.texto}</p>
              {e.correcoes.map((c) => <p key={c.id} style={{ whiteSpace: "pre-wrap" }}><i>Correção ({c.quando.replace("Correção registrada em ", "")}):</i> {c.texto}</p>)}
            </div>
          ))}
          <h2>Encerramento</h2>
          <p>{enc ? `${enc.motivo}: ${enc.sintese}` : "Acompanhamento em andamento."}</p>
          <h2>Anexos</h2>
          {anexos.length ? anexos.map((a) => <p key={a.id}>{a.nome} · {a.quando}</p>) : <p>Nenhum.</p>}
        </div>
      </main>
    </>
  );
}
