import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { deLocal, local } from "./agenda";

export type StatusSessao = "agendada" | "realizada" | "falta" | "cancelada";
export type Sessao = {
  id: string;
  paciente_id: string;
  inicio: string;
  status: StatusSessao;
  valor_centavos: number | null;
  pago_em: string | null;
  recibo_em: string | null;
  origem: "fixo" | "manual";
  remarcada_de: string | null;
  pagamento_avulso?: boolean;
  modalidade?: "online" | "presencial" | null;
};

// Cria as sessões "agendadas" do mês a partir do horário fixo de cada paciente ativo.
// Não recria o que já existe (nem o que foi cancelado), pula os bloqueios da agenda
// e tira do futuro as sessões geradas de um horário fixo que mudou ou acabou.
export async function gerarSessoesDoMes(sb: SupabaseClient, ano: number, mes: number) {
  const ini = deLocal(ano, mes, 1);
  const fim = deLocal(ano, mes + 1, 1);
  const agora = Date.now();
  const [{ data: pacs }, { data: blq }, { data: futuras }, { data: doMes }] = await Promise.all([
    sb.from("pacientes").select("id, status, fixo_dia, fixo_hora, valor_centavos, desde, fim, retomado_em"),
    sb.from("bloqueios").select("inicio, fim").lt("inicio", fim.toISOString()).gt("fim", ini.toISOString()),
    sb.from("sessoes").select("id, paciente_id, inicio, remarcada_de").eq("origem", "fixo").eq("status", "agendada").gt("inicio", new Date(agora).toISOString()),
    sb.from("sessoes").select("paciente_id, inicio, remarcada_de").gte("inicio", new Date(ini.getTime() - 4 * 86400000).toISOString()).lt("inicio", new Date(fim.getTime() + 4 * 86400000).toISOString()),
  ]);
  if (!pacs) return;

  const porId = new Map(pacs.map((p) => [p.id as string, p]));
  // Dia (aaaa-mm-dd) de Brasília de um instante.
  const dia = (d: Date) => { const l = local(d); return `${l.ano}-${String(l.mes + 1).padStart(2, "0")}-${String(l.dia).padStart(2, "0")}`; };
  const gera = (p: { status: string; fim: string | null; fixo_dia: number | null; fixo_hora: string | null }) => p.fixo_dia != null && !!p.fixo_hora && (p.status === "ativo" || !!p.fim);
  const sair = (futuras ?? []).filter((s) => {
    const p = porId.get(s.paciente_id as string);
    if (!p) return true;
    const d = new Date(s.inicio as string);
    // Antes do período atual (ex.: sessões até o encerramento, antes de uma retomada): ficam como estão.
    if (dia(d) < [p.desde as string, (p.retomado_em as string) || ""].sort().pop()!) return false;
    if (!gera(p)) return true;
    if (p.fim && dia(d) > p.fim) return true;
    if (s.remarcada_de) return false; // remarcada à mão: fica onde foi colocada
    const l = local(d);
    const hm = `${String(l.h).padStart(2, "0")}:${String(l.min).padStart(2, "0")}`;
    return l.semana !== p.fixo_dia || hm !== String(p.fixo_hora).slice(0, 5);
  });
  if (sair.length) {
    // Sessão já paga não some: vira cancelada com o pagamento guardado (crédito),
    // e o crédito passa para a próxima sessão em aberto do paciente.
    const ids = sair.map((s) => s.id as string);
    const { data: pagas } = await sb.from("sessoes").select("id").in("id", ids).not("pago_em", "is", null);
    const manter = new Set((pagas ?? []).map((x) => x.id as string));
    if (manter.size) await sb.from("sessoes").update({ status: "cancelada", atualizado_em: new Date().toISOString() }).in("id", [...manter]);
    const apagar = ids.filter((x) => !manter.has(x));
    if (apagar.length) await sb.from("sessoes").delete().in("id", apagar);
  }

  const novas: { paciente_id: string; inicio: string; valor_centavos: number | null; origem: "fixo" }[] = [];
  for (const p of pacs) {
    if (!gera(p)) continue;
    const [h, m] = String(p.fixo_hora).split(":").map(Number);
    // Começa no início do acompanhamento (ou na retomada) e para no fim.
    const comeco = [p.desde as string, (p.retomado_em as string) || ""].sort().pop()!;
    for (let d = 1; d <= 31; d++) {
      const dt = deLocal(ano, mes, d);
      if (local(dt).mes !== ((mes % 12) + 12) % 12) break;
      if (local(dt).semana !== p.fixo_dia) continue;
      const inicio = deLocal(ano, mes, d, h, m);
      const diaIso = dia(inicio);
      if (diaIso < comeco || (p.fim && diaIso > (p.fim as string))) continue;
      const t = inicio.getTime();
      // O horário original de uma sessão remarcada não volta.
      if ((doMes ?? []).some((x) => x.paciente_id === p.id && x.remarcada_de && new Date(x.remarcada_de as string).getTime() === t)) continue;
      // No passado, não cria se já houver sessão do paciente na mesma semana
      // (o horário fixo pode ter mudado depois).
      if (t < agora && (doMes ?? []).some((x) => x.paciente_id === p.id && Math.abs(new Date(x.inicio as string).getTime() - t) < 3.5 * 86400000)) continue;
      if ((blq ?? []).some((b) => t >= new Date(b.inicio as string).getTime() && t < new Date(b.fim as string).getTime())) continue;
      novas.push({ paciente_id: p.id as string, inicio: inicio.toISOString(), valor_centavos: p.valor_centavos as number | null, origem: "fixo" });
    }
  }
  if (novas.length) await sb.from("sessoes").upsert(novas, { onConflict: "paciente_id,inicio", ignoreDuplicates: true });
  await usarCreditos(sb);
}

