import type { Metadata } from "next";
import Image from "next/image";
import Moldura from "../componentes/Moldura";
import { rotas } from "../conteudo";
import foto from "../../public/ritieli.webp";

export const metadata: Metadata = {
  title: "Quem sou · Ritieli Hermes · Psicóloga",
  description: "Ritieli Hermes, psicóloga clínica (CRP 07/46564), pós-graduanda em Terapia Cognitivo-Comportamental. Atendimento online para mulheres em todo o Brasil.",
};

export default function Pagina() {
  return (
    <Moldura atual={rotas.quemSou}>


<section style={{ background: 'var(--rosado)', position: 'relative', overflow: 'hidden' }}>
<svg viewBox="0 0 200 200" width="460" height="460" style={{ position: 'absolute', left: '-160px', bottom: '-200px' }} aria-hidden="true"><path fill="#EFCBD2" d="M43.1,-58.6C55.3,-49.2,64,-35.4,68.5,-20.1C73,-4.8,73.3,12,66.7,25.4C60.1,38.8,46.6,48.8,31.9,56.8C17.2,64.8,1.3,70.8,-15.3,69.6C-31.9,68.4,-49.2,60,-59.6,46.4C-70,32.8,-73.6,14,-70.4,-2.9C-67.2,-19.8,-57.3,-34.8,-44.3,-44.2C-31.3,-53.6,-15.7,-57.4,0.3,-57.8C16.2,-58.2,30.9,-68,43.1,-58.6Z" transform="translate(100 100)" /></svg>
<div className="wrap sb-hero" style={{ position: 'relative' }}>
<div style={{ display: 'flex', flexDirection: 'column', gap: '22px', minWidth: '0' }}>
<h1 className="h1">Prazer, eu sou <em>a Ritieli.</em></h1>
<p className="intro" style={{ maxWidth: '520px' }}>Psicóloga clínica, pós-graduanda em Terapia Cognitivo-Comportamental. Acompanho mulheres que convivem com ansiedade e depressão a encontrar formas mais leves de viver.</p>
<div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
<span className="gosto">CRP 07/46564</span>
<span className="gosto">Terapia Cognitivo-Comportamental</span>
<span className="gosto">Online para todo o Brasil</span>
</div>
<div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '6px' }}>
<a href={rotas.agendar} className="cta">Agendar conversa inicial gratuita <span aria-hidden="true">→</span></a>
</div>
</div>
<div className="sb-foto"><span className="moldura" aria-hidden="true"></span><Image src={foto} alt="Ritieli Hermes sorrindo, de blazer vermelho" sizes="(max-width: 760px) 300px, 440px" priority /></div>
</div>
</section>

<section className="wrap sb-sec">
<div className="sb-hist">
<div className="sb-hist-l">
<h2 className="sb-t">Por que escolhi <em>a psicologia</em></h2>
<p className="sb-mapa">“Me colocar no lugar do outro nunca foi um esforço. Sempre foi algo natural.”</p>
</div>
<div className="sb-hist-r">
<p className="sb-p">Acredito que ninguém escolhe ser psicólogo “do nada”. Normalmente existe um chamado, algo que conversa com a própria história. O meu começou com uma curiosidade imensa sobre o comportamento humano: entender por que sentimos o que sentimos e o que faz cada um de nós ser tão único.</p>
<p className="sb-p">Junto com ela, sempre carreguei uma empatia que às vezes chegava a doer. Desde criança eu conseguia nomear emoções que, para muitas pessoas, pareciam inacessíveis, e gostava de ajudá-las a encontrar o que antes era desconhecido. Também sempre enxerguei potencial onde o próprio outro não conseguia, e gostei de acreditar nas pessoas até que elas mesmas acreditassem.</p>
<p className="sb-p">Entender que a Psicologia era um chamado foi como pegar o mapa nas mãos. E estou amando essa trajetória.</p>
</div>
</div>
</section>

<section className="wrap sb-sec">
<div className="sb-hist">
<div className="sb-hist-l"><h2 className="sb-t">Por que <em>mulheres</em></h2></div>
<div className="sb-hist-r">
<p className="sb-p">Muitas mulheres carregam mais do que conseguem: a cobrança de dar conta de tudo, o cansaço que não passa, a ansiedade que aparece justo quando tudo para. Escolhi dedicar meu trabalho a elas porque acredito que esse peso não precisa ser carregado sozinha.</p>
<p className="sb-p">Nas sessões, você encontra um espaço sem pressa e sem julgamento, para olhar para si com mais gentileza.</p>
</div>
</div>
</section>

<section className="wrap sb-sec">
<p className="citacao-sb">“Não é sobre se tornar outra pessoa. É sobre se reconhecer com mais calma.”</p>
</section>

<section className="wrap sb-sec">
<h2 className="sb-t">Como eu <em>trabalho</em></h2>
<div className="pilares">
<div className="pilar"><span className="n">01</span><h3>Escuta sem julgamento</h3><p>Você pode chegar como está. O primeiro passo é entender a sua história, no seu tempo.</p></div>
<div className="pilar"><span className="n">02</span><h3>Construção a duas</h3><p>Definimos objetivos juntas e revisamos o caminho ao longo das sessões. Você acompanha a sua evolução.</p></div>
<div className="pilar"><span className="n">03</span><h3>Ferramentas para a vida</h3><p>Exercícios simples entre as sessões ajudam a levar o que conversamos para a rotina.</p></div>
</div>
</section>

<section className="wrap sb-sec">
<div className="sb-dois">
<div>
<h2 className="sb-t">Formação</h2>
<ul className="linha">
<li><div className="q">Em andamento</div><div className="o">Pós-graduação em Terapia Cognitivo-Comportamental</div><div className="d">Artmed</div></li>
<li><div className="q">2026</div><div className="o">Registro no Conselho Regional de Psicologia</div><div className="d">CRP 07/46564</div></li>
<li><div className="q">2026/1</div><div className="o">Graduação em Psicologia</div><div className="d">Uniritter</div></li>
</ul>
</div>
<div>
<h2 className="sb-t">Fora do <em>consultório</em></h2>
<p className="sb-p">Gosto de ter um bom livro em mãos e um café recém-passado. Sou apaixonada por papelaria: canetas coloridas, agendas e adesivos. É na meditação e na contemplação que recarrego minhas energias, e meus programas preferidos são passear em livrarias e descobrir novos lugares para tomar café.</p>
<div className="gostos">
<span className="gosto">Livros</span><span className="gosto">Café</span><span className="gosto">Papelaria</span><span className="gosto">Meditação</span><span className="gosto">Livrarias</span><span className="gosto">Cafés novos</span>
</div>
</div>
</div>
</section>

<section className="wrap" style={{ paddingTop: '96px', paddingBottom: '96px' }}>
<div className="faixa">
<h2 className="faixa-t">Que tal nos <em>conhecermos?</em></h2>
<a href={rotas.agendar} className="cta">Agendar conversa inicial gratuita <span aria-hidden="true">→</span></a>
</div>
</section>


    </Moldura>
  );
}
