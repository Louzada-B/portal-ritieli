import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { deLocal, fmtQuando, local, minutos, DIAS_LONGOS, type DiaSemana, type Periodo } from "./agenda";
import { ocupadosEntre } from "./google";
import { PRAZO_HORAS } from "./dados";

// Nenhum conflito na agenda: antes de marcar qualquer coisa, confere sessões,
// conversas iniciais, bloqueios e a agenda do Google da Ritieli.
export const DUR_SESSAO = 50;

type Ignorar = {
  sessaoId?: string;
  pedidoId?: string;
  pacienteId?: string; // sessões do próprio paciente (ao mudar o horário fixo)
  google?: (p: Periodo) => boolean; // períodos do Google que são da própria coisa sendo mudada
};

// Disponibilidade da semana (Painel → Disponibilidade): a sessão inteira precisa caber
// no expediente do dia, fora da pausa.
const hm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
export function foraDoExpediente(semana: DiaSemana[], inicio: Date, durMin: number): string | null {
  const l = local(inicio);
  const d = semana.find((x) => x.dia_semana === l.semana);
  const nome = DIAS_LONGOS[l.semana].toLowerCase().replace("sábado", "sábados").replace("domingo", "domingos").replace(/a$/, "as");
  if (!d || !d.ativo) return `Fora da sua disponibilidade: você não atende ${l.semana === 0 || l.semana === 6 ? "aos" : "às"} ${nome}. Para atender nesse dia, abra o dia em Disponibilidade.`;
  const m0 = l.h * 60 + l.min;
  const ini = minutos(d.inicio);
  const fim = minutos(d.fim);
  const faixa = `das ${hm(ini)} às ${hm(fim)}`;
  if (m0 < ini || m0 + durMin > fim) return `Fora da sua disponibilidade: ${l.semana === 0 || l.semana === 6 ? "aos" : "às"} ${nome} você atende ${faixa}, e a sessão precisa terminar até ${hm(fim)}.`;
  if (d.pausa_inicio && d.pausa_fim && m0 < minutos(d.pausa_fim) && m0 + durMin > minutos(d.pausa_inicio)) return `Fora da sua disponibilidade: ${hm(minutos(d.pausa_inicio))}–${hm(minutos(d.pausa_fim))} é a sua pausa.`;
  return null;
}

const curto = (n: string) => { const p = n.trim().split(/\s+/); return p.length > 1 ? `${p[0]} ${p[p.length - 1][0]}.` : p[0]; };
const sobrepoe = (a0: number, a1: number, b0: number, b1: number) => a0 < b1 && a1 > b0;

export async function conflitoEm(sb: SupabaseClient, inicio: Date, durMin: number, ign: Ignorar = {}): Promise<string | null> {
  return conflitoLote(sb, [inicio], durMin, ign);
}

// Confere vários horários de uma vez (uma consulta ao banco e uma ao Google).
export async function conflitoLote(sb: SupabaseClient, inicios: Date[], durMin: number, ign: Ignorar = {}, pularBloqueio = false): Promise<string | null> {
  if (!inicios.length) return null;
  const ts = inicios.map((d) => d.getTime()).sort((x, y) => x - y);
  const jIni = ts[0];
  const jFim = ts[ts.length - 1] + durMin * 60000;

  const { data: cfg } = await sb.from("config_agenda").select("duracao_conversa_min").eq("id", 1).single();
  const durConversa = (cfg?.duracao_conversa_min as number) ?? 15;
  const [{ data: sess }, { data: peds }, { data: blq }, { data: semana }] = await Promise.all([
    sb.from("sessoes").select("id, paciente_id, inicio, pacientes(nome)").neq("status", "cancelada").lt("inicio", new Date(jFim).toISOString()).gt("inicio", new Date(jIni - DUR_SESSAO * 60000).toISOString()),
    sb.from("pedidos").select("id, nome, inicio, status, criado_em").in("status", ["aguardando", "confirmado"]).lt("inicio", new Date(jFim).toISOString()).gt("inicio", new Date(jIni - durConversa * 60000).toISOString()),
    sb.from("bloqueios").select("inicio, fim, motivo").lt("inicio", new Date(jFim).toISOString()).gt("fim", new Date(jIni).toISOString()),
    sb.from("semana_padrao").select("dia_semana, ativo, inicio, fim, pausa_inicio, pausa_fim"),
  ]);
  const futuro = ts.some((t) => t + durMin * 60000 > Date.now());
  const g = futuro ? await ocupadosEntre(new Date(Math.max(jIni, Date.now() - 3600000)), new Date(jFim)).catch(() => null) : [];
  const limite = Date.now() - PRAZO_HORAS * 3600000;

  for (const t0 of ts) {
    const t1 = t0 + durMin * 60000;
    const s = (sess ?? []).find((x) => x.id !== ign.sessaoId && x.paciente_id !== ign.pacienteId && sobrepoe(t0, t1, new Date(x.inicio).getTime(), new Date(x.inicio).getTime() + DUR_SESSAO * 60000));
    if (s) return `Conflito de agenda: já existe a sessão de ${curto((s.pacientes as unknown as { nome: string } | null)?.nome || "outro paciente")} em ${fmtQuando(new Date(s.inicio))}.`;
    // No passado só importa não duplicar sessão; o resto vale para o que ainda vai acontecer.
    if (t1 < Date.now()) continue;
    const fora = semana?.length ? foraDoExpediente(semana as DiaSemana[], new Date(t0), durMin) : null;
    if (fora) return fora;
    const p = (peds ?? []).find((x) => x.id !== ign.pedidoId && (x.status === "confirmado" || new Date(x.criado_em).getTime() > limite) && sobrepoe(t0, t1, new Date(x.inicio).getTime(), new Date(x.inicio).getTime() + durConversa * 60000));
    if (p) return `Conflito de agenda: há uma conversa inicial ${p.status === "confirmado" ? "confirmada" : "pedida"} com ${curto(p.nome)} em ${fmtQuando(new Date(p.inicio))}.`;
    const b = (blq ?? []).find((x) => sobrepoe(t0, t1, new Date(x.inicio).getTime(), new Date(x.fim).getTime()));
    if (b) {
      if (pularBloqueio) continue; // no bloqueio, a sessão do horário fixo simplesmente não acontece
      return `Conflito de agenda: ${fmtQuando(new Date(t0))} está num bloqueio${b.motivo ? ` (${b.motivo})` : ""}.`;
    }
    if (g === null) return "A agenda do Google não respondeu, então não deu para conferir conflitos. Tente de novo.";
    const ocupado = g.find((x) => sobrepoe(t0, t1, x.inicio.getTime(), x.fim.getTime()) && !(ign.google && ign.google(x)));
    if (ocupado) return `Conflito de agenda: você tem um compromisso na agenda do Google em ${fmtQuando(ocupado.inicio)}.`;
  }
  return null;
}

