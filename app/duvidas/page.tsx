import type { Metadata } from "next";
import Moldura from "../componentes/Moldura";
import Duvidas from "../componentes/Duvidas";
import { rotas } from "../conteudo";

export const metadata: Metadata = {
  title: "Dúvidas · Ritieli Hermes · Psicóloga",
  description: "Perguntas frequentes sobre a terapia online: TCC, conversa inicial gratuita, valores, reembolso, sigilo e atendimento de crianças e adolescentes.",
};

export default function Pagina() {
  return (
    <Moldura atual={rotas.duvidas}>
      <Duvidas />
    </Moldura>
  );
}
