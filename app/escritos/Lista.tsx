"use client";

import Link from "next/link";
import { useState } from "react";
import { Forma } from "../componentes/Formas";
import { Capa, TEMAS, dataCurta, type Escrito } from "../lib/escritosBase";

type Item = Pick<Escrito, "slug" | "titulo" | "tema" | "palavra" | "resumo" | "capa_url" | "publicar_em"> & { min: number };

export default function Lista({ posts }: { posts: Item[] }) {
  const [tema, setTema] = useState("Todos");
  const [busca, setBusca] = useState("");
  const termo = busca.trim().toLowerCase();
  const passa = (p: Item) => (tema === "Todos" || p.tema === tema) && (!termo || `${p.titulo} ${p.resumo}`.toLowerCase().includes(termo));
  const [dest, ...resto] = posts;
  const mostraDest = dest && passa(dest);
  const grade = resto.filter(passa);
  const meta = (p: Item, longo = false) => `${dataCurta(p.publicar_em!)} · ${p.min} min${longo ? " de leitura" : ""}`;
  return (
    <>
      <section className="rosado" style={{ position: "relative", overflow: "hidden" }}>
        <Forma cor="#EFCBD2" style={{ position: "absolute", width: 460, height: 460, right: -140, top: -120 }} />
        <div className="wrap hero" style={{ position: "relative" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20, flex: "1 1 520px", minWidth: 0 }}>
            <h1 className="h1">Escritos para ler <em>com calma.</em></h1>
            <p className="intro">Toda semana, um texto novo sobre ansiedade, depressão e o cuidado consigo. Sem pressa, no seu tempo.</p>
          </div>
          <label className="busca">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9A5A67" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
            <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Buscar nos escritos</span>
            <input type="search" placeholder="Buscar um tema…" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </label>
        </div>
      </section>
      <section className="wrap" style={{ paddingTop: 40 }}>
        <div className="chips" role="group" aria-label="Filtrar por tema">
          {["Todos", ...TEMAS].map((n) => <button key={n} type="button" className={n === tema ? "chip on" : "chip"} aria-pressed={n === tema} onClick={() => setTema(n)}>{n}</button>)}
        </div>
      </section>
      {mostraDest ? (
        <section className="wrap" style={{ paddingTop: 32 }}>
          <Link href={`/escritos/${dest.slug}`} className="destaque">
            <Capa e={dest} tam={64} style={{ minHeight: 360 }} />
            <div className="dest-txt">
              <span style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}><span style={{ background: "#F6E5E7", color: "#7A2335", borderRadius: 999, padding: "6px 12px", fontSize: 12, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" }}>Mais recente</span><span className="cat">{dest.tema}</span></span>
              <h2 className="dest-t">{dest.titulo}</h2>
              <p style={{ margin: 0, color: "#5A3A41" }}>{dest.resumo}</p>
              <span className="meta">{meta(dest, true)}</span>
              <span className="ler">Ler texto <span aria-hidden="true">→</span></span>
            </div>
          </Link>
        </section>
      ) : null}
      <section className="wrap" style={{ paddingTop: 24, paddingBottom: 96 }}>
        <div className="grade">
          {grade.map((p) => (
            <Link key={p.slug} href={`/escritos/${p.slug}`} className="card">
              <Capa e={p} tam={40} />
              <div className="card-txt">
                <span className="cat">{p.tema}</span>
                <h3 className="card-t">{p.titulo}</h3>
                <span className="meta">{meta(p)}</span>
                <span className="ler">Ler texto <span aria-hidden="true">→</span></span>
              </div>
            </Link>
          ))}
          {!grade.length && !mostraDest ? <div className="vazio"><p style={{ margin: "0 0 6px", fontWeight: 700, fontSize: 20, color: "#7A2335" }}>Nenhum texto encontrado.</p><p style={{ margin: 0 }}>Tente outra palavra ou escolha outro tema.</p></div> : null}
        </div>
      </section>
    </>
  );
}
