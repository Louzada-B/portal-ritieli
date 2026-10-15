// Perguntas e escala do formulário de avaliação de palestra (usado na página pública e no painel).
export const ESCALA = ["Discordo totalmente", "Discordo", "Nem concordo nem discordo", "Concordo", "Concordo totalmente"] as const;
export const AFIRMACOES = [
  { campo: "nota", texto: "No geral, a palestra foi muito boa." },
  { campo: "clareza", texto: "O conteúdo foi fácil de entender." },
  { campo: "duracao", texto: "O tempo da palestra foi adequado." },
] as const;
export type CampoLikert = (typeof AFIRMACOES)[number]["campo"];
