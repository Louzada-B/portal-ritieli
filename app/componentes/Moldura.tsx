import Cabecalho from "./Cabecalho";
import Rodape from "./Rodape";
import "../subpaginas.css";

// Estrutura comum das páginas internas: topo, conteúdo e rodapé.
export default function Moldura({ atual, children }: { atual: string; children: React.ReactNode }) {
  return (
    <div className="pagina">
      <Cabecalho atual={atual} />
      <main className="sub">{children}</main>
      <Rodape />
    </div>
  );
}
