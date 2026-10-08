import "server-only";
import { supabaseAdmin } from "./supabase/admin";
import { hashToken } from "./cripto";

// Confere um link pessoal da ficha de cadastro.
export async function fichaPorToken(token: string) {
  if (!token || token.length < 20 || token.length > 64) return null;
  const sb = supabaseAdmin();
  const { data } = await sb.from("fichas").select("id, paciente_id, expira_em, preenchida_em").eq("token_hash", hashToken(token)).maybeSingle();
  if (!data) return null;
  return { ...data, expirado: new Date(data.expira_em).getTime() < Date.now() };
}

export async function termoPorToken(token: string) {
  if (!token || token.length < 20 || token.length > 64) return null;
  const sb = supabaseAdmin();
  const { data } = await sb.from("termos").select("id, paciente_id, conteudo_cripto, status, aceito_em, enviado_em").eq("token_hash", hashToken(token)).maybeSingle();
  return data;
}
