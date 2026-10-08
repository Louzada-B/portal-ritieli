"use server";

import { revalidatePath } from "next/cache";
import { supabaseServidor } from "../../../lib/supabase/servidor";
import { centavosDe, primeiroNome } from "../../../lib/formato";
import { moverOcorrencia } from "../../../lib/google";
import { responsaveisDe, contatoPrincipal, type Paciente } from "../../../lib/pacientes";
import { deLocal, fmtQuando } from "../../../lib/agenda";
import type { StatusSessao } from "../../../lib/sessoes";

export type ResSessao = { erro?: string; ok?: string };

const STATUS: StatusSessao[] = ["agendada", "realizada", "falta", "cancelada"];

export async function registrarSessao(d: { pacienteId: string; data: string; hora: string; status: StatusSessao; valor: string; pago: boolean }): Promise<ResSessao> {
  if (!d.pacienteId) return { erro: "Escolha o paciente." };
  const md = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d.data);
  const mh = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(d.hora);
  if (!md) return { erro: "Escolha a data da sessão no calendário." };
  if (!mh) return { erro: "Escolha o horário." };
  if (!STATUS.includes(d.status)) return { erro: "Situação inválida." };
  const valor = d.valor.trim() ? centavosDe(d.valor) : null;
  if (d.valor.trim() && valor == null) return { erro: "Confira o valor." };
  const inicio = deLocal(+md[1], +md[2] - 1, +md[3], +mh[1], +mh[2]);
  const cobrada = d.status === "realizada" || d.status === "falta";
  const sb = await supabaseServidor();
  const { error } = await sb.from("sessoes").insert({
    paciente_id: d.pacienteId,
    inicio: inicio.toISOString(),
    status: d.status,
    valor_centavos: valor,
    pago_em: cobrada && d.pago ? new Date().toISOString() : null,
    origem: "manual",
  });
  if (error) return { erro: error.code === "23505" ? "Já existe uma sessão desse paciente nesse dia e horário." : "Não deu para salvar. Tente de novo." };
  revalidatePath("/painel/sessoes");
  return { ok: "Sessão registrada." };
}

// Muda a situação, o pagamento ou o recibo. Também serve para desfazer.
export async function mudarSessao(id: string, o: { status: StatusSessao; pago: boolean; recibo: boolean }): Promise<ResSessao> {
  if (!STATUS.includes(o.status)) return { erro: "Situação inválida." };
  const cobrada = o.status === "realizada" || o.status === "falta";
  const sb = await supabaseServidor();
  const { data: atual } = await sb.from("sessoes").select("pago_em, recibo_em").eq("id", id).single();
  if (!atual) return { erro: "Sessão não encontrada." };
  const agora = new Date().toISOString();
  const pago = cobrada && o.pago;
  const recibo = pago && o.recibo;
  const { error } = await sb
    .from("sessoes")
    .update({
      status: o.status,
      pago_em: pago ? atual.pago_em || agora : null,
      recibo_em: recibo ? atual.recibo_em || agora : null,
      atualizado_em: agora,
    })
    .eq("id", id);
  if (error) return { erro: "Não deu para salvar. Tente de novo." };
  revalidatePath("/painel/sessoes");
  return { ok: "Salvo." };
}

export async function mudarValorSessao(id: string, valor: string): Promise<ResSessao> {
  const v = centavosDe(valor);
  if (v == null) return { erro: "Confira o valor." };
  const sb = await supabaseServidor();
  const { error } = await sb.from("sessoes").update({ valor_centavos: v, atualizado_em: new Date().toISOString() }).eq("id", id);
  if (error) return { erro: "Não deu para salvar. Tente de novo." };
  revalidatePath("/painel/sessoes");
  return { ok: "Valor atualizado." };
}

export async function excluirSessao(id: string): Promise<ResSessao> {
  const sb = await supabaseServidor();
  const { error } = await sb.from("sessoes").delete().eq("id", id).eq("origem", "manual");
  if (error) return { erro: "Não deu para excluir. Tente de novo." };
  revalidatePath("/painel/sessoes");
  return { ok: "Sessão excluída." };
}

// Remarca uma sessão agendada para outro dia ou horário. Se ela vem do horário fixo,
// só aquela ocorrência muda na agenda do Google (a sala continua a mesma).
export async function remarcarSessao(id: string, data: string, hora: string): Promise<ResSessao & { para?: string; texto?: string }> {
  const md = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data);
  const mh = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hora);
  if (!md || !mh) return { erro: "Escolha a nova data e o horário." };
  const novo = deLocal(+md[1], +md[2] - 1, +md[3], +mh[1], +mh[2]);
  const sb = await supabaseServidor();
  const { data: s } = await sb.from("sessoes").select("id, paciente_id, inicio, status, origem, remarcada_de").eq("id", id).single();
  if (!s) return { erro: "Sessão não encontrada." };
  if (s.status !== "agendada") return { erro: "Só dá para remarcar uma sessão agendada." };
  if (new Date(s.inicio).getTime() === novo.getTime()) return { erro: "Escolha um dia ou horário diferente." };
  const { data: p } = await sb.from("pacientes").select("*").eq("id", s.paciente_id).single<Paciente>();
  if (!p) return { erro: "Paciente não encontrado." };
  const original = new Date(s.remarcada_de || s.inicio);
  const { error } = await sb.from("sessoes").update({ inicio: novo.toISOString(), remarcada_de: original.toISOString(), atualizado_em: new Date().toISOString() }).eq("id", id);
  if (error) return { erro: error.code === "23505" ? "Já existe uma sessão desse paciente nesse dia e horário." : "Não deu para salvar. Tente de novo." };

  let aviso = "";
  if (s.origem === "fixo" && p.google_evento_id) {
    try {
      await moverOcorrencia(p.google_evento_id, original, novo, 50);
    } catch {
      aviso = " A agenda do Google não acompanhou: ajuste esse dia por lá.";
    }
  }
  revalidatePath("/painel/sessoes");
  const resps = await responsaveisDe(sb, p.id);
  const c = contatoPrincipal(p, resps);
  const antes = fmtQuando(new Date(s.inicio)).replace(" · ", ", às ");
  const depois = fmtQuando(novo).replace(" · ", ", às ");
  const sala = p.tipo === "adulta" && p.meet_link ? ` A sala é a mesma de sempre: ${p.meet_link}` : "";
  const quem = p.tipo === "crianca" ? `a sessão de ${primeiroNome(p.nome)}` : "nossa sessão";
  const texto = `Olá, ${primeiroNome(c.nome)}! Aqui é a Ritieli. Combinado: ${quem} de ${antes} passa para ${depois}.${sala}`;
  return { ok: `Sessão remarcada.${aviso}`, para: c.whatsapp || "", texto };
}
