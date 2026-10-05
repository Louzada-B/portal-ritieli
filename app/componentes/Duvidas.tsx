"use client";

import Link from "next/link";
import { useState } from "react";
import { duvidas, gruposDuvidas, linkWhatsApp, rotas } from "../conteudo";
import { Forma } from "./Formas";

export default function Duvidas() {
  const [cat, setCat] = useState("Todas");
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(0);

  const termo = busca.trim().toLowerCase();
  const grupos: { nome: string; itens: { i: number; pergunta: string; resposta: string }[] }[] = [];
  duvidas.forEach((d, i) => {
    if (cat !== "Todas" && d.grupo !== cat) return;
    if (termo && (d.pergunta + " " + d.resposta).toLowerCase().indexOf(termo) === -1) return;
    let g = grupos.find((x) => x.nome === d.grupo);
    if (!g) {
      g = { nome: d.grupo, itens: [] };
      grupos.push(g);
    }
    g.itens.push({ i, pergunta: d.pergunta, resposta: d.resposta });
  });

  return (
    <>
      <section className="rosado" style={{ position: "relative", overflow: "hidden" }}>
        <Forma cor="#EFCBD2" style={{ position: "absolute", width: 460, height: 460, right: -140, top: -120 }} />
        <div className="wrap hero" style={{ position: "relative" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20, flex: "1 1 520px", minWidth: 0 }}>
            <h1 className="h1">
              Dúvidas? <em>Pergunte à vontade.</em>
            </h1>
            <p className="intro">
              Reuni aqui as perguntas mais comuns de quem está pensando em começar a terapia. Se a sua não estiver na lista, é só me chamar.
            </p>
          </div>
          <label className="busca">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8A4B55" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-4-4" />
            </svg>
            <span className="so-leitor">Buscar nas dúvidas</span>
            <input type="search" placeholder="Buscar uma dúvida…" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </label>
        </div>
      </section>

      <section className="wrap" style={{ paddingTop: 40 }}>
        <div className="chips" role="group" aria-label="Filtrar por assunto">
          {["Todas", ...gruposDuvidas].map((n) => (
            <button key={n} type="button" className={n === cat ? "chip on" : "chip"} aria-pressed={n === cat} onClick={() => setCat(n)}>
              {n}
            </button>
          ))}
        </div>
      </section>

      <section className="wrap duv-grid">
        <div>
          {grupos.map((g) => (
            <div key={g.nome} className="grupo">
              <h2 className="grupo-t">{g.nome}</h2>
              <div className="lista">
                {g.itens.map((f) => {
                  const ab = aberto === f.i;
                  return (
                    <div key={f.i} className="item">
                      <button type="button" className="q" aria-expanded={ab} onClick={() => setAberto(ab ? -1 : f.i)}>
                        <span>{f.pergunta}</span>
                        <span className={ab ? "ic aberto" : "ic"} aria-hidden="true">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                            <path d="M12 5v14M5 12h14" />
                          </svg>
                        </span>
                      </button>
                      {ab && <p className="r">{f.resposta}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {grupos.length === 0 && (
            <div className="vazio" style={{ textAlign: "left" }}>
              <p style={{ margin: "0 0 6px", fontWeight: 700, fontSize: 20, color: "#7A2335" }}>Nenhuma dúvida encontrada.</p>
              <p style={{ margin: 0 }}>Tente outra palavra ou me pergunte direto pelo WhatsApp.</p>
            </div>
          )}
        </div>

        <aside style={{ display: "flex", flexDirection: "column" }}>
          <div className="lado">
            <Forma cor="#F2C9D1" style={{ position: "absolute", width: 260, height: 260, right: -90, bottom: -110, opacity: 0.18 }} />
            <h2>
              Não encontrou <em>a sua dúvida?</em>
            </h2>
            <p>Me mande uma mensagem. Respondo com calma, e você não assume nenhum compromisso.</p>
            <a href={linkWhatsApp()} target="_blank" rel="noopener" className="bt">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.6-5.2A8.5 8.5 0 1 1 21 12z" />
              </svg>
              Perguntar pelo WhatsApp
            </a>
            <Link href={rotas.agendar} className="bt2">
              Agendar conversa inicial gratuita
            </Link>
          </div>
          <div className="crise">
            <span style={{ flex: "0 0 36px", height: 36, borderRadius: "50%", background: "#F6E5E7", color: "#7A2335", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
              </svg>
            </span>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "#5A3A41" }}>
              <strong style={{ color: "#7A2335" }}>Em situação de crise,</strong> não espere: ligue 188 (CVV, 24 horas) ou 192 (SAMU), ou procure o pronto-atendimento mais próximo.
            </p>
          </div>
        </aside>
      </section>
    </>
  );
}
