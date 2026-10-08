"use server";

import { revalidatePath } from "next/cache";
import { supabaseServidor } from "../../../lib/supabase/servidor";
import { slugDe, TEMAS, type Escrito } from "../../../lib/escritosBase";

export type Res = { erro?: string; ok?: string; id?: string };
type Campos = Pick<Escrito, "titulo" | "tema" | "palavra" | "resumo" | "capa_url" | "corpo">;

const limpar = (c: Campos): Campos => ({
  titulo: c.titulo.slice(0, 160),
  tema: (TEMAS as readonly string[]).includes(c.tema) ? c.tema : "Ansiedade",
  palavra: c.palavra.trim().slice(0, 30),
  resumo: c.resumo.slice(0, 200),
  capa_url: c.capa_url && /^https:\/\/[^\s]+$/.test(c.capa_url) ? c.capa_url.slice(0, 500) : null,
  corpo: c.corpo.slice(0, 60000),
});

function noSite(slug?: string | null) {
  revalidatePath("/escritos");
  if (slug) revalidatePath(`/escritos/${slug}`);
  revalidatePath("/");
  revalidatePath("/sitemap.xml");
}

export async function novoEscrito(): Promise<Res> {
  const sb = await supabaseServidor();
  const { data, error } = await sb.from("escritos").insert({}).select("id").single();
  if (error || !data) return { erro: "Não deu para criar. Tente de novo." };
  revalidatePath("/painel/escritos");
  return { ok: "Rascunho novo aberto. Ele é salvo enquanto você escreve.", id: data.id };
}

// Salva os campos. Num texto publicado, a mudança vai direto para o site.
export async function salvarEscrito(id: string, c: Campos): Promise<Res> {
  const sb = await supabaseServidor();
  const { data, error } = await sb.from("escritos").update({ ...limpar(c), atualizado_em: new Date().toISOString() }).eq("id", id).select("slug, publicar_em").single();
  if (error || !data) return { erro: "Não deu para salvar. Tente de novo." };
  revalidatePath("/painel/escritos");
  if (data.publicar_em) noSite(data.slug);
  return { ok: "Salvo." };
}

// Publica agora ou agenda (quando = data e hora em ISO).
export async function publicarEscrito(id: string, c: Campos, quando: "agora" | string): Promise<Res> {
  const v = limpar(c);
  if (v.titulo.trim().length < 5) return { erro: "Escreva o título antes de publicar." };
  if (v.resumo.trim().length < 10) return { erro: "Escreva o resumo que aparece no card." };
  if (v.corpo.trim().length < 50) return { erro: "O texto está muito curto para publicar." };
  let em = new Date();
  if (quando !== "agora") {
    em = new Date(quando);
    if (Number.isNaN(em.getTime()) || em.getTime() < Date.now()) return { erro: "Escolha um dia e horário no futuro para agendar." };
  }
  const sb = await supabaseServidor();
  const { data: atual } = await sb.from("escritos").select("slug, publicar_em").eq("id", id).single();
  if (!atual) return { erro: "Texto não encontrado." };

  // O endereço nasce do título na primeira publicação e não muda depois (links compartilhados continuam valendo).
  let slug = atual.slug as string | null;
  if (!slug) {
    const base = slugDe(v.titulo);
    slug = base;
    for (let i = 2; i < 50; i++) {
      const { count } = await sb.from("escritos").select("id", { count: "exact", head: true }).eq("slug", slug).neq("id", id);
      if (!count) break;
      slug = `${base}-${i}`;
    }
  }
  // Atualizar um texto que já está no ar não muda a data de publicação.
  const jaNoAr = atual.publicar_em && new Date(atual.publicar_em).getTime() <= Date.now();
  const publicar_em = quando === "agora" && jaNoAr ? atual.publicar_em : em.toISOString();
  const { error } = await sb.from("escritos").update({ ...v, slug, publicar_em, atualizado_em: new Date().toISOString() }).eq("id", id);
  if (error) return { erro: "Não deu para publicar. Tente de novo." };
  revalidatePath("/painel/escritos");
  noSite(slug);
  return { ok: quando === "agora" ? (jaNoAr ? "Texto atualizado no site." : "Publicado! Já está na página Escritos.") : "Publicação agendada." };
}

export async function despublicarEscrito(id: string): Promise<Res> {
  const sb = await supabaseServidor();
  const { data, error } = await sb.from("escritos").update({ publicar_em: null, atualizado_em: new Date().toISOString() }).eq("id", id).select("slug").single();
  if (error) return { erro: "Não deu para tirar do site. Tente de novo." };
  revalidatePath("/painel/escritos");
  noSite(data?.slug);
  return { ok: "O texto saiu do site e voltou a ser rascunho." };
}

export async function excluirEscrito(id: string): Promise<Res> {
  const sb = await supabaseServidor();
  const { data } = await sb.from("escritos").select("slug, capa_url").eq("id", id).single();
  const { error } = await sb.from("escritos").delete().eq("id", id);
  if (error) return { erro: "Não deu para excluir. Tente de novo." };
  // A foto só sai do armazenamento se nenhum outro texto usa.
  const marca = "/storage/v1/object/public/escritos/";
  if (data?.capa_url?.includes(marca)) {
    const { count } = await sb.from("escritos").select("id", { count: "exact", head: true }).eq("capa_url", data.capa_url);
    if (!count) await sb.storage.from("escritos").remove([data.capa_url.split(marca)[1]]);
  }
  revalidatePath("/painel/escritos");
  noSite(data?.slug);
  return { ok: "Texto excluído." };
}
