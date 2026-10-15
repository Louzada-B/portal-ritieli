import type { Metadata } from "next";
import Formulario from "./Formulario";
import { contato, linkWhatsApp } from "../conteudo";
import { siteUrl } from "../site";
import "./avaliacao.css";

export const metadata: Metadata = {
  title: "Avaliação da palestra · Ritieli Hermes",
  description: "Conte o que achou da palestra. Leva menos de um minuto e é anônimo.",
  robots: { index: false, follow: false },
};

export default async function Avaliacao({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const { p } = await searchParams;
  const palestra = p && /^[a-z0-9-]{1,60}$/.test(p) ? p : "palestra";
  return (
    <main className="av">
      <div className="av-caixa">
        <header className="av-topo">
          <span className="av-ass">{contato.nome}</span>
          <span className="av-sub">Psicóloga · CRP 07/46564</span>
        </header>
        <Formulario
          palestra={palestra}
          links={{
            site: siteUrl,
            instagram: `https://instagram.com/${contato.instagram}`,
            whatsapp: linkWhatsApp("Olá, Ritieli! Assisti à sua palestra e gostaria de saber mais."),
            arroba: `@${contato.instagram}`,
          }}
        />
      </div>
    </main>
  );
}
