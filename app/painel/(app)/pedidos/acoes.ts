"use server";

import { revalidatePath } from "next/cache";
import { supabaseServidor } from "../../../lib/supabase/servidor";
import { criarEvento } from "../../../lib/google";
import { PRAZO_HORAS, type Pedido } from "../../../lib/dados";
import { fmtQuando } from "../../../lib/agenda";

export type Resultado = { erro?: string; ok?: string; aviso?: string };

export async function confirmarPedido(id: string, novoInicio?: string): Promise<Resultado> {
  const sb = await supabaseServidor();
  const { data: p, error } = await sb.from("pedidos").select("*").eq("id", id).maybeSingle<Pedido>();
  if (error || !p) return { erro: "Pedido não encontrado." };
  if (p.status !== "aguardando") return { erro: "Este pedido já foi respondido." };
  if (Date.now() - new Date(p.criado_em).getTime() > PRAZO_HORAS * 3600 * 1000) return { erro: "O prazo de 48 horas passou e o horário foi liberado." };

  let inicio = new Date(p.inicio);
  if (novoInicio) {
    const n = new Date(novoInicio);
    if (Number.isNaN(n.getTime()) || n.getTime() < Date.now()) return { erro: "Horário inválido." };
    inicio = n;
  }
  const { data: cfg } = await sb.from("config_agenda").select("duracao_conversa_min").eq("id", 1).single();
  const fim = new Date(inicio.getTime() + (cfg?.duracao_conversa_min ?? 15) * 60 * 1000);

  // Reserva primeiro; a regra do banco impede dois pedidos no mesmo horário.
  const r = await sb
    .from("pedidos")
    .update({ status: "confirmado", inicio: inicio.toISOString(), respondido_em: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "aguardando");
  if (r.error) {
    if (r.error.code === "23505") return { erro: "Esse horário já está ocupado por outro pedido." };
    return { erro: "Não deu para confirmar. Tente de novo." };
  }

  let aviso: string | undefined;
  try {
    const quem = p.para_quem === "filho" ? `${p.nome} (responsável, criança de ${p.idade_crianca} anos)` : p.nome;
    const ev = await criarEvento({
      id: p.id.replace(/-/g, ""),
      titulo: `Conversa inicial · ${p.nome}`,
      inicio,
      fim,
      descricao: `Conversa inicial gratuita marcada pelo site.\n${quem}\nWhatsApp: ${p.whatsapp}\nE-mail: ${p.email}`,
    });
    if (ev) {
      await sb.from("pedidos").update({ meet_link: ev.meet, google_evento_id: ev.id }).eq("id", id);
      if (!ev.meet) aviso = "O evento foi para a sua agenda, mas o Google não criou a sala do Meet. Coloque o link na mensagem antes de enviar.";
    } else {
      aviso = "Sem o Google Agenda conectado, a sala do Meet não foi criada. Coloque o link da chamada na mensagem antes de enviar.";
    }
  } catch {
    aviso = "O horário está confirmado, mas o Google Agenda não respondeu. Crie a sala do Meet à mão e coloque o link na mensagem.";
  }
  revalidatePath("/painel", "layout");
  return { ok: `Confirmado para ${fmtQuando(inicio)}.`, aviso };
}

export async function recusarPedido(id: string): Promise<Resultado> {
  const sb = await supabaseServidor();
  const { error, count } = await sb
    .from("pedidos")
    .update({ status: "recusado", respondido_em: new Date().toISOString() }, { count: "exact" })
    .eq("id", id)
    .eq("status", "aguardando");
  if (error || !count) return { erro: "Não deu para recusar. Talvez ele já tenha sido respondido." };
  revalidatePath("/painel", "layout");
  return { ok: "Pedido recusado. O horário voltou para o site." };
}
