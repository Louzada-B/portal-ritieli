import Link from "next/link";
import { supabaseServidor } from "../../../lib/supabase/servidor";
import { carregarAgenda, periodos, PRAZO_HORAS, type Pedido } from "../../../lib/dados";
import { horariosLivres, fmtQuando } from "../../../lib/agenda";
import { TopoCelular } from "../../componentes/Navegacao";
import Detalhe from "./Detalhe";

export const dynamic = "force-dynamic";

const FILTROS = [
  ["aguardando", "Aguardando"],
  ["confirmado", "Confirmados"],
  ["recusado", "Recusados"],
  ["liberado", "Liberados"],
] as const;

const ST: Record<Pedido["status"], [string, string]> = {
  aguardando: ["Aguardando você", "pill p-av"],
  confirmado: ["Confirmado", "pill p-ok"],
  recusado: ["Recusado", "pill p-ne"],
  liberado: ["Liberado", "pill p-ne"],
};

const iniciais = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]!.toUpperCase()).join("");

function haQuanto(iso: string) {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  if (h < 1) return "há poucos minutos";
  if (h < 24) return `há ${h} ${h === 1 ? "hora" : "horas"}`;
  const d = Math.floor(h / 24);
  return `há ${d} ${d === 1 ? "dia" : "dias"}`;
}

function prazo(p: Pedido) {
  const resta = PRAZO_HORAS - (Date.now() - new Date(p.criado_em).getTime()) / 3600000;
  return { txt: `Responder em ${Math.max(0, Math.floor(resta))}h`, urg: resta < 24 };
}

export default async function Pedidos({ searchParams }: { searchParams: Promise<{ f?: string; id?: string }> }) {
  const q = await searchParams;
  const sb = await supabaseServidor();
  const { data } = await sb.from("pedidos").select("*").order("criado_em", { ascending: false }).limit(300);
  const todos = (data ?? []) as Pedido[];
  const filtro = (FILTROS.find(([k]) => k === q.f)?.[0] ?? "aguardando") as Pedido["status"];
  const lista = todos.filter((p) => p.status === filtro).sort((a, b) => (filtro === "aguardando" ? a.criado_em.localeCompare(b.criado_em) : 0));
  const sel = (q.id && todos.find((p) => p.id === q.id)) || lista[0];
  const conta = (k: string) => todos.filter((p) => p.status === k).length;

  let sugestoes: { iso: string; rot: string }[] = [];
  if (sel?.status === "aguardando") {
    const { regras, tomados, google: g } = await carregarAgenda(sb);
    sugestoes = horariosLivres({ config: regras.config, semana: regras.semana, bloqueios: periodos(regras.bloqueios), ocupados: [...tomados, ...g.periodos] })
      .map((d) => ({ iso: d.toISOString(), rot: fmtQuando(d) }));
  }

  // E-mail de confirmação já enviado para a pessoa? (só quando o pedido está confirmado)
  let emailEm: string | null = null;
  if (sel?.status === "confirmado") {
    const { data: env } = await sb.from("envios_email").select("enviado_em").eq("tipo", "confirmacao_conversa").like("chave", `${sel.id}:%`).limit(1).maybeSingle();
    if (env) emailEm = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(env.enviado_em));
  }

  const esperando = conta("aguardando");
  return (
    <>
      <header className="topo"><div><h1>Pedidos de <em>conversa.</em></h1><div className="data">Conversas iniciais pedidas pela agenda do site</div></div></header>
      <TopoCelular titulo="Pedidos" sub={esperando ? `${esperando} esperando resposta` : "Nenhum esperando resposta"} pedidos={esperando} />
      <main className="conteudo">
        <div className={q.id ? "ped-wrap m-vendo" : "ped-wrap"}>
          <div className="filtros" role="group" aria-label="Filtrar pedidos">
            {FILTROS.map(([k, n]) => (
              <Link key={k} href={`/painel/pedidos?f=${k}`} className={filtro === k ? "fi on" : "fi"} aria-current={filtro === k ? "true" : undefined}>{n} <b>{conta(k)}</b></Link>
            ))}
          </div>
          <div className="ped">
            <div className="ped-lista">
              {lista.map((p) => {
                const pz = prazo(p);
                const [stTxt, stCls] = ST[p.status];
                return (
                  <Link key={p.id} href={`/painel/pedidos?f=${filtro}&id=${p.id}`} className={sel?.id === p.id ? "pi on" : "pi"} scroll={false}>
                    <span className={p.para_quem === "filho" ? "av k" : "av"}>{iniciais(p.nome)}</span>
                    <span className="tx">
                      <span style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                        <b>{p.nome}</b>
                        <span className={p.status === "aguardando" ? (pz.urg ? "pill p-ur" : "pill p-av") : stCls}>{p.status === "aguardando" ? pz.txt : stTxt}</span>
                      </span>
                      <span className="q">{fmtQuando(new Date(p.inicio))}</span>
                      <span className="m">{p.para_quem === "filho" ? "Criança ou adolescente" : "Adulta"} · {p.mensagem || "Sem mensagem."}</span>
                    </span>
                  </Link>
                );
              })}
              {!lista.length ? (
                <div className="card" style={{ textAlign: "center", color: "#6B5A5E" }}><b style={{ display: "block", color: "#7A2335", fontSize: 17, marginBottom: 4 }}>Nada por aqui.</b>Nenhum pedido nesta lista.</div>
              ) : null}
              <p style={{ margin: "6px 4px 0", fontSize: 13, color: "#8A7A7E", lineHeight: 1.5 }}>Pedidos sem resposta em 48 horas são liberados automaticamente e vão para Liberados, com uma mensagem pronta para avisar a pessoa.</p>
            </div>
            {sel ? (
              <Detalhe
                key={sel.id}
                voltar={`/painel/pedidos?f=${filtro}`}
                p={sel}
                quando={fmtQuando(new Date(sel.inicio))}
                recebido={haQuanto(sel.criado_em)}
                aceite={new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(sel.aceite_politica_em))}
                status={sel.status === "aguardando" ? [prazo(sel).txt, prazo(sel).urg ? "pill p-ur" : "pill p-av"] : ST[sel.status]}
                sugestoes={sugestoes}
                emailEm={emailEm}
              />
            ) : null}
          </div>
        </div>
      </main>
    </>
  );
}
