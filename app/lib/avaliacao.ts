// Perguntas e escala do formulário de avaliação de palestra (usado na página pública e no painel).
export const ESCALA = ["Discordo totalmente", "Discordo", "Nem concordo nem discordo", "Concordo", "Concordo totalmente"] as const;
export const AFIRMACOES = [
  { campo: "clareza", texto: "O conteúdo foi fácil de entender." },
  { campo: "duracao", texto: "O tempo da palestra foi adequado." },
  { campo: "aplicacao", texto: "O assunto aqui discutido pode ser incrementado em minha vida de forma prática." },
] as const;
export type CampoLikert = (typeof AFIRMACOES)[number]["campo"];
