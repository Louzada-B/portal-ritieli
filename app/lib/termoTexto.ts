// Conteúdo do termo de consentimento. Fica guardado (criptografado) do jeito que foi enviado,
// para o aceite valer exatamente sobre o texto que a pessoa leu.
export type ConteudoTermo = {
  tipo: "adulta" | "crianca";
  nome: string;
  cpf: string;
  responsavel: { nome: string; cpf: string } | null;
  emergencia: string;
  valor: string;
  pagamento: string;
  plataforma: string;
  faltas: string;
  data: string;
};

export const mascararCpf = (c: string) => (c && c.length >= 14 ? `•••.•••.${c.slice(8)}` : c);
