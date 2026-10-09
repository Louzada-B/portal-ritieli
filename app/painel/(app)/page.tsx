import Link from "next/link";
import { supabaseServidor } from "../../lib/supabase/servidor";
import { supabaseAdmin } from "../../lib/supabase/admin";
import { carregarAgenda, periodos, PRAZO_HORAS, type Pedido } from "../../lib/dados";
import { horariosLivres, fmtHora, fmtDiaLongo, fmtQuando, local } from "../../lib/agenda";
import { TopoCelular } from "../componentes/Navegacao";
import Icone from "../componentes/Icone";
import { cadastrosDe } from "../../lib/cadastro";
import PedidosPaciente, { type PedidoLinha } from "../componentes/PedidosPaciente";

export const dynamic = "force-dynamic";

export default async function VisaoGeral({ searchParams }: { searchParams: Promise<{ senha?: string }> }) {
  const { senha } = await searchParams;
  const sb = await supabaseServidor();
  const agora = new Date();
  const [{ data: ags }, { data: confs }, { regras, tomados, google: g }, { data: con }] = await Promise.all([
    sb.from("pedidos").select("*").eq("status", "aguardando").order("criado_em"),
    sb.from("pedidos").select("*").eq("status", "confirmado").gte("inicio", new Date(agora.getTime() - 3600000).toISOString()).order("inicio").limit(8),
    carregarAgenda(sb),
    supabaseAdmin().from("google_conexao").select("id").eq("id", 1).maybeSingle(),
  ]);
  const { data: pacs } = await sb.from("pacientes").select("id, ficha_em").eq("status", "ativo");
  const cads = await cadastrosDe(sb, pacs ?? []);
  const faltaFicha = [...cads.values()].filter((c) => c.ficha !== "preenchida").length;
  const faltaTermo = [...cads.values()].filter((c) => c.ficha === "preenchida" && c.termo !== "aceito").length;
  const { data: pp } = await sb.from("pedidos_paciente").select("id, paciente_id, sessao_inicio, tipo, mensagem, pacientes(nome)").is("resolvido_em", null).order("criado_em");
  const pedidosPac: PedidoLinha[] = (pp ?? []).map((x) => {
    const pac = x.pacientes as unknown as { nome: string } | { nome: string }[] | null;
    return { id: x.id as string, pacienteId: x.paciente_id as string, nome: (Array.isArray(pac) ? pac[0]?.nome : pac?.nome) || "Paciente", quando: fmtQuando(new Date(x.sessao_inicio as string)), tipo: x.tipo as "remarcar" | "cancelar", mensagem: (x.mensagem as string | null) ?? null };
  });
  const aguardando = (ags ?? []) as Pedido[];
  const confirmadas = (confs ?? []) as Pedido[];
  const livres7 = horariosLivres({ config: { ...regras.config, janela_dias: 7 }, semana: regras.semana, bloqueios: periodos(regras.bloqueios), ocupados: [...tomados, ...g.periodos] });

  const maisAntigo = aguardando[0];
  const resta = maisAntigo ? Math.max(0, Math.floor(PRAZO_HORAS - (Date.now() - new Date(maisAntigo.criado_em).getTime()) / 3600000)) : 0;
  const hoje = local(agora);
  const titulo = `${["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"][hoje.semana]}, ${hoje.dia}`;

  return (
    <>
      <header className="topo"><div><h1>Olá, <em>Ritieli.</em></h1><div className="data">{fmtDiaLongo(agora)}</div></div></header>
      <TopoCelular titulo="Olá, Ritieli" sub={titulo} pedidos={aguardando.length} />
      <main className="conteudo">
        {senha === "ok" ? <div className="aviso ok">Senha nova salva.</div> : null}
        {aguardando.length ? (
          <div className="alerta">
            <div style={{ position: "relative", display: "flex", gap: 16, alignItems: "center" }}>
              <span style={{ flex: "0 0 auto", width: 52, height: 52, borderRadius: "50%", background: "rgba(255,255,255,.14)", display: "flex", alignItems: "center", justifyContent: "center", color: "#FFFFFF" }}><Icone nome="pedidos" tam={24} /></span>
              <span style={{ display: "flex", flexDirection: "column" }}>
                <b style={{ fontSize: 20, color: "#FFFFFF" }}>{aguardando.length === 1 ? "1 pedido de conversa esperando você" : `${aguardando.length} pedidos de conversa esperando você`}</b>
                <span style={{ fontSize: 14, color: "#F2C9D1" }}>{aguardando.length === 1 ? "Ele precisa" : "O mais antigo precisa"} de resposta em {resta} {resta === 1 ? "hora" : "horas"}.</span>
              </span>
            </div>
            <Link href="/painel/pedidos" className="bt" style={{ position: "relative" }}>Ver pedidos <span aria-hidden="true">→</span></Link>
          </div>
        ) : null}

        {pedidosPac.length ? <PedidosPaciente itens={pedidosPac} /> : null}

        {faltaFicha + faltaTermo > 0 ? (
          <Link href="/painel/pacientes?f=cadastro" className="faixa">
            <span style={{ display: "flex", flexDirection: "column" }}>
              <b>{faltaFicha + faltaTermo === 1 ? "1 paciente com cadastro pendente" : `${faltaFicha + faltaTermo} pacientes com cadastro pendente`}</b>
              <span className="d">{[faltaFicha ? `${faltaFicha} sem a ficha preenchida` : "", faltaTermo ? `${faltaTermo} sem o termo aceito` : ""].filter(Boolean).join(" · ")}</span>
            </span>
            <span className="bt2" style={{ minHeight: 40, padding: "8px 14px", fontSize: 14 }}>Ver quem falta <span aria-hidden="true">→</span></span>
          </Link>
        ) : null}

        <div className="nums">
          <Link href="/painel/pedidos" className="num" style={{ textDecoration: "none", color: "inherit" }}><span className="rot">Esperando você</span><b>{aguardando.length}</b><span className="l">{aguardando.length === 1 ? "pedido" : "pedidos"} de conversa</span></Link>
          <Link href="/painel/pedidos?f=confirmado" className="num" style={{ textDecoration: "none", color: "inherit" }}><span className="rot">Confirmadas</span><b>{confirmadas.length}</b><span className="l">próximas conversas</span></Link>
          <Link href="/painel/disponibilidade" className="num" style={{ textDecoration: "none", color: "inherit" }}><span className="rot">Próximos 7 dias</span><b>{livres7.length}</b><span className="l">horários livres no site</span></Link>
          <Link href="/painel/disponibilidade" className="num" style={{ textDecoration: "none", color: "inherit" }}><span className="rot">Google Agenda</span><b style={{ fontSize: 22, lineHeight: 1.3 }}>{con ? "Conectada" : "Desconectada"}</b><span className="l">{con ? "bloqueia o site e cria o Meet" : "conecte em Disponibilidade"}</span></Link>
        </div>

        <div className="duas">
          <section className="card">
            <h2 className="card-t"><Icone nome="calendario" />Próximas conversas</h2>
            <ol className="linha-t" style={{ listStyle: "none", margin: "12px 0 0", padding: 0 }}>
              {confirmadas.map((p) => {
                const i = new Date(p.inicio);
                const agoraMesmo = Math.abs(i.getTime() - Date.now()) < 30 * 60000;
                return (
                  <li key={p.id} className={agoraMesmo ? "hl agora" : "hl"}>
                    <span className="h">{fmtHora(i)}<small>{fmtQuando(i).split(" · ")[0]}</small></span>
                    <span className="q">
                      <b>{p.nome}{p.para_quem === "filho" ? " · responsável" : ""}</b>
                      <span style={{ display: "flex", flexWrap: "wrap", gap: 6 }}><span className="pill p-av">Conversa inicial · {regras.config.duracao_conversa_min} min</span><span className="pill p-on">Online</span></span>
                    </span>
                    <span className="ac">
                      {p.meet_link ? (
                        <a href={p.meet_link} target="_blank" rel="noopener" className="bt" style={{ minHeight: 40, padding: "8px 14px", fontSize: 14 }}><Icone nome="video" tam={16} />Entrar na chamada</a>
                      ) : (
                        <Link href={`/painel/pedidos?f=confirmado&id=${p.id}`} className="bt2" style={{ minHeight: 40, padding: "8px 14px", fontSize: 14 }}>Ver pedido</Link>
                      )}
                    </span>
                  </li>
                );
              })}
              {!confirmadas.length ? <li style={{ color: "#8A7A7E", fontSize: 14, padding: "12px 0" }}>Nenhuma conversa confirmada por enquanto.</li> : null}
            </ol>
          </section>
          <section className="card">
            <h2 className="card-t"><Icone nome="pedidos" />Esperando resposta</h2>
            <ul style={{ listStyle: "none", margin: "12px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {aguardando.slice(0, 5).map((p) => (
                <li key={p.id}>
                  <Link href={`/painel/pedidos?id=${p.id}`} style={{ textDecoration: "none", color: "#3A1F25", display: "flex", flexDirection: "column", background: "#F8F3F0", borderRadius: 14, padding: "10px 12px" }}>
                    <b style={{ fontSize: 15 }}>{p.nome}</b>
                    <span style={{ fontSize: 13, color: "#6B5A5E" }}>{fmtQuando(new Date(p.inicio))}</span>
                  </Link>
                </li>
              ))}
              {!aguardando.length ? <li style={{ color: "#8A7A7E", fontSize: 14 }}>Tudo respondido.</li> : null}
            </ul>
          </section>
        </div>
      </main>
    </>
  );
}
