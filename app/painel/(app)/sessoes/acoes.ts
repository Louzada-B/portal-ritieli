"use server";

import { revalidatePath } from "next/cache";
import { supabaseServidor } from "../../../lib/supabase/servidor";
import { centavosDe, primeiroNome } from "../../../lib/formato";
import { moverOcorrencia, criarEventoUnico, moverEvento, apagarEvento, situacaoOcorrencia, salaDoEvento } from "../../../lib/google";
import { responsaveisDe, contatoPrincipal, type Paciente } from "../../../lib/pacientes";
import { deLocal, fmtQuando } from "../../../lib/agenda";
import { conflitoEm, mesmoPeriodo, DUR_SESSAO } from "../../../lib/conflitos";
import type { StatusSessao } from "../../../lib/sessoes";

export type ResSessao = { erro?: string; ok?: string };

const STATUS: StatusSessao[] = ["agendada", "realizada", "falta", "cancelada"];
type Sb = Awaited<ReturnType<typeof supabaseServidor>>;

// Evento próprio de uma sessão avulsa na agenda do Google (com a sala do paciente, se houver).
async function eventoAvulso(sb: Sb, p: Paciente, inicio: Date): Promise<string | null> {
  const sala = p.google_evento_id ? await salaDoEvento(p.google_evento_id) : undefined;
  return criarEventoUnico({
    titulo: `Sessão · ${p.nome}`,
    inicio,
    duracaoMin: DUR_SESSAO,
    descricao: `Sessão avulsa registrada pelo painel.${p.meet_link ? `\nSala: ${p.meet_link}` : ""}`,
    conferencia: sala,
  }).catch(() => null);
}

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
  const { data: p } = await sb.from("pacientes").select("*").eq("id", d.pacienteId).single<Paciente>();
  if (!p) return { erro: "Paciente não encontrado." };

  if (d.status !== "cancelada") {
    const c = await conflitoEm(sb, inicio, DUR_SESSAO);
    if (c) return { erro: c };
  }

  const { data: nova, error } = await sb
    .from("sessoes")
    .insert({
      paciente_id: d.pacienteId,
      inicio: inicio.toISOString(),
      status: d.status,
      valor_centavos: valor,
      pago_em: cobrada && d.pago ? new Date().toISOString() : null,
      origem: "manual",
    })
    .select("id")
    .single();
  if (error || !nova) return { erro: error?.code === "23505" ? "Já existe uma sessão desse paciente nesse dia e horário." : "Não deu para salvar. Tente de novo." };

  let aviso = "";
  if (d.status === "agendada" && inicio.getTime() > Date.now()) {
    const ev = await eventoAvulso(sb, p, inicio);
    if (ev) await sb.from("sessoes").update({ google_evento_id: ev }).eq("id", nova.id);
    else aviso = " A agenda do Google não recebeu o evento, mas o horário já está bloqueado no site.";
  }
  revalidatePath("/painel/sessoes");
  return { ok: `Sessão registrada.${aviso}` };
}

// Muda a situação, o pagamento ou o recibo. Também serve para desfazer.
// Cancelar libera o horário (na agenda do Google também); voltar de cancelada confere conflitos.
export async function mudarSessao(id: string, o: { status: StatusSessao; pago: boolean; recibo: boolean }): Promise<ResSessao> {
  if (!STATUS.includes(o.status)) return { erro: "Situação inválida." };
  const cobrada = o.status === "realizada" || o.status === "falta";
  const sb = await supabaseServidor();
  const { data: atual } = await sb.from("sessoes").select("*").eq("id", id).single();
  if (!atual) return { erro: "Sessão não encontrada." };
  const inicio = new Date(atual.inicio);
  const voltando = atual.status === "cancelada" && o.status !== "cancelada";
  const cancelando = atual.status !== "cancelada" && o.status === "cancelada";
  if (voltando) {
    const c = await conflitoEm(sb, inicio, DUR_SESSAO, { sessaoId: id });
    if (c) return { erro: c };
  }

  const agora = new Date().toISOString();
  const pago = cobrada && o.pago;
  const recibo = pago && o.recibo;
  const mud: Record<string, unknown> = {
    status: o.status,
    pago_em: pago ? atual.pago_em || agora : null,
    recibo_em: recibo ? atual.recibo_em || agora : null,
    atualizado_em: agora,
  };

  let aviso = "";
  if ((cancelando || voltando) && inicio.getTime() > Date.now()) {
    const { data: p } = await sb.from("pacientes").select("*").eq("id", atual.paciente_id).single<Paciente>();
    try {
      if (atual.origem === "fixo" && p?.google_evento_id) {
        await situacaoOcorrencia(p.google_evento_id, new Date(atual.remarcada_de || atual.inicio), cancelando);
      } else if (atual.origem === "manual") {
        if (cancelando && atual.google_evento_id) {
          await apagarEvento(atual.google_evento_id);
          mud.google_evento_id = null;
        } else if (voltando && p) {
          const ev = await eventoAvulso(sb, p, inicio);
          if (ev) mud.google_evento_id = ev;
        }
      }
    } catch {
      aviso = " A agenda do Google não acompanhou: confira esse dia por lá.";
    }
  }

  const { error } = await sb.from("sessoes").update(mud).eq("id", id);
  if (error) return { erro: "Não deu para salvar. Tente de novo." };
  revalidatePath("/painel/sessoes");
  return { ok: `Salvo.${aviso}` };
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
  const { data: s } = await sb.from("sessoes").select("google_evento_id, origem").eq("id", id).single();
  if (!s || s.origem !== "manual") return { erro: "Só dá para excluir uma sessão registrada à mão." };
  const { error } = await sb.from("sessoes").delete().eq("id", id).eq("origem", "manual");
  if (error) return { erro: "Não deu para excluir. Tente de novo." };
  if (s.google_evento_id) await apagarEvento(s.google_evento_id).catch(() => {});
  revalidatePath("/painel/sessoes");
  return { ok: "Sessão excluída." };
}

