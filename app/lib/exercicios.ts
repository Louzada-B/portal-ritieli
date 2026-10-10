import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { decifrarOuVazio } from "./cripto";

export type AnexoEx = { id: string; nome: string; tipo: string; tamanho: number };
export type Exercicio = {
  id: string;
  titulo: string;
  instrucoes: string;
  link: string;
  prazo: string | null;
  criadoEm: string;
  concluidoEm: string | null;
  recado: string;
  anexos: AnexoEx[];
};

// Tipos de arquivo que a Ritieli pode anexar (documentos, imagens e áudio).
export const TIPOS_ANEXO = ["application/pdf", "image/png", "image/jpeg", "image/webp", "audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/wav"];
export const MAX_ANEXO = 10_000_000;

type Linha = { id: string; titulo: string; instrucoes_cripto: string; link_cripto: string | null; prazo: string | null; criado_em: string; concluido_em: string | null; recado_cripto: string | null };

// Exercícios de um paciente, já decifrados, com os anexos. Vale para o painel (cliente com sessão da Ritieli)
// e para a área da(o) paciente (cliente do servidor, depois de conferir o acesso).
export async function exerciciosDoPaciente(sb: SupabaseClient, pacienteId: string): Promise<Exercicio[]> {
  const { data } = await sb
    .from("exercicios")
    .select("id, titulo, instrucoes_cripto, link_cripto, prazo, criado_em, concluido_em, recado_cripto")
    .eq("paciente_id", pacienteId)
    .order("criado_em", { ascending: false });
  const linhas = (data ?? []) as Linha[];
  if (!linhas.length) return [];
  const { data: anx } = await sb.from("exercicio_anexos").select("id, exercicio_id, nome, tipo, tamanho").in("exercicio_id", linhas.map((l) => l.id)).order("criado_em");
  const porEx = new Map<string, AnexoEx[]>();
  for (const a of anx ?? []) porEx.set(a.exercicio_id as string, [...(porEx.get(a.exercicio_id as string) || []), { id: a.id as string, nome: a.nome as string, tipo: a.tipo as string, tamanho: a.tamanho as number }]);
  return linhas.map((l) => ({
    id: l.id,
    titulo: l.titulo,
    instrucoes: decifrarOuVazio(l.instrucoes_cripto),
    link: decifrarOuVazio(l.link_cripto),
    prazo: l.prazo,
    criadoEm: l.criado_em,
    concluidoEm: l.concluido_em,
    recado: decifrarOuVazio(l.recado_cripto),
    anexos: porEx.get(l.id) ?? [],
  }));
}

// Link só vale se for http(s).
export function linkValido(v: string): string | null {
  const t = v.trim();
  if (!t) return "";
  if (t.length > 500) return null;
  try {
    const u = new URL(t);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}
