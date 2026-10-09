// Pix "copia e cola" (BR Code estático, padrão EMV do Banco Central). Sem servidor: só monta o texto.

const campo = (id: string, valor: string) => `${id}${String(valor.length).padStart(2, "0")}${valor}`;

export function crc16(texto: string) {
  let crc = 0xffff;
  for (let i = 0; i < texto.length; i++) {
    crc ^= texto.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

// Nome e cidade só aceitam letras sem acento, números e espaço.
const limpar = (t: string, max: number) =>
  t.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9 ]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

export function pixCopiaECola(o: { chave: string; nome: string; cidade: string; centavos?: number | null }) {
  const conta = campo("00", "br.gov.bcb.pix") + campo("01", o.chave.trim());
  const corpo =
    campo("00", "01") +
    campo("01", "12") +
    campo("26", conta) +
    campo("52", "0000") +
    campo("53", "986") +
    (o.centavos && o.centavos > 0 ? campo("54", (o.centavos / 100).toFixed(2)) : "") +
    campo("58", "BR") +
    campo("59", limpar(o.nome, 25) || "RECEBEDOR") +
    campo("60", limpar(o.cidade, 15) || "BRASIL") +
    campo("62", campo("05", "***")) +
    "6304";
  return corpo + crc16(corpo);
}
