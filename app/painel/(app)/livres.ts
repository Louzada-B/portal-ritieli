"use server";

import { supabaseServidor } from "../../lib/supabase/servidor";
import { ehAdmin } from "../../lib/sessao";
import { livresParaSessao, livresParaFixo, type DiaLivre, type OpcaoFixa } from "../../lib/livres";

type R<T> = { ok: T } | { erro: string };
const NEGADO = { erro: "Sessão expirada. Entre de novo no painel." };

// Dias e horários livres para sessão avulsa. Com `sessaoId`, é a remarcação dessa sessão (o horário dela não conta como ocupado).
export async function listarLivres(sessaoId?: string): Promise<R<DiaLivre[]>> {
  if (!(await ehAdmin())) return NEGADO;
  const sb = await supabaseServidor();
  try {
    let ignorarInicio: Date | undefined;
    if (sessaoId) {
      const { data } = await sb.from("sessoes").select("inicio").eq("id", sessaoId).maybeSingle();
      if (data) ignorarInicio = new Date(data.inicio as string);
    }
    return { ok: await livresParaSessao(sb, { ignorarSessaoId: sessaoId, ignorarInicio }) };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não deu para carregar os horários." };
  }
}

// Dias da semana e horários livres para o horário fixo semanal (sem contar a série do próprio paciente).
export async function listarLivresFixo(pacienteId?: string): Promise<R<OpcaoFixa[]>> {
  if (!(await ehAdmin())) return NEGADO;
  const sb = await supabaseServidor();
  try {
    return { ok: await livresParaFixo(sb, pacienteId) };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não deu para carregar os horários." };
  }
}
