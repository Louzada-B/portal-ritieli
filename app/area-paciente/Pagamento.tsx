import PixCopia from "./PixCopia";
import { reais } from "../lib/formato";
import { linkWhatsApp } from "../conteudo";
import { pixCopiaECola } from "../lib/pix";

type Pix = { chave: string | null; nome: string; cidade: string };

// Cartão "Pagamento em aberto": valor e Pix copia e cola (ou o aviso para pedir a chave).
export default function PagamentoAberto({ qtd, centavos, pix }: { qtd: number; centavos: number; pix: Pix }) {
  return (
    <section className="card" aria-labelledby="pg-t">
      <div className="card-h"><h2 className="card-t" id="pg-t">Pagamento em aberto</h2><span className="pill p-av">{qtd} {qtd > 1 ? "sessões" : "sessão"}</span></div>
      {centavos > 0 ? <div className="valor">{reais(centavos)}</div> : null}
      <span style={{ color: "#6B5A5E", fontSize: 14 }}>Pagamento por Pix. Depois que a Ritieli conferir, o pagamento aparece como pago aqui.</span>
      {pix.chave ? (
        <PixCopia codigo={pixCopiaECola({ chave: pix.chave, nome: pix.nome, cidade: pix.cidade, centavos })} />
      ) : (
        <a className="bt" href={linkWhatsApp("Olá, Ritieli! Pode me passar a chave Pix para eu fazer o pagamento?")} target="_blank" rel="noopener">Pedir a chave Pix à Ritieli</a>
      )}
    </section>
  );
}
