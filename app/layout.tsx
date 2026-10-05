import type { Metadata, Viewport } from "next";
import "./globals.css";
import Revela from "./componentes/Revela";

const site = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: "Ritieli Hermes · Psicóloga · CRP 07/46564",
  description:
    "Terapia Cognitivo-Comportamental online para mulheres, para cuidar da ansiedade e da depressão. Conversa inicial gratuita de 15 minutos.",
  openGraph: {
    title: "Ritieli Hermes · Psicóloga",
    description: "Você não precisa dar conta de tudo sozinha. Terapia online para todo o Brasil.",
    locale: "pt_BR",
    type: "website",
    images: ["/ritieli.webp"],
  },
};

export const viewport: Viewport = {
  themeColor: "#F6E5E7",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&family=Mrs+Saint+Delafield&display=swap"
        />
      </head>
      <body>
        {children}
        <Revela />
      </body>
    </html>
  );
}
