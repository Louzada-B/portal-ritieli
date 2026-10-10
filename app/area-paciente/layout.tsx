import type { Metadata, Viewport } from "next";
import "./paciente.css";

export const metadata: Metadata = {
  title: "Área da paciente · Ritieli Hermes",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { viewportFit: "cover", themeColor: "#F8F3F0" };

export default function LayoutPaciente({ children }: { children: React.ReactNode }) {
  return children;
}
