// Regras da agenda da conversa inicial, compartilhadas entre o site e o painel.
// O Brasil não tem horário de verão desde 2019, então Brasília é sempre UTC−3.

export const FUSO_MS = 3 * 60 * 60 * 1000;

export type Config = { antecedencia_horas: number; janela_dias: number; duracao_conversa_min: number };
export type DiaSemana = {
  dia_semana: number;
  ativo: boolean;
  inicio: string;
  fim: string;
  pausa_inicio: string | null;
  pausa_fim: string | null;
};
export type Periodo = { inicio: Date; fim: Date; titulo?: string; evento?: string }; // evento: id da série (ou do evento) no Google

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DIAS_LONGOS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

// "Relógio de Brasília" de um instante: usa os getters UTC sobre o instante deslocado.
export function local(d: Date) {
  const x = new Date(d.getTime() - FUSO_MS);
  return { ano: x.getUTCFullYear(), mes: x.getUTCMonth(), dia: x.getUTCDate(), semana: x.getUTCDay(), h: x.getUTCHours(), min: x.getUTCMinutes() };
}

// Instante a partir de uma data e hora de Brasília.
export function deLocal(ano: number, mes: number, dia: number, h = 0, min = 0) {
  return new Date(Date.UTC(ano, mes, dia, h, min) + FUSO_MS);
}

export function minutos(hora: string) {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function hhmm(totalMin: number) {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function fmtHora(d: Date) {
  const l = local(d);
  return hhmm(l.h * 60 + l.min);
}

// "Qui, 8 de outubro · 10:00"
export function fmtQuando(d: Date) {
  const l = local(d);
  return `${DIAS[l.semana]}, ${l.dia} de ${MESES[l.mes]} · ${fmtHora(d)}`;
}

// "Quinta, 8 de outubro"
export function fmtDiaLongo(d: Date) {
  const l = local(d);
  return `${DIAS_LONGOS[l.semana]}, ${l.dia} de ${MESES[l.mes]}`;
}

export function fmtDiaCurto(d: Date) {
  const l = local(d);
  return `${DIAS[l.semana]}, ${l.dia} ${MESES[l.mes].slice(0, 3)}`;
}

export { DIAS, DIAS_LONGOS, MESES };

const sobrepoe = (a0: number, a1: number, b0: number, b1: number) => a0 < b1 && a1 > b0;

// Lista os inícios de horários livres para a conversa inicial.
// Um horário começa a cada hora cheia dentro do expediente do dia.
export function horariosLivres(opts: {
  config: Config;
  semana: DiaSemana[];
  bloqueios: Periodo[];
  ocupados: Periodo[];
  agora?: Date;
}): Date[] {
  const { config, semana, bloqueios, ocupados } = opts;
  const agora = opts.agora ?? new Date();
  const limiteMin = agora.getTime() + config.antecedencia_horas * 3600 * 1000;
  const dur = config.duracao_conversa_min * 60 * 1000;
  const hoje = local(agora);
  const travas = [...bloqueios, ...ocupados].map((p) => [p.inicio.getTime(), p.fim.getTime()] as const);
  const livres: Date[] = [];

  for (let i = 0; i <= config.janela_dias; i++) {
    const base = deLocal(hoje.ano, hoje.mes, hoje.dia + i);
    const l = local(base);
    const dia = semana.find((s) => s.dia_semana === l.semana);
    if (!dia || !dia.ativo) continue;
    const ini = minutos(dia.inicio);
    const fim = minutos(dia.fim);
    const pIni = dia.pausa_inicio ? minutos(dia.pausa_inicio) : null;
    const pFim = dia.pausa_fim ? minutos(dia.pausa_fim) : null;
    for (let m = ini; m + config.duracao_conversa_min <= fim; m += 60) {
      if (pIni !== null && pFim !== null && sobrepoe(m, m + config.duracao_conversa_min, pIni, pFim)) continue;
      const comeco = deLocal(l.ano, l.mes, l.dia, Math.floor(m / 60), m % 60);
      const t0 = comeco.getTime();
      if (t0 < limiteMin) continue;
      if (travas.some(([a, b]) => sobrepoe(t0, t0 + dur, a, b))) continue;
      livres.push(comeco);
    }
  }
  return livres;
}
