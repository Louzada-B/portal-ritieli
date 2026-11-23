"use server";

import { revalidatePath } from "next/cache";
import { supabaseServidor } from "../../../lib/supabase/servidor";
import type { Paciente } from "../../../lib/pacientes";

// Paciente de clínica parceira: a clínica cuida do cadastro, dos documentos, da agenda e do pagamento.
// Aqui fica só o mínimo para a Ritieli manter o prontuário e saber quem está atendendo.
export type Res = { erro?: string; ok?: string; id?: string };
export type DadosClinica = { tipo: "adulta" | "crianca"; nome: string; clinica: string; desde: string; observacao: string };

const DATA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const hojeISO = () => new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10);

function validar(d: DadosClinica) {
  const nome = d.nome.trim().replace(/\s+/g, " ");
  const clinica = d.clinica.trim().replace(/\s+/g, " ");
  const observacao = d.observacao.trim();
  if (nome.length < 2 || nome.length > 120) return { erro: "Escreva o nome do paciente." };
  if (clinica.length < 2 || clinica.length > 120) return { erro: "Escreva o nome da clínica." };
  if (!DATA.test(d.desde)) return { erro: "Escolha a data de início." };
  if (observacao.length > 500) return { erro: "A observação passa de 500 caracteres. O que for clínico vai no prontuário." };
  if (d.tipo !== "adulta" && d.tipo !== "crianca") return { erro: "Escolha o público." };
  return { nome, clinica, observacao: observacao || null, desde: d.desde, tipo: d.tipo };
}

export async function criarPacienteClinica(d: DadosClinica): Promise<Res> {
  const v = validar(d);
  if ("erro" in v) return { erro: v.erro };
  const sb = await supabaseServidor();
  const { data, error } = await sb
    .from("pacientes")
    .insert({ ...v, origem: "clinica", status: "ativo", lembretes_email: false })
    .select("id")
    .single();
  if (error || !data) return { erro: "Não deu para salvar. Tente de novo." };
  revalidatePath("/painel/pacientes");
  return { ok: "Paciente salvo.", id: data.id as string };
}

async function pacienteClinica(sb: Awaited<ReturnType<typeof supabaseServidor>>, id: string) {
  const { data } = await sb.from("pacientes").select("id, origem, status, desde").eq("id", id).maybeSingle<Pick<Paciente, "id" | "origem" | "status" | "desde">>();
  return data && data.origem === "clinica" ? data : null;
}

export async function atualizarClinica(id: string, d: DadosClinica): Promise<Res> {
  const v = validar(d);
  if ("erro" in v) return { erro: v.erro };
  const sb = await supabaseServidor();
  const p = await pacienteClinica(sb, id);
  if (!p) return { erro: "Paciente não encontrado." };
  const { error } = await sb.from("pacientes").update({ ...v, atualizado_em: new Date().toISOString() }).eq("id", id);
  if (error) return { erro: "Não deu para salvar. Tente de novo." };
  revalidatePath("/painel/pacientes");
  return { ok: "Dados salvos." };
}

// Registro do atendimento feito na clínica: data (padrão hoje) e, se quiser, o horário.
export async function registrarAtendimento(id: string, a: { data: string; hora: string }): Promise<Res> {
  if (!DATA.test(a.data)) return { erro: "Escolha a data do atendimento." };
  if (a.data > hojeISO()) return { erro: "Registre o atendimento no dia ou depois dele." };
  if (a.hora && !HORA.test(a.hora)) return { erro: "Confira o horário." };
  const sb = await supabaseServidor();
  const p = await pacienteClinica(sb, id);
  if (!p) return { erro: "Paciente não encontrado." };
  if (p.status !== "ativo") return { erro: "O acompanhamento está encerrado. Reative para registrar atendimentos." };
  const { error } = await sb.from("atendimentos_clinica").insert({ paciente_id: id, data: a.data, hora: a.hora || null });
  if (error) return { erro: error.code === "23505" ? "Esse atendimento já está registrado." : "Não deu para salvar. Tente de novo." };
  revalidatePath("/painel/pacientes");
  revalidatePath(`/painel/prontuario/${id}`);
  return { ok: "Atendimento registrado. A evolução é escrita no prontuário." };
}

// Só sai o atendimento registrado por engano, e só se ainda não tem evolução.
export async function removerAtendimento(atendimentoId: string): Promise<Res> {
  const sb = await supabaseServidor();
  const { data: a } = await sb.from("atendimentos_clinica").select("id, paciente_id").eq("id", atendimentoId).maybeSingle();
  if (!a) return { erro: "Atendimento não encontrado." };
  const { count } = await sb.from("prontuario_evolucoes").select("id", { count: "exact", head: true }).eq("atendimento_id", atendimentoId);
  if (count) return { erro: "Este atendimento já tem evolução no prontuário e não pode sair." };
  const { error } = await sb.from("atendimentos_clinica").delete().eq("id", atendimentoId);
  if (error) return { erro: "Não deu para remover. Tente de novo." };
  revalidatePath("/painel/pacientes");
  revalidatePath(`/painel/prontuario/${a.paciente_id}`);
  return { ok: "Atendimento removido." };
}

// Passa a ser paciente particular. O prontuário e os atendimentos registrados continuam;
// o resto do cadastro (contato, valor, horário, ficha e termo) segue o caminho normal.
export async function converterParticular(id: string): Promise<Res> {
  const sb = await supabaseServidor();
  const { data: p } = await sb.from("pacientes").select("id, origem").eq("id", id).maybeSingle();
  if (!p || p.origem !== "clinica") return { erro: "Paciente não encontrado." };
  const { error } = await sb.from("pacientes").update({ origem: "particular", lembretes_email: true, atualizado_em: new Date().toISOString() }).eq("id", id);
  if (error) return { erro: "Não deu para salvar. Tente de novo." };
  revalidatePath("/painel/pacientes");
  revalidatePath("/painel/sessoes");
  revalidatePath("/painel/termos");
  revalidatePath(`/painel/prontuario/${id}`);
  return { ok: "Agora é paciente particular. Complete WhatsApp, e-mail, valor e horário em Editar dados e envie a ficha de cadastro." };
}
