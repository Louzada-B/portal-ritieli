import type { Metadata, Viewport } from "next";
import "./painel.css";
import { RegistrarPwa } from "../componentes/Pwa";
import { ehTeste } from "../site";

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
      {ehTeste && (
        <div role="status" style={{ position: "sticky", top: 0, zIndex: 1000, background: "#B7791F", color: "#fff", textAlign: "center", font: "700 12px/1.2 Arial, sans-serif", letterSpacing: ".08em", padding: "6px 10px" }}>
          AMBIENTE DE TESTE · dados fictícios
        </div>
      )}
      {!ehTeste && <RegistrarPwa variante="painel" />}
      {children}
    </div>
  );
}
