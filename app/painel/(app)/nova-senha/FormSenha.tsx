"use client";

import { useActionState } from "react";
import { trocarSenha, type EstadoForm } from "../../acoes";

export default function FormSenha() {
  const [estado, acao, enviando] = useActionState<EstadoForm, FormData>(trocarSenha, {});
  return (
    <form action={acao} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="campo"><label htmlFor="ns1">Senha nova</label><div className="in"><input id="ns1" name="senha" type="password" autoComplete="new-password" minLength={10} required /></div></div>
      <div className="campo"><label htmlFor="ns2">Repita a senha</label><div className="in"><input id="ns2" name="confirma" type="password" autoComplete="new-password" minLength={10} required /></div></div>
      <span style={{ fontSize: 13, color: "#6B5A5E" }}>Pelo menos 10 caracteres.</span>
      {estado.erro ? <div className="aviso erro" role="alert">{estado.erro}</div> : null}
      <button type="submit" className="bt" disabled={enviando}>{enviando ? "Salvando…" : "Salvar senha nova"}</button>
    </form>
  );
}
