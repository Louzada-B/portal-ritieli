import Casca from "../Casca";
import ManualInterativo from "../../componentes/ManualInterativo";
import { exigirAcesso } from "../../lib/pacienteAuth";
import { AVISO, NOTA, PERGUNTAS, TAREFAS } from "./conteudo";

export const dynamic = "force-dynamic";

export default async function Ajuda({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const q = await searchParams;
  const ctx = await exigirAcesso(q.p);
  return (
    <Casca ctx={ctx} aba="ajuda">
      <div className="pag-h"><h1>Como <em>usar.</em></h1><p>Um passo a passo curto do seu espaço.</p></div>
      <ManualInterativo chave="paciente" tarefas={TAREFAS} perguntas={PERGUNTAS} aviso={AVISO} nota={NOTA} />
    </Casca>
  );
}
