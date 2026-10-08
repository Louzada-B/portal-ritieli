"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Forma } from "../../componentes/Formas";
import TermoDocumento from "../../componentes/TermoDocumento";
import type { ConteudoTermo } from "../../lib/termoTexto";
import { aceitarTermo } from "../acoes";

const Ic = ({ d, t = 20 }: { d: React.ReactNode; t?: number }) => (
  <svg width={t} height={t} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);
const CADEADO = (<><rect x="5" y="10.5" width="14" height="10" rx="2" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /></>);
const RELOGIO = (<><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>);
const BAIXAR = (<><path d="M12 4v11M7.5 10.5L12 15l4.5-4.5" /><path d="M5 19h14" /></>);
const VIDEO = (<><rect x="3" y="6.5" width="12.5" height="11" rx="2" /><path d="M15.5 10.5l5-3v9l-5-3z" /></>);

type Props = { token: string; estado: "ok" | "aceito" | "cancelado" | "invalido"; c: ConteudoTermo | null; quem: string; sala: string; whats: string };

export default function Aceite({ token, estado, c, quem, sala, whats }: Props) {
  const [ok, setOk] = useState(estado === "aceito");
  const [concordo, setConcordo] = useState(false);
  const [erro, setErro] = useState("");
  const [pend, iniciar] = useTransition();

  const aceitar = () =>
    iniciar(async () => {
      setErro("");
      const r = await aceitarTermo(token, concordo);
      if (r.erro) return setErro(r.erro);
      setOk(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

  return (
    <section className="rosado" style={{ position: "relative", overflow: "hidden" }}>
      <Forma cor="#EFCBD2" style={{ position: "absolute", width: 480, height: 480, right: -160, top: -140 }} />
      <div className="wrap ag-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 24, minWidth: 0 }}>
          <h1 className="ag-h1">Termo de <em>consentimento.</em></h1>
          <p style={{ margin: 0, color: "#5A3A41", fontSize: 18, maxWidth: 460 }}>{quem ? `Olá, ${quem}. ` : ""}Este termo explica como vamos trabalhar juntas. Leia com calma e, se tiver dúvida, me pergunte antes de aceitar.</p>
          <ul className="ag-itens">
            <li><span className="ag-ic"><Ic d={CADEADO} /></span>Link pessoal e protegido</li>
            <li><span className="ag-ic"><Ic d={RELOGIO} /></span>O aceite fica registrado com data e hora</li>
            <li><span className="ag-ic"><Ic d={BAIXAR} /></span>Você pode salvar uma cópia em PDF</li>
          </ul>
        </div>

        <div className="ag-card">
          {estado === "invalido" || estado === "cancelado" ? (
            <div className="ag-corpo">
              <h2 className="ag-t">{estado === "cancelado" ? "Este link não vale mais." : "Link não encontrado."}</h2>
              <p style={{ margin: 0, color: "#5A3A41" }}>{estado === "cancelado" ? "O termo foi atualizado e um novo link foi gerado. Peça o link mais recente para a Ritieli pelo WhatsApp." : "Confira se o link foi copiado inteiro, ou peça um novo para a Ritieli pelo WhatsApp."}</p>
              <div className="ag-rodape"><a className="ag-ir" href={whats} target="_blank" rel="noopener">Falar pelo WhatsApp</a></div>
            </div>
          ) : ok ? (
            <div className="ag-corpo ok-final">
              <span className="sel so-tela"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></span>
              <h2 className="ag-t so-tela">Termo aceito. Obrigada!</h2>
              <p className="so-tela" style={{ margin: 0, color: "#5A3A41", maxWidth: 420 }}>O aceite foi registrado com data e hora. Agora é só esperar o dia da nossa sessão.</p>
              {sala ? (
                <div className="so-tela" style={{ display: "flex", flexDirection: "column", gap: 8, alignSelf: "stretch" }}>
                  <span className="ag-rot" style={{ textAlign: "left" }}>Sua sala de atendimento</span>
                  <a className="sala-c" href={sala} target="_blank" rel="noopener"><Ic d={VIDEO} />{sala.replace("https://", "")}</a>
                  <span style={{ fontSize: 13, color: "#8A7A7E", textAlign: "left" }}>É a mesma em todas as sessões. Guarde este link.</span>
                </div>
              ) : null}
              <div className="so-tela" style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
                {c ? <button type="button" className="ag-voltar" onClick={() => window.print()} style={{ display: "inline-flex", gap: 8, alignItems: "center" }}><Ic d={BAIXAR} t={18} />Salvar cópia em PDF</button> : null}
                <Link href="/" className="ag-ir">Ir para o site</Link>
              </div>
              {c ? <div className="so-impressao"><TermoDocumento c={c} publico rodape={<p style={{ marginTop: 14, fontFamily: "Manrope, system-ui, sans-serif", fontSize: 13 }}>Aceito eletronicamente pelo link pessoal. Registro guardado com data e hora.</p>} /></div> : null}
            </div>
          ) : (
            <div className="ag-corpo">
              <h2 className="ag-t">Leia o termo</h2>
              <p className="ag-sub">É o mesmo documento que a Ritieli preparou para você, já com os seus dados.</p>
              {c ? <TermoDocumento c={c} publico /> : null}
              <label className="ag-check"><input type="checkbox" checked={concordo} onChange={() => setConcordo(!concordo)} /><span>Li o termo de consentimento e concordo com ele. Entendo que este aceite tem o mesmo valor da minha assinatura.</span></label>
              {erro ? <div className="ag-erro" role="alert">{erro}</div> : null}
              <div className="ag-rodape"><button type="button" className="ag-ir" onClick={aceitar} disabled={!concordo || pend}>{pend ? "Registrando…" : <>Aceitar o termo <span aria-hidden="true">→</span></>}</button></div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
