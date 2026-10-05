import Link from "next/link";
import { contato, linkWhatsApp, rodape, rotas } from "../conteudo";

export default function Rodape() {
  return (
    <>
      <footer id="contato" className="rodape">
        <div className="rodape-in">
          <div className="rodape-cima">
            <p className="rodape-frase">{rodape.frase}</p>
            <nav aria-label="Contato" className="rodape-nav">
              <a href={linkWhatsApp()} target="_blank" rel="noopener">WhatsApp</a>
              <a href={`https://instagram.com/${contato.instagram}`} target="_blank" rel="noopener">Instagram</a>
              <a href={`mailto:${contato.email}`}>E-mail</a>
              <Link href={rotas.privacidade}>Privacidade</Link>
            </nav>
          </div>
          <div className="rodape-base">
            <span>{rodape.linha}</span>
            <span>{rodape.crise}</span>
          </div>
        </div>
      </footer>
      <a className="wa-flut" href={linkWhatsApp()} target="_blank" rel="noopener" aria-label="Conversar com a Ritieli pelo WhatsApp">
        <span className="pulso" aria-hidden="true" />
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.6-5.2A8.5 8.5 0 1 1 21 12z" />
        </svg>
        <span className="wa-rot">Fale comigo</span>
      </a>
    </>
  );
}
