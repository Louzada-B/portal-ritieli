import type { Pergunta, Tarefa } from "../../../componentes/ManualInterativo";

export const NOTA = "Escolha uma tarefa abaixo e siga o passo a passo. Nada aqui altera dados: é só um guia. Use a busca se não souber onde fica algo.";

export const AVISO = "Sigilo: o prontuário só abre com a senha dele (e a chave de recuperação, se você esquecer a senha). Ninguém mais consegue ler, nem quem cuida do sistema. Guarde a chave de recuperação fora do computador, em lugar seguro.";

export const TAREFAS: Tarefa[] = [
  {
    id: "visao", titulo: "Entender a visão geral", resumo: "O que aparece quando você entra no painel.", busca: "inicio painel menu",
    passos: [
      "Ao entrar, a Visão geral mostra as próximas conversas e o que está esperando resposta.",
      "No menu da esquerda (no celular, nas abas de baixo e no botão do menu) ficam: Visão geral, Pedidos, Disponibilidade, Pacientes, Sessões e pagamentos, e em Conteúdo: Escritos e Termos.",
      "O número vermelho em Pedidos indica quantos pedidos de conversa inicial aguardam você.",
      "Pedidos de remarcação ou cancelamento feitos pelos pacientes também aparecem na Visão geral, em um cartão próprio.",
    ],
  },
  {
    id: "pedidos", titulo: "Responder um pedido de conversa", resumo: "Confirmar, sugerir outro horário ou recusar.", busca: "agendamento conversa inicial site confirmar recusar",
    passos: [
      "Abra Pedidos. Os que aguardam resposta ficam na aba Aguardando.",
      "Toque no pedido para ver quem é, o que escreveu e o horário que pediu.",
      "Para aceitar, use “Confirmar horário”. A pessoa recebe a confirmação.",
      "Se o horário não serve, use “Sugerir outro horário” ou “Outro dia ou horário” e escolha entre os horários livres. O sistema não deixa marcar dois atendimentos no mesmo horário.",
      "Se não puder atender, use “Recusar pedido”.",
    ],
    dica: "Responda dentro do prazo que o painel mostra. Pedidos sem resposta podem ser liberados.",
  },
  {
    id: "horarios", titulo: "Ajustar seus horários", resumo: "Semana padrão, datas bloqueadas e conexão com a agenda.", busca: "disponibilidade agenda google bloquear folga férias",
    passos: [
      "Abra Disponibilidade.",
      "Em “Semana padrão”, marque os dias e horários em que atende. É daí que saem os horários que o site oferece.",
      "Em “Datas bloqueadas”, bloqueie dias de folga, férias ou compromissos. Para desfazer, remova o bloqueio.",
      "Em “Regras da agenda”, ajuste duração da conversa inicial e intervalos.",
      "Se a agenda do Google estiver conectada, horários já ocupados nela deixam de aparecer no site.",
    ],
  },
  {
    id: "pix", titulo: "Conferir sua chave Pix", resumo: "A chave que a paciente vê ao pagar.", busca: "pagamento chave pix cidade",
    passos: [
      "Abra Disponibilidade e role até a parte do Pix.",
      "Confira a chave, o nome e a cidade. É com eles que o código Pix de cada sessão é montado.",
      "Salve. Se mudar de chave, avise quem tem pagamento pendente.",
    ],
    dica: "Os pagamentos são só por Pix e a confirmação é manual: você marca como pago quando o dinheiro entrar.",
  },
  {
    id: "novo", titulo: "Cadastrar um paciente", resumo: "Novo paciente, ficha e termo.", busca: "cadastro ficha termo whatsapp criança adulta responsável",
    passos: [
      "Abra Pacientes e toque em “Novo paciente”.",
      "Escolha o tipo: adulta(o) ou criança/adolescente (neste caso aparecem os dados dos responsáveis e a sessão presencial).",
      "Preencha nome, contato e valor da sessão. Dados sensíveis, como CPF, ficam criptografados.",
      "Em “Ficha e termo”, use o botão para enviar o link da ficha de cadastro e do termo. Eles vão por WhatsApp, pelo botão: nada é enviado sozinho.",
      "Quando a pessoa preencher, o status muda na ficha.",
    ],
    dica: "O jeito mais seguro de ter o CPF é a própria pessoa preencher pela ficha de cadastro.",
  },
  {
    id: "ficha", titulo: "Usar a ficha em abas", resumo: "Dados, Ficha e termo, Sessões e pagamentos, Sala e acesso, Situação.", busca: "abas paciente editar encerrar",
    passos: [
      "Em Pacientes, toque em um nome para abrir a ficha.",
      "A ficha tem cinco abas no topo: Dados, Ficha e termo, Sessões e pagamentos, Sala e acesso e Situação.",
      "Em Dados você vê e edita as informações pessoais e os lembretes por e-mail.",
      "Em Sala e acesso fica o link do Google Meet e o acesso da pessoa à área dela.",
      "Em Situação ficam o prontuário, os termos e o encerramento do acompanhamento.",
    ],
  },
  {
    id: "acesso", titulo: "Dar acesso à área da paciente", resumo: "Criar acesso, enviar senha provisória e reenviar.", busca: "senha login area paciente esqueci",
    passos: [
      "Abra a ficha da pessoa e vá em “Sala e acesso”.",
      "Use “Criar acesso e enviar senha”. Ela recebe um e-mail com a senha provisória.",
      "No primeiro acesso ela é levada a trocar a senha.",
      "Se esquecer, use “Reenviar senha provisória”. Para impedir o uso, use “Desativar” (e “Reativar” para devolver).",
    ],
    dica: "Confira se o e-mail da pessoa está certo antes de criar o acesso.",
  },
  {
    id: "meet", titulo: "Gerar o link da sala (Meet)", resumo: "Sessões online com link próprio.", busca: "google meet video chamada online",
    passos: [
      "Na ficha da pessoa, abra “Sala e acesso”.",
      "Use “Gerar link do Google Meet”. O link aparece ali e fica na área da paciente, no dia da sessão.",
      "Para trocar, use “Gerar outro”. Use “Copiar link” se precisar mandar por fora.",
    ],
  },
  {
    id: "sessoes", titulo: "Registrar e remarcar sessões", resumo: "Registrar sessão, remarcar e ver o histórico.", busca: "agenda remarcar cancelar falta calendário",
    passos: [
      "Abra Sessões e pagamentos.",
      "Para lançar uma sessão que aconteceu, use “Registrar sessão” e escolha a pessoa, a data e o horário.",
      "Para mudar o dia, abra a sessão e use “Remarcar sessão”. O calendário só mostra horários livres, sem conflito.",
      "Pedidos de remarcação feitos pelos pacientes aparecem na Visão geral. Responda por lá.",
    ],
  },
  {
    id: "pagamentos", titulo: "Confirmar pagamentos e recibos", resumo: "Marcar pago, emitir recibo e definir valor.", busca: "pix recebido a receber recibo valor crédito antecipado",
    passos: [
      "Abra Sessões e pagamentos e use o filtro para ver o que está “A receber”.",
      "Quando o Pix entrar na sua conta, abra a sessão e use “Marcar pago”. A paciente passa a ver “Confirmado em” e pode baixar o recibo.",
      "Use “Marcar emitido” quando entregar o recibo. Se precisar, “Desfazer”.",
      "Para mudar o valor de uma sessão, use “Definir valor” (ou o lápis ao lado do valor).",
      "“Pagamento antecipado” e “Paga com crédito” servem para quem pagou antes ou tem crédito de outra sessão.",
    ],
    dica: "A confirmação é manual. Não há baixa automática do Pix.",
  },
  {
    id: "prontuario", titulo: "Abrir e usar o prontuário", resumo: "Senha, evoluções, anexos e exercícios.", busca: "evolução cofre senha chave recuperação anexo pdf exportar",
    passos: [
      "Na ficha da pessoa, toque em “Prontuário” (ou em “Abrir o prontuário →”).",
      "Digite a senha do prontuário para abrir. Ele fecha sozinho após 10 minutos sem uso, e você pode usar “Fechar agora”.",
      "As abas organizam o conteúdo: Evoluções, Demanda e objetivos, Identificação, Encerramento, Anexos, Exercícios e Acessos.",
      "Em Evoluções, escolha a sessão e escreva. O texto é cifrado antes de sair do seu navegador. Registros não se apagam: use “Acrescentar correção”.",
      "Em Anexos, envie arquivos clínicos (cifrados também). Para imprimir ou guardar, use “Exportar PDF”.",
    ],
    dica: "Na primeira vez você cria a senha e recebe uma chave de recuperação. Guarde as duas em lugar seguro.",
  },
  {
    id: "exercicios", titulo: "Criar um exercício", resumo: "Instruções, link, anexos e recado da paciente.", busca: "tarefa casa anexo link prazo recado",
    passos: [
      "Abra o prontuário da pessoa e vá na aba Exercícios.",
      "Na primeira vez, use “Ativar recados protegidos”. Com isso os recados que a pessoa deixar ficam legíveis só para você.",
      "Toque para criar, dê um título, escreva as instruções, coloque um link (opcional) e um prazo (opcional).",
      "Se quiser, anexe PDF, imagem ou áudio de até 10 MB cada. Não anexe documento clínico aqui: esses arquivos não têm proteção de ponta a ponta. Material clínico vai em Anexos do prontuário.",
      "A pessoa não recebe aviso: ela vê o exercício ao entrar na área dela.",
      "Quando ela marcar como feito, o recado aparece na mesma aba, depois de você abrir o prontuário.",
    ],
  },
  {
    id: "termos", titulo: "Enviar e acompanhar termos", resumo: "Termo de consentimento e política de faltas.", busca: "termo consentimento aceite faltas",
    passos: [
      "Abra Termos. À esquerda fica o histórico, com a situação de cada termo.",
      "Para um novo termo, escolha a pessoa e confira o texto, inclusive a política de faltas.",
      "Envie o link pelo botão de WhatsApp. A pessoa lê e aceita; o aceite fica registrado com data e hora.",
    ],
  },
  {
    id: "escritos", titulo: "Publicar um escrito", resumo: "Textos do site.", busca: "blog artigo texto publicar",
    passos: [
      "Abra Escritos, em Conteúdo.",
      "Crie ou edite um texto e publique quando estiver pronto.",
      "Confira como ficou no site antes de divulgar.",
    ],
  },
];

