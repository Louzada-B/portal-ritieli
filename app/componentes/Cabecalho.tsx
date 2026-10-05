"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { contato, linkWhatsApp, menu, rotas } from "../conteudo";
import { Forma } from "./Formas";

export default function Cabecalho({ atual = "/" }: { atual?: string }) {
  const [rolou, setRolou] = useState(false);
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    const aoRolar = () => setRolou(window.scrollY > 40);
    aoRolar();
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => window.removeEventListener("scroll", aoRolar);
  }, []);

  useEffect(() => {
    document.body.style.overflow = aberto ? "hidden" : "";
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [aberto]);

  return (
    <>
      <header className={rolou ? "topo rolou" : "topo"}>
        <div className="topo-in">
          <Link href={rotas.inicio} className="marca-nome">
            <span className="assina">{contato.nome}</span>
            <span className="crp">Psicóloga · {contato.crp}</span>
          </Link>
          <nav aria-label="Principal" className="nav-desk">
            {menu.map((m) => (
              <Link key={m.href} href={m.href} aria-current={m.href === atual ? "page" : undefined} className={m.href === atual ? "atual" : undefined}>
                {m.rotulo}
              </Link>
            ))}
            <Link href={rotas.agendar} className="btn btn-vinho btn-p">
              Agendar conversa
            </Link>
          </nav>
          <div className="nav-mob">
            <Link href={rotas.agendar} className="btn btn-vinho btn-pp">
              Agendar
            </Link>
            <button type="button" className="btn-menu" aria-label="Abrir menu" aria-expanded={aberto} onClick={() => setAberto(true)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h10" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {aberto && (
        <div className="menu-mob" role="dialog" aria-modal="true" aria-label="Menu">
          <Forma cor="#F2C9D1" className="menu-forma" />
          <div className="menu-topo">
            <Link href={rotas.inicio} className="marca-nome claro" onClick={() => setAberto(false)}>
              <span className="assina">{contato.nome}</span>
              <span className="crp">Psicóloga · {contato.crp}</span>
            </Link>
            <button type="button" className="btn-fechar" aria-label="Fechar menu" onClick={() => setAberto(false)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <nav aria-label="Principal" className="menu-lista">
            {menu.map((m, i) => (
              <Link
                key={m.href}
                href={m.href}
                className={m.href === atual ? "mi atual" : "mi"}
                aria-current={m.href === atual ? "page" : undefined}
                style={{ animationDelay: `${i * 0.05}s` }}
                onClick={() => setAberto(false)}
              >
                {m.rotulo} <span>{String(i + 1).padStart(2, "0")}</span>
              </Link>
            ))}
          </nav>
          <div className="menu-base">
            <Link href={rotas.agendar} className="btn btn-branco" onClick={() => setAberto(false)}>
              Agendar conversa inicial gratuita <span aria-hidden="true">→</span>
            </Link>
            <a href={linkWhatsApp()} target="_blank" rel="noopener" className="btn btn-contorno-claro">
              WhatsApp
            </a>
            <p>Em situação de crise, ligue 188 (CVV) ou procure o serviço de emergência mais próximo.</p>
          </div>
        </div>
      )}
    </>
  );
}
