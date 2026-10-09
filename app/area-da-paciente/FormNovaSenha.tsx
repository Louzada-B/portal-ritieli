"use client";

import { useActionState, useState } from "react";
import { definirSenha, type EstadoForm } from "./acoes";
import Icone from "./Icone";

export default function FormNovaSenha() {
  const [ver, setVer] = useState(false);
  const [s1, setS1] = useState("");
  const [s2, setS2] = useState("");
  const [estado, acao, enviando] = useActionState<EstadoForm, FormData>(definirSenha, {});
  const tam = s1.length >= 8;
  const letras = /[A-Za-zÀ-ÿ]/.test(s1) && /[0-9]/.test(s1);
  const iguais = s1.length > 0 && s1 === s2;
  const pronta = tam && letras && iguais;
  const Req = ({ ok, children }: { ok: boolean; children: React.ReactNode }) => (
    <li className={ok ? "ok" : ""}><span className="b"><Icone nome="check" tam={14} /></span>{children}</li>
  );
  return (
    <form action={acao} style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div className="campo">
        <label htmlFor="ns-1">Nova senha</label>
        <div className="in">
          <input id="ns-1" name="senha" type={ver ? "text" : "password"} autoComplete="new-password" placeholder="Crie uma senha" value={s1} onChange={(e) => setS1(e.target.value)} required />
          <button type="button" className="olho" onClick={() => setVer(!ver)} aria-label={ver ? "Esconder senha" : "Mostrar senha"}><Icone nome="olho" /></button>
        </div>
      </div>
      <ul className="reqs" aria-live="polite">
        <Req ok={tam}>Pelo menos 8 caracteres</Req>
        <Req ok={letras}>Letras e números</Req>
        <Req ok={iguais}>As duas senhas iguais</Req>
      </ul>
      <div className="campo"><label htmlFor="ns-2">Repita a nova senha</label><div className="in"><input id="ns-2" name="confirma" type={ver ? "text" : "password"} autoComplete="new-password" placeholder="Digite de novo" value={s2} onChange={(e) => setS2(e.target.value)} required /></div></div>
      {estado.erro ? <div className="aviso" role="alert" style={{ color: "#A3322A" }}>{estado.erro}</div> : null}
      <button type="submit" className="bt" style={{ minHeight: 54, fontSize: 16 }} disabled={!pronta || enviando}>
        {enviando ? "Salvando…" : <>Salvar e entrar <span aria-hidden="true">→</span></>}
      </button>
    </form>
  );
}
