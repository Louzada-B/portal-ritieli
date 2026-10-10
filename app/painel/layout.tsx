import type { Metadata, Viewport } from "next";
import "./painel.css";
import { RegistrarPwa } from "../componentes/Pwa";

export const metadata: Metadata = {
  title: "Painel · Ritieli Hermes",
  robots: { index: false, follow: false },
  manifest: "/pwa/painel.webmanifest",
  appleWebApp: { capable: true, title: "Ritieli Hermes", statusBarStyle: "default" },
  icons: { icon: "/pwa/icone-192.png", apple: "/pwa/apple-touch-icon.png" },
};

export const viewport: Viewport = { viewportFit: "cover", themeColor: "#F8F3F0" };

export default function LayoutPainel({ children }: { children: React.ReactNode }) {
  return (
    <div className="painel">
      <RegistrarPwa variante="painel" />
      {children}
    </div>
  );
}
