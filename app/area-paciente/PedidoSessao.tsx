"use client";

import { useState, useTransition } from "react";
import { pedirSessao } from "./acoes";

// Pedir remarcação ou cancelamento. Quem decide é a Ritieli: aqui só nasce o pedido.
export default function PedidoSessao({ pacienteId, sessaoId, pedido, menos24h, whatsapp }: {
  pacienteId: string; sessaoId: string; pedido: "remarcar" | "cancelar" | null; menos24h: boolean; whatsapp: string;
}) {
  const [aberto, setAberto] = useState<"remarcar" | "cancelar" | null>(null);
  const [texto, setTexto] = useState("");
  const [aviso, setAviso] = useState<{ t: string; erro?: boolean } | null>(null);
  const [pend, iniciar] = useTransition();

  if (pedido) return (
    <span style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <span className="pill p-av">{pedido === "remarcar" ? "Remarcação pedida" : "Cancelamento pedido"}</span>
      <span className="pa-aguarda">Aguardando a confirmação da Ritieli.</span>
    </span>
  );
  if (menos24h) return <a className="bt3" href={whatsapp} target="_blank" rel="noopener">Menos de 24 h: avisar pelo WhatsApp</a>;

  const enviar = () => iniciar(async () => {
    const r = await pedirSessao(pacienteId, sessaoId, aberto!, texto);
    if (r.erro) setAviso({ t: r.erro, erro: true });
    else { setAviso({ t: r.ok || "Pedido enviado." }); setAberto(null); setTexto(""); }
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: "1 1 100%" }}>
      <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="bt2" onClick={() => { setAberto(aberto === "remarcar" ? null : "remarcar"); setAviso(null); }} aria-expanded={aberto === "remarcar"}>Pedir remarcação</button>
        <button type="button" className="bt2" onClick={() => { setAberto(aberto === "cancelar" ? null : "cancelar"); setAviso(null); }} aria-expanded={aberto === "cancelar"}>Cancelar</button>
      </span>
      {aberto ? (
        <div className="caixa">
          <label htmlFor={`msg-${sessaoId}`} style={{ fontWeight: 700, fontSize: 14 }}>{aberto === "remarcar" ? "Quando fica melhor para você? (opcional)" : "Quer deixar um recado? (opcional)"}</label>
          <textarea id={`msg-${sessaoId}`} value={texto} maxLength={500} onChange={(e) => setTexto(e.target.value)} />
          {aberto === "cancelar" ? <span style={{ fontSize: 13, color: "#6B5A5E" }}>Cancelamentos pedidos com pelo menos 24 horas de antecedência não são cobrados. A Ritieli confirma o cancelamento com você.</span> : null}
          <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="bt" disabled={pend} onClick={enviar}>{pend ? "Enviando…" : aberto === "remarcar" ? "Enviar pedido de remarcação" : "Enviar pedido de cancelamento"}</button>
            <button type="button" className="bt2" onClick={() => setAberto(null)}>Voltar</button>
          </span>
        </div>
      ) : null}
      {aviso ? <div className="aviso" role="status" style={aviso.erro ? { borderColor: "#E9B4AE", color: "#A3322A" } : undefined}>{aviso.t}</div> : null}
    </div>
  );
}