// Remarca uma sessão agendada para outro dia ou horário, sem conflito com nada.
// Do horário fixo: só aquela ocorrência muda na agenda do Google (a sala continua a mesma).
export async function remarcarSessao(id: string, data: string, hora: string): Promise<ResSessao & { para?: string; texto?: string }> {
  const md = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data);
  const mh = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hora);
  if (!md || !mh) return { erro: "Escolha a nova data e o horário." };
  const novo = deLocal(+md[1], +md[2] - 1, +md[3], +mh[1], +mh[2]);
  if (novo.getTime() < Date.now()) return { erro: "Escolha um dia e horário que ainda não passaram." };
  const sb = await supabaseServidor();
  const { data: s } = await sb.from("sessoes").select("*").eq("id", id).single();
  if (!s) return { erro: "Sessão não encontrada." };
  if (s.status !== "agendada") return { erro: "Só dá para remarcar uma sessão agendada." };
  const atual = new Date(s.inicio);
  if (atual.getTime() === novo.getTime()) return { erro: "Escolha um dia ou horário diferente." };

  // O horário atual desta sessão aparece ocupado no Google: não conta como conflito.
  const c = await conflitoEm(sb, novo, DUR_SESSAO, { sessaoId: id, google: (x) => mesmoPeriodo(x, atual, DUR_SESSAO) });
  if (c) return { erro: c };

  const { data: p } = await sb.from("pacientes").select("*").eq("id", s.paciente_id).single<Paciente>();
  if (!p) return { erro: "Paciente não encontrado." };
  const original = new Date(s.remarcada_de || s.inicio);
  const { error } = await sb.from("sessoes").update({ inicio: novo.toISOString(), remarcada_de: original.toISOString(), atualizado_em: new Date().toISOString() }).eq("id", id);
  if (error) return { erro: error.code === "23505" ? "Já existe uma sessão desse paciente nesse dia e horário." : "Não deu para salvar. Tente de novo." };

  let aviso = "";
  try {
    if (s.origem === "fixo" && p.google_evento_id) await moverOcorrencia(p.google_evento_id, original, novo, DUR_SESSAO);
    else if (s.origem === "manual" && s.google_evento_id) await moverEvento(s.google_evento_id, novo, DUR_SESSAO);
    else if (s.origem === "manual") {
      const ev = await eventoAvulso(sb, p, novo);
      if (ev) await sb.from("sessoes").update({ google_evento_id: ev }).eq("id", id);
    }
  } catch {
    aviso = " A agenda do Google não acompanhou: ajuste esse dia por lá. No site, o novo horário já está bloqueado.";
  }
  revalidatePath("/painel/sessoes");
  const resps = await responsaveisDe(sb, p.id);
  const ct = contatoPrincipal(p, resps);
  const antes = fmtQuando(atual).replace(" · ", ", às ");
  const depois = fmtQuando(novo).replace(" · ", ", às ");
  const sala = p.tipo === "adulta" && p.meet_link ? ` A sala é a mesma de sempre: ${p.meet_link}` : "";
  const quem = p.tipo === "crianca" ? `a sessão de ${primeiroNome(p.nome)}` : "nossa sessão";
  const texto = `Olá, ${primeiroNome(ct.nome)}! Aqui é a Ritieli. Combinado: ${quem} de ${antes} passa para ${depois}.${sala}`;
  return { ok: `Sessão remarcada.${aviso}`, para: ct.whatsapp || "", texto };
}
