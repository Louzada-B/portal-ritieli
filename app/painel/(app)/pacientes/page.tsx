import { supabaseServidor } from "../../../lib/supabase/servidor";
import { responsaveisDe, type Paciente, type Termo } from "../../../lib/pacientes";
import { type Pedido } from "../../../lib/dados";
import { TopoCelular } from "../../componentes/Navegacao";
import Pacientes from "./Pacientes";

export const dynamic = "force-dynamic";

export default async function PaginaPacientes({ searchParams }: { searchParams: Promise<{ id?: string; novo?: string; pedido?: string; f?: string }> }) {
  const q = await searchParams;
  const sb = await supabaseServidor();
  const { data } = await sb
    .from("pacientes")
    .select("id, tipo, nome, idade, whatsapp, email, cpf_final, valor_centavos, tipo_valor, fixo_dia, fixo_hora, meet_link, google_evento_id, status, desde, fim, ficha_em, criado_em, pedido_id, cidade, escola, cpf_cripto, nascimento_cripto, emergencia_cripto")
    .order("nome");
  const todos = (data ?? []) as Paciente[];
  const sel = q.id ? todos.find((p) => p.id === q.id) : undefined;

  let detalhe = null;
  if (sel) {
    const [resps, { data: fichas }, { data: termos }, { count: nEvo }, { count: nSec }, { count: nAnx }] = await Promise.all([
      responsaveisDe(sb, sel.id),
      sb.from("fichas").select("criado_em, expira_em, preenchida_em").eq("paciente_id", sel.id).order("criado_em", { ascending: false }).limit(1),
      sb.from("termos").select("id, paciente_id, resumo, status, enviado_em, aceito_em, aceite_nome").eq("paciente_id", sel.id).order("enviado_em", { ascending: false }).limit(1),
      sb.from("prontuario_evolucoes").select("id", { count: "exact", head: true }).eq("paciente_id", sel.id),
      sb.from("prontuario_secoes").select("id", { count: "exact", head: true }).eq("paciente_id", sel.id),
      sb.from("prontuario_anexos").select("id", { count: "exact", head: true }).eq("paciente_id", sel.id),
    ]);
    detalhe = {
      responsaveis: resps.map((r) => ({ id: r.id, nome: r.nome, whatsapp: r.whatsapp, email: r.email, cpfFinal: r.cpf_final, parentesco: r.parentesco, financeiro: r.financeiro })),
      ficha: fichas?.[0] ?? null,
      termo: (termos?.[0] as Termo | undefined) ?? null,
      temProntuario: (nEvo ?? 0) + (nSec ?? 0) + (nAnx ?? 0) > 0,
    };
  }

  // Novo paciente a partir de um pedido confirmado.
  let pedido: Pick<Pedido, "id" | "nome" | "whatsapp" | "email" | "para_quem" | "idade_crianca"> | null = null;
  if (q.novo && q.pedido) {
    const { data: pd } = await sb.from("pedidos").select("id, nome, whatsapp, email, para_quem, idade_crianca").eq("id", q.pedido).maybeSingle();
    pedido = pd;
  }

  const ativos = todos.filter((p) => p.status === "ativo").length;
  const lista = todos.map((p) => ({
    id: p.id,
    tipo: p.tipo,
    nome: p.nome,
    idade: p.idade,
    whatsapp: p.whatsapp,
    email: p.email,
    cpfFinal: p.cpf_final,
    temNascimento: !!p.nascimento_cripto,
    temEmergencia: !!p.emergencia_cripto,
    valor: p.valor_centavos,
    tipoValor: p.tipo_valor,
    fixoDia: p.fixo_dia,
    fixoHora: p.fixo_hora ? p.fixo_hora.slice(0, 5) : null,
    meet: p.meet_link,
    status: p.status,
    desde: p.desde,
    fim: p.fim,
    fichaEm: p.ficha_em,
    escola: p.escola,
    cidade: p.cidade,
  }));

  return (
    <>
      <header className="topo"><div><h1>Seus <em>pacientes.</em></h1><div className="data">Contatos, responsáveis, sala de atendimento e histórico</div></div></header>
      <TopoCelular titulo="Pacientes" sub={`${ativos} em acompanhamento`} pedidos={0} />
      <main className="conteudo">
        <Pacientes key={`${q.id || ""}-${q.novo || ""}`} lista={lista} selId={sel?.id || null} detalhe={detalhe} novo={!!q.novo} pedido={pedido} filtroInicial={q.f || "ativo"} />
      </main>
    </>
  );
}
