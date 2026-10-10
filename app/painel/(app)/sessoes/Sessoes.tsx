"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import Icone from "../../componentes/Icone";
import { reais } from "../../../lib/formato";
import type { StatusSessao } from "../../../lib/sessoes";
import { registrarSessao, mudarSessao, mudarValorSessao, excluirSessao, remarcarSessao, pagarAdiantado, desfazerAdiantado } from "./acoes";
import { waLink } from "../../../lib/formato";

export type Linha = {
  id: string; inicio: string; nome: string; tipo: "adulta" | "crianca"; status: StatusSessao;
  valor: number | null; pago: boolean; recibo: boolean; manual: boolean; remarcadaDe: string | null;
};
type Pac = { id: string; nome: string; valor: number | null; hora: string | null; credito: number };
type Estado = { status: StatusSessao; pago: boolean; recibo: boolean };

const DS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MN = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const FUSO = 3 * 3600000;
const loc = (iso: string) => new Date(new Date(iso).getTime() - FUSO);
const fmtData = (iso: string) => { const d = loc(iso); return `${DS[d.getUTCDay()]}, ${d.getUTCDate()} ${MS[d.getUTCMonth()]}`; };
const fmtHora = (iso: string) => { const d = loc(iso); return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`; };
const curto = (n: string) => { const p = n.trim().split(/\s+/); return p.length > 1 ? `${p[0]} ${p[p.length - 1][0]}.` : p[0]; };
const brl = (c: number | null) => (c == null ? "—" : reais(c));
const cobra = (s: StatusSessao) => s === "realizada" || s === "falta";

const ST_CLS: Record<StatusSessao, string> = { realizada: "pill p-ok", agendada: "pill p-on", falta: "pill p-ur", cancelada: "pill p-ne" };
const ST_TXT: Record<StatusSessao, string> = { realizada: "Realizada", agendada: "Agendada", falta: "Falta (cobrada)", cancelada: "Cancelada com 24h" };
const MSG: Record<string, string> = {
  realizada: "Sessão marcada como realizada. O pagamento ficou pendente.",
  falta: "Falta registrada. Pela sua política, ela é cobrada como sessão.",
  cancelada: "Cancelamento com antecedência registrado, sem cobrança.",
  pago: "Pagamento registrado. Agora falta o recibo.",
  agendada: "A sessão voltou para agendada.",
  desrecibo: "Recibo desmarcado: voltou para \"a emitir\".",
  despago: "Pagamento desmarcado: a sessão voltou para \"a pagar\".",
  recibo: "Recibo marcado como emitido.",
};

// Disponibilidade da semana, em minutos do dia (Painel → Disponibilidade).
export type Expediente = { dia: number; ativo: boolean; ini: number; fim: number; pIni: number | null; pFim: number | null };
const hm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
// Inícios possíveis de uma sessão de 50 min no dia escolhido (de hora em hora, fora da pausa).
let BLOQ: [number, number][] = [];
function horasDoDia(exp: Expediente[], data: string): string[] {
  const [a, m, d] = data.split("-").map(Number);
  if (!a) return [];
  const e = exp.find((x) => x.dia === new Date(Date.UTC(a, m - 1, d)).getUTCDay());
  if (!e || !e.ativo) return [];
  const r: string[] = [];
  for (let t = e.ini; t + 50 <= e.fim; t += 60) {
    if (e.pIni != null && e.pFim != null && t < e.pFim && t + 50 > e.pIni) continue;
    const t0 = Date.UTC(a, m - 1, d, Math.floor(t / 60), t % 60) + FUSO;
    if (BLOQ.some(([b0, b1]) => t0 < b1 && t0 + 50 * 60000 > b0)) continue; // bloqueio (férias, feriado…)
    r.push(hm(t));
  }
  return r;
}

function Calendario({ valor, onEscolher, hoje, fechado }: { valor: string; onEscolher: (v: string) => void; hoje: { ano: number; mes: number; dia: number }; fechado?: (iso: string) => boolean }) {
  const [aberto, setAberto] = useState(false);
  const base = valor ? valor.split("-").map(Number) : [hoje.ano, hoje.mes + 1, hoje.dia];
  const [cal, setCal] = useState({ ano: base[0], mes: base[1] - 1 });
  const primeiro = new Date(Date.UTC(cal.ano, cal.mes, 1)).getUTCDay();
  const nDias = new Date(Date.UTC(cal.ano, cal.mes + 1, 0)).getUTCDate();
  const iso = (d: number) => `${cal.ano}-${String(cal.mes + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const txt = valor ? (() => { const [a, m, d] = valor.split("-").map(Number); return `${DS[new Date(Date.UTC(a, m - 1, d)).getUTCDay()]}, ${d} ${MS[m - 1]}`; })() : "Escolher data";
  return (
    <div className="cal-w">
      <button type="button" className={valor ? "cal-b" : "cal-b vaz"} onClick={() => setAberto(!aberto)} aria-haspopup="dialog" aria-expanded={aberto}><Icone nome="calendario" tam={18} /><span>{txt}</span></button>
      {aberto ? (
        <div className="cal" role="dialog" aria-label="Escolher data">
          <div className="cal-h">
            <button type="button" aria-label="Mês anterior" onClick={() => setCal(cal.mes === 0 ? { ano: cal.ano - 1, mes: 11 } : { ano: cal.ano, mes: cal.mes - 1 })}>‹</button>
            <b>{MN[cal.mes]} {cal.ano}</b>
            <button type="button" aria-label="Próximo mês" onClick={() => setCal(cal.mes === 11 ? { ano: cal.ano + 1, mes: 0 } : { ano: cal.ano, mes: cal.mes + 1 })}>›</button>
          </div>
          <div className="cal-g">
            {["D", "S", "T", "Q", "Q", "S", "S"].map((w, i) => <span key={i} className="ds">{w}</span>)}
            {Array.from({ length: primeiro }, (_, i) => <span key={`v${i}`} className="cd vazio" />)}
            {Array.from({ length: nDias }, (_, i) => {
              const d = i + 1;
              const off = !!fechado && fechado(iso(d));
              const cls = ["cd", valor === iso(d) ? "sel" : "", cal.ano === hoje.ano && cal.mes === hoje.mes && d === hoje.dia ? "hoje" : "", (primeiro + i) % 7 === 0 ? "dom" : "", off ? "off" : ""].filter(Boolean).join(" ");
              return <button key={d} type="button" className={cls} disabled={off} onClick={() => { onEscolher(iso(d)); setAberto(false); }}>{d}</button>;
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

type Props = {
  linhas: Linha[]; rotulo: string; ant: string; prox: string; pacientes: Pac[];
  hoje: { ano: number; mes: number; dia: number }; mesAtual: { ano: number; mes: number }; buscaInicial?: string;
  expediente: Expediente[]; bloqueios: [number, number][];
};

export default function Sessoes({ linhas, rotulo, ant, prox, pacientes, hoje, buscaInicial, expediente, bloqueios }: Props) {
  BLOQ = bloqueios;
  const [filtro, setFiltro] = useState<"todas" | "ag" | "pend" | "rec">("todas");
  const [busca, setBusca] = useState(buscaInicial || "");
  const [form, setForm] = useState(false);
  const [adiant, setAdiant] = useState(false);
  const [ad, setAd] = useState({ pacienteId: "", quantas: "4" });
  const [adIds, setAdIds] = useState<string[] | null>(null);
  const [r, setR] = useState({ pacienteId: pacientes[0]?.id || "", data: "", hora: "", status: "agendada" as StatusSessao, valor: pacientes[0]?.valor != null ? String(pacientes[0].valor / 100).replace(".", ",") : "", pago: false });
  const [msg, setMsg] = useState<{ t: string; erro?: boolean; toast?: boolean; desfazer?: { id: string; e: Estado } } | null>(null);
  const [editVal, setEditVal] = useState<{ id: string; v: string } | null>(null);
  const [remarca, setRemarca] = useState<{ l: Linha; data: string; hora: string } | null>(null);
  const [envio, setEnvio] = useState<{ para: string; texto: string } | null>(null);
  const [pend, iniciar] = useTransition();
  const [menu, setMenu] = useState<{ id: string; q: "sessao" | "pag" | "rec"; estilo?: React.CSSProperties } | null>(null);
  // No computador o menu fica fixo na tela (nunca aumenta a página nem empurra o menu lateral) e abre para cima se faltar espaço embaixo.
  const abrirMenu = (e: React.MouseEvent<HTMLElement>, id: string, q: "sessao" | "pag" | "rec") => {
    let estilo: React.CSSProperties | undefined;
    if (window.innerWidth > 760) {
      const r = e.currentTarget.getBoundingClientRect();
      const abaixo = window.innerHeight - r.bottom - 16;
      const acima = r.top - 16;
      const pBaixo = abaixo >= 330 || abaixo >= acima;
      estilo = {
        position: "fixed",
        ...(q === "rec" ? { right: Math.max(8, window.innerWidth - r.right), left: "auto" } : { left: Math.max(8, r.left) }),
        ...(pBaixo ? { top: r.bottom + 6, bottom: "auto", maxHeight: Math.max(200, abaixo) } : { bottom: window.innerHeight - r.top + 6, top: "auto", maxHeight: Math.max(200, acima) }),
      };
    }
    setMenu({ id, q, estilo });
  };
  useEffect(() => {
    if (!menu) return;
    const f = (e: KeyboardEvent) => { if (e.key === "Escape") setMenu(null); };
    const fecha = () => setMenu(null);
    window.addEventListener("keydown", f);
    window.addEventListener("scroll", fecha, true);
    window.addEventListener("resize", fecha);
    return () => { window.removeEventListener("keydown", f); window.removeEventListener("scroll", fecha, true); window.removeEventListener("resize", fecha); };
  }, [menu]);

  const abrirRemarcar = (l: Linha) => {
    const d = loc(l.inicio);
    const data = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    const hs = horasDoDia(expediente, data);
    const h = fmtHora(l.inicio);
    setRemarca({ l, data, hora: hs.includes(h) ? h : hs[0] || "" });
    setEnvio(null);
    setMsg(null);
    setForm(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const hojeIso = `${hoje.ano}-${String(hoje.mes + 1).padStart(2, "0")}-${String(hoje.dia).padStart(2, "0")}`;
  const horasRem = remarca ? horasDoDia(expediente, remarca.data) : [];
  const horasReg = r.data ? horasDoDia(expediente, r.data) : [];
  const pacR = pacientes.find((x) => x.id === r.pacienteId);
  const credR = pacR?.credito || 0;
  const salvarRemarcar = () =>
    remarca &&
    iniciar(async () => {
      const res = await remarcarSessao(remarca.l.id, remarca.data, remarca.hora);
      if (res.erro) return setMsg({ t: res.erro, erro: true });
      setMsg({ t: res.ok! });
      setEnvio({ para: res.para || "", texto: res.texto || "" });
      setRemarca(null);
    });

  const real = linhas.filter((l) => cobra(l.status));
  const aRec = real.filter((l) => !l.pago);
  // Recibo: toda sessão paga (antes ou depois) precisa do seu, menos a cancelada sem crédito.
  const semRecibo = linhas.filter((l) => l.pago && !l.recibo && l.status !== "cancelada");
  const pagas = linhas.filter((l) => l.pago);
  const ags = linhas.filter((l) => l.status === "agendada");
  const soma = (xs: Linha[]) => xs.reduce((a, l) => a + (l.valor || 0), 0);
  // Busca pelo nome (sem acentos) e sempre em ordem de data, da mais recente para a mais antiga.
  const sem = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const termo = sem(busca.trim());
  const lista = (filtro === "pend" ? aRec : filtro === "rec" ? semRecibo : filtro === "ag" ? ags : linhas)
    .filter((l) => !termo || sem(l.nome).includes(termo))
    .sort((a, b) => b.inicio.localeCompare(a.inicio));

  const escolherPac = (id: string) => {
    const p = pacientes.find((x) => x.id === id);
    setR({ ...r, pacienteId: id, hora: p?.hora && (!r.data || horasDoDia(expediente, r.data).includes(p.hora)) ? p.hora : r.hora, valor: p?.valor != null ? String(p.valor / 100).replace(".", ",") : r.valor });
  };

  const mudar = (l: Linha, novo: Estado, aviso: string) =>
    iniciar(async () => {
      const res = await mudarSessao(l.id, novo);
      if (res.erro) return setMsg({ t: res.erro, erro: true });
      if (res.semDesfazer || (res.ok && res.ok !== "Salvo." && novo.status === "cancelada")) return setMsg({ t: res.ok!, toast: true });
      setMsg({ t: aviso, desfazer: { id: l.id, e: { status: l.status, pago: l.pago, recibo: l.recibo } } });
    });

  // O aviso com Desfazer some sozinho depois de 10 segundos.
  useEffect(() => {
    if (!msg?.desfazer && !msg?.toast) return;
    const t = setTimeout(() => setMsg(null), msg.desfazer ? 10000 : 4000);
    return () => clearTimeout(t);
  }, [msg]);

  const salvarAdiantado = () =>
    iniciar(async () => {
      const res = await pagarAdiantado(ad.pacienteId || pacientes[0]?.id || "", Number(ad.quantas));
      if (res.erro) return setMsg({ t: res.erro, erro: true });
      setAdIds(res.ids || []);
      setAdiant(false);
      setMsg({ t: res.ok!, desfazer: { id: "__adiantado", e: { status: "agendada", pago: false, recibo: false } } });
    });

  const desfazer = () =>
    msg?.desfazer &&
    iniciar(async () => {
      if (msg.desfazer!.id === "__adiantado") {
        const res = await desfazerAdiantado(adIds || []);
        setAdIds(null);
        return setMsg(res.erro ? { t: res.erro, erro: true } : { t: "Desfeito. As sessões voltaram para a pagar.", toast: true });
      }
      const res = await mudarSessao(msg.desfazer!.id, msg.desfazer!.e);
      setMsg(res.erro ? { t: res.erro, erro: true } : { t: "Desfeito. A sessão voltou como estava.", toast: true });
    });

  const salvar = () =>
    iniciar(async () => {
      const res = await registrarSessao(r);
      if (res.erro) return setMsg({ t: res.erro, erro: true });
      setMsg({ t: res.ok! });
      setForm(false);
      setR({ ...r, data: "" });
    });

  // Cada estado da sessão é tocável e abre só as opções dele (folha no celular, menu no computador).
  type Op = { t: string; f: () => void; atual?: boolean; perigo?: boolean };
  const opSessao = (l: Linha): Op[] => {
    const st = l.status;
    const ops: Op[] = [
      { t: "Agendada", atual: st === "agendada", f: () => mudar(l, { status: "agendada", pago: l.pago, recibo: l.recibo }, MSG.agendada) },
      { t: "Realizada", atual: st === "realizada", f: () => mudar(l, { status: "realizada", pago: l.pago, recibo: l.recibo }, l.pago ? "Sessão marcada como realizada. Ela já estava paga." : MSG.realizada) },
      { t: "Faltou", atual: st === "falta", f: () => mudar(l, { status: "falta", pago: l.pago, recibo: l.recibo }, MSG.falta) },
      { t: "Cancelou com 24h", atual: st === "cancelada", f: () => mudar(l, { status: "cancelada", pago: false, recibo: false }, MSG.cancelada) },
    ];
    if (st === "agendada") ops.push({ t: "Remarcar", f: () => abrirRemarcar(l) });
    // Excluir só a sessão registrada à mão, agendada e sem pagamento (para não sumir com dinheiro recebido).
    if (l.manual && st === "agendada" && !l.pago) ops.push({ t: "Excluir sessão", perigo: true, f: () => iniciar(async () => { const res = await excluirSessao(l.id); setMsg(res.erro ? { t: res.erro, erro: true } : { t: res.ok! }); }) });
    return ops;
  };
  const opPag = (l: Linha): Op[] | null => {
    if (l.status === "cancelada") return null;
    return l.pago
      ? [{ t: l.recibo ? "Desmarcar pago e recibo" : "Desmarcar pago", f: () => mudar(l, { status: l.status, pago: false, recibo: false }, l.recibo ? `${MSG.despago} O recibo também foi desmarcado.` : MSG.despago) }]
      : [{ t: "Marcar pago", f: () => mudar(l, { status: l.status, pago: true, recibo: false }, MSG.pago) }];
  };
  const opRec = (l: Linha): Op[] | null => {
    if (l.status === "cancelada" || !l.pago) return null;
    return l.recibo
      ? [{ t: "Desmarcar recibo emitido", f: () => mudar(l, { status: l.status, pago: true, recibo: false }, MSG.desrecibo) }]
      : [{ t: "Marcar recibo emitido", f: () => mudar(l, { status: l.status, pago: true, recibo: true }, MSG.recibo) }];
  };
  const chip = (l: Linha, q: "sessao" | "pag" | "rec", texto: string, cls: string, ops: Op[] | null, titulo: string) => {
    if (!ops) return <span className={`est ${cls}`}>{texto}</span>;
    const aberto = menu?.id === l.id && menu.q === q;
    return (
      <span className={`est-w${q === "rec" ? " est-dir" : ""}`}>
        <button type="button" className={`est ${cls}`} disabled={pend} aria-haspopup="menu" aria-expanded={aberto} onClick={(e) => (aberto ? setMenu(null) : abrirMenu(e, l.id, q))}>
          <span>{texto}</span><span className="est-s" aria-hidden="true">▾</span>
        </button>
        {aberto ? (
          <>
            <span className="est-fundo" onClick={() => setMenu(null)} />
            <span className="est-menu" role="menu" aria-label={titulo} style={menu?.estilo}>
              <span className="est-t"><b>{titulo}</b><small>{curto(l.nome)} · {fmtData(l.inicio)}, {fmtHora(l.inicio)}</small></span>
              {ops.map((o) => (
                <button key={o.t} type="button" role="menuitem" className={`${o.atual ? "atual" : ""}${o.perigo ? " perigo" : ""}`} disabled={pend} onClick={() => { setMenu(null); if (!o.atual) o.f(); }}>
                  <span className="ck" aria-hidden="true">{o.atual ? "✓" : ""}</span>{o.t}
                </button>
              ))}
            </span>
          </>
        ) : null}
      </span>
    );
  };
  const estados = (l: Linha) => {
    const [pt, pc] = pg(l);
    const [rt, rcc] = rc(l);
    return [
      chip(l, "sessao", ST_TXT[l.status], ST_CLS[l.status], opSessao(l), "Situação da sessão"),
      chip(l, "pag", pt, pc, opPag(l), "Pagamento"),
      chip(l, "rec", rt, rcc, opRec(l), "Recibo"),
    ];
  };


  const pg = (l: Linha) =>
    l.status === "cancelada" ? (l.pago ? ["Crédito", "pill p-av"] : ["Sem cobrança", "pill p-ne"])
    : l.status === "agendada" ? (l.pago ? ["Pago", "pill p-ok"] : ["A pagar", "pill p-ne"])
    : l.pago ? ["Pago", "pill p-ok"] : ["Pendente", "pill p-av"];
  const rc = (l: Linha) =>
    l.status === "cancelada" || !l.pago ? (l.status === "realizada" || l.status === "falta" ? ["Aguarda pagamento", "pill p-ne"] : ["—", "pill p-ne"])
    : l.recibo ? ["Recibo emitido", "pill p-ok"] : ["Recibo a emitir", "pill p-ur"];
  const valorCel = (l: Linha) =>
    editVal?.id === l.id ? (
      <span className="cel">
        <span className="valor-in" style={{ display: "flex", alignItems: "center", background: "#FFFFFF", border: "1px solid #E2CCD0", borderRadius: 12, paddingLeft: 10, width: 120 }}><span style={{ fontWeight: 700, color: "#8A7A7E" }}>R$</span><input type="text" inputMode="decimal" autoFocus value={editVal.v} onChange={(e) => setEditVal({ id: l.id, v: e.target.value })} style={{ border: 0, boxShadow: "none", width: "100%", minHeight: 36 }} aria-label="Valor da sessão" /></span>
        <button type="button" className="mini" disabled={pend} onClick={() => iniciar(async () => { const res = await mudarValorSessao(l.id, editVal.v); setMsg(res.erro ? { t: res.erro, erro: true } : { t: res.ok! }); if (!res.erro) setEditVal(null); })}>Salvar</button>
      </span>
    ) : (
      <button type="button" onClick={() => setEditVal({ id: l.id, v: l.valor != null ? String(l.valor / 100).replace(".", ",") : "" })} title="Mudar o valor" style={{ font: "inherit", fontWeight: 700, color: "inherit", background: "none", border: 0, padding: 0, cursor: "pointer", whiteSpace: "nowrap" }}>{l.status === "cancelada" ? "—" : l.valor == null ? <span style={{ color: "#A3322A", textDecoration: "underline" }}>Definir valor</span> : brl(l.valor)}</button>
    );
  const tipoTxt = (l: Linha) => `${l.tipo === "crianca" ? "Infantil · presencial" : "Online"} · ${fmtHora(l.inicio)}${l.manual ? " · registrada" : ""}${l.remarcadaDe ? ` · remarcada de ${fmtData(l.remarcadaDe).split(",")[0].toLowerCase()}, ${fmtHora(l.remarcadaDe)}` : ""}`;

  return (
    <>
      <header className="topo"><div><h1>Sessões e <em>pagamentos.</em></h1><div className="data">O que foi atendido, pago e declarado</div></div><div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><button type="button" className="bt2" onClick={() => { setAdiant(true); setForm(false); setRemarca(null); }}><Icone nome="sessoes" tam={18} />Pagamento antecipado</button><button type="button" className="bt" onClick={() => { setForm(true); setAdiant(false); setRemarca(null); }}><Icone nome="mais" tam={18} />Registrar sessão</button></div></header>
      <main className="conteudo">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
          <span className="mes"><Link href={ant} scroll={false} aria-label="Mês anterior" className="mes-b">‹</Link><b>{rotulo}</b><Link href={prox} scroll={false} aria-label="Próximo mês" className="mes-b">›</Link></span>
          <button type="button" className="bt m-only" onClick={() => { setForm(true); setAdiant(false); }}><Icone nome="mais" tam={18} />Registrar sessão</button>
          <button type="button" className="bt2 m-only" onClick={() => { setAdiant(true); setForm(false); }}><Icone nome="sessoes" tam={18} />Pagamento antecipado</button>
        </div>

        {msg && !msg.desfazer && !msg.toast ? (
          <div className={msg.erro ? "aviso erro" : "aviso ok"} role="status">{msg.t}</div>
        ) : null}
        {/* Depois de marcar uma sessão, o aviso aparece embaixo da tela, perto de onde a pessoa está, com Desfazer. */}
        {msg?.desfazer || msg?.toast ? (
          <div className="toast" role="status" style={{ gap: 14 }}>
            <span style={{ fontWeight: 500 }}>{msg.t}</span>
            {msg.desfazer ? <button type="button" onClick={desfazer} disabled={pend} style={{ font: "inherit", fontSize: 14, fontWeight: 700, color: "#F2C9D1", background: "transparent", border: "1.5px solid rgba(242,201,209,.6)", borderRadius: 999, padding: "6px 14px", cursor: "pointer", whiteSpace: "nowrap" }}>Desfazer</button> : null}
          </div>
        ) : null}

        {envio && envio.texto ? (
          <div className="caixa ok" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={{ fontSize: 14, color: "#3A1F25" }}>Avise o novo horário. A mensagem já está pronta:</span>
            <div className="prev">{envio.texto}</div>
            <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {envio.para ? <a href={waLink(envio.para, envio.texto)} target="_blank" rel="noopener" className="bt" style={{ width: "auto" }}><Icone nome="whats" tam={18} />Abrir no WhatsApp</a> : <span style={{ fontSize: 13, color: "#A3322A" }}>Sem WhatsApp cadastrado.</span>}
              <button type="button" className="bt3" onClick={() => setEnvio(null)}>Fechar</button>
            </span>
          </div>
        ) : null}

        {remarca ? (
          <section className="card">
            <div className="form-c" style={{ background: "transparent", padding: 0 }}>
              <h2 className="card-t"><Icone nome="calendario" tam={20} />Remarcar sessão</h2>
              <span style={{ fontSize: 14, color: "#5A3A41" }}><b>{curto(remarca.l.nome)}</b> · hoje marcada para {fmtData(remarca.l.inicio)}, {fmtHora(remarca.l.inicio)}. Só esta sessão muda: as próximas continuam no horário fixo.</span>
              <div className="fc"><span className="lb">Novo dia e horário</span>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 110px", gap: 8, maxWidth: 460 }}>
                  <Calendario valor={remarca.data} onEscolher={(v) => { const hs = horasDoDia(expediente, v); setRemarca({ ...remarca, data: v, hora: hs.includes(remarca.hora) ? remarca.hora : hs[0] || "" }); }} hoje={hoje} fechado={(v) => v < hojeIso || !horasDoDia(expediente, v).length} />
                  <select value={remarca.hora} onChange={(e) => setRemarca({ ...remarca, hora: e.target.value })} aria-label="Novo horário" disabled={!horasRem.length}>
                    {horasRem.length ? horasRem.map((h) => <option key={h} value={h}>{h}</option>) : <option value="">—</option>}
                  </select>
                </div>
                <span style={{ fontSize: 13, color: "#8A7A7E" }}>{horasRem.length ? `Só aparecem os dias e horários da sua disponibilidade. Conflitos com outras sessões e com a agenda do Google são conferidos ao remarcar.` : "Nesse dia você não atende. Escolha outro dia no calendário."}</span>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button type="button" className="bt" onClick={salvarRemarcar} disabled={pend} style={{ width: "auto" }}>{pend ? "Remarcando…" : "Remarcar sessão"}</button>
                <button type="button" className="bt3" onClick={() => setRemarca(null)}>Cancelar</button>
              </div>
            </div>
          </section>
        ) : null}

        {adiant ? (
          <section className="card">
            <div className="form-c" style={{ background: "transparent", padding: 0 }}>
              <h2 className="card-t"><Icone nome="sessoes" tam={20} />Pagamento antecipado</h2>
              <span style={{ fontSize: 14, color: "#5A3A41" }}>Quando a pessoa paga várias sessões de uma vez: as próximas sessões agendadas dela ficam como pagas, na ordem das datas.</span>
              <div className="fc-g">
                <div className="fc"><label htmlFor="ad-pac">Paciente</label>
                  <select id="ad-pac" value={ad.pacienteId || pacientes[0]?.id || ""} onChange={(e) => setAd({ ...ad, pacienteId: e.target.value })}>
                    {pacientes.map((p) => <option key={p.id} value={p.id}>{curto(p.nome)}</option>)}
                  </select>
                </div>
                <div className="fc"><label htmlFor="ad-n">Quantas sessões</label>
                  <select id="ad-n" value={ad.quantas} onChange={(e) => setAd({ ...ad, quantas: e.target.value })}>
                    {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((n) => <option key={n} value={n}>{n} {n === "1" ? "sessão" : "sessões"}</option>)}
                  </select>
                </div>
              </div>
              {(() => {
                const p = pacientes.find((x) => x.id === (ad.pacienteId || pacientes[0]?.id));
                return p?.valor != null ? <span style={{ fontSize: 14, color: "#5A3A41" }}>Total: <b>{reais(p.valor * Number(ad.quantas))}</b> ({ad.quantas} × {reais(p.valor)})</span> : null;
              })()}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button type="button" className="bt" onClick={salvarAdiantado} disabled={pend || !pacientes.length} style={{ width: "auto" }}>{pend ? "Salvando…" : "Registrar pagamento"}</button>
                <button type="button" className="bt3" onClick={() => setAdiant(false)}>Cancelar</button>
              </div>
            </div>
          </section>
        ) : null}

        {form ? (
          <section className="card">
            <div className="form-c" style={{ background: "transparent", padding: 0 }}>
              <h2 className="card-t"><Icone nome="sessoes" tam={20} />Registrar sessão</h2>
              <div className="fc-g">
                <div className="fc"><label htmlFor="r-pac">Paciente</label>
                  <select id="r-pac" value={r.pacienteId} onChange={(e) => escolherPac(e.target.value)}>
                    {pacientes.map((p) => <option key={p.id} value={p.id}>{curto(p.nome)}</option>)}
                  </select>
                </div>
                <div className="fc"><span className="lb">Data e horário</span>
                  <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 110px", gap: 8 }}>
                    <Calendario valor={r.data} onEscolher={(v) => { const hs = horasDoDia(expediente, v); const fixa = pacientes.find((x) => x.id === r.pacienteId)?.hora; setR({ ...r, data: v, hora: hs.includes(r.hora) ? r.hora : fixa && hs.includes(fixa) ? fixa : hs[0] || "" }); }} hoje={hoje} fechado={(v) => !horasDoDia(expediente, v).length} />
                    <select value={r.hora} onChange={(e) => setR({ ...r, hora: e.target.value })} aria-label="Horário" disabled={!horasReg.length}>
                      {horasReg.length ? horasReg.map((h) => <option key={h} value={h}>{h}</option>) : <option value="">—</option>}
                    </select>
                  </div>
                  <span style={{ fontSize: 13, color: "#8A7A7E" }}>{r.data ? "Só aparecem os dias e horários da sua disponibilidade." : "Escolha o dia: os dias em que você não atende ficam riscados."}</span>
                </div>
              </div>
              <div className="fc"><span className="lb">Situação</span>
                <div className="seg">{(["agendada", "realizada", "falta", "cancelada"] as StatusSessao[]).map((k) => <button key={k} type="button" className={r.status === k ? "on" : ""} onClick={() => setR({ ...r, status: k })}>{ST_TXT[k]}</button>)}</div>
              </div>
              <div className="fc-g">
                <div className="fc"><label htmlFor="r-val">Valor</label><div className="valor-in" style={{ display: "flex", alignItems: "center", background: "#FFFFFF", border: "1px solid #E2CCD0", borderRadius: 12, paddingLeft: 12 }}><span style={{ fontWeight: 700, color: "#8A7A7E" }}>R$</span><input id="r-val" type="text" inputMode="decimal" value={r.valor} onChange={(e) => setR({ ...r, valor: e.target.value })} style={{ border: 0, boxShadow: "none" }} /></div></div>
                {r.status !== "cancelada" ? (
                  credR ? (
                    <div className="fc"><span className="lb">Pagamento</span><span className="pill p-ok" style={{ alignSelf: "flex-start" }}>Paga com crédito</span><span style={{ fontSize: 13, color: "#5A3A41" }}>{curto(pacR?.nome || "")} tem {credR === 1 ? "1 sessão" : `${credR} sessões`} em crédito (cancelada já paga). Esta sessão fica paga com ele, sem contar de novo no Recebido.</span></div>
                  ) : <div className="fc"><span className="lb">{r.status === "agendada" ? "Já está paga?" : "Pagamento"}</span><div className="seg">{[["Pago", true], ["Pendente", false]].map(([n, v]) => <button key={String(n)} type="button" className={r.pago === v ? "on" : ""} onClick={() => setR({ ...r, pago: v as boolean })}>{n as string}</button>)}</div></div>
                ) : null}
              </div>
              {!pacientes.length ? <span style={{ fontSize: 14, color: "#A3322A" }}>Nenhum paciente ativo. Cadastre em <Link href="/painel/pacientes?novo=1">Pacientes</Link>.</span> : null}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button type="button" className="bt" onClick={salvar} disabled={pend || !pacientes.length} style={{ width: "auto" }}>{pend ? "Salvando…" : "Salvar sessão"}</button>
                <button type="button" className="bt3" onClick={() => setForm(false)}>Cancelar</button>
              </div>
            </div>
          </section>
        ) : null}

        <div className="nums">
          <div className="num"><span className="rot">Sessões cobradas</span><b>{real.length}</b><span className="l">realizadas e faltas</span></div>
          <div className="num"><span className="rot">Recebido</span><b>{reais(soma(pagas)) || "R$ 0"}</b><span className="l">Pix</span></div>
          <div className="num"><span className="rot">A receber</span><b>{reais(soma(aRec)) || "R$ 0"}</b><span className="l">{aRec.length} {aRec.length === 1 ? "sessão pendente" : "sessões pendentes"}</span></div>
          <div className="num"><span className="rot">Recibos</span><b>{semRecibo.length}</b><span className="l">a emitir no Receita Saúde</span></div>
        </div>

        <div className="fluxo"><span style={{ color: "#7A2335", flex: "0 0 auto", marginTop: 2 }}><Icone nome="horarios" tam={18} /></span><span><b>Como uma sessão anda por aqui:</b> ela começa como <b>agendada</b> (pagamento &quot;a pagar&quot;). O Pix pode vir antes ou depois: toque em <b>Marcar pago</b> quando cair na sua conta, ou use <b>Pagamento antecipado</b> quando a pessoa pagar várias sessões de uma vez. No dia, você marca <b>realizada</b>, <b>falta</b> ou <b>cancelada com 24h</b> (se ela já estava paga, o pagamento vira <b>crédito</b> e paga sozinho a próxima sessão em aberto, ou a próxima que for marcada, sem contar de novo no Recebido). Depois de emitir o recibo no Receita Saúde, toque em <b>Marcar emitido</b>. As sessões do horário fixo de cada paciente aparecem sozinhas.</span></div>

        <div className="rs">
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <span style={{ flex: "0 0 auto", width: 48, height: 48, borderRadius: "50%", background: "#F6E5E7", color: "#7A2335", display: "flex", alignItems: "center", justifyContent: "center" }}><Icone nome="termos" tam={22} /></span>
            <span style={{ display: "flex", flexDirection: "column" }}><b style={{ fontSize: 17 }}>Recibos do Receita Saúde</b><span style={{ fontSize: 14, color: "#5A3A41" }}>Toda sessão paga precisa de recibo emitido no Receita Saúde. Emita lá e marque aqui para não esquecer nenhum.</span></span>
          </div>
          <a href="https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/auditoria-fiscal/conformidade/perguntas-e-respostas-receita-saude" target="_blank" rel="noopener" className="bt2" style={{ width: "auto" }}><Icone nome="site" tam={18} />Abrir o Receita Saúde</a>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <label className="busca"><Icone nome="busca" tam={18} /><span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Buscar paciente</span><input type="search" placeholder="Buscar pelo nome do paciente" value={busca} onChange={(e) => setBusca(e.target.value)} /></label>
        <div className="filtros" role="group" aria-label="Filtrar sessões">
          {([["todas", "Todas", linhas.length], ["ag", "Agendadas", ags.length], ["pend", "A receber", aRec.length], ["rec", "Recibo a emitir", semRecibo.length]] as const).map(([k, n, c]) => (
            <button key={k} type="button" className={filtro === k ? "fi on" : "fi"} aria-pressed={filtro === k} onClick={() => setFiltro(k)}>{n} <b>{c}</b></button>
          ))}
        </div>
        </div>

        <section className="card lista-s" style={{ padding: "20px 12px 8px" }}>
          <table className="tab-s">
            <thead><tr><th>Data</th><th>Paciente</th><th>Sessão</th><th>Valor</th><th>Pagamento</th><th>Recibo</th></tr></thead>
            <tbody>
              {lista.map((l) => {
                const [e1, e2, e3] = estados(l);
                return (
                  <tr key={l.id}>
                    <td style={{ whiteSpace: "nowrap", fontWeight: 600 }}>{fmtData(l.inicio)}</td>
                    <td><span className="pac"><b>{curto(l.nome)}</b><small>{tipoTxt(l)}</small></span></td>
                    <td>{e1}</td>
                    <td className="v">{valorCel(l)}</td>
                    <td>{e2}</td>
                    <td>{e3}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="cards-s">
            {lista.map((l) => {
              const [e1, e2, e3] = estados(l);
              return (
              <div className="cs" key={l.id}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}><span className="pac"><b>{curto(l.nome)}</b><small>{fmtData(l.inicio)} · {tipoTxt(l)}</small></span><b>{valorCel(l)}</b></div>
                <div className="est-g">{e1}{e2}{e3}</div>
              </div>
              );
            })}
          </div>
          {!lista.length ? <p style={{ margin: 0, padding: "24px 12px 28px", textAlign: "center", color: "#6B5A5E" }}><b style={{ display: "block", color: "#2F6A45", fontSize: 17, marginBottom: 4 }}>Nada por aqui.</b>{linhas.length ? busca.trim() ? `Nenhuma sessão de "${busca.trim()}" nesta lista.` : "Nenhuma sessão nesta lista." : "Nenhuma sessão neste mês. As do horário fixo de cada paciente aparecem sozinhas."}</p> : null}
        </section>
      </main>
    </>
  );
}
