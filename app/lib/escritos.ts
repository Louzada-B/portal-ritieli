import "server-only";
import { supabaseAdmin } from "./supabase/admin";
import type { Escrito } from "./escritosBase";

const CAMPOS = "id, slug, titulo, tema, palavra, resumo, capa_url, corpo, publicar_em, criado_em, atualizado_em";

// Só o que já está no ar (os agendados aparecem quando chega a hora).
export async function escritosPublicados(): Promise<Escrito[]> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return [];
  const { data } = await supabaseAdmin().from("escritos").select(CAMPOS).not("publicar_em", "is", null).lte("publicar_em", new Date().toISOString()).not("slug", "is", null).order("publicar_em", { ascending: false });
  return (data ?? []) as Escrito[];
}

export async function escritoPorSlug(slug: string): Promise<Escrito | null> {
  if (!/^[a-z0-9-]{1,80}$/.test(slug) || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const { data } = await supabaseAdmin().from("escritos").select(CAMPOS).eq("slug", slug).not("publicar_em", "is", null).lte("publicar_em", new Date().toISOString()).maybeSingle();
  return (data as Escrito | null) ?? null;
}
