"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { resolverPedidoPaciente, confirmarCancelamentoPedido, confirmarRemarcacaoPedido, recusarPedido } from "../(app)/pedidosPaciente";
import { listarLivres } from "../(app)/livres";
import SeletorLivre from "./SeletorLivre";

export type PedidoLinha = { id: string; nome: string; quando: string; tipo: "remarcar" | "cancelar"; mensagem: string | null; pacienteId: string; sessaoId: string | null };

const campo: React.CSSProperties = { font: "inherit", fontSize: 14, padding: "6px 8px", borderRadius: 8, border: "1px solid #E2CCD0" };

function Linha({ x, feito, onFeito, onFechar }: { x: PedidoLinha; feito: { t: string; erro?: boolean } | null; onFeito: (id: string, r: { t: string; erro?: boolean }) => void; onFechar: (id: string) => void }) {
  const [pend, iniciar] = useTransition();
  const [novo, setNovo] = useState({ data: "", hora: "" });
  const rodar = (f: () => Promise<{ erro?: string; ok?: string }>) => iniciar(async () => {
    const r = await f();
    onFeito(x.id, r.erro ? { t: r.erro, erro: true } : { t: r.ok || "Feito." });
  });
  const resolvido = !!feito && !feito.erro;
  return (
    <li style={{ background: "#F8F3F0", borderRadius: 14, padding: "12px 14px", display: "flex", flexWrap: "wrap", gap: "10px 24px", alignItems: "flex-start", justifyContent: "space-between" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 220, flex: "1 1 260px" }}>
        <b>{x.nome} · {x.tipo === "remarcar" ? "pede remarcação" : "pede cancelamento"}</b>
        <span style={{ fontSize: 14, color: "#5A3A41" }}>Sessão de {x.quando}</span>
        {x.mensagem ? <span style={{ fontSize: 14, color: "#3A1F25", whiteSpace: "pre-wrap" }}>“{x.mensagem}”</span> : null}
        <Link href={`/painel/pacientes?id=${x.pacienteId}`} style={{ fontSize: 13, fontWeight: 700 }}>Abrir ficha</Link>
      </div>

      {resolvido ? (
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flex: "1 1 280px" }}>
          <span className="aviso ok" role="status" style={{ flex: 1 }}>{feito!.t}</span>
          <button type="button" className="mini2" onClick={() => onFechar(x.id)}>Fechar</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: "1 1 340px", minWidth: 0 }}>
          {x.tipo === "remarcar" ? (
            x.sessaoId ? (
              <SeletorLivre
                carregar={() => listarLivres(x.sessaoId!)}
                recarregar={x.sessaoId}
                valor={novo}
                onChange={setNovo}
                manual={
                  <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <input type="date" aria-label="Novo dia" value={novo.data} onChange={(e) => setNovo({ ...novo, data: e.target.value })} style={campo} />
                    <input type="time" aria-label="Novo horário" value={novo.hora} onChange={(e) => setNovo({ ...novo, hora: e.target.value })} style={campo} />
                  </span>
                }
              />
            ) : <span style={{ fontSize: 13, color: "#8A7A7E" }}>A sessão deste pedido não existe mais. Recuse ou marque como resolvido.</span>
          ) : null}
          <span style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {x.tipo === "remarcar" ? (
              <button type="button" className="mini2" disabled={pend || !novo.data || !novo.hora} onClick={() => rodar(() => confirmarRemarcacaoPedido(x.id, novo.data, novo.hora))}>Remarcar e resolver</button>
            ) : (
              <button type="button" className="mini2" disabled={pend} onClick={() => rodar(() => confirmarCancelamentoPedido(x.id))}>Confirmar cancelamento</button>
            )}
            <button type="button" className="mini2" disabled={pend} onClick={() => rodar(() => recusarPedido(x.id))}>Recusar</button>
            <button type="button" className="mini2" disabled={pend} onClick={() => rodar(() => resolverPedidoPaciente(x.id))}>Só marcar como resolvido</button>
          </span>
          {feito?.erro ? <span className="aviso erro" role="status">{feito.t}</span> : null}
        </div>
      )}
    </li>
  );
}

// Depois de resolver, o pedido continua na tela com o resultado até a Ritieli fechar (o aviso não some sozinho).
export default function PedidosPaciente({ itens }: { itens: PedidoLinha[] }) {
  const [feitos, setFeitos] = useState<Record<string, { t: string; erro?: boolean }>>({});
  const [fechados, setFechados] = useState<string[]>([]);
  const [guardados, setGuardados] = useState<Record<string, PedidoLinha>>({});
  const aoFeito = (id: string, r: { t: string; erro?: boolean }) => {
    setFeitos((f) => ({ ...f, [id]: r }));
    if (!r.erro) { const it = itens.find((i) => i.id === id); if (it) setGuardados((g) => ({ ...g, [id]: it })); }
  };
  const mostrar = [...itens, ...Object.values(guardados).filter((g) => !itens.some((i) => i.id === g.id))].filter((i) => !fechados.includes(i.id));
  if (!mostrar.length) return null;
  return (
    <section className="card">
      <h2 className="card-t">Pedidos de pacientes</h2>
      <span style={{ fontSize: 13, color: "#8A7A7E" }}>Feitos na área da(o) paciente. Resolva aqui mesmo: a sessão é ajustada e a paciente recebe um e-mail curto.</span>
      <ul style={{ listStyle: "none", margin: "12px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        {mostrar.map((x) => <Linha key={x.id} x={x} feito={feitos[x.id] ?? null} onFeito={aoFeito} onFechar={(id) => setFechados((f) => [...f, id])} />)}
      </ul>
    </section>
  );
}
