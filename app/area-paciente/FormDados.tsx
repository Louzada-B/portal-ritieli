"use client";

import { useState, useTransition } from "react";
import { salvarContato, trocarSenha, type EstadoForm } from "./acoes";
import { fone } from "../lib/formato";

export function FormContato({ pacienteId, whatsapp, cidade, emergencia }: { pacienteId: string; whatsapp: string; cidade: string; emergencia: string }) {
  // O contato de emergência é guardado como "Nome e parentesco · telefone": aqui vira dois campos, como na ficha do painel.
  const i = emergencia.lastIndexOf(" · ");
  const [v, setV] = useState({ whatsapp: fone(whatsapp), cidade, eNome: i >= 0 ? emergencia.slice(0, i) : emergencia, eTelefone: i >= 0 ? emergencia.slice(i + 3) : "" });
  const [r, setR] = useState<EstadoForm | null>(null);
  const [pend, iniciar] = useTransition();
  return (
    <form onSubmit={(e) => { e.preventDefault(); iniciar(async () => setR(await salvarContato(pacienteId, v))); }} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="fc"><label htmlFor="c-tel">Telefone</label><input id="c-tel" type="tel" autoComplete="tel" value={v.whatsapp} onChange={(e) => setV({ ...v, whatsapp: fone(e.target.value) })} /></div>
      <div className="fc"><label htmlFor="c-cid">Cidade</label><input id="c-cid" value={v.cidade} maxLength={80} onChange={(e) => setV({ ...v, cidade: e.target.value })} /></div>
      <div className="fc"><label htmlFor="c-en">Contato de emergência: nome e parentesco</label><input id="c-en" placeholder="Ex.: Maria, mãe" value={v.eNome} maxLength={120} onChange={(e) => setV({ ...v, eNome: e.target.value })} /></div>
      <div className="fc"><label htmlFor="c-et">Contato de emergência: telefone</label><input id="c-et" type="tel" placeholder="(51) 99999-9999" value={v.eTelefone} onChange={(e) => setV({ ...v, eTelefone: fone(e.target.value) })} /></div>
      {r ? <div className="aviso" role="status" style={r.erro ? { borderColor: "#E9B4AE", color: "#A3322A" } : undefined}>{r.erro || r.ok}</div> : null}
      <button type="submit" className="bt" style={{ alignSelf: "flex-start" }} disabled={pend}>{pend ? "Salvando…" : "Salvar"}</button>
    </form>
  );
}

export function FormTroca() {
  const [r, setR] = useState<EstadoForm | null>(null);
  const [pend, iniciar] = useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const f = e.currentTarget;
        const dados = new FormData(f);
        iniciar(async () => {
          const res = await trocarSenha({}, dados);
          setR(res);
          if (res.ok) f.reset();
        });
      }}
      style={{ display: "flex", flexDirection: "column", gap: 12 }}
    >
      <div className="fc"><label htmlFor="s-at">Senha atual</label><input id="s-at" name="atual" type="password" autoComplete="current-password" required /></div>
      <div className="fc"><label htmlFor="s-no">Senha nova</label><input id="s-no" name="nova" type="password" autoComplete="new-password" required minLength={8} /></div>
      <div className="fc"><label htmlFor="s-re">Repita a senha nova</label><input id="s-re" name="repita" type="password" autoComplete="new-password" required minLength={8} /></div>
      <span style={{ fontSize: 13, color: "#8A7A7E" }}>Pelo menos 8 caracteres, com letras e números. Ao trocar, os outros aparelhos saem da sua conta.</span>
      {r ? <div className="aviso" role="status" style={r.erro ? { borderColor: "#E9B4AE", color: "#A3322A" } : undefined}>{r.erro || r.ok}</div> : null}
      <button type="submit" className="bt2" style={{ alignSelf: "flex-start" }} disabled={pend}>{pend ? "Salvando…" : "Trocar senha"}</button>
    </form>
  );
}
