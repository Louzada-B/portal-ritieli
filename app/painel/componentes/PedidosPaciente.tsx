"use client";

import Link from "next/link";
import { useTransition } from "react";
import { resolverPedidoPaciente } from "../(app)/pedidosPaciente";

export type PedidoLinha = { id: string; nome: string; quando: string; tipo: "remarcar" | "cancelar"; mensagem: string | null; pacienteId: string };

export default function PedidosPaciente({ itens }: { itens: PedidoLinha[] }) {
  const [pend, iniciar] = useTransition();
  return (
    <section className="card">
      <h2 className="card-t">Pedidos das pacientes</h2>
      <span style={{ fontSize: 13, color: "#8A7A7E" }}>Feitos na área da paciente. Combine com ela, ajuste em Sessões e marque como resolvido.</span>
      <ul style={{ listStyle: "none", margin: "12px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        {itens.map((x) => (
          <li key={x.id} style={{ background: "#F8F3F0", borderRadius: 14, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
            <b>{x.nome} · {x.tipo === "remarcar" ? "pede remarcação" : "pede cancelamento"}</b>
            <span style={{ fontSize: 14, color: "#5A3A41" }}>Sessão de {x.quando}</span>
            {x.mensagem ? <span style={{ fontSize: 14, color: "#3A1F25", whiteSpace: "pre-wrap" }}>“{x.mensagem}”</span> : null}
            <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Link href={`/painel/pacientes?id=${x.pacienteId}`} className="mini2">Abrir ficha</Link>
              <Link href="/painel/sessoes" className="mini2">Ir para Sessões</Link>
              <button type="button" className="mini2" disabled={pend} onClick={() => iniciar(async () => { await resolverPedidoPaciente(x.id); })}>Marcar como resolvido</button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
