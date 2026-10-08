"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { Forma, FORMA_B } from "../componentes/Formas";
import { linkWhatsApp, rotas } from "../conteudo";
import type { DiaAgenda } from "../lib/agendaPublica";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, o: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove: (id: string) => void;
    };
  }
}

const I = {
  video: (<><rect x="3" y="6" width="13" height="12" rx="2" /><path d="M16 10l5-3v10l-5-3" /></>),
  presente: (<><path d="M4 11h16v9H4zM3 7h18v4H3zM12 7v13" /><path d="M12 7c-1.5-3-5-3-5-1s3 1 5 1zM12 7c1.5-3 5-3 5-1s-3 1-5 1z" /></>),
  whats: <path d="M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.6-5.2A8.5 8.5 0 1 1 21 12z" />,
  pessoa: (<><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" /></>),
  familia: (<><circle cx="8.5" cy="7.5" r="3" /><circle cx="17" cy="10.5" r="2.2" /><path d="M3 20c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" /><path d="M14.5 20c.3-2.2 1.3-3.6 2.5-3.6s2.4 1.2 2.7 3.6" /></>),
  info: (<><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>),
  ok: <path d="M5 12.5l4.5 4.5L19 7.5" />,
};
const Ic = ({ d, tam = 20, w = 1.8 }: { d: React.ReactNode; tam?: number; w?: number }) => (
  <svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);

const fone = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
};

