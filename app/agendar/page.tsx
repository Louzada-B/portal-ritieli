import EmConstrucao from "../componentes/EmConstrucao";
import { rotas } from "../conteudo";

export default function Pagina() {
  return <EmConstrucao atual={rotas.agendar} titulo="Agendar conversa" />;
}
