"use client";

import { useState } from "react";
import { pensamentos } from "../conteudo";

export default function Pensamentos() {
  const [virados, setVirados] = useState<boolean[]>(pensamentos.map(() => false));
  const virar = (i: number) => setVirados((v) => v.map((x, j) => (j === i ? !x : x)));

  return (
    <div className="pens-grade">
      {pensamentos.map((p, i) => (
        <button key={i} type="button" className="pens revela" aria-expanded={virados[i]} onClick={() => virar(i)}>
          {virados[i] ? (
            <>
              <span className="pens-velho">“{p.velho}”</span>
              <span className="pens-novo">{p.novo}</span>
            </>
          ) : (
            <span className="pens-frase">“{p.velho}”</span>
          )}
          <span className="dica">{virados[i] ? "Ver pensamento original ↺" : "Reescrever pensamento ↻"}</span>
        </button>
      ))}
    </div>
  );
}
