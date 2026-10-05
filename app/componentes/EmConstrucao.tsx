import Link from "next/link";
import Moldura from "./Moldura";
import { Forma } from "./Formas";
import { linkWhatsApp } from "../conteudo";

// Tela provisória para páginas que ainda aguardam conteúdo.
export default function EmConstrucao({ atual, titulo }: { atual: string; titulo: string }) {
  return (
    <Moldura atual={atual}>
      <section className="rosado" style={{ position: "relative", overflow: "hidden", flex: "1 0 auto" }}>
        <Forma cor="#EFCBD2" style={{ position: "absolute", width: 520, height: 520, right: -140, top: -80 }} />
        <div className="wrap nf" style={{ position: "relative" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 640 }}>
            <span className="rot-sobre">{titulo}</span>
            <h1 className="h1" style={{ fontSize: 56 }}>
              Esta página está <em style={{ fontSize: 64 }}>quase pronta.</em>
            </h1>
            <p className="intro" style={{ maxWidth: 520 }}>Enquanto isso, você pode voltar ao início ou falar comigo pelo WhatsApp.</p>
            <div className="nf-links">
              <Link href="/" className="cta">Voltar ao início</Link>
              <a href={linkWhatsApp()} target="_blank" rel="noopener" className="nf-sec">Falar pelo WhatsApp</a>
            </div>
          </div>
        </div>
      </section>
    </Moldura>
  );
}
