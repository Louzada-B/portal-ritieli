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
type Pac = { id: string; nome: string; valor: number | null; hora: string | null };
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
  recibo: "Recibo marcado como emitido.",
};
const HORAS = Array.from({ length: 15 }, (_, i) => `${String(i + 7).padStart(2, "0")}:00`);

function Calendario({ valor, onEscolher, hoje }: { valor: string; onEscolher: (v: string) => void; hoje: { ano: number; mes: number; dia: number } }) {
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
              const cls = ["cd", valor === iso(d) ? "sel" : "", cal.ano === hoje.ano && cal.mes === hoje.mes && d === hoje.dia ? "hoje" : "", (primeiro + i) % 7 === 0 ? "dom" : ""].filter(Boolean).join(" ");
              return <button key={d} type="button" className={cls} onClick={() => { onEscolher(iso(d)); setAberto(false); }}>{d}</button>;
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

type Props = {
  linhas: Linha[]; rotulo: string; ant: string; prox: string; pacientes: Pac[];
  hoje: { ano: number; mes: number; dia: number }; mesAtual: { ano: number; mes: number };
};

export default function Sessoes({ linhas, rotulo, ant, prox, pacientes, hoje }: Props) {
  const [filtro, setFiltro] = useState<"todas" | "ag" | "pend" | "rec">("todas");
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState(false);
  const [adiant, setAdiant] = useState(false);
  const [ad, setAd] = useState({ pacienteId: "", quantas: "4" });
  const [adIds, setAdIds] = useState<string[] | null>(null);
  const [r, setR] = useState({ pacienteId: pacientes[0]?.id || "", data: "", hora: pacientes[0]?.hora || "08:00", status: "agendada" as StatusSessao, valor: pacientes[0]?.valor != null ? String(pacientes[0].valor / 100).replace(".", ",") : "", pago: false });
  const [msg, setMsg] = useState<{ t: string; erro?: boolean; toast?: boolean; desfazer?: { id: string; e: Estado } } | null>(null);
  const [editVal, setEditVal] = useState<{ id: string; v: string } | null>(null);
  const [remarca, setRemarca] = useState<{ l: Linha; data: string; hora: string } | null>(null);
  const [envio, setEnvio] = useState<{ para: string; texto: string } | null>(null);
  const [pend, iniciar] = useTransition();

  const abrirRemarcar = (l: Linha) => {
    const d = loc(l.inicio);
    setRemarca({ l, data: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`, hora: fmtHora(l.inicio) });
    setEnvio(null);
    setMsg(null);
    setForm(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
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
    setR({ ...r, pacienteId: id, hora: p?.hora || r.hora, valor: p?.valor != null ? String(p.valor / 100).replace(".", ",") : r.valor });
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

  const acoes = (l: Linha, longo: boolean) => {
    const ag = l.status === "agendada";
    // Pagar vale antes (antecipado) ou depois da sessão.
    const podePagar = l.status !== "cancelada" && !l.pago;
    const podeEmitir = l.status !== "cancelada" && l.pago && !l.recibo;
    const sessao = ag ? (
      <>
        <button type="button" className="mini" disabled={pend} onClick={() => mudar(l, { status: "realizada", pago: l.pago, recibo: l.recibo }, l.pago ? "Sessão marcada como realizada. Ela já estava paga." : MSG.realizada)}>Realizada</button>
        <button type="button" className="mini" disabled={pend} onClick={() => mudar(l, { status: "falta", pago: l.pago, recibo: l.recibo }, MSG.falta)}>Faltou</button>
        <button type="button" className="mini" disabled={pend} onClick={() => mudar(l, { status: "cancelada", pago: false, recibo: false }, MSG.cancelada)}>{longo ? "Cancelou com 24h" : "Cancelou"}</button>
        <button type="button" className="mini" disabled={pend} onClick={() => abrirRemarcar(l)}>Remarcar</button>
      </>
    ) : null;
    return {
      ag, podePagar, podeEmitir, tem: ag || podePagar || podeEmitir, sessao,
      nodos: (
        <>
          {sessao}
          {podePagar ? <button type="button" className="mini" disabled={pend} onClick={() => mudar(l, { status: l.status, pago: true, recibo: false }, MSG.pago)}>Marcar pago</button> : null}
          {podeEmitir ? <button type="button" className="mini" disabled={pend} onClick={() => mudar(l, { status: l.status, pago: true, recibo: true }, MSG.recibo)}>{longo ? "Marcar recibo emitido" : "Marcar emitido"}</button> : null}
        </>
      ),
    };
  };


  const pg = (l: Linha) =>
    l.status === "cancelada" ? (l.pago ? ["Crédito", "pill p-av"] : ["Sem cobrança", "pill p-ne"])
    : l.status === "agendada" ? (l.pago ? ["Pago antecipado", "pill p-ok"] : ["A pagar", "pill p-ne"])
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
                  <Calendario valor={remarca.data} onEscolher={(v) => setRemarca({ ...remarca, data: v })} hoje={hoje} />
                  <select value={remarca.hora} onChange={(e) => setRemarca({ ...remarca, hora: e.target.value })} aria-label="Novo horário">
                    {(HORAS.includes(remarca.hora) ? HORAS : [...HORAS, remarca.hora].sort()).map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
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
                    <Calendario valor={r.data} onEscolher={(v) => setR({ ...r, data: v })} hoje={hoje} />
                    <select value={r.hora} onChange={(e) => setR({ ...r, hora: e.target.value })} aria-label="Horário">
                      {(HORAS.includes(r.hora) ? HORAS : [...HORAS, r.hora].sort()).map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="fc"><span className="lb">Situação</span>
                <div className="seg">{(["agendada", "realizada", "falta", "cancelada"] as StatusSessao[]).map((k) => <button key={k} type="button" className={r.status === k ? "on" : ""} onClick={() => setR({ ...r, status: k })}>{ST_TXT[k]}</button>)}</div>
              </div>
              <div className="fc-g">
                <div className="fc"><label htmlFor="r-val">Valor</label><div className="valor-in" style={{ display: "flex", alignItems: "center", background: "#FFFFFF", border: "1px solid #E2CCD0", borderRadius: 12, paddingLeft: 12 }}><span style={{ fontWeight: 700, color: "#8A7A7E" }}>R$</span><input id="r-val" type="text" inputMode="decimal" value={r.valor} onChange={(e) => setR({ ...r, valor: e.target.value })} style={{ border: 0, boxShadow: "none" }} /></div></div>
                {r.status !== "cancelada" ? (
                  <div className="fc"><span className="lb">{r.status === "agendada" ? "Já está paga?" : "Pagamento"}</span><div className="seg">{[["Pago", true], ["Pendente", false]].map(([n, v]) => <button key={String(n)} type="button" className={r.pago === v ? "on" : ""} onClick={() => setR({ ...r, pago: v as boolean })}>{n as string}</button>)}</div></div>
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
          <div className="num"><span className="rot">Recebido</span><b>{reais(soma(pagas)) || "R$ 0"}</b><span className="l">Pix{pagas.some((l) => l.status === "agendada") ? ", com antecipados" : ""}</span></div>
          <div className="num"><span className="rot">A receber</span><b>{reais(soma(aRec)) || "R$ 0"}</b><span className="l">{aRec.length} {aRec.length === 1 ? "sessão pendente" : "sessões pendentes"}</span></div>
          <div className="num"><span className="rot">Recibos</span><b>{semRecibo.length}</b><span className="l">a emitir no Receita Saúde</span></div>
        </div>

        <div className="fluxo"><span style={{ color: "#7A2335", flex: "0 0 auto", marginTop: 2 }}><Icone nome="horarios" tam={18} /></span><span><b>Como uma sessão anda por aqui:</b> ela começa como <b>agendada</b> (pagamento &quot;a pagar&quot;). O Pix pode vir antes ou depois: toque em <b>Marcar pago</b> quando cair na sua conta, ou use <b>Pagamento antecipado</b> quando a pessoa pagar várias sessões de uma vez. No dia, você marca <b>realizada</b>, <b>falta</b> ou <b>cancelada com 24h</b> (se ela já estava paga, o pagamento passa para a próxima sessão). Depois de emitir o recibo no Receita Saúde, toque em <b>Marcar emitido</b>. As sessões do horário fixo de cada paciente aparecem sozinhas.</span></div>

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
                const a = acoes(l, false);
                const [pt, pc] = pg(l);
                const [rt, rcc] = rc(l);
                return (
                  <tr key={l.id}>
                    <td style={{ whiteSpace: "nowrap", fontWeight: 600 }}>{fmtData(l.inicio)}</td>
                    <td><span className="pac"><b>{curto(l.nome)}</b><small>{tipoTxt(l)}</small></span></td>
                    <td><span className="cel"><span className={ST_CLS[l.status]}>{ST_TXT[l.status]}</span>{a.sessao}</span></td>
                    <td className="v">{valorCel(l)}</td>
                    <td><span className="cel"><span className={pc}>{pt}</span>{a.podePagar ? <button type="button" className="mini" disabled={pend} onClick={() => mudar(l, { status: l.status, pago: true, recibo: false }, MSG.pago)}>Marcar pago</button> : null}</span></td>
                    <td><span className="cel"><span className={rcc}>{rt}</span>{a.podeEmitir ? <button type="button" className="mini" disabled={pend} onClick={() => mudar(l, { status: l.status, pago: true, recibo: true }, MSG.recibo)}>Marcar emitido</button> : null}{l.manual && l.status === "agendada" ? <button type="button" className="mini" disabled={pend} onClick={() => iniciar(async () => { const res = await excluirSessao(l.id); setMsg(res.erro ? { t: res.erro, erro: true } : { t: res.ok! }); })} aria-label="Excluir sessão registrada">Excluir</button> : null}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="cards-s">
            {lista.map((l) => {
              const a = acoes(l, true);
              const [pt, pc] = pg(l);
              const [rt, rcc] = rc(l);
              return (
                <div className="cs" key={l.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}><span className="pac"><b>{curto(l.nome)}</b><small>{fmtData(l.inicio)} · {tipoTxt(l)}</small></span><b>{valorCel(l)}</b></div>
                  <div className="cel"><span className={ST_CLS[l.status]}>{ST_TXT[l.status]}</span><span className={pc}>{pt}</span><span className={rcc}>{rt}</span></div>
                  {a.tem || (l.manual && l.status === "agendada") ? <div className="cel">{a.nodos}{l.manual && l.status === "agendada" ? <button type="button" className="mini" disabled={pend} onClick={() => iniciar(async () => { const res = await excluirSessao(l.id); setMsg(res.erro ? { t: res.erro, erro: true } : { t: res.ok! }); })}>Excluir</button> : null}</div> : null}
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
