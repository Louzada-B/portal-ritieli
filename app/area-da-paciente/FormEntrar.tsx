"use client";

import { useActionState, useRef, useState } from "react";
import { entrar, esqueciSenha, type EstadoForm } from "./acoes";
import Icone from "./Icone";

export default function FormEntrar() {
  const [ver, setVer] = useState(false);
  const [rec, setRec] = useState(false);
  const [estado, acao, enviando] = useActionState<EstadoForm, FormData>(entrar, {});
  const [estRec, acaoRec, enviandoRec] = useActionState<EstadoForm, FormData>(esqueciSenha, {});
  const emailRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <form action={acao} style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <div className="campo"><label htmlFor="pa-mail">E-mail</label><div className="in"><input ref={emailRef} id="pa-mail" name="email" type="email" autoComplete="username" placeholder="voce@email.com" required /></div></div>
        <div className="campo">
          <label htmlFor="pa-senha">Senha</label>
          <div className="in">
            <input id="pa-senha" name="senha" type={ver ? "text" : "password"} autoComplete="current-password" placeholder="Sua senha" required />
            <button type="button" className="olho" onClick={() => setVer(!ver)} aria-label={ver ? "Esconder senha" : "Mostrar senha"}><Icone nome="olho" /></button>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 14, color: "#5A3A41", cursor: "pointer" }}>
            <input type="checkbox" name="manter" style={{ width: 18, height: 18, accentColor: "#7A2335", margin: 0 }} />Manter conectada
          </label>
          <button type="button" className="bt3" onClick={() => setRec(true)}>Esqueci minha senha</button>
        </div>
        {estado.erro ? <div className="aviso" role="alert" style={{ color: "#A3322A", borderColor: "#F2C9D1" }}>{estado.erro}</div> : null}
        <button type="submit" className="bt" style={{ minHeight: 54, fontSize: 16 }} disabled={enviando}>
          {enviando ? "Entrando…" : <>Entrar <span aria-hidden="true">→</span></>}
        </button>
      </form>
      {rec ? (
        <form action={(fd) => { fd.set("email", emailRef.current?.value || ""); return acaoRec(fd); }} className="aviso">
          {estRec.ok ? (
            <>
              <b style={{ fontSize: 15, color: "#2F6A45" }}>Senha provisória a caminho.</b>
              <span style={{ fontSize: 14, color: "#5A3A41" }}>{estRec.ok} Sua senha atual continua valendo até você usar a provisória.</span>
            </>
          ) : (
            <>
              <b style={{ fontSize: 15 }}>Vamos enviar uma senha provisória</b>
              <span style={{ fontSize: 14, color: "#5A3A41" }}>Escreva o seu e-mail no campo acima. A senha provisória chega nele e vale por 24 horas. Ao entrar com ela, você cria uma senha nova.</span>
              {estRec.erro ? <span role="alert" style={{ fontSize: 14, color: "#A3322A" }}>{estRec.erro}</span> : null}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button type="submit" className="bt" style={{ minHeight: 42 }} disabled={enviandoRec}>{enviandoRec ? "Enviando…" : "Enviar senha provisória"}</button>
                <button type="button" className="bt3" onClick={() => setRec(false)} style={{ textDecoration: "none" }}>Cancelar</button>
              </div>
            </>
          )}
        </form>
      ) : null}
    </>
  );
}
