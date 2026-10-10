"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function PixCopia({ codigo }: { codigo: string }) {
  const [aberto, setAberto] = useState(false);
  const [copiou, setCopiou] = useState(false);
  const [qr, setQr] = useState<string | null>(null);

  // O QR Code é montado aqui no aparelho, a partir do mesmo código: nada é enviado a terceiros.
  useEffect(() => {
    if (!aberto) return;
    let vivo = true;
    QRCode.toDataURL(codigo, { errorCorrectionLevel: "M", margin: 1, width: 220, color: { dark: "#3A1F25", light: "#FFFFFF" } })
      .then((u) => { if (vivo) setQr(u); })
      .catch(() => { if (vivo) setQr(null); });
    return () => { vivo = false; };
  }, [aberto, codigo]);

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
      {!aberto ? <button type="button" className="bt pa-bt-p" onClick={() => setAberto(true)}>Pagar com Pix</button> : null}
      {aberto ? (
        <div className="pix">
          <span className="rot">Pix copia e cola</span>
          <div className="pix-corpo">
            {qr ? (
              <div className="pix-qr">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qr} alt="QR Code do Pix" width={180} height={180} />
                <span>Abrindo pelo computador? Aponte a câmera do app do banco para o QR Code.</span>
              </div>
            ) : null}
            <div className="pix-cod">
              <code>{codigo}</code>
              <button type="button" className="bt2 pa-bt-p" onClick={copiar}>{copiou ? "Código copiado" : "Copiar código"}</button>
            </div>
          </div>
          <span style={{ fontSize: 13, color: "#6B5A5E" }}>No celular: abra o app do seu banco, escolha Pix copia e cola e cole o código. A Ritieli confere o pagamento e atualiza aqui.</span>
        </div>
      ) : null}
    </>
  );
}
