"use client";

import { useState } from "react";
import { etapas } from "../conteudo";
import { Check } from "./Formas";

export default function Etapas() {
  const [ativa, setAtiva] = useState(0);
  const e = etapas[ativa];
  const off = 100 - [12.5, 37.5, 62.5, 87.5][ativa];

  return (
    <>
      <div className="etapas-wrap">
        <svg className="trilha" viewBox="0 0 1000 120" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 60 C 125 0, 125 120, 250 60 S 375 0, 500 60 S 625 120, 750 60 S 875 0, 1000 60" fill="none" stroke="#EAD9DC" strokeWidth="2" strokeDasharray="3 9" strokeLinecap="round" />
          <path
            d="M0 60 C 125 0, 125 120, 250 60 S 375 0, 500 60 S 625 120, 750 60 S 875 0, 1000 60"
            pathLength={100}
            fill="none"
            stroke="#7A2335"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="100"
            style={{ strokeDashoffset: off, transition: "stroke-dashoffset 1.4s cubic-bezier(.4,0,.2,1)" }}
          />
        </svg>
        <div role="group" aria-label="Etapas" className="etapas">
          {etapas.map((x, i) => (
            <button key={x.n} type="button" className="etapa" aria-pressed={i === ativa} onClick={() => setAtiva(i)}>
              <span className={i === ativa ? "circ on" : i < ativa ? "circ feito" : "circ"}>{x.n}</span>
              <span className="etapa-t">{x.titulo}</span>
              <span className="etapa-s">{x.sub}</span>
            </button>
          ))}
        </div>
      </div>

      <div aria-live="polite">
        <div className="passo etapa-det" key={ativa}>
          <div className="etapa-det-txt">
            <span className="rotulo">Etapa {e.n} de 04</span>
            <h3>{e.titulo}</h3>
            <p className="suave">{e.texto}</p>
          </div>
          <div className="etapa-det-lista">
            <ul>
              {e.itens.map((it) => (
                <li key={it}>
                  <span className="bola-check">
                    <Check traco={2.4} />
                  </span>
                  {it}
                </li>
              ))}
            </ul>
            <button type="button" className="btn btn-vinho btn-p" onClick={() => setAtiva((ativa + 1) % 4)}>
              {ativa === 3 ? "Voltar ao início ↺" : "Próxima etapa →"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
