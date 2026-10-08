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
    if (!p || !gera(p)) return true;
    const d = new Date(s.inicio as string);
    if (p.fim && dia(d) > p.fim) return true;
    if (s.remarcada_de) return false; // remarcada à mão: fica onde foi colocada
    const l = local(d);
    const hm = `${String(l.h).padStart(2, "0")}:${String(l.min).padStart(2, "0")}`;
    return l.semana !== p.fixo_dia || hm !== String(p.fixo_hora).slice(0, 5);
  });
  if (sair.length) await sb.from("sessoes").delete().in("id", sair.map((s) => s.id as string));

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
}

// Uma sessão cobra quando foi realizada ou quando houve falta.
export const cobra = (s: Pick<Sessao, "status">) => s.status === "realizada" || s.status === "falta";
