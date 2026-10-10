import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { deLocal, local, minutos, DIAS, MESES, type DiaSemana, type Periodo } from "./agenda";
import { ocupadosEntre } from "./google";
import { DUR_SESSAO } from "./conflitos";
import { PRAZO_HORAS } from "./dados";

// Horários de sessão realmente livres: dentro da disponibilidade, fora de pausas e bloqueios, sem sessão,
// conversa inicial nem compromisso na agenda do Google. Servem para a Ritieli escolher sem consultar a agenda.

export type DiaLivre = { data: string; rot: string; horas: string[] };
export type OpcaoFixa = { dia: number; rot: string; horas: string[] };

const sobrepoe = (a0: number, a1: number, b0: number, b1: number) => a0 < b1 && a1 > b0;
const pad = (n: number) => String(n).padStart(2, "0");
const hm = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;

async function carregar(sb: SupabaseClient, de: Date, ate: Date, pacienteId?: string) {
  const [{ data: semana }, { data: blq }, { data: sess }, { data: peds }, { data: cfg }, g] = await Promise.all([
    sb.from("semana_padrao").select("dia_semana, ativo, inicio, fim, pausa_inicio, pausa_fim").order("dia_semana"),
    sb.from("bloqueios").select("inicio, fim").lt("inicio", ate.toISOString()).gt("fim", de.toISOString()),
    sb.from("sessoes").select("id, paciente_id, inicio, google_evento_id").neq("status", "cancelada").gte("inicio", new Date(de.getTime() - DUR_SESSAO * 60000).toISOString()).lt("inicio", ate.toISOString()),
    sb.from("pedidos").select("inicio, status, criado_em").in("status", ["aguardando", "confirmado"]).gte("inicio", de.toISOString()).lt("inicio", ate.toISOString()),
    sb.from("config_agenda").select("duracao_conversa_min").eq("id", 1).single(),
    ocupadosEntre(de, ate).catch(() => null),
  ]);
  if (g === null) throw new Error("A agenda do Google não respondeu. Tente de novo.");
  const meus = new Set<string>();
  if (pacienteId) {
    const [{ data: pa }, { data: av }] = await Promise.all([
      sb.from("pacientes").select("google_evento_id").eq("id", pacienteId).maybeSingle(),
      sb.from("sessoes").select("google_evento_id").eq("paciente_id", pacienteId).not("google_evento_id", "is", null),
    ]);
    if (pa?.google_evento_id) meus.add(pa.google_evento_id as string);
    for (const x of av ?? []) meus.add(x.google_evento_id as string);
  }
  const durConversa = ((cfg?.duracao_conversa_min as number) ?? 15) * 60000;
  const limite = Date.now() - PRAZO_HORAS * 3600000;
  const conversas: Periodo[] = (peds ?? [])
    .filter((p) => p.status === "confirmado" || new Date(p.criado_em).getTime() > limite)
    .map((p) => ({ inicio: new Date(p.inicio), fim: new Date(new Date(p.inicio).getTime() + durConversa) }));
  return {
    semana: ((semana ?? []) as DiaSemana[]).map((d) => ({ ...d, inicio: String(d.inicio).slice(0, 5), fim: String(d.fim).slice(0, 5), pausa_inicio: d.pausa_inicio ? String(d.pausa_inicio).slice(0, 5) : null, pausa_fim: d.pausa_fim ? String(d.pausa_fim).slice(0, 5) : null })),
    bloqueios: (blq ?? []).map((b) => ({ inicio: new Date(b.inicio), fim: new Date(b.fim) })) as Periodo[],
    sessoes: (sess ?? []).map((s) => ({ id: s.id as string, pacienteId: s.paciente_id as string, inicio: new Date(s.inicio as string) })),
    conversas,
    google: g as Periodo[],
    meus,
  };
}

// Início de sessão a cada hora cheia dentro do expediente do dia.
function inicios(semana: DiaSemana[], ano: number, mes: number, dia: number, semanaDia: number): Date[] {
  const d = semana.find((s) => s.dia_semana === semanaDia);
  if (!d || !d.ativo) return [];
  const ini = minutos(d.inicio);
  const fim = minutos(d.fim);
  const pI = d.pausa_inicio ? minutos(d.pausa_inicio) : null;
  const pF = d.pausa_fim ? minutos(d.pausa_fim) : null;
  const r: Date[] = [];
  for (let m = ini; m + DUR_SESSAO <= fim; m += 60) {
    if (pI !== null && pF !== null && sobrepoe(m, m + DUR_SESSAO, pI, pF)) continue;
    r.push(deLocal(ano, mes, dia, Math.floor(m / 60), m % 60));
  }
  return r;
}

