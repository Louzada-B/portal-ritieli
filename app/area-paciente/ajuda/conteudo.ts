import type { Pergunta, Tarefa } from "../../componentes/ManualInterativo";

export const NOTA = "Este é um guia rápido do seu espaço. Escolha o que quer fazer e siga os passos. Nada aqui muda os seus dados.";

export const AVISO = "Este espaço não é canal de emergência. Em crise, ligue 188 (CVV) ou 192 (SAMU). Para falar com a Ritieli, use o WhatsApp ou o e-mail que aparecem no rodapé de cada tela.";

export const TAREFAS: Tarefa[] = [
  {
    id: "entrar", titulo: "Entrar pela primeira vez", resumo: "E-mail, senha provisória e senha nova.", busca: "login acesso senha primeiro acesso",
    passos: [
      "Você recebe um e-mail com a senha provisória. Abra o endereço da área da paciente.",
      "Digite o e-mail cadastrado e a senha provisória.",
      "No primeiro acesso o sistema pede que você crie uma senha só sua. Escolha uma que você consiga lembrar e não use em outros lugares.",
      "Pronto: a partir daí você entra com o seu e-mail e a sua senha.",
    ],
    dica: "Se não achar o e-mail, olhe a caixa de spam. Se não chegou, peça à Ritieli que reenvie.",
  },
  {
    id: "inicio", titulo: "Entender o Início", resumo: "Próxima sessão, avisos e exercícios.", busca: "pagina principal resumo",
    passos: [
      "O Início mostra a sua próxima sessão e o que está pendente.",
      "O cartão “Para esta semana” lista até três exercícios em aberto. Toque para ver todos.",
      "Quando a Ritieli responde a um pedido seu, a resposta aparece no topo. Use o × para fechar um aviso, ou “Fechar todas”.",
    ],
  },
  {
    id: "sessoes", titulo: "Ver suas sessões", resumo: "Próximas, realizadas e histórico.", busca: "agenda horario dia",
    passos: [
      "Abra Sessões.",
      "Em “Próximas” estão as sessões marcadas, com dia, horário e se é online ou presencial.",
      "Use os filtros para ver só as realizadas, as remarcadas ou as canceladas.",
    ],
  },
  {
    id: "entrar-sessao", titulo: "Entrar na sessão online", resumo: "O botão libera 10 minutos antes.", busca: "meet video chamada link sala",
    passos: [
      "No horário da sessão, abra o Início ou as Sessões.",
      "O botão “Entrar na sessão” libera 10 minutos antes do horário.",
      "Toque nele para abrir a sala de vídeo. Se for sessão presencial, o endereço aparece no lugar do botão.",
    ],
    dica: "Teste o áudio e a câmera antes e escolha um lugar onde você se sinta à vontade para conversar.",
  },
  {
    id: "remarcar", titulo: "Pedir remarcação ou cancelamento", resumo: "Você pede, a Ritieli confirma.", busca: "mudar horario desmarcar faltar",
    passos: [
      "Em Sessões, abra a sessão que quer mudar e escolha “Pedir remarcação” (ou o pedido de cancelamento).",
      "Se for remarcar, mande uma mensagem com o pedido de troca e confirme em “Enviar pedido de remarcação”. Para cancelar, use “Enviar pedido de cancelamento”.",
      "A sessão fica como “Remarcação pedida” até a Ritieli responder. A resposta aparece no seu Início.",
      "Se faltar menos de 24 horas, avise pelo WhatsApp, como combinado no termo.",
    ],
    dica: "Um pedido não é uma confirmação: a sessão só muda depois que a Ritieli responde.",
  },
  {
    id: "pagar", titulo: "Pagar uma sessão com Pix", resumo: "Pix copia e cola, sem sair da sua área.", busca: "pagamento pix valor chave copiar",
    passos: [
      "Abra Pagamentos. As sessões em aberto aparecem em “Pagamento em aberto”.",
      "Escolha “Pagar por pix”.",
      "Use “Copiar código” e ou escaneie o qrcode. Confira o valor e o nome antes de confirmar.",
      "Depois de pagar, a Ritieli confere e marca como pago.",
      "Quando for confirmado, aparece “Confirmado em” com a data.",
    ],
  },
  {
    id: "recibo", titulo: "Pedir o recibo", resumo: "O recibo é emitido pela Ritieli e enviado a você.", busca: "comprovante imposto reembolso plano",
    passos: [
      "Abra Pagamentos e procure a sessão paga.",
      "Se o recibo ainda não saiu, o status fica “Aguardando recibo”.",
      "Quando estiver pronto, aparecerá o botão para solicitar o recibo.",
      "O recibo é emitido por ela no sistema da Receita Federal (Receita Saúde). Ele serve para o seu imposto de renda e para pedir reembolso ao plano.",
    ],
  },
  {
    id: "exercicios", titulo: "Fazer um exercício", resumo: "Instruções, anexos e recado para a Ritieli.", busca: "tarefa casa feito recado reabrir",
    passos: [
      "Abra Exercícios. Os que estão em andamento aparecem primeiro; os já feitos ficam em “Histórico”.",
      "Toque em um exercício para ler as instruções, abrir o link e ver os arquivos (Imagem 1, Imagem 2 e assim por diante).",
      "Se quiser, escreva um recado para a Ritieli.",
      "Quando terminar, toque em “Fiz este exercício”.",
      "Se quiser refazer, use “Reabrir para refazer”.",
    ],
    dica: "Não existe resposta certa. O recado é um espaço seu para contar como foi.",
  },
  {
    id: "dados", titulo: "Atualizar seus dados e a senha", resumo: "Telefone, contato de emergência e senha.", busca: "senha trocar perfil telefone emergência",
    passos: [
      "Abra Meus dados.",
      "Atualize telefone, endereço ou contato de emergência (nome, parentesco e telefone) e salve.",
      "Para trocar a senha, digite a senha atual, a nova e repita a nova em “Trocar senha”.",
      "Também dá para ver o termo de consentimento em “Ver o termo de consentimento”.",
    ],
  },
  {
    id: "privacidade", titulo: "Saber como seus dados são tratados", resumo: "O que é protegido e o que você controla.", busca: "lgpd sigilo seguranca privacidade",
    passos: [
      "A política de privacidade explica quais dados são guardados e por quê. O link fica no rodapé de cada tela.",
      "O que você escreve nos recados dos exercícios é protegido.",
      "Para pedir acesso, correção ou exclusão de dados, fale com a Ritieli.",
    ],
  },
];

