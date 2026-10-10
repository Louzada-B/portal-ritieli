"use server";

import { revalidatePath } from "next/cache";
import { supabaseServidor } from "../../../lib/supabase/servidor";
import { ehAdmin } from "../../../lib/sessao";
import { cifrar, cifrarOuNulo } from "../../../lib/cripto";
import { linkValido, MAX_ANEXO, TIPOS_ANEXO } from "../../../lib/exercicios";

type Res = { erro?: string; ok?: string; id?: string; url?: string };
const NEGADO: Res = { erro: "Sessão expirada. Entre de novo no painel." };
const ATUALIZAR = () => { revalidatePath("/painel/pacientes"); };

export async function criarExercicio(pacienteId: string, d: { titulo: string; instrucoes: string; link: string; prazo: string }): Promise<Res> {
  if (!(await ehAdmin())) return NEGADO;
  const titulo = d.titulo.trim();
  const instrucoes = d.instrucoes.trim();
  if (titulo.length < 2 || titulo.length > 120) return { erro: "Dê um título ao exercício (até 120 letras)." };
  if (instrucoes.length < 2) return { erro: "Escreva as instruções do exercício." };
  if (instrucoes.length > 5000) return { erro: "As instruções passaram de 5.000 letras." };
  const link = linkValido(d.link);
  if (link === null) return { erro: "Confira o link: precisa começar com https://." };
  if (d.prazo && !/^\d{4}-\d{2}-\d{2}$/.test(d.prazo)) return { erro: "Confira a data." };
  const sb = await supabaseServidor();
  const { data: p } = await sb.from("pacientes").select("id, status").eq("id", pacienteId).maybeSingle();
  if (!p) return { erro: "Paciente não encontrado." };
  if (p.status !== "ativo") return { erro: "O acompanhamento está encerrado." };
  const { data, error } = await sb.from("exercicios").insert({ paciente_id: pacienteId, titulo, instrucoes_cripto: cifrar(instrucoes), link_cripto: cifrarOuNulo(link), prazo: d.prazo || null }).select("id").single();
  if (error || !data) return { erro: "Não deu para salvar. Tente de novo." };
  ATUALIZAR();
  return { ok: "Exercício criado.", id: data.id as string };
}

// O arquivo já foi enviado ao armazenamento pelo navegador da Ritieli; aqui só o registro.
export async function registrarAnexoExercicio(exercicioId: string, d: { caminho: string; nome: string; tipo: string; tamanho: number }): Promise<Res> {
  if (!(await ehAdmin())) return NEGADO;
  if (!TIPOS_ANEXO.includes(d.tipo)) return { erro: "Tipo de arquivo não aceito. Use PDF, imagem (PNG, JPG, WEBP) ou áudio (MP3, M4A, WAV)." };
  if (d.tamanho < 1 || d.tamanho > MAX_ANEXO) return { erro: "O arquivo passa de 10 MB." };
  const sb = await supabaseServidor();
  const { data: ex } = await sb.from("exercicios").select("id, paciente_id").eq("id", exercicioId).maybeSingle();
  if (!ex) return { erro: "Exercício não encontrado." };
  if (!d.caminho.startsWith(`${ex.paciente_id}/${exercicioId}/`)) return { erro: "Caminho do arquivo inválido." };
  const { error } = await sb.from("exercicio_anexos").insert({ exercicio_id: exercicioId, caminho: d.caminho, nome: d.nome.slice(0, 120), tipo: d.tipo, tamanho: d.tamanho });
  if (error) return { erro: "Não deu para guardar o anexo. Tente de novo." };
  ATUALIZAR();
  return { ok: "Anexo guardado." };
}

export async function excluirAnexoExercicio(anexoId: string): Promise<Res> {
  if (!(await ehAdmin())) return NEGADO;
  const sb = await supabaseServidor();
  const { data: a } = await sb.from("exercicio_anexos").select("id, caminho").eq("id", anexoId).maybeSingle();
  if (!a) return { erro: "Anexo não encontrado." };
  await sb.storage.from("exercicios").remove([a.caminho as string]);
  const { error } = await sb.from("exercicio_anexos").delete().eq("id", anexoId);
  if (error) return { erro: "Não deu para excluir o anexo." };
  ATUALIZAR();
  return { ok: "Anexo excluído." };
}

export async function excluirExercicio(id: string): Promise<Res> {
  if (!(await ehAdmin())) return NEGADO;
  const sb = await supabaseServidor();
  const { data: anx } = await sb.from("exercicio_anexos").select("caminho").eq("exercicio_id", id);
  if (anx?.length) await sb.storage.from("exercicios").remove(anx.map((a) => a.caminho as string));
  const { error } = await sb.from("exercicios").delete().eq("id", id);
  if (error) return { erro: "Não deu para excluir. Tente de novo." };
  ATUALIZAR();
  return { ok: "Exercício excluído." };
}

// Link temporário (5 minutos) para a Ritieli abrir um anexo.
export async function urlAnexoExercicio(anexoId: string): Promise<Res> {
  if (!(await ehAdmin())) return NEGADO;
  const sb = await supabaseServidor();
  const { data: a } = await sb.from("exercicio_anexos").select("caminho, nome").eq("id", anexoId).maybeSingle();
  if (!a) return { erro: "Anexo não encontrado." };
  const { data, error } = await sb.storage.from("exercicios").createSignedUrl(a.caminho as string, 300, { download: a.nome as string });
  if (error || !data) return { erro: "Não deu para abrir o anexo." };
  return { ok: "ok", url: data.signedUrl };
}
