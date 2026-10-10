import type { RespostaPedido } from "../lib/pacienteDados";
import { fmtQuando } from "../lib/agenda";
import { linkWhatsApp } from "../conteudo";

const quando = (iso: string) => fmtQuando(new Date(iso)).replace(" · ", ", às ");

// Resultado dos pedidos de remarcação e cancelamento, nos 7 dias depois da resposta da Ritieli.
export default function RespostasPedido({ itens }: { itens: RespostaPedido[] }) {
  if (!itens.length) return null;
  return (
    <section className="card" aria-label="Respostas aos seus pedidos" style={{ marginBottom: 20 }}>
      <h2 className="card-t">Resposta aos seus pedidos</h2>
      <div className="lista">
        {itens.map((r) => {
          const ok = r.resultado === "confirmado";
          const titulo = ok ? (r.tipo === "remarcar" ? "Remarcação confirmada" : "Cancelamento confirmado") : r.tipo === "remarcar" ? "Remarcação não atendida" : "Cancelamento não atendido";
          const texto = ok
            ? r.tipo === "remarcar" && r.novoInicio
              ? `A sessão de ${quando(r.sessaoInicio)} passou para ${quando(r.novoInicio)}.`
              : `A sessão de ${quando(r.sessaoInicio)} foi cancelada.`
            : `A Ritieli não conseguiu atender o pedido para a sessão de ${quando(r.sessaoInicio)}. A sessão continua marcada.`;
          return (
            <div className="item" key={r.id} style={{ alignItems: "flex-start" }}>
              <div className="it-t" style={{ flex: 1 }}>
                <b>{titulo}</b>
                <span>{texto}</span>
                {!ok ? <a href={linkWhatsApp(`Olá, Ritieli! Sobre o meu pedido para a sessão de ${quando(r.sessaoInicio)}.`)} target="_blank" rel="noopener" style={{ fontWeight: 700 }}>Combinar pelo WhatsApp</a> : null}
              </div>
              <span className={ok ? "pill p-ok" : "pill p-av"}>{ok ? "Confirmado" : "Recusado"}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
