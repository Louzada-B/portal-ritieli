"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { resolverPedidoPaciente, confirmarCancelamentoPedido, confirmarRemarcacaoPedido, recusarPedido } from "../(app)/pedidosPaciente";

export type PedidoLinha = { id: string; nome: string; quando: string; tipo: "remarcar" | "cancelar"; mensagem: string | null; pacienteId: string };

function Linha({ x }: { x: PedidoLinha }) {
  const [pend, iniciar] = useTransition();
  const [novo, setNovo] = useState({ data: "", hora: "" });
  const [aviso, setAviso] = useState<{ t: string; erro?: boolean } | null>(null);
  const rodar = (f: () => Promise<{ erro?: string; ok?: string }>) => iniciar(async () => {
    const r = await f();
    setAviso(r.erro ? { t: r.erro, erro: true } : { t: r.ok || "Feito." });
  });
  return (
    <li style={{ background: "#F8F3F0", borderRadius: 14, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
      <b>{x.nome} · {x.tipo === "remarcar" ? "pede remarcação" : "pede cancelamento"}</b>
      <span style={{ fontSize: 14, color: "#5A3A41" }}>Sessão de {x.quando}</span>
      {x.mensagem ? <span style={{ fontSize: 14, color: "#3A1F25", whiteSpace: "pre-wrap" }}>“{x.mensagem}”</span> : null}

      {x.tipo === "remarcar" ? (
        <span style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 12, fontWeight: 700, color: "#5A3A41" }}>Novo dia<input type="date" value={novo.data} onChange={(e) => setNovo({ ...novo, data: e.target.value })} style={{ font: "inherit", fontSize: 14, padding: "6px 8px", borderRadius: 8, border: "1px solid #E2CCD0" }} /></label>
          <label style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 12, fontWeight: 700, color: "#5A3A41" }}>Horário<input type="time" value={novo.hora} onChange={(e) => setNovo({ ...novo, hora: e.target.value })} style={{ font: "inherit", fontSize: 14, padding: "6px 8px", borderRadius: 8, border: "1px solid #E2CCD0" }} /></label>
          <button type="button" className="mini2" disabled={pend || !novo.data || !novo.hora} onClick={() => rodar(() => confirmarRemarcacaoPedido(x.id, novo.data, novo.hora))}>Remarcar e resolver</button>
        </span>
      ) : (
        <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="mini2" disabled={pend} onClick={() => rodar(() => confirmarCancelamentoPedido(x.id))}>Confirmar cancelamento</button>
        </span>
      )}

      <span style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" className="mini2" disabled={pend} onClick={() => rodar(() => recusarPedido(x.id))}>Recusar</button>
        <button type="button" className="mini2" disabled={pend} onClick={() => rodar(() => resolverPedidoPaciente(x.id))}>Só marcar como resolvido</button>
        <Link href={`/painel/pacientes?id=${x.pacienteId}`} style={{ fontSize: 13, fontWeight: 700 }}>Abrir ficha</Link>
      </span>
      {aviso ? <span className={aviso.erro ? "aviso erro" : "aviso ok"} role="status">{aviso.t}</span> : null}
    </li>
  );
}

export default function PedidosPaciente({ itens }: { itens: PedidoLinha[] }) {
  return (
    <section className="card">
      <h2 className="card-t">Pedidos de pacientes</h2>
      <span style={{ fontSize: 13, color: "#8A7A7E" }}>Feitos na área da(o) paciente. Resolva aqui mesmo: a sessão é ajustada e a paciente recebe um e-mail curto.</span>
      <ul style={{ listStyle: "none", margin: "12px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        {itens.map((x) => <Linha key={x.id} x={x} />)}
      </ul>
    </section>
  );
}
