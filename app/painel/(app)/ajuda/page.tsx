import { TopoCelular } from "../../componentes/Navegacao";
import ManualInterativo from "../../../componentes/ManualInterativo";
import { AVISO, NOTA, PERGUNTAS, TAREFAS } from "./conteudo";

export const dynamic = "force-dynamic";

export default function Ajuda() {
  return (
    <>
      <header className="topo"><div><h1>Manual do <em>painel.</em></h1><div className="data">Passo a passo das tarefas do dia a dia</div></div></header>
      <TopoCelular titulo="Ajuda" sub="Manual do painel" pedidos={0} />
      <main className="conteudo">
        <ManualInterativo chave="painel" tarefas={TAREFAS} perguntas={PERGUNTAS} aviso={AVISO} nota={NOTA} />
      </main>
    </>
  );
}
