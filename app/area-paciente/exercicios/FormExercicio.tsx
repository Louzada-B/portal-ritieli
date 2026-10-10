"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { concluirExercicio, reabrirExercicio } from "./acoes";
import { cifrarRecado } from "../../lib/recadoCifrado";

export default function FormExercicio({ pacienteId, id, feito, chavePublica }: { pacienteId: string; id: string; feito: boolean; chavePublica: string | null }) {
  const router = useRouter();
  const [pend, iniciar] = useTransition();
  const [recado, setRecado] = useState("");
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
      {chavePublica ? (
        <div className="fc">
          <label htmlFor="ex-recado">Quer deixar um recado para a Ritieli? (opcional)</label>
          <textarea id="ex-recado" rows={4} maxLength={1000} value={recado} onChange={(e) => setRecado(e.target.value)} placeholder="Como foi fazer? O que você percebeu?" />
          <span style={{ fontSize: 12, color: "#8A7A7E" }}>O recado é protegido no seu aparelho antes de ser enviado: só a Ritieli consegue ler. Não é canal de emergência: em crise, ligue 188 (CVV) ou 192 (SAMU).</span>
        </div>
      ) : <span style={{ fontSize: 13, color: "#6B5A5E" }}>Para deixar um recado, fale com a Ritieli pelo WhatsApp.</span>}
      {msg ? <div className={msg.erro ? "aviso erro" : "aviso"} role="status">{msg.t}</div> : null}
      <button type="button" className="bt pa-bt-p" disabled={pend} onClick={() => rodar(async () => { try { const t = recado.trim(); return await concluirExercicio(pacienteId, id, t && chavePublica ? await cifrarRecado(chavePublica, t) : null); } catch { return { erro: "Não deu para proteger o recado neste aparelho." }; } })}>{pend ? "Salvando…" : "Fiz este exercício"}</button>
    </div>
  );
}
