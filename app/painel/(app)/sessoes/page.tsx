import { supabaseServidor } from "../../../lib/supabase/servidor";
import { deLocal, local, MESES } from "../../../lib/agenda";
import { gerarSessoesDoMes, type Sessao } from "../../../lib/sessoes";
import { TopoCelular } from "../../componentes/Navegacao";
import Sessoes, { type Linha } from "./Sessoes";

export const dynamic = "force-dynamic";

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

export default async function PaginaSessoes({ searchParams }: { searchParams: Promise<{ m?: string; busca?: string }> }) {
  const q = await searchParams;
  const hoje = local(new Date());
  const mm = /^(\d{4})-(\d{2})$/.exec(q.m || "");
  const ano = mm ? +mm[1] : hoje.ano;
  const mes = mm ? Math.min(11, Math.max(0, +mm[2] - 1)) : hoje.mes;
  const sb = await supabaseServidor();
  await gerarSessoesDoMes(sb, ano, mes);

  const ini = deLocal(ano, mes, 1);
  const fim = deLocal(ano, mes + 1, 1);
  const [{ data: sess }, { data: pacs }, { data: semana }, { data: blq }] = await Promise.all([
    sb.from("sessoes").select("id, paciente_id, inicio, status, valor_centavos, pago_em, recibo_em, origem, remarcada_de, pacientes(nome, tipo)").gte("inicio", ini.toISOString()).lt("inicio", fim.toISOString()).order("inicio", { ascending: false }),
    sb.from("pacientes").select("id, nome, valor_centavos, fixo_hora").eq("status", "ativo").order("nome"),
    sb.from("semana_padrao").select("dia_semana, ativo, inicio, fim, pausa_inicio, pausa_fim"),
    sb.from("bloqueios").select("inicio, fim").gte("fim", new Date().toISOString()),
  ]);
  const mins = (h: string | null) => (h ? Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5)) : null);
  const expediente = (semana ?? []).map((d) => ({ dia: d.dia_semana as number, ativo: !!d.ativo, ini: mins(d.inicio)!, fim: mins(d.fim)!, pIni: mins(d.pausa_inicio), pFim: mins(d.pausa_fim) }));

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
      remarcadaDe: x.remarcada_de,
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
        buscaInicial={(q.busca || "").slice(0, 60)}
        expediente={expediente}
        bloqueios={(blq ?? []).map((b) => [new Date(b.inicio).getTime(), new Date(b.fim).getTime()] as [number, number])}
      />
    </>
  );
}
