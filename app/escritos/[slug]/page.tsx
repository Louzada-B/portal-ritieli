import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { siteUrl } from "../../site";
import { escritoPorSlug, escritosPublicados } from "../../lib/escritos";
import Artigo from "./Artigo";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const e = await escritoPorSlug(slug);
  if (!e) return { title: "Texto não encontrado · Ritieli Hermes", robots: { index: false } };
  return {
    title: `${e.titulo} · Ritieli Hermes`,
    description: e.resumo,
    alternates: { canonical: `/escritos/${e.slug}` },
    openGraph: { type: "article", title: e.titulo, description: e.resumo, url: `${siteUrl}/escritos/${e.slug}`, publishedTime: e.publicar_em || undefined, ...(e.capa_url ? { images: [{ url: e.capa_url }] } : {}) },
  };
}

export default async function PaginaEscrito({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const e = await escritoPorSlug(slug);
  if (!e) notFound();
  const todos = await escritosPublicados();
  const outros = todos.filter((x) => x.id !== e.id);
  const rel = [...outros.filter((x) => x.tema === e.tema), ...outros.filter((x) => x.tema !== e.tema)].slice(0, 3);
  const url = `${siteUrl}/escritos/${e.slug}`;
  const ld = { "@context": "https://schema.org", "@type": "BlogPosting", headline: e.titulo, description: e.resumo, datePublished: e.publicar_em, dateModified: e.atualizado_em, author: { "@type": "Person", name: "Ritieli Hermes", jobTitle: "Psicóloga" }, mainEntityOfPage: url, ...(e.capa_url ? { image: e.capa_url } : {}) };

  return <Artigo e={e} rel={rel} url={url} ld={ld} />;
}
