"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { RespostaPedido } from "../lib/pacienteDados";
import { fmtQuando } from "../lib/agenda";
import { linkWhatsApp } from "../conteudo";
import { dispensarResposta } from "./acoes";

const quando = (iso: string) => fmtQuando(new Date(iso)).replace(" · ", ", às ");

// Resultado dos pedidos de remarcação e cancelamento. Some sozinho em 7 dias ou quando a pessoa fecha.
export default function RespostasPedido({ pacienteId, itens }: { pacienteId: string; itens: RespostaPedido[] }) {
  const router = useRouter();
  const [pend, iniciar] = useTransition();
  if (!itens.length) return null;
  const fechar = (ids: string[]) => iniciar(async () => { await dispensarResposta(pacienteId, ids); router.refresh(); });
  return (
    <section className="card" aria-label="Respostas aos seus pedidos" style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h2 className="card-t" style={{ margin: 0 }}>Resposta aos seus pedidos</h2>
        <button type="button" className="bt2 pa-bt-p" disabled={pend} onClick={() => fechar(itens.map((r) => r.id))}>{itens.length > 1 ? "Fechar todas" : "Fechar"}</button>
      </div>
      <div className="lista" style={{ marginTop: 8 }}>
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
              <button type="button" aria-label="Fechar este aviso" disabled={pend} onClick={() => fechar([r.id])} style={{ background: "none", border: 0, cursor: "pointer", fontSize: 20, lineHeight: 1, color: "#8A7A7E", padding: "0 4px" }}>×</button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
