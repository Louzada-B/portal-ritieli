import type { Metadata } from "next";
import EmConstrucao from "../componentes/EmConstrucao";
import Moldura from "../componentes/Moldura";
import { rotas } from "../conteudo";
import { agendaLiberada, montarAgenda } from "../lib/agendaPublica";
import Agenda from "./Agenda";
import "./agendar.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Agendar conversa inicial · Ritieli Hermes",
  description: "Escolha um horário para a conversa inicial gratuita de 15 minutos, por vídeo.",
};

export default async function Pagina() {
  if (!(await agendaLiberada())) return <EmConstrucao atual={rotas.agendar} titulo="Agendar conversa" />;
  const { duracao, dias } = await montarAgenda().catch(() => ({ duracao: 15, dias: [] }));
  return (
    <Moldura atual={rotas.agendar}>
      <Agenda diasIniciais={dias} duracao={duracao} siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""} />
    </Moldura>
  );
}
