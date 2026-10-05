import type { Metadata } from "next";
import Moldura from "../componentes/Moldura";
import { linkWhatsApp, rotas } from "../conteudo";

export const metadata: Metadata = {
  title: "Crianças e adolescentes · Ritieli Hermes · Psicóloga",
  description: "Psicoterapia para crianças e adolescentes de 5 a 16 anos com a TCC. Sessões presenciais no Nonoai, em Porto Alegre, e encontros com os pais que podem ser online.",
};

export default function Pagina() {
  return (
    <Moldura atual={rotas.infantil}>


<section style={{ background: 'var(--rosado)', position: 'relative', overflow: 'hidden' }}>
<div className="wrap in-hero" style={{ position: 'relative' }}>
<div style={{ display: 'flex', flexDirection: 'column', gap: '22px', minWidth: '0' }}>

<h1 className="h1">Cuidar de quem está crescendo, <em>com leveza.</em></h1>
<p className="intro" style={{ maxWidth: '540px' }}>Psicoterapia para crianças e adolescentes de 5 a 16 anos, com a Terapia Cognitivo-Comportamental adaptada a cada fase. As sessões são presenciais: com as crianças, usamos brincadeiras, histórias e atividades; com os adolescentes, conversa e recursos adequados à idade. A família participa de todo o processo, e os encontros com os responsáveis podem ser online.</p>
<div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
<a href={rotas.agendar} className="cta">Conversar sobre meu filho ou filha <span aria-hidden="true">→</span></a>
<a href="#como" style={{ textDecoration: 'none', color: '#7A2335', background: '#FFFFFF', border: '1.5px solid #C98C99', borderRadius: '999px', padding: '14px 22px', fontWeight: '600', fontSize: '15px', minHeight: '52px', boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center' }}>Como funciona</a>
</div>
</div>
<div className="in-art" aria-hidden="true">
<svg viewBox="0 0 200 200" width="100%" height="100%" style={{ inset: '0' }}><path fill="#EFCBD2" d="M43.1,-58.6C55.3,-49.2,64,-35.4,68.5,-20.1C73,-4.8,73.3,12,66.7,25.4C60.1,38.8,46.6,48.8,31.9,56.8C17.2,64.8,1.3,70.8,-15.3,69.6C-31.9,68.4,-49.2,60,-59.6,46.4C-70,32.8,-73.6,14,-70.4,-2.9C-67.2,-19.8,-57.3,-34.8,-44.3,-44.2C-31.3,-53.6,-15.7,-57.4,0.3,-57.8C16.2,-58.2,30.9,-68,43.1,-58.6Z" transform="translate(100 100)" /></svg>
<svg viewBox="0 0 200 200" width="46%" height="46%" style={{ right: '-4%', top: '4%' }}><path fill="#E9D3C7" d="M38.5,-49.3C50.4,-41.6,60.5,-30,64.3,-16.4C68.1,-2.8,65.6,12.8,58.2,25.3C50.8,37.8,38.5,47.2,24.8,53.6C11.1,60,-4,63.4,-18.9,60.4C-33.8,57.4,-48.5,48,-57.6,34.7C-66.7,21.4,-70.2,4.2,-66.4,-11C-62.6,-26.2,-51.5,-39.4,-38.4,-47C-25.3,-54.6,-12.7,-56.6,0.6,-57.3C13.8,-58,26.6,-57,38.5,-49.3Z" transform="translate(100 100)" /></svg>
<svg viewBox="0 0 200 200" width="30%" height="30%" style={{ left: '6%', bottom: '6%' }}><path fill="#B0475D" opacity=".35" d="M38.5,-49.3C50.4,-41.6,60.5,-30,64.3,-16.4C68.1,-2.8,65.6,12.8,58.2,25.3C50.8,37.8,38.5,47.2,24.8,53.6C11.1,60,-4,63.4,-18.9,60.4C-33.8,57.4,-48.5,48,-57.6,34.7C-66.7,21.4,-70.2,4.2,-66.4,-11C-62.6,-26.2,-51.5,-39.4,-38.4,-47C-25.3,-54.6,-12.7,-56.6,0.6,-57.3C13.8,-58,26.6,-57,38.5,-49.3Z" transform="translate(100 100)" /></svg>
<svg viewBox="0 0 120 120" width="44%" height="44%" style={{ left: '28%', top: '26%' }}><circle cx="60" cy="60" r="44" fill="#FFFFFF" /><circle cx="46" cy="54" r="5" fill="#7A2335" /><circle cx="74" cy="54" r="5" fill="#7A2335" /><path d="M44 72c8 10 24 10 32 0" fill="none" stroke="#7A2335" strokeWidth="5" strokeLinecap="round" /></svg>
<span className="bal" style={{ left: '-6%', top: '12%' }}>Brincar também é falar</span>
<span className="bal" style={{ right: '-4%', bottom: '14%' }}>Família junto no processo</span>
</div>
</div>
</section>

<section className="wrap sec">
<h2 className="st">Quando <em>procurar ajuda</em></h2>
<p className="sl">Toda criança e todo adolescente passam por fases difíceis. Vale conversar quando algumas dessas situações duram semanas ou começam a atrapalhar o dia a dia da família.</p>
<div className="sinais">
<div className="sinal"><span className="ck"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></span><div><h3>Medos e ansiedade</h3><p>Medos intensos, preocupação excessiva, ansiedade com a escola e as provas ou dificuldade de ficar longe dos pais.</p></div></div>
<div className="sinal"><span className="ck"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></span><div><h3>Mudanças de comportamento</h3><p>Irritação, choro frequente, isolamento ou agressividade que antes não existiam.</p></div></div>
<div className="sinal"><span className="ck"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></span><div><h3>Sono, alimentação e corpo</h3><p>Pesadelos, dificuldade para dormir, mudanças no apetite ou preocupação excessiva com o próprio corpo.</p></div></div>
<div className="sinal"><span className="ck"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></span><div><h3>Escola e amizades</h3><p>Dificuldade de adaptação, conflitos com colegas, bullying ou queda no rendimento.</p></div></div>
<div className="sinal"><span className="ck"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></span><div><h3>Autoestima e redes sociais</h3><p>Insegurança, comparação constante, uso excessivo do celular ou sofrimento ligado às redes.</p></div></div>
<div className="sinal"><span className="ck"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></span><div><h3>Mudanças e perdas</h3><p>Separação dos pais, mudança de casa ou de escola, ou a morte de alguém querido.</p></div></div>
</div>
</section>

<section id="como" className="wrap sec">
<h2 className="st">Como <em>funciona</em></h2>
<p className="sl">O cuidado envolve a família. Os responsáveis participam desde o primeiro contato, de um jeito que se ajusta à idade de cada um.</p>
<div className="passos">
<div className="passo-i"><span className="n">1</span><span className="tag">Online</span><h3>Conversa com os responsáveis</h3><p>Um primeiro encontro só com os adultos, para entender a história do seu filho ou filha e o que tem preocupado vocês.</p></div>
<div className="passo-i"><span className="n">2</span><span className="tag">Presencial</span><h3>Primeiros encontros</h3><p>Sessões de 50 minutos, com brincadeiras para os menores e conversa para os adolescentes, para que se sintam seguros e à vontade.</p></div>
<div className="passo-i"><span className="n">3</span><span className="tag">Presencial</span><h3>Acompanhamento semanal</h3><p>Trabalhamos emoções, pensamentos e comportamentos com recursos adequados a cada idade.</p></div>
<div className="passo-i"><span className="n">4</span><span className="tag">Online</span><h3>Devolutivas para a família</h3><p>Encontros periódicos com os responsáveis, com orientações para o dia a dia em casa.</p></div>
</div>
</section>

<section className="wrap sec">
<div className="local">
<div className="local-mapa" aria-hidden="true">
<span className="rua" style={{ left: '0', right: '0', top: '30%', height: '18px' }}></span>
<span className="rua" style={{ left: '0', right: '0', top: '68%', height: '12px' }}></span>
<span className="rua" style={{ top: '0', bottom: '0', left: '36%', width: '16px' }}></span>
<span className="rua" style={{ top: '0', bottom: '0', left: '74%', width: '12px' }}></span>
<span className="pin"></span>
</div>
<div className="local-txt">
<h2 className="st" style={{ fontSize: '36px' }}>Onde <em style={{ fontSize: '42px' }}>acontece</em></h2>
<p style={{ margin: '0', color: '#5A3A41' }}>Os atendimentos presenciais acontecem no bairro Nonoai, em Porto Alegre, em um ambiente preparado e acolhedor para crianças e adolescentes.</p>
<dl>
<div><dt>Bairro</dt><dd>Nonoai · Porto Alegre/RS</dd></div>
<div><dt>Endereço</dt><dd>R. Santa Flora, 1166 · Nonoai · Porto Alegre/RS · CEP 90830-410<br /><a href="https://www.google.com/maps/search/?api=1&amp;query=R.+Santa+Flora,+1166+-+Nonoai,+Porto+Alegre+-+RS,+90830-410" target="_blank" rel="noopener" style={{ fontWeight: '700', fontSize: '14px' }}>Ver no mapa →</a></dd></div>
<div><dt>Confirmação</dt><dd>O endereço da sessão é confirmado no agendamento.</dd></div>
</dl>
</div>
</div>
</section>

<section className="wrap sec">
<div className="aviso-r">
<span style={{ flex: '0 0 36px', height: '36px', borderRadius: '50%', background: '#FFFFFF', color: '#7A2335', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></span>
<p style={{ margin: '0' }}>O atendimento de crianças e adolescentes acontece com a <strong style={{ color: '#3A1F25' }}>autorização dos responsáveis legais</strong>, como prevê o Código de Ética do Psicólogo. O que é compartilhado nas sessões é tratado com cuidado e sigilo: os responsáveis recebem as orientações necessárias para apoiar o processo, e a privacidade do adolescente é respeitada.</p>
</div>
</section>

<section className="wrap" style={{ paddingTop: '96px', paddingBottom: '96px' }}>
<div className="faixa">
<h2 className="faixa-t">Quer conversar sobre <em>o seu filho ou filha?</em></h2>
<a href={linkWhatsApp()} target="_blank" rel="noopener" className="cta">Falar pelo WhatsApp <span aria-hidden="true">→</span></a>
</div>
</section>


    </Moldura>
  );
}
