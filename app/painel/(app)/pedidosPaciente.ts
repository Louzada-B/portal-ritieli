"use server";

import { revalidatePath } from "next/cache";
import { supabaseServidor } from "../../lib/supabase/servidor";
import { ehAdmin } from "../../lib/sessao";

// Marca como resolvido um pedido de remarcação ou cancelamento feito na área da paciente.
export async function resolverPedidoPaciente(id: string): Promise<{ erro?: string; ok?: string }> {
  if (!(await ehAdmin())) return { erro: "Sessão expirada. Entre de novo no painel." };
  const sb = await supabaseServidor();
  const { error } = await sb.from("pedidos_paciente").update({ resolvido_em: new Date().toISOString() }).eq("id", id);
  if (error) return { erro: "Não deu para marcar como resolvido." };
  revalidatePath("/painel");
  return { ok: "Pedido resolvido." };
}
