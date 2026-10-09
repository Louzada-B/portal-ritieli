"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { supabaseServidor } from "../../../lib/supabase/servidor";
import type { Pacote } from "./cofre";

// Tudo o que chega aqui já vem cifrado do navegador. O servidor só guarda.
export type Res = { erro?: string; ok?: string };

const CIFRA = /^[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+$/;
const ok = (s: unknown, max = 400000) => typeof s === "string" && s.length < max && CIFRA.test(s);

async function aparelho() {
  const h = await headers();
  const ua = h.get("user-agent") || "";
  const tipo = /iPad|Tablet/i.test(ua) ? "Tablet" : /Mobi|Android|iPhone/i.test(ua) ? "Celular" : "Computador";
  const cidade = h.get("x-vercel-ip-city");
  return { aparelho: tipo, cidade: cidade ? decodeURIComponent(cidade).slice(0, 80) : null };
}

export async function registrarAcesso(pacienteId: string | null, acao: string) {
  try {
    const sb = await supabaseServidor();
    await sb.from("prontuario_acessos").insert({ paciente_id: pacienteId, acao: acao.slice(0, 60), ...(await aparelho()) });
  } catch {}
}

export async function salvarChave(p: Pacote, modo: "criar" | "trocar" | "recuperar"): Promise<Res> {
  if (!ok(p.chave_senha, 400) || !ok(p.chave_rec, 400) || !p.salt_senha || !p.salt_rec || !(p.iteracoes >= 100000)) return { erro: "Dados inválidos." };
  const sb = await supabaseServidor();
  if (modo === "criar") {
    const { error } = await sb.from("prontuario_chave").insert({ id: 1, ...p });
    if (error) return { erro: error.code === "23505" ? "A senha do prontuário já foi criada. Recarregue a página." : "Não deu para salvar. Tente de novo." };
  } else {
    // A chave de recuperação e a chave mestra não mudam: só o embrulho da senha.
    const { error } = await sb.from("prontuario_chave").update({ salt_senha: p.salt_senha, iteracoes: p.iteracoes, chave_senha: p.chave_senha, atualizado_em: new Date().toISOString() }).eq("id", 1);
    if (error) return { erro: "Não deu para salvar. Tente de novo." };
  }
  await registrarAcesso(null, modo === "criar" ? "Criou a senha do prontuário" : modo === "trocar" ? "Trocou a senha do prontuário" : "Recuperou o acesso com a chave");
  return { ok: "Salvo." };
}

export async function salvarEvolucao(pacienteId: string, d: { sessaoId: string | null; data: string; rotulo: string; cripto: string }): Promise<Res> {
  if (!ok(d.cripto) || !/^\d{4}-\d{2}-\d{2}$/.test(d.data)) return { erro: "Dados inválidos." };
  const sb = await supabaseServidor();
  const { error } = await sb.from("prontuario_evolucoes").insert({ paciente_id: pacienteId, sessao_id: d.sessaoId || null, data: d.data, rotulo: d.rotulo.slice(0, 60) || null, conteudo_cripto: d.cripto });
  if (error) return { erro: "Não deu para salvar. Tente de novo." };
  await registrarAcesso(pacienteId, "Registrou evolução");
  revalidatePath(`/painel/prontuario/${pacienteId}`);
  return { ok: "Evolução registrada e criptografada." };
}

export async function salvarCorrecao(pacienteId: string, evolucaoId: string, cripto: string): Promise<Res> {
  if (!ok(cripto)) return { erro: "Dados inválidos." };
  const sb = await supabaseServidor();
  const { error } = await sb.from("prontuario_correcoes").insert({ evolucao_id: evolucaoId, conteudo_cripto: cripto });
  if (error) return { erro: "Não deu para salvar. Tente de novo." };
  await registrarAcesso(pacienteId, "Acrescentou correção");
  revalidatePath(`/painel/prontuario/${pacienteId}`);
  return { ok: "Correção acrescentada. O texto original continua guardado." };
}

export async function salvarSecao(pacienteId: string, tipo: "demanda" | "encerramento", cripto: string): Promise<Res> {
  if (!ok(cripto) || !["demanda", "encerramento"].includes(tipo)) return { erro: "Dados inválidos." };
  const sb = await supabaseServidor();
  const { error } = await sb.from("prontuario_secoes").insert({ paciente_id: pacienteId, tipo, conteudo_cripto: cripto });
  if (error) return { erro: "Não deu para salvar. Tente de novo." };
  await registrarAcesso(pacienteId, tipo === "demanda" ? "Salvou demanda e objetivos" : "Registrou encerramento");
  revalidatePath(`/painel/prontuario/${pacienteId}`);
  return { ok: tipo === "demanda" ? "Demanda e objetivos salvos. A versão anterior fica no histórico." : "Encerramento registrado." };
}

export async function registrarAnexo(pacienteId: string, d: { caminho: string; meta: string; tamanho: number }): Promise<Res> {
  if (!ok(d.meta, 4000) || !d.caminho.startsWith(`${pacienteId}/`) || !(d.tamanho > 0 && d.tamanho <= 15000000)) return { erro: "Dados inválidos." };
  const sb = await supabaseServidor();
  const { error } = await sb.from("prontuario_anexos").insert({ paciente_id: pacienteId, caminho: d.caminho, meta_cripto: d.meta, tamanho: d.tamanho });
  if (error) return { erro: "Não deu para salvar o anexo. Tente de novo." };
  await registrarAcesso(pacienteId, "Anexou arquivo");
  revalidatePath(`/painel/prontuario/${pacienteId}`);
  return { ok: "Anexo guardado, criptografado." };
}

// Exclui o anexo: o arquivo cifrado no armazenamento e o registro. Fica no registro de acessos.
export async function excluirAnexo(pacienteId: string, anexoId: string): Promise<Res> {
  const sb = await supabaseServidor();
  const { data: a } = await sb.from("prontuario_anexos").select("id, caminho").eq("id", anexoId).eq("paciente_id", pacienteId).maybeSingle();
  if (!a) return { erro: "Anexo não encontrado." };
  const { error: e1 } = await sb.storage.from("prontuario").remove([a.caminho as string]);
  if (e1) return { erro: "Não deu para excluir o arquivo. Tente de novo." };
  const { error: e2 } = await sb.from("prontuario_anexos").delete().eq("id", anexoId);
  if (e2) return { erro: "Não deu para excluir o anexo. Tente de novo." };
  await registrarAcesso(pacienteId, "Excluiu anexo");
  revalidatePath(`/painel/prontuario/${pacienteId}`);
  return { ok: "Anexo excluído." };
}
