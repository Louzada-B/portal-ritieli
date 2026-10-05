import type { Metadata } from "next";
import EmConstrucao from "../componentes/EmConstrucao";
import { rotas } from "../conteudo";

export const metadata: Metadata = { robots: { index: false } };

export default function Pagina() {
  return <EmConstrucao atual={rotas.agendar} titulo="Agendar conversa" />;
}
