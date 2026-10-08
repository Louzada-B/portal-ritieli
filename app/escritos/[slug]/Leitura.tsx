"use client";

import { useEffect, useState } from "react";

// Ferramentas de leitura: barra de progresso, tamanho do texto e copiar o link.
export default function Leitura({ url, titulo, children }: { url: string; titulo: string; children: React.ReactNode }) {
  const [tam, setTam] = useState(18);
  const [prog, setProg] = useState(0);
  const [copiado, setCopiado] = useState(false);
  useEffect(() => {
    const f = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setProg(max > 0 ? Math.min(100, (h.scrollTop / max) * 100) : 0);
    };
    f();
    window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);
  const copiar = () => navigator.clipboard?.writeText(url).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 2500); });
  const wa = `https://wa.me/?text=${encodeURIComponent(`${titulo} ${url}`)}`;
  const Ic = ({ d }: { d: React.ReactNode }) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>;
  return (
    <>
      <div className="progresso" style={{ width: `${prog}%` }} aria-hidden="true" />
      <aside className="lateral" aria-label="Ferramentas de leitura">
        <button type="button" className="lat-btn" onClick={() => setTam(Math.max(15, tam - 1))} aria-label="Diminuir o texto">A−</button>
        <button type="button" className="lat-btn" onClick={() => setTam(Math.min(24, tam + 1))} aria-label="Aumentar o texto">A+</button>
        <a className="lat-btn" href={wa} target="_blank" rel="noopener" aria-label="Compartilhar no WhatsApp"><Ic d={<path d="M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.6-5.2A8.5 8.5 0 1 1 21 12z" />} /></a>
        <button type="button" className="lat-btn" onClick={copiar} aria-label="Copiar o link do texto"><Ic d={<><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>} /></button>
        {copiado ? <span style={{ fontSize: 12, fontWeight: 700, color: "#7A2335", textAlign: "center" }}>Copiado!</span> : null}
      </aside>
      <div className="corpo" style={{ fontSize: tam }}>
        {children}
        <div className="compartilha" style={{ flexWrap: "wrap", gap: 10, margin: "1.6em 0 0" }}>
          <a href={wa} target="_blank" rel="noopener" className="comp-b">Compartilhar no WhatsApp</a>
          <button type="button" onClick={copiar} className="comp-b">{copiado ? "Link copiado!" : "Copiar link"}</button>
        </div>
        <p className="aviso-t">Este texto tem caráter informativo e não substitui o acompanhamento psicológico. Em situação de crise, ligue 188 (CVV).</p>
      </div>
    </>
  );
}
