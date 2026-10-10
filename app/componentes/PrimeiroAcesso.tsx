"use client";

import "./manual.css";
import Link from "next/link";
import { useEffect, useState } from "react";

export type PassoTour = { titulo: string; texto: string };

// Apresentação curta no primeiro acesso. Lembra que já foi vista só neste navegador; dá para pular.
export default function PrimeiroAcesso({ chave, passos, ajuda }: { chave: string; passos: PassoTour[]; ajuda: string }) {
  const [aberto, setAberto] = useState(false);
  const [i, setI] = useState(0);
  const k = `tour:${chave}`;
  useEffect(() => {
    try { if (!localStorage.getItem(k)) setAberto(true); } catch {}
  }, [k]);
  const fechar = () => { setAberto(false); try { localStorage.setItem(k, "1"); } catch {} };
  if (!aberto) return null;
  const ultimo = i === passos.length - 1;
  return (
    <div className="mnl-tour" role="dialog" aria-modal="true" aria-labelledby="tour-t">
      <div>
        <span className="mnl-n">Boas-vindas · {i + 1} de {passos.length}</span>
        <h2 id="tour-t">{passos[i].titulo}</h2>
        <p>{passos[i].texto}</p>
        <div className="mnl-pts" aria-hidden="true">{passos.map((_, j) => <i key={j} className={j <= i ? "f" : ""} />)}</div>
        <div className="mnl-nav">
          <button type="button" className="mnl-bt s" onClick={fechar}>Pular</button>
          {ultimo
            ? <Link href={ajuda} className="mnl-bt" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }} onClick={fechar}>Abrir o manual</Link>
            : <button type="button" className="mnl-bt" onClick={() => setI(i + 1)}>Próximo</button>}
        </div>
      </div>
    </div>
  );
}
