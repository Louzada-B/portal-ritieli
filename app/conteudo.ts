// Textos e dados do site num só lugar.
// Para trocar um texto da página inicial, normalmente basta mexer aqui.

export const contato = {
  nome: "Ritieli Hermes",
  crp: "CRP 07/46564",
  whatsapp: "5551994484669",
  email: "ritielihermes@gmail.com",
  instagram: "psi.ritielihermes",
};

export const linkWhatsApp = (mensagem?: string) =>
  `https://wa.me/${contato.whatsapp}${mensagem ? `?text=${encodeURIComponent(mensagem)}` : ""}`;

// Endereços das outras páginas (ainda em construção).
export const rotas = {
  inicio: "/",
  quemSou: "/quem-sou",
  infantil: "/criancas-e-adolescentes",
  comoFunciona: "/#ficha",
  escritos: "/escritos",
  duvidas: "/duvidas",
  agendar: "/agendar",
  privacidade: "/privacidade",
};

export const menu = [
  { rotulo: "Início", href: rotas.inicio },
  { rotulo: "Quem sou", href: rotas.quemSou },
  { rotulo: "Crianças e adolescentes", href: rotas.infantil },
  { rotulo: "Como funciona", href: rotas.comoFunciona },
  { rotulo: "Escritos", href: rotas.escritos },
  { rotulo: "Dúvidas", href: rotas.duvidas },
];

export const hero = {
  titulo: "Vamos construir juntas uma vida",
  destaque: "com mais sentido.",
  texto:
    "Um espaço de acolhimento para cuidar da ansiedade e da depressão, com a Terapia Cognitivo-Comportamental.",
  selos: ["Conversa de 15 minutos, sem compromisso", "Online para todo o Brasil"],
};

export const pensamentos = [
  {
    velho: "Minha cabeça não desliga nunca.",
    novo: "Minha mente está em alerta, tentando me proteger. Posso aprender a acalmá-la, aos poucos.",
  },
  {
    velho: "Estou sempre cansada, mesmo sem ter feito nada.",
    novo: "Esse cansaço quer me dizer algo. Pequenos passos podem devolver energia à rotina.",
  },
  {
    velho: "Por mais que eu faça, nunca é suficiente.",
    novo: "Eu faço muito. Talvez a régua é que esteja alta demais.",
  },
  {
    velho: "Todo mundo parece dar conta. Menos eu.",
    novo: "Eu vejo só a superfície da vida dos outros. E pedir ajuda também é dar conta.",
  },
];

export const triangulo = {
  pensamento: {
    rotulo: "Pensamento",
    frase: "“Ela deve estar chateada comigo.”",
    texto: "O pensamento surge rápido e parece certeza. Na terapia, aprendemos a examiná-lo:",
    termo: "reestruturação cognitiva",
  },
  emocao: {
    rotulo: "Emoção",
    frase: "Um aperto no peito. Ansiedade.",
    texto: "A emoção acompanha o pensamento. Na terapia, ela é acolhida e nomeada, sem julgamento.",
    termo: "",
  },
  comportamento: {
    rotulo: "Comportamento",
    frase: "Checar o celular a cada minuto.",
    texto: "O comportamento alivia na hora e mantém o ciclo. Na terapia, construímos outras saídas:",
    termo: "ativação comportamental",
  },
};

export const apresentacao = {
  titulo: "Oi, eu sou a Ritieli.",
  paragrafos: [
    "Sou psicóloga clínica e trabalho com a Terapia Cognitivo-Comportamental, uma abordagem com forte respaldo científico que ajuda a entender o que você sente e a construir formas práticas de lidar com a ansiedade, a tristeza e os desafios do dia a dia.",
    "Escolhi dedicar meu trabalho às mulheres porque acredito na força, na sensibilidade e no potencial de transformação que existe em cada uma. E acredito que uma relação construída com confiança e acolhimento abre caminho para uma vida com mais leveza, autoestima e sentido.",
  ],
  selos: ["CRP 07/46564", "Pós-graduanda em Terapia Cognitivo-Comportamental", "Atendimento online"],
};

