import type { Metadata } from "next";
import Link from "next/link";
import Moldura from "../componentes/Moldura";
import EmConstrucao from "../componentes/EmConstrucao";
import { rotas } from "../conteudo";
import { escritosPublicados } from "../lib/escritos";
import { minutosDe } from "../lib/escritosBase";
import Lista from "./Lista";
import "./escritos.css";

// Os agendados aparecem sozinhos: a página se refaz a cada 5 minutos.
export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const posts = await escritosPublicados();
  if (!posts.length) return { title: "Escritos · Ritieli Hermes", robots: { index: false } };
  return {
    title: "Escritos · Ritieli Hermes · Psicóloga",
    description: "Textos para ler com calma sobre ansiedade, depressão, autocuidado e Terapia Cognitivo-Comportamental.",
    alternates: { canonical: rotas.escritos },
  };
}

export default async function Pagina() {
  const posts = await escritosPublicados();
  if (!posts.length) return <EmConstrucao atual={rotas.escritos} titulo="Escritos" />;
  return (
    <Moldura atual={rotas.escritos}>
      <Lista posts={posts.map((p) => ({ slug: p.slug, titulo: p.titulo, tema: p.tema, palavra: p.palavra, resumo: p.resumo, capa_url: p.capa_url, publicar_em: p.publicar_em, min: minutosDe(p.corpo) }))} />
      <section className="wrap" style={{ paddingBottom: 96 }}>
        <div className="faixa">
          <h2 className="faixa-t">Algum texto falou com você? <em>Vamos conversar.</em></h2>
          <Link href={rotas.agendar} className="cta">Agendar conversa inicial gratuita <span aria-hidden="true">→</span></Link>
        </div>
      </section>
    </Moldura>
  );
}
