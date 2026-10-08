import FormSenha from "./FormSenha";
import { TopoCelular } from "../../componentes/Navegacao";

export default function NovaSenha() {
  return (
    <>
      <header className="topo"><div><h1>Senha <em>nova.</em></h1><div className="data">Escolha uma senha que só você saiba.</div></div></header>
      <TopoCelular titulo="Senha nova" pedidos={0} />
      <main className="conteudo">
        <section className="card" style={{ maxWidth: 460 }}><FormSenha /></section>
      </main>
    </>
  );
}
