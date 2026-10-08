import Link from "next/link";
import Moldura from "../../componentes/Moldura";
import { rotas } from "../../conteudo";
import { Capa, TextoEscrito, minutosDe, dataCurta, type Escrito } from "../../lib/escritosBase";
import Leitura from "./Leitura";
import "../escritos.css";

// O texto publicado, como aparece no site.
export default function Artigo({ e, rel, url, ld }: { e: Escrito; rel: Escrito[]; url: string; ld: object }) {
  return (
    <Moldura atual={rotas.escritos}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <article className="artigo">
        <section className="rosado">
          <div className="wrap">
            <div className="art-top">
              <Link href={rotas.escritos} className="voltar"><span aria-hidden="true">←</span> Todos os escritos</Link>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginTop: 18 }}><span className="cat">{e.tema}</span><span className="meta">· {dataCurta(e.publicar_em!, true)} · {minutosDe(e.corpo)} min de leitura</span></div>
              <h1 className="art-h1">{e.titulo}</h1>
              <p className="art-sub">{e.resumo}</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <div className="autora"><img src="/ritieli.webp" alt="" /><span style={{ display: "flex", flexDirection: "column", lineHeight: 1.35 }}><span style={{ fontWeight: 700, fontSize: 16 }}>Ritieli Hermes</span><span style={{ fontSize: 14, color: "#6B5A5E" }}>Psicóloga · CRP 07/46564</span></span></div>
            </div>
          </div>
        </section>

        <div className="wrap" style={{ paddingTop: 40 }}>
          <Capa e={e} tam={88} className="capa art-capa" />
        </div>

        <div className="wrap corpo-wrap">
          <Leitura url={url} titulo={e.titulo}>
            <TextoEscrito corpo={e.corpo} />
          </Leitura>
          <div />
        </div>

        <div className="wrap" style={{ maxWidth: 860, paddingBottom: 80 }}>
          <div className="bio">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ritieli.webp" alt="Ritieli Hermes" />
            <div style={{ flex: "1 1 300px", minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
              <span className="assina">Ritieli Hermes</span>
              <p style={{ margin: 0, fontSize: 16, lineHeight: 1.6, color: "#5A3A41" }}>Psicóloga (CRP 07/46564), pós-graduanda em Terapia Cognitivo-Comportamental. Atende mulheres adultas online, com foco em ansiedade e depressão.</p>
            </div>
            <Link href={rotas.agendar} className="cta" style={{ fontSize: 15 }}>Agendar conversa</Link>
          </div>
        </div>
      </article>

      {rel.length ? (
        <section className="wrap" style={{ paddingBottom: 96 }}>
          <h2 style={{ margin: "0 0 28px", fontWeight: 700, fontSize: 32, letterSpacing: "-0.02em", color: "#7A2335" }}>Continue lendo</h2>
          <div className="rel">
            {rel.map((p) => (
              <Link key={p.id} href={`/escritos/${p.slug}`} className="card">
                <Capa e={p} tam={40} />
                <div className="card-txt">
                  <span className="cat">{p.tema}</span>
                  <h3 className="card-t">{p.titulo}</h3>
                  <span className="meta">{dataCurta(p.publicar_em!)} · {minutosDe(p.corpo)} min</span>
                  <span className="ler">Ler texto <span aria-hidden="true">→</span></span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="wrap" style={{ paddingBottom: 96 }}>
        <div className="faixa">
          <h2 className="faixa-t">Algum texto falou com você? <em>Vamos conversar.</em></h2>
          <Link href={rotas.agendar} className="cta">Agendar conversa inicial gratuita <span aria-hidden="true">→</span></Link>
        </div>
      </section>
    </Moldura>
  );
}