// Dias e horários livres para uma sessão avulsa (nova, ou a remarcação de uma existente).
export async function livresParaSessao(sb: SupabaseClient, o: { ignorarSessaoId?: string; ignorarInicio?: Date; dias?: number } = {}): Promise<DiaLivre[]> {
  const dias = o.dias ?? 30;
  const agora = new Date();
  const de = agora;
  const ate = new Date(agora.getTime() + (dias + 1) * 86400000);
  const c = await carregar(sb, de, ate);
  const ign = o.ignorarInicio;
  const mesmo = (ini: Date) => !!ign && Math.abs(ini.getTime() - ign.getTime()) < 60000;
  const h = local(agora);
  const saida: DiaLivre[] = [];
  for (let i = 0; i <= dias; i++) {
    const base = local(deLocal(h.ano, h.mes, h.dia + i));
    const horas: string[] = [];
    for (const t of inicios(c.semana, base.ano, base.mes, base.dia, base.semana)) {
      const t0 = t.getTime();
      const t1 = t0 + DUR_SESSAO * 60000;
      if (t0 < agora.getTime() + 30 * 60000) continue;
      if (c.bloqueios.some((p) => sobrepoe(t0, t1, p.inicio.getTime(), p.fim.getTime()))) continue;
      if (c.sessoes.some((s) => s.id !== o.ignorarSessaoId && sobrepoe(t0, t1, s.inicio.getTime(), s.inicio.getTime() + DUR_SESSAO * 60000))) continue;
      if (c.conversas.some((p) => sobrepoe(t0, t1, p.inicio.getTime(), p.fim.getTime()))) continue;
      // O horário atual da própria sessão aparece ocupado no Google: não conta.
      if (c.google.some((p) => sobrepoe(t0, t1, p.inicio.getTime(), p.fim.getTime()) && !(mesmo(p.inicio) && Math.abs(p.fim.getTime() - (p.inicio.getTime() + DUR_SESSAO * 60000)) < 60000))) continue;
      const l = local(t);
      horas.push(`${pad(l.h)}:${pad(l.min)}`);
    }
    if (horas.length) saida.push({ data: `${base.ano}-${pad(base.mes + 1)}-${pad(base.dia)}`, rot: `${DIAS[base.semana].toLowerCase()}, ${base.dia} ${MESES[base.mes].slice(0, 3)}`, horas });
  }
  return saida;
}

// Horários livres para o horário FIXO semanal: precisa estar livre em todas as próximas 12 semanas.
// Bloqueio pontual não impede (nesse dia a sessão simplesmente não acontece). A série do próprio paciente não conta.
export async function livresParaFixo(sb: SupabaseClient, pacienteId?: string): Promise<OpcaoFixa[]> {
  const agora = new Date();
  const h = local(agora);
  const ate = deLocal(h.ano, h.mes, h.dia + 7 * 12 + 1);
  const c = await carregar(sb, agora, ate, pacienteId);
  const saida: OpcaoFixa[] = [];
  for (const dia of [1, 2, 3, 4, 5, 6, 0]) {
    const horas: string[] = [];
    // Datas das próximas 12 ocorrências desse dia da semana.
    const datas: { ano: number; mes: number; dia: number }[] = [];
    for (let i = 0; i < 7 * 12 + 1 && datas.length < 12; i++) {
      const l = local(deLocal(h.ano, h.mes, h.dia + i));
      if (l.semana === dia) datas.push({ ano: l.ano, mes: l.mes, dia: l.dia });
    }
    if (!datas.length) continue;
    const modelo = inicios(c.semana, datas[0].ano, datas[0].mes, datas[0].dia, dia);
    for (const t of modelo) {
      const lt = local(t);
      const livre = datas.every((d) => {
        const t0 = deLocal(d.ano, d.mes, d.dia, lt.h, lt.min).getTime();
        const t1 = t0 + DUR_SESSAO * 60000;
        if (t0 < agora.getTime()) return true;
        if (c.sessoes.some((s) => s.pacienteId !== pacienteId && sobrepoe(t0, t1, s.inicio.getTime(), s.inicio.getTime() + DUR_SESSAO * 60000))) return false;
        if (c.conversas.some((p) => sobrepoe(t0, t1, p.inicio.getTime(), p.fim.getTime()))) return false;
        return !c.google.some((p) => sobrepoe(t0, t1, p.inicio.getTime(), p.fim.getTime()) && !(p.evento && c.meus.has(p.evento)));
      });
      if (livre) horas.push(`${pad(lt.h)}:${pad(lt.min)}`);
    }
    if (horas.length) saida.push({ dia, rot: ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"][dia], horas });
  }
  return saida;
}

export { hm };
