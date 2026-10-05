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
  infantil: "/infantil",
  comoFunciona: "/#ficha",
  escritos: "/escritos",
  duvidas: "/duvidas",
  agendar: "/agendar",
  privacidade: "/privacidade",
};

export const menu = [
  { rotulo: "Início", href: rotas.inicio },
  { rotulo: "Quem sou", href: rotas.quemSou },
  { rotulo: "Infantil", href: rotas.infantil },
  { rotulo: "Como funciona", href: rotas.comoFunciona },
  { rotulo: "Escritos", href: rotas.escritos },
  { rotulo: "Dúvidas", href: rotas.duvidas },
];

export const hero = {
  titulo: "Você não precisa dar conta de tudo",
  destaque: "sozinha.",
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
    "Escolhi a psicologia porque sempre me tocou aquilo que as pessoas sentem e nem sempre conseguem dizer. Na formação, encontrei na Terapia Cognitivo-Comportamental um caminho que une acolhimento e ferramentas práticas para a vida real, e foi ali que me reconheci como terapeuta.",
    "Hoje, dedico meu trabalho a mulheres que carregam muito: cobranças, cansaço, ansiedade, tristeza. Nas nossas sessões, você encontra um espaço sem pressa e sem julgamento, onde vamos no seu ritmo, entendendo seus padrões e construindo, juntas, formas mais leves de viver.",
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
    itens: ["Agenda do site para a conversa inicial", "Confirmação pelo WhatsApp", "Lembrete por e-mail na véspera"],
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
  titulo: "Também cuido de",
  destaque: "crianças.",
  texto: "Atendimento presencial em Porto Alegre, com a família junto no processo.",
  botao: "Conhecer o atendimento infantil",
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