export default function Agenda({ diasIniciais, duracao, siteKey }: { diasIniciais: DiaAgenda[]; duracao: number; siteKey: string }) {
  const [etapa, setEtapa] = useState<1 | 2 | 3 | 4>(1);
  const [quem, setQuem] = useState<"mim" | "filho" | null>(null);
  const [dias, setDias] = useState(diasIniciais);
  const [diaSel, setDiaSel] = useState(0);
  const [hora, setHora] = useState<string | null>(null);
  const [f, setF] = useState({ nome: "", whatsapp: "", email: "", idade: "", mensagem: "" });
  const [aceito, setAceito] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [quando, setQuando] = useState("");
  const [token, setToken] = useState("");
  const tsRef = useRef<HTMLDivElement>(null);
  const tsId = useRef<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const filho = quem === "filho";
  const dia = dias[diaSel];
  const horaSel = dia?.horarios.find((h) => h.iso === hora);

  const ir = (n: 1 | 2 | 3) => {
    setErro("");
    setEtapa(n);
    cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const recarregar = async () => {
    try {
      const r = await fetch("/api/agenda/horarios", { cache: "no-store" });
      const j = await r.json();
      if (j.dias) {
        setDias(j.dias);
        setDiaSel(0);
        setHora(null);
      }
    } catch {}
  };

  // Widget anti-robô na etapa 3.
  const montarTurnstile = () => {
    if (!siteKey || !tsRef.current || !window.turnstile || tsId.current) return;
    tsId.current = window.turnstile.render(tsRef.current, {
      sitekey: siteKey,
      language: "pt-BR",
      callback: (t: string) => setToken(t),
      "expired-callback": () => setToken(""),
      "error-callback": () => setToken(""),
    });
  };
  useEffect(() => {
    if (etapa === 3) montarTurnstile();
    return () => {
      if (etapa === 3 && tsId.current && window.turnstile) {
        window.turnstile.remove(tsId.current);
        tsId.current = null;
        setToken("");
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etapa]);

  const enviar = async () => {
    setErro("");
    setEnviando(true);
    try {
      const r = await fetch("/api/agenda/pedido", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ para_quem: quem, inicio: hora, ...f, aceite: aceito, token }),
      });
      const j = await r.json();
      if (j.ok) {
        setQuando(j.quando);
        setEtapa(4);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      setErro(j.msg || "Não deu para enviar. Tente de novo.");
      if (j.codigo === "ocupado") {
        await recarregar();
        setEtapa(2);
      }
      if (tsId.current && window.turnstile) window.turnstile.reset(tsId.current);
      setToken("");
    } catch {
      setErro("Sem conexão. Confira sua internet e tente de novo.");
    } finally {
      setEnviando(false);
    }
  };

  const camposOk =
    f.nome.trim().length >= 2 &&
    f.whatsapp.replace(/\D/g, "").length >= 10 &&
    /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim()) &&
    (!filho || /\d/.test(f.idade)) &&
    aceito &&
    (!siteKey || !!token);

  const passo = (n: number) => (etapa === n ? "atual" : etapa > n ? "feito" : "");

  if (etapa === 4) {
    return (
      <section className="rosado" style={{ position: "relative", overflow: "hidden" }}>
        <Forma cor="#EFCBD2" style={{ position: "absolute", width: 480, height: 480, right: -170, top: -150 }} />
        <Forma d={FORMA_B} cor="#E9D3C7" style={{ position: "absolute", width: 300, height: 300, left: -120, bottom: -100 }} />
        <div className="wrap ok-wrap">
          <span className="ok-sel"><Ic d={I.ok} tam={44} w={2.2} /></span>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
            <h1 className="ok-h1">Pedido enviado. <em>Obrigada!</em></h1>
            <p style={{ margin: 0, color: "#5A3A41", fontSize: 18, maxWidth: 540 }}>Recebi seu pedido de conversa inicial. O horário fica guardado para você enquanto eu confirmo.</p>
          </div>
          <div className="ok-card">
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 16px", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #F1E3E6", paddingBottom: 18 }}>
              <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.35 }}>
                <span style={{ fontSize: 13, color: "#8A7A7E" }}>Conversa inicial · gratuita</span>
                <span style={{ fontWeight: 700, fontSize: 22, color: "#3A1F25" }}>{quando}</span>
              </span>
              <span className="ok-status"><i aria-hidden="true" />Aguardando confirmação</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "16px 32px" }}>
              <span className="ok-linha"><span className="ok-ic"><Ic d={I.video} /></span><span style={{ display: "flex", flexDirection: "column", lineHeight: 1.35 }}><span style={{ fontWeight: 700 }}>Por vídeo, {duracao} minutos</span><span style={{ fontSize: 14, color: "#6B5A5E" }}>Horário de Brasília</span></span></span>
              <span className="ok-linha"><span className="ok-ic"><Ic d={I.pessoa} /></span><span style={{ display: "flex", flexDirection: "column", lineHeight: 1.35 }}><span style={{ fontWeight: 700 }}>{filho ? "Para meu filho ou filha" : "Para mim"}</span><span style={{ fontSize: 14, color: "#6B5A5E" }}>{f.nome.trim()} · {fone(f.whatsapp)}</span></span></span>
            </div>
          </div>
          <h2 style={{ margin: "24px 0 0", fontWeight: 700, fontSize: 32, lineHeight: 1.1, letterSpacing: "-0.02em", color: "#7A2335" }}>O que acontece agora</h2>
          <ol className="ok-passos">
            <li><span className="ok-ic"><Ic d={I.whats} /></span><b>Eu confirmo pelo WhatsApp</b><span className="d">Você recebe uma mensagem minha em até 48 horas para confirmar o horário.</span></li>
            <li><span className="ok-ic"><Ic d={I.video} /></span><b>O link chega pelo WhatsApp</b><span className="d">Junto com a confirmação, envio o link da chamada de vídeo.</span></li>
            <li><span className="ok-ic"><Ic d={I.video} /></span><b>No horário, é só entrar</b><span className="d">Use o link que enviei pelo WhatsApp, com fone de ouvido e em um lugar reservado.</span></li>
          </ol>
          <div className="ok-btns">
            <Link href={rotas.inicio} className="ok-b1">Voltar ao início</Link>
            <Link href={rotas.escritos} className="ok-b2">Ler os Escritos enquanto isso</Link>
          </div>
          <p style={{ margin: 0, fontSize: 14, color: "#6B5A5E" }}>Precisa mudar o horário? É só responder a minha mensagem no WhatsApp.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="rosado" style={{ position: "relative", overflow: "hidden" }}>
      {siteKey ? <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onLoad={() => etapa === 3 && montarTurnstile()} /> : null}
      <Forma cor="#EFCBD2" style={{ position: "absolute", width: 480, height: 480, right: -160, top: -140 }} />
      <Forma d={FORMA_B} cor="#E9D3C7" style={{ position: "absolute", width: 300, height: 300, left: -130, bottom: -110 }} />
      <div className="wrap ag-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 26, minWidth: 0 }}>
          <h1 className="ag-h1">Vamos marcar a primeira <em>conversa.</em></h1>
          <p style={{ margin: 0, color: "#5A3A41", fontSize: 18, maxWidth: 460 }}>Escolha um horário e deixe seu contato. Eu confirmo com você pelo WhatsApp e envio o link da chamada.</p>
          <ul className="ag-itens">
            <li><span className="ag-ic"><Ic d={I.video} /></span>{duracao} minutos, por vídeo</li>
            <li><span className="ag-ic"><Ic d={I.presente} /></span>Gratuita e sem compromisso</li>
            <li><span className="ag-ic"><Ic d={I.whats} /></span>Confirmação pelo WhatsApp</li>
          </ul>
          <div className="ag-quem ag-side-extra">
            <img src="/ritieli.webp" alt="Ritieli Hermes" />
            <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.35 }}>
              <span style={{ fontSize: 13, color: "#8A7A7E" }}>Quem vai te receber</span>
              <span style={{ fontWeight: 700 }}>Ritieli Hermes</span>
              <span style={{ fontSize: 13, color: "#6B5A5E" }}>Psicóloga · CRP 07/46564</span>
            </span>
          </div>
          <p className="ag-crise ag-side-extra">Esta agenda não é para emergências. Em situação de crise, ligue 188 (CVV) ou 192 (SAMU).</p>
        </div>

        <div className="ag-card" ref={cardRef} style={{ scrollMarginTop: 110 }}>
          <ol className="ag-passos" aria-label="Etapas do agendamento">
            <li className={passo(1)}><span className="n">{etapa > 1 ? "✓" : "1"}</span>Para quem</li>
            <li className={passo(2)}><span className="n">{etapa > 2 ? "✓" : "2"}</span>Dia e horário</li>
            <li className={passo(3)}><span className="n">3</span>Seus dados</li>
          </ol>

          {etapa === 1 ? (
            <div className="ag-corpo">
              <h2 className="ag-t">Para quem é a conversa?</h2>
              <div className="ag-opcoes" role="group" aria-label="Para quem é a conversa">
                <button type="button" className={quem === "mim" ? "ag-op on" : "ag-op"} onClick={() => setQuem("mim")} aria-pressed={quem === "mim"}>
                  <span className="oi"><Ic d={I.pessoa} tam={24} /></span><span className="ot">Para mim</span><span className="od">Sou adulta e quero começar a terapia.</span><span className="tag">Online · todo o Brasil</span>
                </button>
                <button type="button" className={filho ? "ag-op on" : "ag-op"} onClick={() => setQuem("filho")} aria-pressed={filho}>
                  <span className="oi"><Ic d={I.familia} tam={24} /></span><span className="ot">Para meu filho ou filha</span><span className="od">A primeira conversa é com os responsáveis.</span><span className="tag">Presencial · Porto Alegre</span>
                </button>
              </div>
              <div className="ag-rodape">
                <button type="button" className="ag-ir" onClick={() => ir(2)} disabled={!quem}>Continuar <span aria-hidden="true">→</span></button>
              </div>
            </div>
          ) : null}

          {etapa === 2 ? (
            <div className="ag-corpo">
              <h2 className="ag-t">Escolha o dia e o horário</h2>
              <p className="ag-sub">Horários de Brasília. A conversa dura {duracao} minutos.</p>
              {erro ? <div className="ag-aviso" role="alert" style={{ background: "#FBE5E2", color: "#A3322A" }}><Ic d={I.info} tam={18} /><span>{erro}</span></div> : null}
              {dias.length ? (
                <>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <span className="ag-rot">{dia?.mes}</span>
                    <div className="ag-dias" role="group" aria-label="Dias disponíveis">
                      {dias.map((d, i) => (
                        <button key={d.data} type="button" className={i === diaSel ? "dia sel" : "dia"} aria-pressed={i === diaSel} onClick={() => { setDiaSel(i); setHora(null); }}>
                          <span style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>{d.rot}</span>
                          <span style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.1 }}>{d.num}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <span className="ag-rot">Horários livres</span>
                    <div className="ag-slots" role="group" aria-label="Horários">
                      {dia?.horarios.map((h) => (
                        <button key={h.iso} type="button" className={hora === h.iso ? "slot sel" : "slot"} disabled={h.ocupado} aria-pressed={hora === h.iso} onClick={() => setHora(h.iso)}>{h.h}</button>
                      ))}
                    </div>
                    {dia?.horarios.some((h) => h.ocupado) ? <span style={{ fontSize: 13, color: "#8A7A7E" }}>Horários riscados já estão reservados.</span> : null}
                  </div>
                </>
              ) : (
                <div className="ag-aviso"><Ic d={I.info} tam={18} /><span>Não há horários livres nos próximos dias. <a href={linkWhatsApp("Olá, Ritieli! Gostaria de marcar uma conversa inicial.")} target="_blank" rel="noopener">Fale comigo pelo WhatsApp</a> que a gente combina.</span></div>
              )}
              {filho ? <div className="ag-aviso"><Ic d={I.info} tam={18} /><span>Esta primeira conversa é online, só com os responsáveis. Os encontros com a criança ou o adolescente acontecem depois, presencialmente em Porto Alegre.</span></div> : null}
              <div className="ag-rodape">
                <button type="button" className="ag-voltar" onClick={() => ir(1)}><span aria-hidden="true">←</span> Voltar</button>
                <button type="button" className="ag-ir" onClick={() => ir(3)} disabled={!horaSel}>Continuar <span aria-hidden="true">→</span></button>
              </div>
            </div>
          ) : null}

          {etapa === 3 ? (
            <form className="ag-corpo" onSubmit={(e) => { e.preventDefault(); if (camposOk && !enviando) enviar(); }}>
              <h2 className="ag-t">Seus dados para eu confirmar</h2>
              <div className="ag-resumo">
                <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.4 }}>
                  <span style={{ fontSize: 13, color: "#8A7A7E" }}>{filho ? "Para meu filho ou filha" : "Para mim"} · conversa inicial gratuita</span>
                  <b>{dia ? `${dia.rot}, ${dia.num} de ${dia.mes} · ${horaSel?.h}` : ""}</b>
                </span>
                <button type="button" className="ag-link" onClick={() => ir(2)}>Alterar</button>
              </div>
              <div className="ag-campos">
                <div className="ag-campo inteiro"><label htmlFor="ag-nome">{filho ? "Seu nome (responsável)" : "Como você prefere ser chamada?"}</label><input id="ag-nome" type="text" autoComplete="name" placeholder="Seu nome" maxLength={120} value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} required /></div>
                <div className="ag-campo"><label htmlFor="ag-wa">WhatsApp</label><input id="ag-wa" type="tel" autoComplete="tel" inputMode="tel" placeholder="(51) 90000-0000" value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: fone(e.target.value) })} required /></div>
                <div className="ag-campo"><label htmlFor="ag-mail">E-mail</label><input id="ag-mail" type="email" autoComplete="email" placeholder="voce@email.com" maxLength={254} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required /></div>
                {filho ? <div className="ag-campo inteiro"><label htmlFor="ag-idade">Idade da criança ou do adolescente</label><input id="ag-idade" type="text" inputMode="numeric" placeholder="Ex.: 7 anos" maxLength={10} value={f.idade} onChange={(e) => setF({ ...f, idade: e.target.value })} style={{ maxWidth: 220 }} required /></div> : null}
                <div className="ag-campo inteiro">
                  <label htmlFor="ag-msg">{filho ? "Quer me contar um pouco sobre a criança?" : "Quer me contar algo antes da conversa?"} <span className="op">(opcional)</span></label>
                  <textarea id="ag-msg" placeholder="Escreva só o que quiser contar." maxLength={2000} value={f.mensagem} onChange={(e) => setF({ ...f, mensagem: e.target.value })} />
                  <span className="dica">Não precisa entrar em detalhes. Só eu leio esta mensagem.</span>
                </div>
              </div>
              <label className="ag-check"><input type="checkbox" checked={aceito} onChange={() => setAceito(!aceito)} /><span>Li a <Link href={rotas.privacidade} target="_blank">Política de Privacidade</Link> e concordo com o uso dos meus dados para este agendamento.</span></label>
              {siteKey ? <div ref={tsRef} style={{ minHeight: 65 }} /> : null}
              {erro ? <div className="ag-aviso" role="alert" style={{ background: "#FBE5E2", color: "#A3322A" }}><Ic d={I.info} tam={18} /><span>{erro}</span></div> : null}
              <div className="ag-rodape">
                <button type="button" className="ag-voltar" onClick={() => ir(2)}><span aria-hidden="true">←</span> Voltar</button>
                <button type="submit" className="ag-ir" disabled={!camposOk || enviando}>{enviando ? "Enviando…" : <>Enviar pedido <span aria-hidden="true">→</span></>}</button>
              </div>
              <p className="ag-nota">O horário fica guardado até eu confirmar com você.</p>
            </form>
          ) : null}
        </div>
      </div>
    </section>
  );
}
