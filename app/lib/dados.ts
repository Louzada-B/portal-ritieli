import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Config, DiaSemana, Periodo } from "./agenda";

export type Bloqueio = { id: string; inicio: string; fim: string; motivo: string | null };

export type Pedido = {
  id: string;
  para_quem: "mim" | "filho";
  nome: string;
  whatsapp: string;
  email: string;
  idade_crianca: number | null;
  mensagem: string | null;
  inicio: string;
  status: "aguardando" | "confirmado" | "recusado" | "liberado";
  aceite_politica_em: string;
  meet_link: string | null;
  google_evento_id: string | null;
  criado_em: string;
  respondido_em: string | null;
  liberado_em: string | null;
};

export const PRAZO_HORAS = 48;

// Regras da agenda. Funciona com o cliente logado (painel) ou com o do servidor (site).
export async function carregarRegras(sb: SupabaseClient) {
  const agora = new Date().toISOString();
  const [c, s, b] = await Promise.all([
    sb.from("config_agenda").select("antecedencia_horas, janela_dias, duracao_conversa_min").eq("id", 1).single(),
    sb.from("semana_padrao").select("*").order("dia_semana"),
    sb.from("bloqueios").select("id, inicio, fim, motivo").gte("fim", agora).order("inicio"),
  ]);
  if (c.error) throw c.error;
  if (s.error) throw s.error;
  if (b.error) throw b.error;
  return {
    config: c.data as Config,
    semana: (s.data as DiaSemana[]).map((d) => ({ ...d, inicio: d.inicio.slice(0, 5), fim: d.fim.slice(0, 5), pausa_inicio: d.pausa_inicio?.slice(0, 5) ?? null, pausa_fim: d.pausa_fim?.slice(0, 5) ?? null })),
    bloqueios: b.data as Bloqueio[],
  };
}

// Horários já tomados por pedidos ativos (aguardando dentro do prazo ou confirmados).
export async function horariosTomados(sb: SupabaseClient, duracaoMin: number): Promise<Periodo[]> {
  const desde = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data, error } = await sb.from("pedidos").select("inicio, status, criado_em").in("status", ["aguardando", "confirmado"]).gte("inicio", desde);
  if (error) throw error;
  const limite = Date.now() - PRAZO_HORAS * 3600 * 1000;
  return (data ?? [])
    .filter((p) => p.status === "confirmado" || new Date(p.criado_em).getTime() > limite)
    .map((p) => {
      const inicio = new Date(p.inicio);
      return { inicio, fim: new Date(inicio.getTime() + duracaoMin * 60 * 1000) };
    });
}

export const periodos = (lista: Bloqueio[]): Periodo[] => lista.map((b) => ({ inicio: new Date(b.inicio), fim: new Date(b.fim) }));
