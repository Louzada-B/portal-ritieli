// Texto formatado das evoluções: guardado como JSON do editor (dentro do conteúdo cifrado)
// e desenhado aqui elemento por elemento, sem HTML vindo do registro. Só passa o que está na lista:
// parágrafo, título, listas, quebra de linha, negrito, itálico, sublinhado, realce e as cores da paleta.

export const CORES_EVOLUCAO: { nome: string; cor: string }[] = [
  { nome: "Preto", cor: "#1F1A1C" },
  { nome: "Azul", cor: "#1F4E8C" },
  { nome: "Vermelho", cor: "#A32323" },
  { nome: "Verde", cor: "#2E6B3A" },
  { nome: "Roxo", cor: "#5B3A8C" },
];
const PALETA = new Set(CORES_EVOLUCAO.map((c) => c.cor.toLowerCase()));
export const COR_REALCE = "#FCEB9C";

export type NoRico = { type?: string; text?: string; attrs?: Record<string, unknown>; marks?: { type: string; attrs?: Record<string, unknown> }[]; content?: NoRico[] };

function marcar(texto: string, marks: NoRico["marks"], k: string): React.ReactNode {
  let el: React.ReactNode = texto;
  for (const m of marks ?? []) {
    if (m.type === "bold") el = <strong key={k}>{el}</strong>;
    else if (m.type === "italic") el = <em key={k}>{el}</em>;
    else if (m.type === "underline") el = <u key={k}>{el}</u>;
    else if (m.type === "highlight") el = <mark key={k} style={{ background: COR_REALCE, color: "inherit", padding: "0 2px", borderRadius: 3 }}>{el}</mark>;
    else if (m.type === "textStyle") {
      const cor = typeof m.attrs?.color === "string" ? m.attrs.color.toLowerCase() : "";
      if (PALETA.has(cor)) el = <span key={k} style={{ color: cor }}>{el}</span>;
    }
  }
  return el;
}

function desenhar(nos: NoRico[] | undefined, pre: string): React.ReactNode[] {
  return (nos ?? []).map((n, i) => {
    const k = `${pre}${i}`;
    switch (n.type) {
      case "text": return <span key={k}>{marcar(n.text ?? "", n.marks, k + "m")}</span>;
      case "hardBreak": return <br key={k} />;
      case "paragraph": return <p key={k} style={{ margin: "0 0 8px", minHeight: "1em" }}>{desenhar(n.content, k + "-")}</p>;
      case "heading": return <h4 key={k} style={{ margin: "10px 0 6px", fontSize: 16, fontWeight: 700 }}>{desenhar(n.content, k + "-")}</h4>;
      case "bulletList": return <ul key={k} style={{ margin: "0 0 8px", paddingLeft: 22 }}>{desenhar(n.content, k + "-")}</ul>;
      case "orderedList": return <ol key={k} style={{ margin: "0 0 8px", paddingLeft: 22 }}>{desenhar(n.content, k + "-")}</ol>;
      case "listItem": return <li key={k}>{desenhar(n.content, k + "-")}</li>;
      default: return <span key={k}>{desenhar(n.content, k + "-")}</span>;
    }
  });
}

// Evolução antiga (texto puro) ou nova (com doc formatado).
export default function TextoRico({ texto, doc }: { texto: string; doc?: NoRico | null }) {
  if (!doc || doc.type !== "doc") return <p style={{ whiteSpace: "pre-wrap" }}>{texto}</p>;
  return <div className="texto-rico">{desenhar(doc.content, "n")}</div>;
}