export const PERGUNTAS: Pergunta[] = [
  { p: "Esqueci a senha do painel. E agora?", r: "Use “Esqueci a senha” na tela de entrada: um e-mail leva você a criar uma nova. A senha do prontuário é outra, separada." },
  { p: "Esqueci a senha do prontuário.", r: "Use a chave de recuperação que apareceu quando você criou o prontuário. Se perder a senha e a chave, ninguém consegue recuperar o conteúdo. Por isso guarde as duas em dois lugares seguros." },
  { p: "Quem consegue ler o prontuário?", r: "Só você, com a senha dele. Ele é cifrado no seu navegador, e o servidor guarda apenas texto ilegível." },
  { p: "O paciente recebe aviso quando crio um exercício?", r: "Não. Ele vê o exercício ao entrar na área dele." },
  { p: "O sistema manda mensagem por WhatsApp sozinho?", r: "Não. Ficha, termo e outros links só saem pelo botão de WhatsApp, quando você decide. Lembretes de sessão vão por e-mail, se a opção estiver ligada na ficha." },
  { p: "Posso excluir um paciente?", r: "Só depois de o prazo mínimo de guarda do prontuário (5 anos). Para encerrar o atendimento antes, use “Encerrar acompanhamento”, na aba Situação." },
  { p: "Marquei duas sessões no mesmo horário?", r: "O sistema não permite. Se aparecer um aviso de conflito, escolha outro horário." },
  { p: "Algo não funciona. Quem aviso?", r: "Fale com o Bruno, que cuida do sistema. Diga a tela e o que apareceu, sem enviar dados de pacientes." },
];

export const TOUR = [
  { titulo: "Bem-vinda ao seu painel", texto: "Aqui você organiza pedidos, horários, pacientes, sessões e o prontuário. Vou mostrar o essencial em poucos passos." },
  { titulo: "Pedidos e horários", texto: "Pedidos de conversa chegam em Pedidos, com um número no menu. Os horários que o site oferece saem de Disponibilidade." },
  { titulo: "Pacientes e sessões", texto: "Cada paciente tem uma ficha em abas. Sessões e pagamentos ficam juntos, e a confirmação do Pix é sempre manual." },
  { titulo: "Prontuário protegido", texto: "O prontuário tem senha própria e chave de recuperação. Guarde as duas bem: sem elas ninguém consegue abrir o conteúdo." },
  { titulo: "Dúvidas? Tem manual", texto: "O manual com passo a passo fica em Ajuda, no menu. Você pode voltar a ele quando quiser." },
];
