"use client";

import { useEffect, useState } from "react";

// App instalável (PWA). Dois apps separados: a área da(o) paciente e o painel da Ritieli,
// cada um com o seu manifesto, o seu service worker e o seu escopo.

type Variante = "paciente" | "painel";
const CFG: Record<Variante, { sw: string; escopo: string; titulo: string; texto: string }> = {
  paciente: { sw: "/pwa/sw-paciente.js", escopo: "/area-paciente", titulo: "Instale o app no seu celular", texto: "Abra a sua área direto da tela inicial, como um aplicativo." },
  painel: { sw: "/pwa/sw-painel.js", escopo: "/painel", titulo: "Instale o painel no celular", texto: "Abra o painel direto da tela inicial, como um aplicativo." },
};

// Registra o service worker (necessário para o navegador oferecer a instalação).
export function RegistrarPwa({ variante }: { variante: Variante }) {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const c = CFG[variante];
    navigator.serviceWorker.register(c.sw, { scope: c.escopo }).catch((e) => console.error("PWA:", e));
  }, [variante]);
  return null;
}

type EventoInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const guardado = (chave: string) => { try { return localStorage.getItem(chave); } catch { return null; } };
const guardar = (chave: string, v: string) => { try { localStorage.setItem(chave, v); } catch { /* sem armazenamento: o aviso só volta no próximo acesso */ } };

export function CartaoInstalar({ variante, className }: { variante: Variante; className?: string }) {
  const c = CFG[variante];
  const chave = `pwa-dispensou-${variante}`;
  const [evento, setEvento] = useState<EventoInstalar | null>(null);
  const [ios, setIos] = useState(false);
  const [safari, setSafari] = useState(true);
  const [oculto, setOculto] = useState(true);

  useEffect(() => {
    const instalado = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const ate = Number(guardado(chave) || 0);
    if (instalado || ate > Date.now()) return;
    const ua = navigator.userAgent;
    const ehIos = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    setIos(ehIos);
    setSafari(!/CriOS|FxiOS|EdgiOS|Instagram|FBAN|FBAV|Line/.test(ua));
    setOculto(false);
    const antes = (e: Event) => { e.preventDefault(); setEvento(e as EventoInstalar); };
    const depois = () => setOculto(true);
    window.addEventListener("beforeinstallprompt", antes);
    window.addEventListener("appinstalled", depois);
    return () => { window.removeEventListener("beforeinstallprompt", antes); window.removeEventListener("appinstalled", depois); };
  }, [chave]);

  if (oculto || (!evento && !ios)) return null;

  const dispensar = () => { guardar(chave, String(Date.now() + 30 * 86400000)); setOculto(true); };
  const instalar = async () => {
    if (!evento) return;
    await evento.prompt();
    const r = await evento.userChoice;
    setEvento(null);
    if (r.outcome === "accepted") setOculto(true);
    else dispensar();
  };

  return (
    <section className={className} aria-label="Instalar o app" style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/pwa/icone-192.png" alt="" width={52} height={52} style={{ borderRadius: 14, flex: "0 0 auto" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
        <b style={{ fontSize: 17 }}>{c.titulo}</b>
        <span style={{ fontSize: 14, opacity: 0.85 }}>{c.texto}</span>
        {evento ? (
          <span style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
            <button type="button" className="bt" onClick={instalar}>Instalar app</button>
            <button type="button" className="bt3" onClick={dispensar}>Agora não</button>
          </span>
        ) : (
          <>
            <ol style={{ margin: "4px 0 0", paddingLeft: 20, fontSize: 14, display: "flex", flexDirection: "column", gap: 4 }}>
              {!safari ? <li>Abra esta página no <b>Safari</b>.</li> : null}
              <li>Toque em <b>Compartilhar</b> (o quadrado com uma seta para cima).</li>
              <li>Escolha <b>Adicionar à Tela de Início</b>.</li>
            </ol>
            <span><button type="button" className="bt3" onClick={dispensar}>Entendi, fechar</button></span>
          </>
        )}
      </div>
    </section>
  );
}