export const PERGUNTAS: Pergunta[] = [
  { p: "Esqueci a minha senha.", r: "Fale com a Ritieli: ela envia uma nova senha provisória por e-mail, e você cria uma senha nova ao entrar." },
  { p: "Qual a diferença entre pedir e confirmar uma remarcação?", r: "Quando você pede, a Ritieli ainda não respondeu. A sessão só muda depois que ela confirma, e a resposta aparece no seu Início." },
  { p: "Paguei, mas continua “em aberto”.", r: "A confirmação do Pix é feita manualmente pela Ritieli. Caso não tenho dado baixa até a próxima sessão, você pode avisá-la." },
  { p: "A Ritieli vê o que eu escrevo no recado do exercício?", r: "Sim, só ela. O recado é protegido neste aparelho antes de ser enviado e não é legível para mais ninguém." },
  { p: "Posso usar em mais de um aparelho?", r: "Sim. Entre com o mesmo e-mail e a mesma senha. Saia (botão “Sair”) se usar um aparelho de outra pessoa." },
];

export const TOUR = [
  { titulo: "Bem-vinda(o) ao seu espaço", texto: "Aqui você vê suas sessões, faz exercícios e acompanha os pagamentos. Vou mostrar o essencial em poucos passos." },
  { titulo: "Sessões e pedidos", texto: "Em Sessões você vê o que está marcado. Para mudar um horário, faça o pedido ali: a Ritieli responde e a resposta aparece no Início." },
  { titulo: "Exercícios e pagamentos", texto: "Os exercícios combinados com a Ritieli ficam em Exercícios. Os pagamentos são por Pix, em Pagamentos." },
  { titulo: "Quando precisar de ajuda", texto: "O guia passo a passo fica em “Como usar”, no topo da tela. E o WhatsApp da Ritieli está no rodapé." },
];
