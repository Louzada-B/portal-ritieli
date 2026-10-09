"use client";

import { useState } from "react";

export default function PixCopia({ codigo }: { codigo: string }) {
  const [aberto, setAberto] = useState(false);
  const [copiou, setCopiou] = useState(false);
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiou(true);
      setTimeout(() => setCopiou(false), 2500);
    } catch {
      setAberto(true);
    }
  };
  return (
    <>
      {!aberto ? <button type="button" className="bt" onClick={() => setAberto(true)}>Pagar com Pix</button> : null}
      {aberto ? (
        <div className="pix">
          <span className="rot">Pix copia e cola</span>
          <code>{codigo}</code>
          <button type="button" className="bt2" onClick={copiar}>{copiou ? "Código copiado" : "Copiar código"}</button>
          <span style={{ fontSize: 13, color: "#6B5A5E" }}>Abra o app do seu banco, escolha Pix copia e cola e cole o código. A Ritieli confere o pagamento e atualiza aqui.</span>
        </div>
      ) : null}
    </>
  );
}
