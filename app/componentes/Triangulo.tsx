"use client";

import { useEffect, useRef, useState } from "react";
import { triangulo } from "../conteudo";

type Vertice = keyof typeof triangulo;
const ORDEM: Vertice[] = ["pensamento", "emocao", "comportamento"];

export default function Triangulo() {
  const [vert, setVert] = useState<Vertice>("pensamento");
  const [pausa, setPausa] = useState(false);
  const reduz = useRef(false);

  useEffect(() => {
    reduz.current = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  }, []);

  useEffect(() => {
    if (pausa || reduz.current) return;
    const t = setInterval(() => setVert((v) => ORDEM[(ORDEM.indexOf(v) + 1) % 3]), 17000);
    return () => clearInterval(t);
  }, [pausa]);

  const ir = (v: Vertice) => {
    setVert(v);
    setPausa(true);
  };
  const isP = vert === "pensamento";
  const isE = vert === "emocao";
  const isC = vert === "comportamento";
  const aresta = (on: boolean) => (on ? "aresta on" : "aresta");
  const atual = triangulo[vert];

  return (
    <div className="tcc-in">
      <div className="tri-col">
        <div className="tri">
          <svg viewBox="0 0 500 460" width="100%" height="100%" aria-hidden="true">
            <line x1="250" y1="60" x2="70" y2="400" className={aresta(isP || isE)} />
            <line x1="250" y1="60" x2="430" y2="400" className={aresta(isP || isC)} />
            <line x1="70" y1="400" x2="430" y2="400" className={aresta(isE || isC)} />
            <circle className="anel" cx="250" cy="280" r="70" fill="#F8F3F0" stroke="#C98C99" strokeWidth="1" strokeDasharray="3 6" />
          </svg>
          <button type="button" className={isP ? "vert on" : "vert"} aria-pressed={isP} onClick={() => ir("pensamento")} style={{ top: 6, left: "50%", transform: "translateX(-50%)" }}>
            {triangulo.pensamento.rotulo}
          </button>
          <button type="button" className={isE ? "vert on" : "vert"} aria-pressed={isE} onClick={() => ir("emocao")} style={{ bottom: 6, left: 0 }}>
            {triangulo.emocao.rotulo}
          </button>
          <button type="button" className={isC ? "vert on" : "vert"} aria-pressed={isC} onClick={() => ir("comportamento")} style={{ bottom: 6, right: 0 }}>
            {triangulo.comportamento.rotulo}
          </button>
          <span className="tri-voce">você</span>
        </div>
        <button type="button" className="link-btn" onClick={() => setPausa((p) => !p)}>
          {pausa ? "Retomar animação" : "Pausar animação"}
        </button>
      </div>
      <div className="tri-texto">
        <h2 className="h2 revela">O que você pensa, sente e faz conversa entre si.</h2>
        <p className="suave">
          Quando um ponto do triângulo muda, os outros acompanham. A TCC é uma das abordagens com maior respaldo científico para ansiedade e depressão.
        </p>
        <div className="tri-card" aria-live="polite">
          <span className="rotulo">Exemplo: uma mensagem fica sem resposta</span>
          <div className="passo" key={vert}>
            <p className="tri-frase">{atual.frase}</p>
            <p className="suave">
              {atual.texto}
              {atual.termo && (
                <>
                  {" "}
                  <strong>{atual.termo}</strong>.
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
