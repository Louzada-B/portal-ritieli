import type { Metadata, Viewport } from "next";
import "./painel.css";

export const metadata: Metadata = {
  title: "Painel · Ritieli Hermes",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { viewportFit: "cover", themeColor: "#F8F3F0" };

export default function LayoutPainel({ children }: { children: React.ReactNode }) {
  return <div className="painel">{children}</div>;
}