export const etapas = [
  {
    n: "01",
    titulo: "Você escolhe um horário",
    sub: "Leva 2 minutos",
    texto:
      "Na agenda aqui do site, você escolhe o dia e o horário que funcionam para você e deixa seu nome e contato. Eu confirmo o horário com você pelo WhatsApp.",
    itens: ["Agenda do site para a conversa inicial", "Confirmação pelo WhatsApp", "Link da chamada enviado por e-mail"],
  },
  {
    n: "02",
    titulo: "Conversa inicial",
    sub: "15 min · gratuita",
    texto:
      "Um primeiro encontro por vídeo para você me contar, do seu jeito, o que te traz. Eu explico como trabalho e tiramos juntas as dúvidas sobre o processo.",
    itens: ["Sem compromisso", "Por vídeo, de onde você estiver", "Espaço para todas as perguntas"],
  },
  {
    n: "03",
    titulo: "Primeira sessão",
    sub: "50 minutos",
    texto:
      "Começamos a conhecer sua história com mais calma e a entender o que tem pesado. Juntas, combinamos os objetivos da terapia.",
    itens: ["Escuta sem julgamento", "Objetivos definidos juntas", "Sigilo garantido pelo Código de Ética"],
  },
  {
    n: "04",
    titulo: "Encontros semanais",
    sub: "1 vez por semana",
    texto:
      "Um acompanhamento regular, no seu ritmo. Na TCC, também usamos pequenos exercícios entre as sessões para levar o que conversamos para o dia a dia.",
    itens: ["Dia e horário combinados com você", "Exercícios práticos entre sessões", "Revisão do seu progresso"],
  },
];

export const informacoes = [
  { rotulo: "Onde", valor: "Online, para todo o Brasil", icone: "video" },
  { rotulo: "Valores", valor: "Sob consulta, com valor social", icone: "coracao" },
  { rotulo: "Pagamento", valor: "Pix ou cartão", icone: "cartao" },
] as const;

export const infantil = {
  titulo: "Também cuido de crianças",
  destaque: "e adolescentes.",
  texto: "Sessões presenciais em Porto Alegre e encontros online com a família.",
  botao: "Conhecer o atendimento",
};

export const escritos = {
  titulo: "Textos para ler",
  destaque: "com calma.",
  texto: "Toda semana, um texto novo sobre ansiedade, depressão e o cuidado consigo.",
  maisRecente: "Por que a ansiedade aparece justo na hora de descansar?",
};

export const agendar = {
  titulo: "A primeira conversa é",
  destaque: "por minha conta.",
  texto:
    "15 minutos, por vídeo, para você me contar o que te traz e tirar suas dúvidas. Escolha um horário e deixe seu contato: eu confirmo com você pelo WhatsApp.",
  rodape: "Gratuita · 15 minutos · por vídeo. Para você ou para o seu filho.",
};

// Agenda da conversa inicial: segunda a sábado, das 8h às 12h.
// Enquanto a agenda real (Google Agenda) não estiver ligada, a página mostra
// os próximos dias úteis com horários de exemplo.
export const agendaExemplo = {
  diasDaSemana: [1, 2, 3, 4, 5, 6],
  horarios: ["09:00", "10:00", "08:00"],
};

export const rodape = {
  frase: "Um espaço para você ser ouvida com calma e cuidado.",
  linha: "Ritieli Hermes · Psicóloga · CRP 07/46564 · Atendimento online para todo o Brasil",
  crise: "Em situação de crise, ligue 188 (CVV) ou procure o serviço de emergência mais próximo.",
};

