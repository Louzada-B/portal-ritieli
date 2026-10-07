import Image from "next/image";
import Link from "next/link";
import Cabecalho from "./componentes/Cabecalho";
import Etapas from "./componentes/Etapas";
import { Check, Forma, FORMA_B } from "./componentes/Formas";
import Pensamentos from "./componentes/Pensamentos";
import ProximosHorarios from "./componentes/ProximosHorarios";
import Rodape from "./componentes/Rodape";
import Triangulo from "./componentes/Triangulo";
import { agendar, apresentacao, escritos, hero, infantil, informacoes, rotas } from "./conteudo";
import foto from "../public/ritieli.webp";

const ICONES = {
  video: <><rect x="3" y="6" width="13" height="12" rx="2" /><path d="M16 10l5-3v10l-5-3" /></>,
  coracao: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  cartao: <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M7 15h4" /></>,
};

export default function Inicio() {
  return (
    <div className="pagina">
      <Cabecalho atual="/" />

      <main>
        {/* Abertura */}
        <section id="inicio" className="hero rosado">
          <Forma cor="#EFCBD2" className="forma" style={{ width: 520, height: 520, right: -120, top: 60 }} />
          <Forma d={FORMA_B} cor="#E9D3C7" className="forma" style={{ width: 260, height: 260, left: -80, bottom: 40, animationDelay: "-6s" }} />
          <div className="hero-in">
            <div className="hero-txt">
              <h1>
                {hero.titulo} <em className="tardio">{hero.destaque}</em>
              </h1>
              <p className="hero-p">{hero.texto}</p>
              <div className="hero-btns">
                <Link href={rotas.agendar} className="btn btn-vinho btn-g">
                  Conversa inicial gratuita <span aria-hidden="true">→</span>
                </Link>
                <Link href={rotas.quemSou} className="btn btn-sec">
                  Conheça a Ritieli
                </Link>
              </div>
              <ul className="selos">
                {hero.selos.map((s) => (
                  <li key={s}>
                    <span className="bola-check branca"><Check /></span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div className="hero-foto-col">
              <div className="hero-foto foto-in">
                <div className="hero-foto-linha" aria-hidden="true" />
                <Image src={foto} alt="Ritieli Hermes sorrindo, de blazer vermelho" priority sizes="(max-width: 760px) 330px, 430px" className="hero-img" />
                <div className="hero-tag">
                  <span className="rotulo">Abordagem</span>
                  <span className="hero-tag-v">Terapia<br />Cognitivo-Comportamental</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pensamentos automáticos */}
        <section aria-labelledby="pensamentos" className="secao">
          <div className="cabeca-secao">
            <span id="pensamentos" className="sobretitulo">Pensamentos que talvez você conheça</span>
            <h2 className="h2 revela">E se eles pudessem ser vistos de outro jeito?</h2>
            <p className="dica-secao">Toque em um cartão para ver o pensamento reescrito, como fazemos na terapia.</p>
          </div>
          <Pensamentos />
          <div className="destaque-tcc">
            <Forma d={FORMA_B} cor="#F6E5E7" className="destaque-forma" />
            <span aria-hidden="true" className="aspas">“</span>
            <p className="destaque-frase">
              Na TCC, chamamos isso de <span className="marca">pensamentos automáticos</span>. Eles parecem verdades, mas podem ser olhados de perto, questionados e, aos poucos, <em>transformados.</em>
            </p>
            <p className="destaque-nota">Você não precisa chegar ao seu limite para buscar ajuda.</p>
          </div>
        </section>

        {/* Triângulo da TCC */}
        <section id="tcc" className="rosado rel">
          <Forma d={FORMA_B} cor="#EFCBD2" className="forma" style={{ width: 380, height: 380, right: -100, bottom: -120, animationDelay: "-3s" }} />
          <Triangulo />
        </section>

        {/* Apresentação */}
        <section id="carta" className="secao carta">
          <figure className="carta-foto revela">
            <Forma cor="#F6E5E7" className="carta-forma" />
            <Image src={foto} alt="Ritieli Hermes sorrindo, de blazer vermelho" sizes="(max-width: 760px) 90vw, 420px" className="carta-img" />
          </figure>
          <div className="carta-txt revela">
            <h2 className="h2">{apresentacao.titulo}</h2>
            {apresentacao.paragrafos.map((p) => (
              <p key={p.slice(0, 20)} className="carta-p">{p}</p>
            ))}
            <div className="chips">
              {apresentacao.selos.map((s) => (
                <span key={s} className="chip">{s}</span>
              ))}
            </div>
          </div>
        </section>

        {/* Como funciona */}
        <section id="ficha" className="secao sem-topo">
          <div className="ficha">
            <div className="ficha-cabeca">
              <div>
                <h2 className="h2 revela">Começar é mais simples do que parece</h2>
                <p className="dica-secao">Toque em cada etapa para ver o que acontece.</p>
              </div>
              <Link href={rotas.duvidas} className="link-forte">Perguntas frequentes →</Link>
            </div>
            <Etapas />
            <div className="infos">
              {informacoes.map((i) => (
                <div key={i.rotulo} className="info revela">
                  <span className="ico">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      {ICONES[i.icone]}
                    </svg>
                  </span>
                  <span className="info-t">
                    <span className="rotulo">{i.rotulo}</span>
                    <span className="val">{i.valor}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Infantil */}
        <section id="infantil" className="secao sem-topo">
          <Link href={rotas.infantil} className="kids">
            <Forma cor="#F6E5E7" className="kids-forma" />
            <span className="kids-ico">
              <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true">
                <circle cx="28" cy="28" r="22" fill="#FFFFFF" />
                <circle cx="21" cy="24" r="2.6" fill="#7A2335" />
                <circle cx="35" cy="24" r="2.6" fill="#7A2335" />
                <path d="M19 33c2.4 3.4 5.4 5 9 5s6.6-1.6 9-5" stroke="#7A2335" strokeWidth="2.6" strokeLinecap="round" />
                <circle cx="15" cy="31" r="3" fill="#F2C9D1" />
                <circle cx="41" cy="31" r="3" fill="#F2C9D1" />
              </svg>
            </span>
            <span className="kids-txt">
              <span className="kids-t">
                {infantil.titulo} <em>{infantil.destaque}</em>
              </span>
              <span className="kids-p">{infantil.texto}</span>
            </span>
            <span className="kids-ir">
              {infantil.botao} <span aria-hidden="true">→</span>
            </span>
          </Link>
        </section>

        {/* Escritos */}
        <section id="conteudos" className="secao sem-topo">
          <Link href={rotas.escritos} className="convite revela">
            <Forma cor="#F2C9D1" className="convite-forma" />
            <h2 className="convite-t">
              {escritos.titulo} <em>{escritos.destaque}</em>
            </h2>
            <p className="convite-p">{escritos.texto}</p>
            <span className="convite-rec">
              <span className="convite-rot">Mais recente</span>
              <span className="convite-tit">{escritos.maisRecente}</span>
            </span>
            <span className="convite-cta">
              Ler os escritos <span aria-hidden="true">→</span>
            </span>
          </Link>
        </section>

        {/* Agendar */}
        <section id="agendar" className="rosado rel agendar">
          <Forma cor="#EFCBD2" className="forma" style={{ width: 420, height: 420, left: -140, top: -100, animationDelay: "-9s" }} />
          <div className="agendar-in">
            <div className="agendar-txt">
              <h2 className="h2-g revela">
                {agendar.titulo} <em>{agendar.destaque}</em>
              </h2>
              <p className="suave">{agendar.texto}</p>
            </div>
            <div className="conv-card">
              <span className="rotulo">Próximos horários livres</span>
              <ProximosHorarios />
              <Link href={rotas.agendar} className="btn btn-vinho btn-bloco">
                Ver todos os horários <span aria-hidden="true">→</span>
              </Link>
              <p className="conv-rodape">{agendar.rodape}</p>
            </div>
          </div>
        </section>
      </main>

      <Rodape />
    </div>
  );
}
