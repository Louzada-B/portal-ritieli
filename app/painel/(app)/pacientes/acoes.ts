"use server";

import { revalidatePath } from "next/cache";
import { supabaseServidor } from "../../../lib/supabase/servidor";
import { cifrar, decifrarOuVazio, novoToken } from "../../../lib/cripto";
import { cpfValido, cpfFormatado, soDigitos, normalizarFone, centavosDe, primeiroNome, fixoTexto } from "../../../lib/formato";
import { responsaveisDe, contatoPrincipal, type Paciente } from "../../../lib/pacientes";
import { criarEventoSemanal, apagarEvento } from "../../../lib/google";
import { local, deLocal } from "../../../lib/agenda";
import { siteUrl } from "../../../site";

export type Resultado = { erro?: string; ok?: string; id?: string; link?: string; para?: string; texto?: string; valor?: string };

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export type DadosNovo = {
  tipo: "adulta" | "crianca";
  nome: string;
  idade: string;
  whatsapp: string;
  email: string;
  cpf: string;
  rNome: string;
  rParentesco: string;
  rWhatsapp: string;
  rEmail: string;
  rCpf: string;
  valor: string;
  tipoValor: "normal" | "social";
  fixoDia: string;
  fixoHora: string;
  pedidoId?: string;
};

function validarComum(d: { valor: string; fixoDia: string; fixoHora: string }) {
  const valor = d.valor.trim() ? centavosDe(d.valor) : null;
  if (d.valor.trim() && valor == null) return { erro: "Confira o valor da sessão." };
  const temFixo = d.fixoDia !== "" && d.fixoHora !== "";
  if ((d.fixoDia !== "") !== (d.fixoHora !== "")) return { erro: "Escolha o dia e o horário fixos, ou deixe os dois em branco." };
  if (temFixo && !HORA.test(d.fixoHora)) return { erro: "Horário fixo inválido." };
  return { valor, fixoDia: temFixo ? Number(d.fixoDia) : null, fixoHora: temFixo ? d.fixoHora : null };
}

export async function criarPaciente(d: DadosNovo): Promise<Resultado> {
  if (d.nome.trim().length < 2) return { erro: "Escreva o nome do paciente." };
  const comum = validarComum(d);
  if ("erro" in comum) return { erro: comum.erro };
  const sb = await supabaseServidor();

  const base = {
    tipo: d.tipo,
    nome: d.nome.trim(),
    valor_centavos: comum.valor,
    tipo_valor: d.tipoValor,
    fixo_dia: comum.fixoDia,
    fixo_hora: comum.fixoHora,
    pedido_id: d.pedidoId || null,
  };

  if (d.tipo === "adulta") {
    const wa = d.whatsapp.trim() ? normalizarFone(d.whatsapp) : null;
    if (d.whatsapp.trim() && !wa) return { erro: "Confira o WhatsApp, com DDD." };
    if (d.email.trim() && !EMAIL.test(d.email.trim())) return { erro: "Confira o e-mail." };
    if (d.cpf.trim() && !cpfValido(d.cpf)) return { erro: "CPF inválido." };
    const cpf = soDigitos(d.cpf);
    const { data, error } = await sb
      .from("pacientes")
      .insert({ ...base, whatsapp: wa, email: d.email.trim().toLowerCase() || null, cpf_cripto: cpf ? cifrar(cpf) : null, cpf_final: cpf ? cpf.slice(-2) : null })
      .select("id")
      .single();
    if (error) return { erro: "Não deu para salvar. Tente de novo." };
    revalidatePath("/painel/pacientes");
    return { ok: "Paciente salvo.", id: data.id };
  }

  const idade = parseInt(soDigitos(d.idade), 10);
  if (!idade || idade < 1 || idade > 17) return { erro: "Confira a idade da criança ou do adolescente." };
  if (d.rNome.trim().length < 2) return { erro: "Escreva o nome do responsável." };
  const rWa = d.rWhatsapp.trim() ? normalizarFone(d.rWhatsapp) : null;
  if (d.rWhatsapp.trim() && !rWa) return { erro: "Confira o WhatsApp do responsável, com DDD." };
  if (d.rEmail.trim() && !EMAIL.test(d.rEmail.trim())) return { erro: "Confira o e-mail do responsável." };
  if (d.rCpf.trim() && !cpfValido(d.rCpf)) return { erro: "CPF do responsável inválido." };
  const rCpf = soDigitos(d.rCpf);

  const { data: pac, error } = await sb.from("pacientes").insert({ ...base, idade }).select("id").single();
  if (error) return { erro: "Não deu para salvar. Tente de novo." };
  const { data: resp, error: e2 } = await sb
    .from("responsaveis")
    .insert({ nome: d.rNome.trim(), whatsapp: rWa, email: d.rEmail.trim().toLowerCase() || null, cpf_cripto: rCpf ? cifrar(rCpf) : null, cpf_final: rCpf ? rCpf.slice(-2) : null })
    .select("id")
    .single();
  if (e2) return { erro: "O paciente foi salvo, mas o responsável não. Adicione na ficha." , id: pac.id };
  await sb.from("paciente_responsaveis").insert({ paciente_id: pac.id, responsavel_id: resp.id, parentesco: d.rParentesco.trim() || null, financeiro: true, legal: true, ordem: 1 });
  revalidatePath("/painel/pacientes");
  return { ok: "Paciente salvo.", id: pac.id };
}

