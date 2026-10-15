"use client";

import { useEffect, useState, useTransition } from "react";
import { enviarAvaliacao } from "./acoes";

type Links = { site: string; instagram: string; whatsapp: string; arroba: string };

const NOTAS = [1, 2, 3, 4, 5];
const ROTULO_NOTA: Record<number, string> = { 1: "Não gostei", 2: "Fraca", 3: "Boa", 4: "Muito boa", 5: "Excelente" };
const CLAREZA = [["sim", "Sim"], ["em_parte", "Em parte"], ["nao", "Não"]] as const;
const DURACAO = [["curta", "Curta"], ["na_medida", "Na medida"], ["longa", "Longa"]] as const;

export default function Formulario({ palestra, links }: { palestra: string; links: Links }) {
  const chave = `avaliacao:${palestra}`;
  const [feito, setFeito] = useState(false);
  const [nota, setNota] = useState(0);
  const [clareza, setClareza] = useState("");
  const [duracao, setDuracao] = useState("");
  const [maisUtil, setMaisUtil] = useState("");
  const [melhorar, setMelhorar] = useState("");
  const [site, setSite] = useState("");
  const [erro, setErro] = useState("");
  const [pend, iniciar] = useTransition();

  useEffect(() => {
    try { if (localStorage.getItem(chave)) setFeito(true); } catch {}
  }, [chave]);

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nota) return setErro("Escolha uma nota de 1 a 5.");
    if (!clareza) return setErro("Responda se o conteúdo foi claro.");
    if (!duracao) return setErro("Responda sobre o tempo da palestra.");
    setErro("");
    iniciar(async () => {
      const r = await enviarAvaliacao({ palestra, nota, clareza, duracao, maisUtil, melhorar, site });
      if (r.erro) return setErro(r.erro);
      try { localStorage.setItem(chave, "1"); } catch {}
      setFeito(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  if (feito) {
    return (
      <section className="av-fim" aria-live="polite">
        <span className="av-ok" aria-hidden="true">✓</span>
        <h1>Obrigada pela sua resposta!</h1>
        <p>Sua opinião me ajuda a preparar encontros cada vez melhores.</p>
        <p className="av-conv">Se quiser continuar a conversa:</p>
        <div className="av-links">
          <a className="av-bt" href={links.site} target="_blank" rel="noopener">Conheça meu trabalho</a>
          <a className="av-bt av-bt2" href={links.instagram} target="_blank" rel="noopener">Instagram {links.arroba}</a>
          <a className="av-bt av-bt2" href={links.whatsapp} target="_blank" rel="noopener">Fale comigo no WhatsApp</a>
        </div>
      </section>
    );
  }

  return (
    <form className="av-form" onSubmit={enviar} noValidate>
      <div className="av-intro">
        <h1>Como foi a <em>palestra?</em></h1>
        <p>Leva menos de um minuto. As respostas são anônimas: não pedimos nome nem contato.</p>
      </div>

      <fieldset className="av-q">
        <legend><span className="av-n">1</span>De 1 a 5, como você avalia a palestra?</legend>
        <div className="av-notas" role="radiogroup" aria-label="Nota de 1 a 5">
          {NOTAS.map((n) => (
            <button key={n} type="button" role="radio" aria-checked={nota === n} className={nota === n ? "av-nota on" : "av-nota"} onClick={() => setNota(n)}>
              <b>{n}</b>
            </button>
          ))}
        </div>
        <span className="av-rot">{nota ? ROTULO_NOTA[nota] : "1 = não gostei · 5 = excelente"}</span>
      </fieldset>

      <fieldset className="av-q">
        <legend><span className="av-n">2</span>O conteúdo foi fácil de entender?</legend>
        <div className="av-chips" role="radiogroup">
          {CLAREZA.map(([v, t]) => (
            <button key={v} type="button" role="radio" aria-checked={clareza === v} className={clareza === v ? "av-chip on" : "av-chip"} onClick={() => setClareza(v)}>{t}</button>
          ))}
        </div>
      </fieldset>

      <fieldset className="av-q">
        <legend><span className="av-n">3</span>O tempo da palestra foi…</legend>
        <div className="av-chips" role="radiogroup">
          {DURACAO.map(([v, t]) => (
            <button key={v} type="button" role="radio" aria-checked={duracao === v} className={duracao === v ? "av-chip on" : "av-chip"} onClick={() => setDuracao(v)}>{t}</button>
          ))}
        </div>
      </fieldset>

      <div className="av-q">
        <label htmlFor="av-util" className="av-leg"><span className="av-n">4</span><span>O que você leva de mais útil desta palestra? <i>(opcional)</i></span></label>
        <textarea id="av-util" rows={3} maxLength={1000} value={maisUtil} onChange={(e) => setMaisUtil(e.target.value)} />
      </div>

      <div className="av-q">
        <label htmlFor="av-melhor" className="av-leg"><span className="av-n">5</span><span>O que poderia ser melhor? <i>(opcional)</i></span></label>
        <textarea id="av-melhor" rows={3} maxLength={1000} value={melhorar} onChange={(e) => setMelhorar(e.target.value)} />
      </div>

      <input className="av-isca" tabIndex={-1} autoComplete="off" aria-hidden="true" name="site" value={site} onChange={(e) => setSite(e.target.value)} />

      {erro ? <p className="av-erro" role="alert">{erro}</p> : null}
      <button type="submit" className="av-bt av-enviar" disabled={pend}>{pend ? "Enviando…" : "Enviar avaliação"}</button>
    </form>
  );
}
