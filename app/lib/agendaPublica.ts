import "server-only";
import { supabaseAdmin } from "./supabase/admin";
import { carregarAgenda, periodos } from "./dados";
import { horariosLivres, local, fmtHora, DIAS, MESES } from "./agenda";
import { ehAdmin } from "./sessao";

// A agenda só abre para o público quando AGENDA_ABERTA=sim estiver na Vercel.
// Antes disso, só a Ritieli, logada no painel, consegue usar.
export async function agendaLiberada() {
  if (process.env.AGENDA_ABERTA === "sim") return true;
  return ehAdmin();
}

export type DiaAgenda = { data: string; rot: string; num: string; mes: string; horarios: { iso: string; h: string; ocupado: boolean }[] };

export async function montarAgenda() {
  const sb = supabaseAdmin();
  const [, { regras, tomados, google: g }] = await Promise.all([sb.rpc("liberar_pedidos_vencidos"), carregarAgenda(sb)]);
  const base = { config: regras.config, semana: regras.semana, bloqueios: periodos(regras.bloqueios) };
  // Todos os horários do expediente (fora dos bloqueios) e, entre eles, os livres.
  const candidatos = horariosLivres({ ...base, ocupados: [] });
  const livres = new Set(horariosLivres({ ...base, ocupados: [...tomados, ...g.periodos] }).map((d) => d.getTime()));

  const dias = new Map<string, DiaAgenda>();
  for (const c of candidatos) {
    const l = local(c);
    const chave = `${l.ano}-${String(l.mes + 1).padStart(2, "0")}-${String(l.dia).padStart(2, "0")}`;
    if (!dias.has(chave)) dias.set(chave, { data: chave, rot: DIAS[l.semana], num: String(l.dia), mes: MESES[l.mes], horarios: [] });
    dias.get(chave)!.horarios.push({ iso: c.toISOString(), h: fmtHora(c), ocupado: !livres.has(c.getTime()) });
  }
  // Só mostra dias com pelo menos um horário livre.
  return { duracao: regras.config.duracao_conversa_min, dias: [...dias.values()].filter((d) => d.horarios.some((h) => !h.ocupado)), livres };
}
