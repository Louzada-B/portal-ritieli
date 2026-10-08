import type { MetadataRoute } from "next";
import { siteUrl } from "./site";
import { escritosPublicados } from "./lib/escritos";

export const revalidate = 3600;

// Só entram páginas com conteúdo pronto (Escritos só quando houver texto publicado).
const paginas = [
  { caminho: "", prioridade: 1 },
  { caminho: "/quem-sou", prioridade: 0.9 },
  { caminho: "/criancas-e-adolescentes", prioridade: 0.9 },
  { caminho: "/duvidas", prioridade: 0.8 },
  { caminho: "/privacidade", prioridade: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const fixas: MetadataRoute.Sitemap = paginas.map((p) => ({ url: `${siteUrl}${p.caminho}`, lastModified: new Date(), changeFrequency: "monthly", priority: p.prioridade }));
  const posts = await escritosPublicados().catch(() => []);
  if (!posts.length) return fixas;
  return [
    ...fixas,
    { url: `${siteUrl}/escritos`, lastModified: new Date(posts[0].publicar_em!), changeFrequency: "weekly", priority: 0.8 },
    ...posts.map((p) => ({ url: `${siteUrl}/escritos/${p.slug}`, lastModified: new Date(p.atualizado_em), changeFrequency: "monthly" as const, priority: 0.7 })),
  ];
}