// Mesmo período (início e fim iguais, com folga de um minuto).
export const mesmoPeriodo = (a: Periodo, inicio: Date, durMin: number) =>
  Math.abs(a.inicio.getTime() - inicio.getTime()) < 60000 && Math.abs(a.fim.getTime() - (inicio.getTime() + durMin * 60000)) < 60000;

// Horário fixo de um paciente: não pode bater com o de outro paciente no mesmo período,
// nem com nada marcado nas próximas semanas.
export async function conflitoFixo(
  sb: SupabaseClient,
  p: { id?: string; fixo_dia: number; fixo_hora: string; desde: string; fim: string | null; antigo?: { dia: number | null; hora: string | null } },
): Promise<string | null> {
  const [h, m] = p.fixo_hora.split(":").map(Number);
  const ini = h * 60 + m;
  const hojeL = local(new Date());
  const hoje = `${hojeL.ano}-${String(hojeL.mes + 1).padStart(2, "0")}-${String(hojeL.dia).padStart(2, "0")}`;

  const { data: outros } = await sb.from("pacientes").select("id, nome, fixo_dia, fixo_hora, desde, fim, status").eq("fixo_dia", p.fixo_dia).not("fixo_hora", "is", null);
  for (const o of outros ?? []) {
    if (o.id === p.id) continue;
    if (o.status !== "ativo" && !(o.fim && o.fim >= hoje)) continue;
    const [oh, om] = String(o.fixo_hora).split(":").map(Number);
    const oIni = oh * 60 + om;
    if (!sobrepoe(ini, ini + DUR_SESSAO, oIni, oIni + DUR_SESSAO)) continue;
    const fimA = p.fim || "9999-12-31";
    const fimB = (o.fim as string | null) || "9999-12-31";
    if (p.desde <= fimB && (o.desde as string) <= fimA) return `Conflito de agenda: ${curto(o.nome as string)} já tem horário fixo nesse dia e hora.`;
  }

  // Próximas ocorrências (até 12 semanas ou o fim) contra o resto da agenda.
  const aPartir = p.desde > hoje ? p.desde : hoje;
  const [a, mm, dd] = aPartir.split("-").map(Number);
  const antigoMin = p.antigo?.hora ? Number(p.antigo.hora.slice(0, 2)) * 60 + Number(p.antigo.hora.slice(3, 5)) : null;
  // A série antiga do próprio paciente ainda aparece no Google: não conta como conflito.
  const proprio = (x: Periodo) => {
    if (p.antigo?.dia == null || antigoMin == null) return false;
    const l = local(x.inicio);
    return l.semana === p.antigo.dia && l.h * 60 + l.min === antigoMin && x.fim.getTime() - x.inicio.getTime() === DUR_SESSAO * 60000;
  };
  const datas: Date[] = [];
  for (let i = 0; i < 120 && datas.length < 12; i++) {
    const d = deLocal(a, mm - 1, dd + i, h, m);
    if (local(d).semana !== p.fixo_dia) continue;
    const l = local(d);
    const dia = `${l.ano}-${String(l.mes + 1).padStart(2, "0")}-${String(l.dia).padStart(2, "0")}`;
    if (p.fim && dia > p.fim) break;
    if (d.getTime() < Date.now()) continue;
    datas.push(d);
  }
  return conflitoLote(sb, datas, DUR_SESSAO, { pacienteId: p.id, google: proprio }, true);
}
