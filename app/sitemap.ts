import type { MetadataRoute } from "next";
import { siteUrl } from "./site";

// Só entram páginas com conteúdo pronto.
const paginas = [
  { caminho: "", prioridade: 1 },
  { caminho: "/quem-sou", prioridade: 0.9 },
  { caminho: "/criancas-e-adolescentes", prioridade: 0.9 },
  { caminho: "/duvidas", prioridade: 0.8 },
  { caminho: "/privacidade", prioridade: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return paginas.map((p) => ({ url: `${siteUrl}${p.caminho}`, lastModified: new Date(), changeFrequency: "monthly", priority: p.prioridade }));
}
