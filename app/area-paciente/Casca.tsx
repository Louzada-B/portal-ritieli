import Link from "next/link";
import Icone from "./Icone";
import { ROTA, type Contexto } from "../lib/pacienteAuth";
import { contato, linkWhatsApp } from "../conteudo";
import { iniciais, primeiroNome } from "../lib/formato";
import { sair } from "./acoes";

export type Aba = "inicio" | "sessoes" | "pagamentos" | "dados" | "exercicios";

const ABAS: { id: Exclude<Aba, "exercicios">; texto: string; caminho: string; icone: "casa" | "calendario" | "cartao" | "pessoa" }[] = [
  { id: "inicio", texto: "Início", caminho: "", icone: "casa" },
  { id: "sessoes", texto: "Sessões", caminho: "/sessoes", icone: "calendario" },
  { id: "pagamentos", texto: "Pagamentos", caminho: "/pagamentos", icone: "cartao" },
  { id: "dados", texto: "Meus dados", caminho: "/meus-dados", icone: "pessoa" },
];

// Estrutura comum das telas: topo, abas, troca de paciente (quando o login vê mais de um), rodapé e barra do celular.
export default function Casca({ ctx, aba, children }: { ctx: Contexto; aba: Aba; children: React.ReactNode }) {
  const varios = ctx.pacientes.length > 1;
  const href = (caminho: string, id = ctx.atual.id) => `${ROTA}${caminho}${varios ? `?p=${id}` : ""}`;
  return (
    <div className="pac raiz">
      <header className="pa-topo">
        <div className="pa-topo-in">
          <Link href={href("")} className="pmarca"><span className="ass">{contato.nome}</span><span className="sub">Área da(o) paciente</span></Link>
          <nav className="abas" aria-label="Áreas">
            {ABAS.map((a) => <Link key={a.id} href={href(a.caminho)} className={a.id === aba ? "atual" : undefined} aria-current={a.id === aba ? "page" : undefined}>{a.texto}</Link>)}
          </nav>
          <div className="quem">
            <span className="av" aria-hidden="true">{iniciais(ctx.acesso.nome)}</span>
            <span className="nome" style={{ fontWeight: 600, fontSize: 14 }}>{primeiroNome(ctx.acesso.nome)}</span>
            <form action={sair}><button type="submit" className="sair" style={{ background: "none", border: 0, cursor: "pointer", font: "inherit", fontWeight: 700, fontSize: 14 }}>Sair</button></form>
          </div>
        </div>
      </header>

      <div className="wrap">
        {varios ? (
          <div className="pa-chips" style={{ paddingTop: 20 }} role="group" aria-label="Acompanhamento de">
            {ctx.pacientes.map((p) => <Link key={p.id} href={href(ABAS.find((a) => a.id === aba)?.caminho ?? "/exercicios", p.id)} className={p.id === ctx.atual.id ? "pa-chip on" : "pa-chip"} style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>{primeiroNome(p.nome)}</Link>)}
          </div>
        ) : null}
        {children}
        <footer className="pa-rodape">
          <span>Precisa falar com a {primeiroNome(contato.nome)}? <a href={linkWhatsApp()} target="_blank" rel="noopener">WhatsApp</a> ou <a href={`mailto:${contato.email}`}>{contato.email}</a>.</span>
          <span>Este espaço não é canal de emergência. Em crise, ligue 188 (CVV) ou 192 (SAMU). · <Link href="/privacidade">Política de privacidade</Link></span>
        </footer>
      </div>

      <nav className="tabbar" aria-label="Áreas">
        {ABAS.map((a) => <Link key={a.id} href={href(a.caminho)} className={a.id === aba ? "atual" : undefined} aria-current={a.id === aba ? "page" : undefined}><Icone nome={a.icone} tam={22} />{a.texto}</Link>)}
      </nav>
    </div>
  );
}
