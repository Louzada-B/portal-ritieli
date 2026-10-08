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
};

// Cria as sessões "agendadas" do mês a partir do horário fixo de cada paciente ativo.
// Não recria o que já existe (nem o que foi cancelado), pula os bloqueios da agenda
// e tira do futuro as sessões geradas de um horário fixo que mudou ou acabou.
export async function gerarSessoesDoMes(sb: SupabaseClient, ano: number, mes: number) {
  const ini = deLocal(ano, mes, 1);
  const fim = deLocal(ano, mes + 1, 1);
  const agora = Date.now();
  const [{ data: pacs }, { data: blq }, { data: futuras }, { data: doMes }] = await Promise.all([
    sb.from("pacientes").select("id, status, fixo_dia, fixo_hora, valor_centavos, desde, criado_em"),
    sb.from("bloqueios").select("inicio, fim").lt("inicio", fim.toISOString()).gt("fim", ini.toISOString()),
    sb.from("sessoes").select("id, paciente_id, inicio").eq("origem", "fixo").eq("status", "agendada").gt("inicio", new Date(agora).toISOString()),
    sb.from("sessoes").select("paciente_id, inicio").gte("inicio", new Date(ini.getTime() - 4 * 86400000).toISOString()).lt("inicio", new Date(fim.getTime() + 4 * 86400000).toISOString()),
  ]);
  if (!pacs) return;

  const porId = new Map(pacs.map((p) => [p.id as string, p]));
  const sair = (futuras ?? []).filter((s) => {
    const p = porId.get(s.paciente_id as string);
    if (!p || p.status !== "ativo" || p.fixo_dia == null || !p.fixo_hora) return true;
    const l = local(new Date(s.inicio as string));
    const hm = `${String(l.h).padStart(2, "0")}:${String(l.min).padStart(2, "0")}`;
    return l.semana !== p.fixo_dia || hm !== String(p.fixo_hora).slice(0, 5);
  });
  if (sair.length) await sb.from("sessoes").delete().in("id", sair.map((s) => s.id as string));

  const novas: { paciente_id: string; inicio: string; valor_centavos: number | null; origem: "fixo" }[] = [];
  for (const p of pacs) {
    if (p.status !== "ativo" || p.fixo_dia == null || !p.fixo_hora) continue;
    const [h, m] = String(p.fixo_hora).split(":").map(Number);
    // Começa no dia do cadastro (o que vier depois: "desde" ou a criação).
    const criado = local(new Date(p.criado_em as string));
    const comeco = Math.max(new Date(`${p.desde}T00:00:00-03:00`).getTime(), deLocal(criado.ano, criado.mes, criado.dia).getTime());
    for (let d = 1; d <= 31; d++) {
      const dia = deLocal(ano, mes, d);
      if (local(dia).mes !== ((mes % 12) + 12) % 12) break;
      if (local(dia).semana !== p.fixo_dia) continue;
      const inicio = deLocal(ano, mes, d, h, m);
      if (inicio.getTime() < comeco) continue;
      const t = inicio.getTime();
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
