import Link from "next/link";
import Casca from "../Casca";
import PedidoSessao from "../PedidoSessao";
import { exigirAcesso, ROTA } from "../../lib/pacienteAuth";
import { supabaseAdmin } from "../../lib/supabase/admin";
import { sessoesDoPaciente, pedidosDoPaciente } from "../../lib/pacienteDados";
import { fmtDiaLongo, fmtHora, local } from "../../lib/agenda";
import { fixoTexto } from "../../lib/formato";
import { linkWhatsApp } from "../../conteudo";

export const dynamic = "force-dynamic";

const FILTROS = [
  { id: "todas", t: "Todas" },
  { id: "realizadas", t: "Realizadas" },
  { id: "faltas", t: "Faltas" },
  { id: "remarcadas", t: "Remarcadas" },
] as const;
const SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export default async function Sessoes({ searchParams }: { searchParams: Promise<{ p?: string; f?: string }> }) {
  const q = await searchParams;
  const ctx = await exigirAcesso(q.p);
  const p = ctx.atual;
  const sb = supabaseAdmin();
  const [sessoes, pedidos] = await Promise.all([sessoesDoPaciente(sb, p.id), pedidosDoPaciente(sb, p.id)]);
  const agora = Date.now();
  const filtro = FILTROS.find((x) => x.id === q.f)?.id ?? "todas";
  const proximas = sessoes.filter((s) => s.status === "agendada" && new Date(s.inicio).getTime() >= agora - 3600000);
  const idsProx = new Set(proximas.map((s) => s.id));
  let historico = sessoes.filter((s) => !idsProx.has(s.id)).reverse();
  if (filtro === "realizadas") historico = historico.filter((s) => s.status === "realizada");
  if (filtro === "faltas") historico = historico.filter((s) => s.status === "falta");
  if (filtro === "remarcadas") historico = historico.filter((s) => !!s.remarcada_de);
  const pedidoDe = (id: string) => pedidos.find((x) => x.sessao_id === id)?.tipo ?? null;
  const varios = ctx.pacientes.length > 1;
  const wa = linkWhatsApp("Olá, Ritieli! Preciso combinar sobre a minha sessão.");
  const pill = (s: (typeof sessoes)[number]) =>
    s.status === "realizada" ? { c: "pill p-ok", t: "Realizada" } : s.status === "falta" ? { c: "pill p-ur", t: "Falta" } : s.status === "cancelada" ? { c: "pill p-ne", t: "Cancelada" } : { c: "pill p-on", t: "Confirmada" };

  return (
    <Casca ctx={ctx} aba="sessoes">
      <div className="pag-h"><h1>Suas <em>sessões.</em></h1><p>{p.fixo_dia != null ? `Horário combinado: ${fixoTexto(p.fixo_dia, p.fixo_hora)}.` : "Horário a combinar com a Ritieli."}</p></div>

      <section className="card" aria-labelledby="sp-t">
        <h2 className="card-t" id="sp-t">Próximas</h2>
        {proximas.length ? (
          <div className="lista">
            {proximas.map((s) => {
              const d = new Date(s.inicio);
              const l = local(d);
              const ped = pedidoDe(s.id);
              return (
                <div className="item" key={s.id}>
                  <div className="dt"><span className="d1">{SEMANA[l.semana]}</span><span className="d2">{l.dia}</span></div>
                  <div className="it-t"><b>{fmtDiaLongo(d)}</b><span>{fmtHora(d)}</span></div>
                  {ped ? null : <span className="pill p-on">Confirmada</span>}
                  <div className="item-ac" style={{ flex: "1 1 100%" }}>
                    <PedidoSessao pacienteId={p.id} sessaoId={s.id} pedido={ped} menos24h={d.getTime() - agora < 24 * 3600000} whatsapp={wa} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : <p style={{ margin: 0, color: "#6B5A5E" }}>Não há sessões marcadas no momento.</p>}
      </section>

      <section className="regras" style={{ marginTop: 20 }} aria-labelledby="sc-t">
        <h2 className="card-t" id="sc-t">Nossos combinados</h2>
        <ul>
          <li>Remarcações e cancelamentos precisam ser pedidos com pelo menos 24 horas de antecedência.</li>
          <li>Cancelamento com menos de 24 horas é considerado falta, e faltas sem desmarcação são cobradas como sessão realizada.</li>
          <li>Aqui você faz o pedido e a Ritieli confirma com você.</li>
        </ul>
        <Link href={`${ROTA}/meus-dados${varios ? `?p=${p.id}` : ""}`} className="bt3" style={{ alignSelf: "flex-start" }}>Ver o termo de consentimento</Link>
      </section>

      <section className="card" style={{ marginTop: 20 }} aria-labelledby="sh-t">
        <div className="card-h">
          <h2 className="card-t" id="sh-t">Histórico</h2>
          <div className="pa-chips" role="group" aria-label="Filtrar histórico">
            {FILTROS.map((f) => <Link key={f.id} className={f.id === filtro ? "pa-chip on" : "pa-chip"} style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }} href={`${ROTA}/sessoes?${varios ? `p=${p.id}&` : ""}f=${f.id}`}>{f.t}</Link>)}
          </div>
        </div>
        {historico.length ? (
          <div className="lista">
            {historico.slice(0, 60).map((s) => {
              const d = new Date(s.inicio);
              const l = local(d);
              const pl = pill(s);
              return (
                <div className="item" key={s.id}>
                  <div className="dt pas"><span className="d1">{SEMANA[l.semana]}</span><span className="d2">{l.dia}</span></div>
                  <div className="it-t"><b>{fmtDiaLongo(d)}</b><span>{fmtHora(d)}{s.remarcada_de ? " · remarcada" : ""}</span></div>
                  <span className={pl.c}>{pl.t}</span>
                </div>
              );
            })}
          </div>
        ) : <p style={{ margin: 0, color: "#6B5A5E" }}>Nada por aqui ainda.</p>}
      </section>
    </Casca>
  );
}
