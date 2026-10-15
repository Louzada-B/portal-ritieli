"use client";

import { useEffect, useState, useTransition } from "react";
import { enviarAvaliacao } from "./acoes";
import { AFIRMACOES, ESCALA, type CampoLikert } from "../lib/avaliacao";

type Links = { site: string; instagram: string; whatsapp: string; arroba: string };


export default function Formulario({ palestra, links }: { palestra: string; links: Links }) {
  const chave = `avaliacao:${palestra}`;
  const [feito, setFeito] = useState(false);
  const [lk, setLk] = useState<Record<CampoLikert, number>>({ nota: 0, clareza: 0, duracao: 0 });
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
    if (!lk.nota || !lk.clareza || !lk.duracao) return setErro("Responda as três primeiras perguntas.");
    setErro("");
    iniciar(async () => {
      const r = await enviarAvaliacao({ palestra, nota: lk.nota, clareza: lk.clareza, duracao: lk.duracao, maisUtil, melhorar, site });
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

      <p className="av-instr">Nas três primeiras, diga o quanto você concorda com cada frase.</p>
      {AFIRMACOES.map((a, i) => (
        <fieldset key={a.campo} className="av-q">
          <legend><span className="av-n">{i + 1}</span>{a.texto}</legend>
          <div className="av-likert" role="radiogroup" aria-label={a.texto}>
            {ESCALA.map((rot, k) => (
              <button key={rot} type="button" role="radio" aria-checked={lk[a.campo] === k + 1} aria-label={rot} title={rot}
                className={lk[a.campo] === k + 1 ? "av-lk on" : "av-lk"} onClick={() => setLk({ ...lk, [a.campo]: k + 1 })}>
                <span className="av-bol" aria-hidden="true" />
              </button>
            ))}
          </div>
          <div className="av-pontas" aria-hidden="true"><span>Discordo totalmente</span><span>Concordo totalmente</span></div>
          <span className="av-rot">{lk[a.campo] ? ESCALA[lk[a.campo] - 1] : "\u00a0"}</span>
        </fieldset>
      ))}

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
