"use client";

import { useActionState, useRef, useState } from "react";
import { entrar, esqueciSenha, type EstadoForm } from "../acoes";
import Icone from "../componentes/Icone";

export default function FormEntrar() {
  const [ver, setVer] = useState(false);
  const [rec, setRec] = useState(false);
  const [estado, acao, enviando] = useActionState<EstadoForm, FormData>(entrar, {});
  const [estRec, acaoRec, enviandoRec] = useActionState<EstadoForm, FormData>(esqueciSenha, {});
  const emailRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <form action={acao} style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <div className="campo">
          <label htmlFor="pe-mail">E-mail</label>
          <div className="in"><input ref={emailRef} id="pe-mail" name="email" type="email" autoComplete="username" placeholder="voce@email.com" required /></div>
        </div>
        <div className="campo">
          <label htmlFor="pe-senha">Senha</label>
          <div className="in">
            <input id="pe-senha" name="senha" type={ver ? "text" : "password"} autoComplete="current-password" placeholder="Sua senha" required />
            <button type="button" className="olho" onClick={() => setVer(!ver)} aria-label={ver ? "Esconder senha" : "Mostrar senha"}><Icone nome="olho" /></button>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, color: "#6B5A5E", lineHeight: 1.45, flex: "1 1 200px" }}>Você fica conectada. Depois de 10 dias sem abrir o painel, pedimos a senha de novo.</span>
          <button type="button" onClick={() => setRec(true)} style={{ font: "inherit", fontSize: 14, fontWeight: 700, color: "#7A2335", background: "none", border: 0, padding: "6px 0", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}>Esqueci minha senha</button>
        </div>
        {estado.erro ? <div className="aviso erro" role="alert">{estado.erro}</div> : null}
        <button type="submit" className="bt" style={{ minHeight: 54, fontSize: 16 }} disabled={enviando}>
          {enviando ? "Entrando…" : <>Entrar <span aria-hidden="true">→</span></>}
        </button>
      </form>
      {rec ? (
        <form
          action={(fd) => { fd.set("email", emailRef.current?.value || ""); return acaoRec(fd); }}
          style={{ background: "#FFFFFF", border: "1px solid #F2C9D1", borderRadius: 16, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}
        >
          {estRec.ok ? (
            <>
              <b style={{ fontSize: 15, color: "#2F6A45" }}>Link enviado.</b>
              <span style={{ fontSize: 14, color: "#5A3A41" }}>{estRec.ok}</span>
            </>
          ) : (
            <>
              <b style={{ fontSize: 15 }}>Vamos criar uma senha nova</b>
              <span style={{ fontSize: 14, color: "#5A3A41" }}>Escreva seu e-mail no campo acima. Enviamos um link para criar a senha nova.</span>
              {estRec.erro ? <div className="aviso erro" role="alert">{estRec.erro}</div> : null}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button type="submit" className="bt" style={{ minHeight: 42 }} disabled={enviandoRec}>{enviandoRec ? "Enviando…" : "Enviar link"}</button>
                <button type="button" className="bt3" onClick={() => setRec(false)}>Cancelar</button>
              </div>
            </>
          )}
        </form>
      ) : null}
    </>
  );
}
