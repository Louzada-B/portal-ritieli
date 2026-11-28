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
  // Endereço do consultório no dia em que o termo foi gerado (termos antigos não têm: usam o anterior).
  endereco?: string;
};

// Endereço dos termos gerados antes de o endereço passar a ser guardado no próprio termo.
export const ENDERECO_TERMO_ANTIGO = "na R. Santa Flora, 1166, no bairro Nonoai, em Porto Alegre";

export const mascararCpf = (c: string) => (c && c.length >= 14 ? `•••.•••.${c.slice(8)}` : c);
