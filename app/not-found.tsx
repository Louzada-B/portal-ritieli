import Link from "next/link";
import Moldura from "./componentes/Moldura";
import { Forma } from "./componentes/Formas";
import { rotas } from "./conteudo";

export default function NaoEncontrada() {
  return (
    <Moldura atual="">
      <section className="rosado" style={{ position: "relative", overflow: "hidden", flex: "1 0 auto" }}>
        <Forma cor="#EFCBD2" style={{ position: "absolute", width: 520, height: 520, right: -140, top: -80 }} />
        <div className="wrap nf" style={{ position: "relative" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 640 }}>
            <span className="nf-n" aria-hidden="true">404</span>
            <h1 className="h1" style={{ fontSize: 56 }}>
              Esta página <em style={{ fontSize: 64 }}>se perdeu.</em>
            </h1>
            <p className="intro" style={{ maxWidth: 520 }}>
              O endereço pode estar errado ou a página pode ter mudado de lugar. Respire fundo: daqui você encontra o caminho de volta.
            </p>
            <div className="nf-links">
              <Link href="/" className="cta">Voltar ao início</Link>
              <Link href={rotas.escritos} className="nf-sec">Ler os escritos</Link>
              <Link href={rotas.duvidas} className="nf-sec">Ver dúvidas</Link>
            </div>
          </div>
        </div>
      </section>
    </Moldura>
  );
}