// Crédito = sessão cancelada que já estava paga. O dinheiro já entrou, então ele paga
// automaticamente a próxima sessão em aberto do mesmo paciente, nesta ordem:
// 1) a sessão indicada (ex.: a que acabou de ser registrada);
// 2) sessões realizadas ou com falta ainda não pagas (da mais antiga);
// 3) sessões agendadas ainda não pagas (da mais próxima).
// O pagamento muda de lugar (não soma de novo no "Recebido"). Sem sessão em aberto, o crédito fica guardado.
export type UsoCredito = { de: string; para: string; inicio: string };
export async function usarCreditos(sb: SupabaseClient, pacienteId?: string, preferir?: string): Promise<UsoCredito[]> {
  let q = sb.from("sessoes").select("id, paciente_id, inicio, pago_em, recibo_em").eq("status", "cancelada").not("pago_em", "is", null).order("inicio");
  if (pacienteId) q = q.eq("paciente_id", pacienteId);
  const { data: creditos } = await q;
  if (!creditos?.length) return [];
  const usos: UsoCredito[] = [];
  const pacs = [...new Set(creditos.map((c) => c.paciente_id as string))];
  for (const pid of pacs) {
    const { data: abertas } = await sb.from("sessoes").select("id, inicio, status").eq("paciente_id", pid).neq("status", "cancelada").is("pago_em", null);
    if (!abertas?.length) continue;
    const ordem = (x: { id: string; inicio: string; status: string }) => (x.id === preferir ? 0 : x.status === "agendada" ? 2 : 1);
    const fila = (abertas as { id: string; inicio: string; status: string }[]).sort((a, b) => ordem(a) - ordem(b) || a.inicio.localeCompare(b.inicio));
    const meus = creditos.filter((c) => c.paciente_id === pid);
    for (let i = 0; i < Math.min(meus.length, fila.length); i++) {
      const c = meus[i];
      const alvo = fila[i];
      // As duas mudanças numa só operação no banco: o pagamento muda de lugar, nunca some nem duplica.
      const { data: ok } = await sb.rpc("usar_credito", { de: c.id, para: alvo.id });
      if (!ok) continue;
      usos.push({ de: c.id as string, para: alvo.id, inicio: alvo.inicio });
    }
  }
  return usos;
}

// Uma sessão cobra quando foi realizada ou quando houve falta.
export const cobra = (s: Pick<Sessao, "status">) => s.status === "realizada" || s.status === "falta";

// Resumo das sessões de um paciente (o acompanhamento inteiro, não só o mês).
export type ResumoSessoes = {
  realizadas: number; faltas: number; proximas: number;
  pagasFrente: number; pagasFrenteAte: string | null;
  devendo: number; devendoValor: number; credito: number; creditoValor: number; recibos: number;
};
export function resumir(rows: Pick<Sessao, "inicio" | "status" | "valor_centavos" | "pago_em" | "recibo_em">[], agora = Date.now()): ResumoSessoes {
  const futuras = rows.filter((r) => r.status === "agendada" && new Date(r.inicio).getTime() >= agora - 3600000);
  const frente = futuras.filter((r) => r.pago_em).sort((a, b) => a.inicio.localeCompare(b.inicio));
  const devendo = rows.filter((r) => (r.status === "realizada" || r.status === "falta") && !r.pago_em);
  const credito = rows.filter((r) => r.status === "cancelada" && r.pago_em);
  return {
    realizadas: rows.filter((r) => r.status === "realizada").length,
    faltas: rows.filter((r) => r.status === "falta").length,
    proximas: futuras.length,
    pagasFrente: frente.length,
    pagasFrenteAte: frente.length ? frente[frente.length - 1].inicio : null,
    devendo: devendo.length,
    devendoValor: devendo.reduce((a, r) => a + (r.valor_centavos || 0), 0),
    credito: credito.length,
    creditoValor: credito.reduce((a, r) => a + (r.valor_centavos || 0), 0),
    recibos: rows.filter((r) => r.pago_em && !r.recibo_em && r.status !== "cancelada").length,
  };
}
