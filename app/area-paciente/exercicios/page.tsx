import Link from "next/link";
import Casca from "../Casca";
import { exigirAcesso, ROTA } from "../../lib/pacienteAuth";
import { supabaseAdmin } from "../../lib/supabase/admin";
import { exerciciosDoPaciente } from "../../lib/exercicios";

export const dynamic = "force-dynamic";

const dia = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "numeric", month: "long" }).format(new Date(iso.length === 10 ? iso + "T12:00:00Z" : iso));
const hoje = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(new Date());

export default async function Exercicios({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const q = await searchParams;
  const ctx = await exigirAcesso(q.p);
  const p = ctx.atual;
  const todos = await exerciciosDoPaciente(supabaseAdmin(), p.id);
  const abertos = todos.filter((x) => !x.concluidoEm);
  const feitos = todos.filter((x) => x.concluidoEm);
  const sufixo = ctx.pacientes.length > 1 ? `?p=${p.id}` : "";
  const h = hoje();
  const item = (x: (typeof todos)[number]) => (
    <Link key={x.id} href={`${ROTA}/exercicios/${x.id}${sufixo}`} className="card" style={{ display: "flex", flexDirection: "column", gap: 6, textDecoration: "none", color: "inherit" }}>
      <b style={{ fontSize: 17 }}>{x.titulo}</b>
      <span style={{ fontSize: 14, color: "#6B5A5E" }}>
        {x.concluidoEm ? `Feito em ${dia(x.concluidoEm)}` : x.prazo ? (x.prazo < h ? `Prazo combinado: ${dia(x.prazo)}` : `Até ${dia(x.prazo)}`) : "Sem prazo"}
        {x.anexos.length ? ` · ${x.anexos.length} anexo${x.anexos.length > 1 ? "s" : ""}` : ""}
      </span>
    </Link>
  );
  return (
    <Casca ctx={ctx} aba="exercicios">
      <div className="pag-h"><h1>Seus <em>exercícios.</em></h1><p>O que a Ritieli combinou com você entre uma sessão e outra.</p></div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {abertos.length ? abertos.map(item) : <section className="card"><p style={{ margin: 0, color: "#6B5A5E" }}>Nenhum exercício em andamento.</p></section>}
      </div>
      {feitos.length ? (
        <section style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 12 }} aria-labelledby="ex-h">
          <h2 className="card-t" id="ex-h">Histórico</h2>
          {feitos.map(item)}
        </section>
      ) : null}
    </Casca>
  );
}
