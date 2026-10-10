"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { concluirExercicio, reabrirExercicio } from "./acoes";

export default function FormExercicio({ pacienteId, id, feito, recadoAtual }: { pacienteId: string; id: string; feito: boolean; recadoAtual: string }) {
  const router = useRouter();
  const [pend, iniciar] = useTransition();
  const [recado, setRecado] = useState(recadoAtual);
  const [msg, setMsg] = useState<{ t: string; erro?: boolean } | null>(null);
  const rodar = (f: () => Promise<{ erro?: string; ok?: string }>) => iniciar(async () => {
    const r = await f();
    setMsg(r.erro ? { t: r.erro, erro: true } : { t: r.ok! });
    if (r.ok) router.refresh();
  });
  if (feito)
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {msg ? <div className="aviso" role="status">{msg.t}</div> : null}
        <button type="button" className="bt2 pa-bt-p" disabled={pend} onClick={() => rodar(() => reabrirExercicio(pacienteId, id))}>Reabrir para refazer</button>
      </div>
    );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="fc">
        <label htmlFor="ex-recado">Quer deixar um recado para a Ritieli? (opcional)</label>
        <textarea id="ex-recado" rows={4} maxLength={1000} value={recado} onChange={(e) => setRecado(e.target.value)} placeholder="Como foi fazer? O que você percebeu?" />
        <span style={{ fontSize: 12, color: "#8A7A7E" }}>Só a Ritieli lê. Não é canal de emergência: em crise, ligue 188 (CVV) ou 192 (SAMU).</span>
      </div>
      {msg ? <div className={msg.erro ? "aviso erro" : "aviso"} role="status">{msg.t}</div> : null}
      <button type="button" className="bt pa-bt-p" disabled={pend} onClick={() => rodar(() => concluirExercicio(pacienteId, id, recado))}>{pend ? "Salvando…" : "Fiz este exercício"}</button>
    </div>
  );
}
