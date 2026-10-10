"use server";

import { revalidatePath } from "next/cache";
import { supabaseServidor } from "../../lib/supabase/servidor";
import { ehAdmin } from "../../lib/sessao";
import { responsaveisDe, contatoPrincipal, type Paciente } from "../../lib/pacientes";
import { fmtQuando } from "../../lib/agenda";
import { emailPedidoRespondido } from "../../lib/emails";
import { mudarSessao, remarcarSessao } from "./sessoes/acoes";

type Res = { erro?: string; ok?: string };
const NEGADO: Res = { erro: "Sessão expirada. Entre de novo no painel." };

type Pedido = { id: string; paciente_id: string; sessao_id: string | null; sessao_inicio: string | null; tipo: "remarcar" | "cancelar"; resolvido_em: string | null };

async function carregar(id: string) {
  const sb = await supabaseServidor();
  const { data } = await sb.from("pedidos_paciente").select("id, paciente_id, sessao_id, sessao_inicio, tipo, resolvido_em").eq("id", id).maybeSingle();
  return { sb, pedido: data as Pedido | null };
}

// Fecha o pedido e avisa a paciente por e-mail (curto, sem dado clínico). Se o e-mail falhar, o pedido continua resolvido.
async function fechar(sb: Awaited<ReturnType<typeof supabaseServidor>>, pedido: Pedido, resultado: "confirmado" | "recusado", novoHorario?: string): Promise<string> {
  const { error } = await sb.from("pedidos_paciente").update({ resolvido_em: new Date().toISOString(), resultado }).eq("id", pedido.id);
  if (error) return "";
  revalidatePath("/painel");
  revalidatePath("/painel/sessoes");
  const { data: p } = await sb.from("pacientes").select("*").eq("id", pedido.paciente_id).maybeSingle<Paciente>();
  if (!p) return "";
  const ct = contatoPrincipal(p, await responsaveisDe(sb, p.id));
  if (!ct.email) return " A paciente não tem e-mail cadastrado: avise por outro meio.";
  const ok = await emailPedidoRespondido({
    para: ct.email,
    nome: ct.nome,
    tipo: pedido.tipo,
    resultado,
    sessao: pedido.sessao_inicio ? fmtQuando(new Date(pedido.sessao_inicio)).replace(" · ", ", às ") : "",
    novoHorario,
  });
  return ok ? ` A paciente recebeu um e-mail avisando.` : " O e-mail para a paciente não saiu: avise por outro meio.";
}

// Só marca como resolvido (quando a Ritieli já tratou por fora).
export async function resolverPedidoPaciente(id: string): Promise<Res> {
  if (!(await ehAdmin())) return NEGADO;
  const sb = await supabaseServidor();
  const { error } = await sb.from("pedidos_paciente").update({ resolvido_em: new Date().toISOString() }).eq("id", id);
  if (error) return { erro: "Não deu para marcar como resolvido." };
  revalidatePath("/painel");
  return { ok: "Pedido resolvido." };
}

// Cancelamento: confirma e já cancela a sessão (cancelada com 24 h, sem cobrança).
export async function confirmarCancelamentoPedido(id: string): Promise<Res> {
  if (!(await ehAdmin())) return NEGADO;
  const { sb, pedido } = await carregar(id);
  if (!pedido || pedido.resolvido_em) return { erro: "Esse pedido já foi resolvido." };
  if (pedido.tipo !== "cancelar") return { erro: "Esse pedido é de remarcação." };
  if (pedido.sessao_id) {
    const { data: s } = await sb.from("sessoes").select("status, pago_em, recibo_em").eq("id", pedido.sessao_id).maybeSingle();
    if (s && s.status !== "cancelada") {
      const r = await mudarSessao(pedido.sessao_id, { status: "cancelada", pago: !!s.pago_em, recibo: !!s.recibo_em });
      if (r.erro) return r;
    }
  }
  const aviso = await fechar(sb, pedido, "confirmado");
  return { ok: `Sessão cancelada e pedido resolvido.${aviso}` };
}

// Remarcação: escolhe o novo horário ali mesmo (com a checagem de conflito da tela Sessões).
export async function confirmarRemarcacaoPedido(id: string, data: string, hora: string): Promise<Res> {
  if (!(await ehAdmin())) return NEGADO;
  const { sb, pedido } = await carregar(id);
  if (!pedido || pedido.resolvido_em) return { erro: "Esse pedido já foi resolvido." };
  if (pedido.tipo !== "remarcar" || !pedido.sessao_id) return { erro: "Esse pedido não tem uma sessão para remarcar." };
  const r = await remarcarSessao(pedido.sessao_id, data, hora);
  if (r.erro) return { erro: r.erro };
  const { data: s } = await sb.from("sessoes").select("inicio").eq("id", pedido.sessao_id).maybeSingle();
  const aviso = await fechar(sb, pedido, "confirmado", s ? fmtQuando(new Date(s.inicio as string)).replace(" · ", ", às ") : undefined);
  return { ok: `Sessão remarcada e pedido resolvido.${aviso}` };
}

// Recusa: a sessão fica como está e a paciente é avisada.
export async function recusarPedido(id: string): Promise<Res> {
  if (!(await ehAdmin())) return NEGADO;
  const { sb, pedido } = await carregar(id);
  if (!pedido || pedido.resolvido_em) return { erro: "Esse pedido já foi resolvido." };
  const aviso = await fechar(sb, pedido, "recusado");
  return { ok: `Pedido recusado.${aviso}` };
}
