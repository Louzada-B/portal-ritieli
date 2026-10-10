import type { Metadata, Viewport } from "next";
import "./paciente.css";
import { RegistrarPwa } from "../componentes/Pwa";

export const metadata: Metadata = {
  title: "Área da(o) paciente · Ritieli Hermes",
  robots: { index: false, follow: false },
  manifest: "/pwa/paciente.webmanifest",
  appleWebApp: { capable: true, title: "Ritieli Hermes", statusBarStyle: "default" },
  icons: { icon: "/pwa/icone-192.png", apple: "/pwa/apple-touch-icon.png" },
};

export const viewport: Viewport = { viewportFit: "cover", themeColor: "#F8F3F0" };

export default function LayoutPaciente({ children }: { children: React.ReactNode }) {
  return (
    <>
      <RegistrarPwa variante="paciente" />
      {children}
    </>
  );
}