export async function atualizarPaciente(id: string, d: { nome: string; idade: string; whatsapp: string; email: string; valor: string; tipoValor: "normal" | "social"; fixoDia: string; fixoHora: string }): Promise<Resultado> {
  if (d.nome.trim().length < 2) return { erro: "Escreva o nome." };
  const comum = validarComum(d);
  if ("erro" in comum) return { erro: comum.erro };
  const wa = d.whatsapp.trim() ? normalizarFone(d.whatsapp) : null;
  if (d.whatsapp.trim() && !wa) return { erro: "Confira o WhatsApp, com DDD." };
  if (d.email.trim() && !EMAIL.test(d.email.trim())) return { erro: "Confira o e-mail." };
  const idade = d.idade.trim() ? parseInt(soDigitos(d.idade), 10) : null;
  const sb = await supabaseServidor();
  const { data: atual } = await sb.from("pacientes").select("fixo_dia, fixo_hora, google_evento_id").eq("id", id).single();
  const { error } = await sb
    .from("pacientes")
    .update({
      nome: d.nome.trim(),
      idade,
      whatsapp: wa,
      email: d.email.trim().toLowerCase() || null,
      valor_centavos: comum.valor,
      tipo_valor: d.tipoValor,
      fixo_dia: comum.fixoDia,
      fixo_hora: comum.fixoHora,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { erro: "Não deu para salvar. Tente de novo." };
  revalidatePath("/painel/pacientes");
  const mudouFixo = atual && (atual.fixo_dia !== comum.fixoDia || (atual.fixo_hora || "").slice(0, 5) !== (comum.fixoHora || ""));
  return { ok: mudouFixo && atual?.google_evento_id ? "Salvo. O horário fixo mudou: gere a sala de novo para a agenda acompanhar." : "Salvo." };
}

// Link pessoal da ficha de cadastro (vale 7 dias) e a mensagem pronta para o WhatsApp.
export async function linkFicha(id: string): Promise<Resultado> {
  const sb = await supabaseServidor();
  const { data: p } = await sb.from("pacientes").select("*").eq("id", id).single<Paciente>();
  if (!p) return { erro: "Paciente não encontrado." };
  const resps = await responsaveisDe(sb, id);
  const c = contatoPrincipal(p, resps);
  const { token, hash } = novoToken();
  const { error } = await sb.from("fichas").insert({ paciente_id: id, token_hash: hash, expira_em: new Date(Date.now() + 7 * 86400000).toISOString() });
  if (error) return { erro: "Não deu para gerar o link. Tente de novo." };
  const link = `${siteUrl}/cadastro/${token}`;
  const texto = `Olá, ${primeiroNome(c.nome)}! Aqui é a Ritieli. Para organizarmos o início do acompanhamento, preencha a ficha de cadastro neste link pessoal (leva uns 3 minutos e vale por 7 dias): ${link}`;
  return { ok: "Link gerado.", link, para: c.whatsapp || "", texto };
}

export async function verCpf(id: string, quem: "paciente" | "responsavel"): Promise<Resultado> {
  const sb = await supabaseServidor();
  const tabela = quem === "paciente" ? "pacientes" : "responsaveis";
  const { data } = await sb.from(tabela).select("cpf_cripto").eq("id", id).single();
  if (!data?.cpf_cripto) return { erro: "CPF não informado." };
  return { valor: cpfFormatado(decifrarOuVazio(data.cpf_cripto)) };
}

export async function verPessoais(id: string): Promise<{ nascimento: string; emergencia: string }> {
  const sb = await supabaseServidor();
  const { data } = await sb.from("pacientes").select("nascimento_cripto, emergencia_cripto").eq("id", id).single();
  return { nascimento: decifrarOuVazio(data?.nascimento_cripto), emergencia: decifrarOuVazio(data?.emergencia_cripto) };
}

export async function salvarCpf(id: string, quem: "paciente" | "responsavel", cpf: string): Promise<Resultado> {
  if (!cpfValido(cpf)) return { erro: "CPF inválido." };
  const c = soDigitos(cpf);
  const sb = await supabaseServidor();
  const { error } = await sb.from(quem === "paciente" ? "pacientes" : "responsaveis").update({ cpf_cripto: cifrar(c), cpf_final: c.slice(-2) }).eq("id", id);
  if (error) return { erro: "Não deu para salvar. Tente de novo." };
  revalidatePath("/painel/pacientes");
  return { ok: "CPF salvo." };
}

export async function adicionarResponsavel(pacienteId: string, d: { nome: string; parentesco: string; whatsapp: string; email: string; cpf: string; financeiro: boolean }): Promise<Resultado> {
  if (d.nome.trim().length < 2) return { erro: "Escreva o nome do responsável." };
  const wa = d.whatsapp.trim() ? normalizarFone(d.whatsapp) : null;
  if (d.whatsapp.trim() && !wa) return { erro: "Confira o WhatsApp, com DDD." };
  if (d.email.trim() && !EMAIL.test(d.email.trim())) return { erro: "Confira o e-mail." };
  if (d.cpf.trim() && !cpfValido(d.cpf)) return { erro: "CPF inválido." };
  const c = soDigitos(d.cpf);
  const sb = await supabaseServidor();
  const { data: r, error } = await sb
    .from("responsaveis")
    .insert({ nome: d.nome.trim(), whatsapp: wa, email: d.email.trim().toLowerCase() || null, cpf_cripto: c ? cifrar(c) : null, cpf_final: c ? c.slice(-2) : null })
    .select("id")
    .single();
  if (error) return { erro: "Não deu para salvar. Tente de novo." };
  const { count } = await sb.from("paciente_responsaveis").select("responsavel_id", { count: "exact", head: true }).eq("paciente_id", pacienteId);
  await sb.from("paciente_responsaveis").insert({ paciente_id: pacienteId, responsavel_id: r.id, parentesco: d.parentesco.trim() || null, financeiro: d.financeiro, legal: true, ordem: (count ?? 0) + 1 });
  revalidatePath("/painel/pacientes");
  return { ok: "Responsável adicionado." };
}

function proximaOcorrencia(dia: number, hora: string) {
  const agora = new Date();
  const hoje = local(agora);
  const [h, m] = hora.split(":").map(Number);
  for (let i = 0; i < 8; i++) {
    const d = deLocal(hoje.ano, hoje.mes, hoje.dia + i, h, m);
    if (local(d).semana === dia && d.getTime() > agora.getTime()) return d;
  }
  return deLocal(hoje.ano, hoje.mes, hoje.dia + 7, h, m);
}

// Cria (ou recria) a sessão semanal na agenda da Ritieli, com a sala do Meet.
export async function gerarSala(id: string): Promise<Resultado> {
  const sb = await supabaseServidor();
  const { data: p } = await sb.from("pacientes").select("*").eq("id", id).single<Paciente>();
  if (!p) return { erro: "Paciente não encontrado." };
  if (p.fixo_dia == null || !p.fixo_hora) return { erro: "Defina o horário fixo antes de gerar a sala." };
  try {
    if (p.google_evento_id) await apagarEvento(p.google_evento_id).catch(() => {});
    const ev = await criarEventoSemanal({
      chave: `${p.id.replace(/-/g, "")}${Date.now()}`,
      titulo: `Sessão · ${p.nome}`,
      inicio: proximaOcorrencia(p.fixo_dia, p.fixo_hora.slice(0, 5)),
      duracaoMin: 50,
      descricao: `Sessão semanal (${fixoTexto(p.fixo_dia, p.fixo_hora)}). Criada pelo painel.`,
    });
    await sb.from("pacientes").update({ meet_link: ev.meet, google_evento_id: ev.id, atualizado_em: new Date().toISOString() }).eq("id", id);
    revalidatePath("/painel/pacientes");
    return ev.meet ? { ok: "Sala criada. A sessão semanal já está na sua agenda." } : { erro: "O evento foi para a agenda, mas o Google não criou a sala do Meet." };
  } catch (e) {
    if (e instanceof Error && e.message === "sem_google") return { erro: "Conecte o Google Agenda em Disponibilidade para gerar a sala." };
    return { erro: "O Google Agenda não respondeu. Tente de novo." };
  }
}

export async function mudarStatus(id: string, status: "ativo" | "encerrado"): Promise<Resultado> {
  const sb = await supabaseServidor();
  const { data: p } = await sb.from("pacientes").select("google_evento_id").eq("id", id).single();
  if (status === "encerrado" && p?.google_evento_id) {
    await apagarEvento(p.google_evento_id).catch(() => {});
    await sb.from("pacientes").update({ google_evento_id: null, meet_link: null }).eq("id", id);
  }
  const { error } = await sb.from("pacientes").update({ status, atualizado_em: new Date().toISOString() }).eq("id", id);
  if (error) return { erro: "Não deu para salvar. Tente de novo." };
  revalidatePath("/painel/pacientes");
  return { ok: status === "encerrado" ? "Acompanhamento encerrado. A sessão semanal saiu da sua agenda." : "Acompanhamento reativado." };
}

// Exclusão definitiva (pedido da própria pessoa ou cadastro de teste): tira a sessão
// semanal da agenda e apaga ficha, termos, responsáveis só deste paciente e o cadastro.
export async function excluirPaciente(id: string, confirmacao: string): Promise<Resultado> {
  const sb = await supabaseServidor();
  const { data: p } = await sb.from("pacientes").select("id, nome, google_evento_id").eq("id", id).single();
  if (!p) return { erro: "Paciente não encontrado." };
  if (confirmacao.trim().toLowerCase() !== p.nome.trim().toLowerCase()) return { erro: "Escreva o nome completo, igual ao cadastro, para confirmar." };
  if (p.google_evento_id) await apagarEvento(p.google_evento_id).catch(() => {});

  const { data: links } = await sb.from("paciente_responsaveis").select("responsavel_id").eq("paciente_id", id);
  const ids = (links ?? []).map((l) => l.responsavel_id as string);
  const { error } = await sb.from("pacientes").delete().eq("id", id);
  if (error) return { erro: "Não deu para excluir. Tente de novo." };
  if (ids.length) {
    // Responsáveis que não cuidam de outro paciente saem junto.
    const { data: outros } = await sb.from("paciente_responsaveis").select("responsavel_id").in("responsavel_id", ids);
    const ficam = new Set((outros ?? []).map((o) => o.responsavel_id as string));
    const sair = ids.filter((r) => !ficam.has(r));
    if (sair.length) await sb.from("responsaveis").delete().in("id", sair);
  }
  revalidatePath("/painel/pacientes");
  revalidatePath("/painel/termos");
  return { ok: "Paciente e dados excluídos." };
}