// Perguntas da página Dúvidas (revisadas pela Ritieli).
export const duvidas: { grupo: string; pergunta: string; resposta: string }[] = [
  { grupo: "Sobre a terapia", pergunta: "O que é a Terapia Cognitivo-Comportamental?", resposta: "É uma abordagem que olha para a relação entre o que você pensa, sente e faz. Juntas, identificamos padrões que mantêm o sofrimento e construímos novas formas de lidar com eles. É uma das abordagens com maior respaldo científico para ansiedade e depressão." },
  { grupo: "Sobre a terapia", pergunta: "Preciso estar muito mal para procurar terapia?", resposta: "Não. A terapia também é um espaço para se conhecer melhor, atravessar uma fase difícil ou cuidar de algo antes que fique maior. O importante é o desejo de olhar para si com mais cuidado." },
  { grupo: "Sobre a terapia", pergunta: "Como funciona a conversa inicial gratuita?", resposta: "São cerca de 15 minutos, por vídeo, para você me contar o que te traz e tirar dúvidas sobre o processo. Não há compromisso: depois dela, você decide se quer começar." },
  { grupo: "Sobre a terapia", pergunta: "Quanto tempo dura o processo?", resposta: "Depende de cada pessoa e do que trouxe você até a terapia. Na TCC, definimos objetivos juntas e revisamos o caminho ao longo das sessões, para que você acompanhe a sua evolução. Entretanto, a terapia é um processo orientado no tempo, com início, desenvolvimento e encerramento. Ao longo desse percurso, o objetivo é que você desenvolva recursos e ferramentas que lhe permitam lidar com suas dificuldades de forma cada vez mais autônoma, seguindo seu caminho com mais segurança mesmo após o término do processo terapêutico." },
  { grupo: "Sobre a terapia", pergunta: "Qual a frequência das sessões?", resposta: "As sessões são semanais e têm duração de 50 minutos. Também podemos marcar mais sessões caso você sinta necessidade." },
  { grupo: "Atendimento online", pergunta: "Terapia online funciona mesmo?", resposta: "Sim. Estudos indicam que, para ansiedade e depressão, a terapia online tende a ter resultados semelhantes aos do atendimento presencial. O que mais importa é o vínculo e o compromisso com o processo." },
  { grupo: "Atendimento online", pergunta: "Do que eu preciso para a sessão?", resposta: "Um celular ou computador com internet, fone de ouvido e um lugar reservado, onde você se sinta à vontade para falar. Antes de cada sessão, envio o link da chamada." },
  { grupo: "Atendimento online", pergunta: "E se a internet cair durante a sessão?", resposta: "Sem problema. Combinamos antes um plano: tentamos reconectar e, se não der, seguimos por telefone ou remarcamos o tempo que faltou." },
  { grupo: "Atendimento online", pergunta: "Você atende pessoas de outras cidades?", resposta: "Sim. Como o atendimento é online, posso atender mulheres de qualquer lugar do Brasil. Se você mora fora do país, me chame para conversarmos sobre o seu caso." },
  { grupo: "Atendimento online", pergunta: "Você atende crianças ou adolescentes?", resposta: "No momento, o atendimento online é voltado para mulheres adultas. O atendimento de crianças e adolescentes, de 5 a 16 anos, tem sessões presenciais em Porto Alegre, e os encontros com os pais ou responsáveis podem ser online. Me chame no WhatsApp para saber mais." },
  { grupo: "Valores e pagamento", pergunta: "Quanto custa a sessão?", resposta: "O valor é informado na conversa inicial e pode ser adaptado de acordo com a sua realidade. Também há a opção de valor social para quem se enquadra nessa modalidade." },
  { grupo: "Valores e pagamento", pergunta: "Como funciona o valor social?", resposta: "É uma forma de tornar a terapia acessível para quem não pode pagar o valor integral. Conversamos sobre isso com sigilo e sem constrangimento." },
  { grupo: "Valores e pagamento", pergunta: "Quais são as formas de pagamento?", resposta: "Pix ou cartão." },
  { grupo: "Valores e pagamento", pergunta: "Posso pedir reembolso no plano de saúde?", resposta: "Muitos planos reembolsam as sessões de psicologia. Emito recibo eletrônico pelo Receita Saúde, válido para reembolso e para o Imposto de Renda. Vale confirmar as regras com o seu plano." },
  { grupo: "Valores e pagamento", pergunta: "E se eu precisar faltar ou remarcar?", resposta: "Cancelamentos e remarcações precisam ser avisados com pelo menos 24 horas de antecedência. Cancelamentos com menos de 24 horas são considerados falta, e faltas sem desmarcação são cobradas como sessão realizada." },
  { grupo: "Sigilo e cuidado", pergunta: "O que eu falar fica entre nós?", resposta: "Sim. O sigilo é garantido pelo Código de Ética Profissional do Psicólogo. As sessões acontecem por uma plataforma de vídeo com criptografia, não são gravadas, e seus dados são tratados de acordo com a LGPD." },
  { grupo: "Sigilo e cuidado", pergunta: "Você pode dar diagnóstico ou receitar remédio?", resposta: "Psicólogas não receitam medicamentos. Quando necessário, posso orientar a busca por um psiquiatra e trabalhar em conjunto com outros profissionais de saúde." },
  { grupo: "Sigilo e cuidado", pergunta: "E se eu estiver em crise?", resposta: "Este site e o WhatsApp não são canais de emergência. Em crise, ligue 188 (CVV, 24 horas) ou 192 (SAMU), ou procure o pronto-atendimento mais próximo. Na terapia, construímos juntas um plano de cuidado para momentos difíceis." },
];

export const gruposDuvidas = ["Sobre a terapia", "Atendimento online", "Valores e pagamento", "Sigilo e cuidado"];
