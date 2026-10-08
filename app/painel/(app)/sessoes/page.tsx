import { supabaseServidor } from "../../../lib/supabase/servidor";
import { deLocal, local, MESES } from "../../../lib/agenda";
import { gerarSessoesDoMes, type Sessao } from "../../../lib/sessoes";
import { TopoCelular } from "../../componentes/Navegacao";
import Sessoes, { type Linha } from "./Sessoes";

export const dynamic = "force-dynamic";

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

export default async function PaginaSessoes({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const q = await searchParams;
  const hoje = local(new Date());
  const mm = /^(\d{4})-(\d{2})$/.exec(q.m || "");
  const ano = mm ? +mm[1] : hoje.ano;
  const mes = mm ? Math.min(11, Math.max(0, +mm[2] - 1)) : hoje.mes;
  const sb = await supabaseServidor();
  await gerarSessoesDoMes(sb, ano, mes);

  const ini = deLocal(ano, mes, 1);
  const fim = deLocal(ano, mes + 1, 1);
  const [{ data: sess }, { data: pacs }] = await Promise.all([
    sb.from("sessoes").select("id, paciente_id, inicio, status, valor_centavos, pago_em, recibo_em, origem, pacientes(nome, tipo)").gte("inicio", ini.toISOString()).lt("inicio", fim.toISOString()).order("inicio", { ascending: false }),
    sb.from("pacientes").select("id, nome, valor_centavos, fixo_hora").eq("status", "ativo").order("nome"),
  ]);

  const linhas: Linha[] = (sess ?? []).map((s) => {
    const p = s.pacientes as unknown as { nome: string; tipo: "adulta" | "crianca" } | null;
    const x = s as unknown as Sessao;
    return {
      id: x.id,
      inicio: x.inicio,
      nome: p?.nome || "Paciente",
      tipo: p?.tipo || "adulta",
      status: x.status,
      valor: x.valor_centavos,
      pago: !!x.pago_em,
      recibo: !!x.recibo_em,
      manual: x.origem === "manual",
    };
  });

  const ant = mes === 0 ? `${ano - 1}-12` : `${ano}-${String(mes).padStart(2, "0")}`;
  const prox = mes === 11 ? `${ano + 1}-01` : `${ano}-${String(mes + 2).padStart(2, "0")}`;
  const rotulo = `${cap(MESES[mes])} de ${ano}`;

  return (
    <>
      <TopoCelular titulo="Sessões" sub={rotulo} pedidos={0} />
      <Sessoes
        key={`${ano}-${mes}`}
        linhas={linhas}
        rotulo={rotulo}
        ant={`/painel/sessoes?m=${ant}`}
        prox={`/painel/sessoes?m=${prox}`}
        pacientes={(pacs ?? []).map((p) => ({ id: p.id as string, nome: p.nome as string, valor: p.valor_centavos as number | null, hora: p.fixo_hora ? String(p.fixo_hora).slice(0, 5) : null }))}
        hoje={{ ano: hoje.ano, mes: hoje.mes, dia: hoje.dia }}
        mesAtual={{ ano, mes }}
      />
    </>
  );
}
