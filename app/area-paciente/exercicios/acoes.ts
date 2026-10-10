"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "../../lib/supabase/admin";
import { acessoDaAcao, ROTA } from "../../lib/pacienteAuth";
import { RECADO_E2E } from "../../lib/exercicios";

type Res = { erro?: string; ok?: string };

async function dono(pacienteId: string, exercicioId: string) {
  const ctx = await acessoDaAcao(pacienteId);
  if (!ctx || ctx.atual.id !== pacienteId) return null;
  const sb = supabaseAdmin();
  // O exercício precisa ser do paciente que está agindo.
  const { data } = await sb.from("exercicios").select("id").eq("id", exercicioId).eq("paciente_id", pacienteId).maybeSingle();
  return data ? sb : null;
}

// O recado chega já cifrado pelo navegador da paciente (só a Ritieli decifra); o servidor só guarda.
export async function concluirExercicio(pacienteId: string, exercicioId: string, recadoCifrado: string | null): Promise<Res> {
  const sb = await dono(pacienteId, exercicioId);
  if (!sb) return { erro: "Sessão expirada. Entre de novo." };
  if (recadoCifrado !== null && !RECADO_E2E.test(recadoCifrado)) return { erro: "Não deu para proteger o recado. Tente de novo." };
  const { error } = await sb.from("exercicios").update({ concluido_em: new Date().toISOString(), recado_e2e: recadoCifrado }).eq("id", exercicioId).eq("paciente_id", pacienteId);
  if (error) return { erro: "Não deu para salvar. Tente de novo." };
  revalidatePath(`${ROTA}`, "layout");
  return { ok: "Pronto, a Ritieli vai ver." };
}

export async function reabrirExercicio(pacienteId: string, exercicioId: string): Promise<Res> {
  const sb = await dono(pacienteId, exercicioId);
  if (!sb) return { erro: "Sessão expirada. Entre de novo." };
  const { error } = await sb.from("exercicios").update({ concluido_em: null, recado_e2e: null }).eq("id", exercicioId).eq("paciente_id", pacienteId);
  if (error) return { erro: "Não deu para reabrir." };
  revalidatePath(`${ROTA}`, "layout");
  return { ok: "Exercício reaberto." };
}
