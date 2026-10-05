import type { Metadata, Viewport } from "next";
import "./globals.css";
import Revela from "./componentes/Revela";
import { contato } from "./conteudo";
import { siteUrl } from "./site";

const descricao =
  "Terapia Cognitivo-Comportamental online para mulheres, para cuidar da ansiedade e da depressão. Atendimento presencial de crianças e adolescentes em Porto Alegre. Conversa inicial gratuita de 15 minutos.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Ritieli Hermes · Psicóloga · CRP 07/46564",
  description: descricao,
  applicationName: "Ritieli Hermes · Psicóloga",
  openGraph: {
    title: "Ritieli Hermes · Psicóloga",
    description: "Vamos construir juntas uma vida com mais sentido. Terapia online para todo o Brasil.",
    siteName: "Ritieli Hermes · Psicóloga",
    locale: "pt_BR",
    type: "website",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Ritieli Hermes, psicóloga, CRP 07/46564" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ritieli Hermes · Psicóloga",
    description: "Vamos construir juntas uma vida com mais sentido. Terapia online para todo o Brasil.",
    images: ["/og.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#F6E5E7",
};

// Dados da psicóloga no formato que os buscadores entendem (schema.org).
const dadosEstruturados = {
  "@context": "https://schema.org",
  "@type": ["MedicalBusiness", "ProfessionalService"],
  name: "Ritieli Hermes · Psicóloga",
  description: descricao,
  url: siteUrl,
  image: `${siteUrl}/og.jpg`,
  telephone: "+55 51 99448-4669",
  email: contato.email,
  medicalSpecialty: "Psychiatric",
  areaServed: { "@type": "Country", name: "Brasil" },
  address: {
    "@type": "PostalAddress",
    streetAddress: "R. Santa Flora, 1166",
    addressLocality: "Porto Alegre",
    addressRegion: "RS",
    postalCode: "90830-410",
    addressCountry: "BR",
  },
  sameAs: [`https://instagram.com/${contato.instagram}`],
  founder: {
    "@type": "Person",
    name: "Ritieli Hermes",
    jobTitle: "Psicóloga clínica",
    identifier: contato.crp,
    knowsAbout: ["Terapia Cognitivo-Comportamental", "Ansiedade", "Depressão", "Psicoterapia infantil"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preload" href="/fontes/manrope-latin-500-normal.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="preload" href="/fontes/manrope-latin-700-normal.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="preload" href="/fontes/mrs-saint-delafield-latin-400-normal.woff2" as="font" type="font/woff2" crossOrigin="" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(dadosEstruturados) }} />
      </head>
      <body>
        {children}
        <Revela />
      </body>
    </html>
  );
}
