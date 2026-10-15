"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

// Transforma o nome digitado em identificador de link: "Ansiedade na Escola X" -> "ansiedade-na-escola-x".
const paraSlug = (t: string) =>
  t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

const COR = { dark: "#7A2335", light: "#FFFFFF" };

export default function GeradorQR({ base, inicial }: { base: string; inicial: string }) {
  const [nome, setNome] = useState(inicial === "palestra" ? "" : inicial);
  const [png, setPng] = useState("");
  const [copiado, setCopiado] = useState(false);
  const slug = paraSlug(nome);
  const link = slug && slug !== "palestra" ? `${base}?p=${slug}` : base;

  useEffect(() => {
    QRCode.toDataURL(link, { errorCorrectionLevel: "H", margin: 2, width: 1024, color: COR }).then(setPng).catch(() => setPng(""));
  }, [link]);

  const baixar = (href: string, arquivo: string) => {
    const a = document.createElement("a");
    a.href = href;
    a.download = arquivo;
    a.click();
  };
  const baixarSvg = async () => {
    const svg = await QRCode.toString(link, { type: "svg", errorCorrectionLevel: "H", margin: 2, color: COR });
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    baixar(url, `qr-avaliacao-${slug || "palestra"}.svg`);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  const copiar = async () => {
    try { await navigator.clipboard.writeText(link); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch {}
  };

  return (
    <section className="card" style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
      <div style={{ flex: "1 1 300px", display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
        <h2 className="card-t">Link e QR code da avaliação</h2>
        <div className="fc">
          <label htmlFor="av-nome">Nome da palestra (opcional)</label>
          <input id="av-nome" type="text" placeholder="Ex.: Ansiedade na Escola X" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={80} />
        </div>
        <span style={{ fontSize: 13, color: "#8A7A7E" }}>Cada nome gera um link próprio, e as respostas ficam separadas aqui no painel. Sem nome, as respostas entram em “palestra”.</span>
        <code style={{ fontSize: 14, wordBreak: "break-all", color: "#7A2335", background: "#F8F3F0", borderRadius: 10, padding: "10px 12px" }}>{link}</code>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button type="button" className="mini2" onClick={copiar}>{copiado ? "Link copiado" : "Copiar link"}</button>
          <button type="button" className="mini2" disabled={!png} onClick={() => baixar(png, `qr-avaliacao-${slug || "palestra"}.png`)}>Baixar QR (PNG)</button>
          <button type="button" className="mini2" onClick={baixarSvg}>Baixar QR (SVG)</button>
          <a className="mini2" href={link} target="_blank" rel="noopener" style={{ textDecoration: "none" }}>Abrir formulário</a>
          <a className="mini2" href={`/painel/avaliacoes?p=${slug || "palestra"}`} style={{ textDecoration: "none" }}>Ver respostas</a>
        </div>
        <span style={{ fontSize: 13, color: "#8A7A7E" }}>No slide, use o QR grande (pelo menos ¼ da tela). O PNG serve para PowerPoint e Canva; o SVG não perde qualidade em nenhum tamanho.</span>
      </div>
      <div style={{ flex: "0 0 auto", width: 220, height: 220, borderRadius: 16, border: "1px solid #EFE2E4", display: "flex", alignItems: "center", justifyContent: "center", background: "#fff" }}>
        {png ? <img src={png} alt={`QR code para ${link}`} width={200} height={200} /> : null}
      </div>
    </section>
  );
}
