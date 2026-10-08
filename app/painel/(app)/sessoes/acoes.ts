"use server";

import { revalidatePath } from "next/cache";
import { supabaseServidor } from "../../../lib/supabase/servidor";
import { centavosDe, primeiroNome } from "../../../lib/formato";
import { moverOcorrencia, criarEventoUnico, moverEvento, apagarEvento, situacaoOcorrencia, salaDoEvento } from "../../../lib/google";
import { responsaveisDe, contatoPrincipal, type Paciente } from "../../../lib/pacientes";
import { deLocal, fmtQuando, local } from "../../../lib/agenda";
import { conflitoEm, mesmoPeriodo, DUR_SESSAO } from "../../../lib/conflitos";
import { gerarSessoesDoMes, usarCreditos, type StatusSessao, type UsoCredito } from "../../../lib/sessoes";

export type ResSessao = { erro?: string; ok?: string; semDesfazer?: boolean };

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

const quando = (iso: string) => fmtQuando(new Date(iso)).replace(" · ", ", às ");
// Texto curto sobre créditos usados (para a mensagem de retorno).
function textoCreditos(usos: UsoCredito[], aqui?: string) {
  if (!usos.length) return "";
  const outros = usos.filter((u) => u.para !== aqui);
  const nesta = usos.length - outros.length;
  return [
    nesta ? " Ela tinha crédito: esta sessão ficou paga com ele, sem somar de novo no Recebido." : "",
    outros.length ? ` O crédito pagou a sessão de ${outros.map((u) => quando(u.inicio)).join(" e de ")}.` : "",
  ].join("");
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
  const sb = await supabaseServidor();
  const { data: p } = await sb.from("pacientes").select("*").eq("id", d.pacienteId).single<Paciente>();
  if (!p) return { erro: "Paciente não encontrado." };

  if (d.status !== "cancelada") {
    const c = await conflitoEm(sb, inicio, DUR_SESSAO);
    if (c) return { erro: c };
  }

  const { count: creditos } = await sb.from("sessoes").select("id", { count: "exact", head: true }).eq("paciente_id", d.pacienteId).eq("status", "cancelada").not("pago_em", "is", null);
  const temCredito = (creditos ?? 0) > 0;

  const { data: nova, error } = await sb
    .from("sessoes")
    .insert({
      paciente_id: d.pacienteId,
      inicio: inicio.toISOString(),
      status: d.status,
      valor_centavos: valor,
      // Com crédito, a sessão é paga com ele (logo abaixo), e não com um pagamento novo.
      pago_em: d.status !== "cancelada" && d.pago && !temCredito ? new Date().toISOString() : null,
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
  const usos = d.status !== "cancelada" && temCredito ? await usarCreditos(sb, d.pacienteId, nova.id) : [];
  revalidatePath("/painel/sessoes");
  revalidatePath("/painel/pacientes");
  return { ok: `Sessão registrada.${textoCreditos(usos, nova.id)}${aviso}` };
}

// Muda a situação, o pagamento ou o recibo. Também serve para desfazer.
// Cancelar libera o horário (na agenda do Google também); voltar de cancelada confere conflitos.
export async function mudarSessao(id: string, o: { status: StatusSessao; pago: boolean; recibo: boolean }): Promise<ResSessao> {
  if (!STATUS.includes(o.status)) return { erro: "Situação inválida." };
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
  // Pagamento pode vir antes (antecipado) ou depois da sessão; só a cancelada não cobra.
  const pago = o.status !== "cancelada" && o.pago;
  const recibo = pago && o.recibo;
  const mud: Record<string, unknown> = {
    status: o.status,
    pago_em: pago ? atual.pago_em || agora : null,
    recibo_em: recibo ? atual.recibo_em || agora : null,
    atualizado_em: agora,
  };

  let aviso = "";
  let semDesfazer = false;
  // Sessão já paga que é cancelada: o pagamento fica guardado como crédito
  // e, logo depois de salvar, paga a próxima sessão em aberto (se houver).
  if (cancelando && atual.pago_em) {
    mud.pago_em = atual.pago_em;
    mud.recibo_em = atual.recibo_em;
  }
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

  const usos = await usarCreditos(sb, atual.paciente_id);
  revalidatePath("/painel/sessoes");
  revalidatePath("/painel/pacientes");
  if (cancelando && atual.pago_em) {
    const daqui = usos.find((u) => u.de === id);
    const resto = textoCreditos(usos.filter((u) => u.de !== id), id);
    if (daqui) return { ok: `Cancelamento registrado. O pagamento passou para a sessão de ${quando(daqui.inicio)}.${resto}${aviso}`, semDesfazer: true };
    return { ok: `Cancelamento registrado. Ela já estava paga e não há outra sessão em aberto: o pagamento ficou como crédito e paga a próxima sessão que for marcada.${resto}${aviso}`, semDesfazer };
  }
  if (usos.length) semDesfazer = true;
  return { ok: `Salvo.${textoCreditos(usos, id)}${aviso}`, semDesfazer };
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
  const { data: s } = await sb.from("sessoes").select("google_evento_id, origem, pago_em, status").eq("id", id).single();
  if (!s || s.origem !== "manual") return { erro: "Só dá para excluir uma sessão registrada à mão." };
  // Excluir não pode sumir com dinheiro recebido.
  if (s.pago_em) return { erro: s.status === "cancelada" ? "Essa sessão guarda um crédito (pagamento já recebido). Ele é usado sozinho na próxima sessão marcada; por isso ela não pode ser excluída." : "Essa sessão está paga, então não dá para excluir (o pagamento sumiria). Se a paciente desmarcou, use Cancelou: o valor vira crédito. Se foi marcada como paga por engano, toque em Desmarcar pago e depois exclua." };
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

// Pagamento antecipado de várias sessões: marca como pagas as próximas sessões agendadas
// do paciente (criando as dos próximos meses, se ainda não existem).
export async function pagarAdiantado(pacienteId: string, quantas: number): Promise<ResSessao & { ids?: string[] }> {
  const n = Math.floor(quantas);
  if (!pacienteId) return { erro: "Escolha o paciente." };
  if (!(n >= 1 && n <= 24)) return { erro: "Escolha de 1 a 24 sessões." };
  const sb = await supabaseServidor();
  const l = local(new Date());
  for (let i = 0; i < 6; i++) await gerarSessoesDoMes(sb, l.ano + Math.floor((l.mes + i) / 12), (l.mes + i) % 12);
  const { data: livres } = await sb.from("sessoes").select("id, inicio").eq("paciente_id", pacienteId).eq("status", "agendada").is("pago_em", null).gte("inicio", new Date(Date.now() - 12 * 3600000).toISOString()).order("inicio").limit(n);
  if (!livres?.length) return { erro: "Não há sessões agendadas sem pagamento para esse paciente. Confira o horário fixo ou registre as sessões antes." };
  const ids = livres.map((x) => x.id as string);
  const { error } = await sb.from("sessoes").update({ pago_em: new Date().toISOString(), atualizado_em: new Date().toISOString() }).in("id", ids);
  if (error) return { erro: "Não deu para salvar. Tente de novo." };
  revalidatePath("/painel/sessoes");
  revalidatePath("/painel/pacientes");
  const datas = livres.map((x) => fmtQuando(new Date(x.inicio as string)).split(" · ")[0]).join("; ");
  const falta = n - ids.length;
  return { ok: `Pagamento antecipado de ${ids.length} ${ids.length === 1 ? "sessão" : "sessões"}: ${datas}.${falta > 0 ? ` Atenção: só havia ${ids.length} ${ids.length === 1 ? "sessão agendada" : "sessões agendadas"} sem pagamento, então só ${ids.length === 1 ? "ela ficou paga" : "elas ficaram pagas"}. Registre as outras ${falta} sessões e use Pagamento antecipado de novo para elas.` : ""}`, ids };
}

// Desfaz um pagamento antecipado.
export async function desfazerAdiantado(ids: string[]): Promise<ResSessao> {
  if (!ids.length) return { ok: "Nada a desfazer." };
  const sb = await supabaseServidor();
  const { error } = await sb.from("sessoes").update({ pago_em: null, recibo_em: null, atualizado_em: new Date().toISOString() }).in("id", ids).eq("status", "agendada");
  if (error) return { erro: "Não deu para desfazer. Tente de novo." };
  revalidatePath("/painel/sessoes");
  return { ok: "Desfeito." };
}
