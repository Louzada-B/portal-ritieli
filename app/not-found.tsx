import Link from "next/link";
import Cabecalho from "./componentes/Cabecalho";
import Rodape from "./componentes/Rodape";

export default function NaoEncontrada() {
  return (
    <div className="pagina">
      <Cabecalho atual="" />
      <main className="nao-encontrada rosado">
        <span className="sobretitulo">Em construção</span>
        <h1 className="h2-g">
          Esta página está <em>quase pronta.</em>
        </h1>
        <p className="suave">Enquanto isso, você pode voltar ao início ou falar comigo pelo WhatsApp.</p>
        <Link href="/" className="btn btn-vinho btn-g">
          Voltar ao início <span aria-hidden="true">→</span>
        </Link>
      </main>
      <Rodape />
    </div>
  );
}
