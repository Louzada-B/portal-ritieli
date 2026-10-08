import type { Metadata } from "next";
import "./painel.css";

export const metadata: Metadata = {
  title: "Painel · Ritieli Hermes",
  robots: { index: false, follow: false },
};

export default function LayoutPainel({ children }: { children: React.ReactNode }) {
  return <div className="painel">{children}</div>;
}
