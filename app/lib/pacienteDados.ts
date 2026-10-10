import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { gerarSessoesDoMes, type Sessao } from "./sessoes";
import { local } from "./agenda";
import type { ConteudoTermo } from "./termoTexto";
import { decifrarOuVazio } from "./cripto";

// Dados que a área da(o) paciente mostra. Tudo sai do servidor, sempre pelo id do paciente já liberado ao login.

export type PedidoPac = { id: string; sessao_id: string | null; sessao_inicio: string; tipo: "remarcar" | "cancelar"; criado_em: string; resolvido_em: string | null };

export async function sessoesDoPaciente(sb: SupabaseClient, pacienteId: string): Promise<Sessao[]> {
  // Garante as sessões do horário fixo dos próximos meses, como o painel faz ao abrir a ficha.
  const l = local(new Date());
  for (let i = 0; i < 3; i++) await gerarSessoesDoMes(sb, l.ano + Math.floor((l.mes + i) / 12), (l.mes + i) % 12);
  const { data } = await sb
    .from("sessoes")
    .select("id, paciente_id, inicio, status, valor_centavos, pago_em, recibo_em, origem, remarcada_de")
    .eq("paciente_id", pacienteId)
    .order("inicio");
  return (data ?? []) as Sessao[];
}

export async function pedidosDoPaciente(sb: SupabaseClient, pacienteId: string): Promise<PedidoPac[]> {
  const { data } = await sb
    .from("pedidos_paciente")
    .select("id, sessao_id, sessao_inicio, tipo, criado_em, resolvido_em")
    .eq("paciente_id", pacienteId)
    .is("resolvido_em", null)
    .order("criado_em", { ascending: false });
  return (data ?? []) as PedidoPac[];
}

export async function configPix(sb: SupabaseClient) {
  const { data } = await sb.from("config_agenda").select("pix_chave, pix_nome, pix_cidade").eq("id", 1).maybeSingle();
  return { chave: (data?.pix_chave as string | null) || null, nome: (data?.pix_nome as string) || "Ritieli Hermes", cidade: (data?.pix_cidade as string) || "Porto Alegre" };
}

export async function termoAceito(sb: SupabaseClient, pacienteId: string): Promise<{ aceitoEm: string; conteudo: ConteudoTermo | null } | null> {
  const { data } = await sb
    .from("termos")
    .select("aceito_em, conteudo_cripto")
    .eq("paciente_id", pacienteId)
    .eq("status", "aceito")
    .order("aceito_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data?.aceito_em) return null;
  let conteudo: ConteudoTermo | null = null;
  try {
    conteudo = JSON.parse(decifrarOuVazio(data.conteudo_cripto as string));
  } catch {
    conteudo = null;
  }
  return { aceitoEm: data.aceito_em as string, conteudo };
}

// Valor de uma sessão: o dela, ou o combinado com o paciente.
export const valorDe = (s: Pick<Sessao, "valor_centavos">, padrao: number | null) => s.valor_centavos ?? padrao ?? 0;
