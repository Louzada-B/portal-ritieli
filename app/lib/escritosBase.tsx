// Escritos: temas, cores das capas e o formato simples do texto, usados no site e no painel.
import type { ReactNode } from "react";

export const TEMAS = ["Ansiedade", "Depressão", "Autocuidado", "TCC na prática"] as const;
export type Tema = (typeof TEMAS)[number];
export const ESTILO: Record<string, { fundo: string; tinta: string }> = {
  Ansiedade: { fundo: "#F6E5E7", tinta: "#7A2335" },
  Depressão: { fundo: "#3A1F25", tinta: "#F2C9D1" },
  Autocuidado: { fundo: "#F4E9E2", tinta: "#8C3A4E" },
  "TCC na prática": { fundo: "#7A2335", tinta: "#F2C9D1" },
};

export type Escrito = {
  id: string;
  slug: string | null;
  titulo: string;
  tema: string;
  palavra: string;
  resumo: string;
  capa_url: string | null;
  corpo: string;
  publicar_em: string | null;
  criado_em: string;
  atualizado_em: string;
};

export const palavrasDe = (t: string) => (t.trim() ? t.trim().split(/\s+/).length : 0);
export const minutosDe = (t: string) => Math.max(1, Math.round(palavrasDe(t) / 200));

export function slugDe(t: string) {
  return (
    t
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 70)
      .replace(/-+$/g, "") || "texto"
  );
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export const dataCurta = (iso: string, ano = false) => {
  const d = new Date(new Date(iso).getTime() - 3 * 3600000);
  return `${d.getUTCDate()} ${MESES[d.getUTCMonth()]}${ano ? ` ${d.getUTCFullYear()}` : ""}`;
};

// Negrito (**assim**) e itálico (_assim_) dentro de um parágrafo.
function inline(t: string, k: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|_(.+?)_/g;
  let ult = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(t))) {
    if (m.index > ult) out.push(t.slice(ult, m.index));
    out.push(m[1] != null ? <strong key={`${k}-${i++}`}>{m[1]}</strong> : <em key={`${k}-${i++}`}>{m[2]}</em>);
    ult = m.index + m[0].length;
  }
  if (ult < t.length) out.push(t.slice(ult));
  return out;
}

// Formato do texto: "## " subtítulo, "> " citação, "- " lista, "1. " passos,
// "!> " caixa "Experimente agora"; parágrafos separados por linha em branco.
export function TextoEscrito({ corpo }: { corpo: string }) {
  const blocos = corpo.replace(/\r/g, "").split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  return (
    <>
      {blocos.map((b, n) => {
        const linhas = b.split("\n").map((l) => l.trim()).filter(Boolean);
        const k = `b${n}`;
        if (linhas.length === 1 && linhas[0].startsWith("## ")) return <h2 key={k}>{linhas[0].slice(3)}</h2>;
        if (linhas.every((l) => l.startsWith(">"))) return <p key={k} className="citacao">“{inline(linhas.map((l) => l.replace(/^>\s?/, "")).join(" ").replace(/^“|”$/g, ""), k)}”</p>;
        if (linhas.every((l) => l.startsWith("!>"))) return <div key={k} className="exp"><span className="cat">Experimente agora</span><p style={{ margin: 0, fontWeight: 600, fontSize: "1.05em" }}>{inline(linhas.map((l) => l.replace(/^!>\s?/, "")).join(" ").replace(/^Experimente( agora)?:\s*/i, ""), k)}</p></div>;
        if (linhas.every((l) => /^[-•]\s/.test(l))) return <ul key={k}>{linhas.map((l, i) => <li key={i}>{inline(l.replace(/^[-•]\s/, ""), `${k}${i}`)}</li>)}</ul>;
        if (linhas.every((l) => /^\d+[.)]\s/.test(l))) return <ol key={k}>{linhas.map((l, i) => <li key={i}><span>{inline(l.replace(/^\d+[.)]\s/, ""), `${k}${i}`)}</span></li>)}</ol>;
        if (linhas[0].startsWith("## ")) return <div key={k}><h2>{linhas[0].slice(3)}</h2><p>{inline(linhas.slice(1).join(" "), k)}</p></div>;
        return <p key={k}>{inline(linhas.join(" "), k)}</p>;
      })}
    </>
  );
}

// Capa: a foto (se houver) com a palavra por cima, ou a cor do tema.
export function Capa({ e, tam, className = "capa", style }: { e: Pick<Escrito, "capa_url" | "palavra" | "tema" | "titulo">; tam: number; className?: string; style?: React.CSSProperties }) {
  const est = ESTILO[e.tema] || ESTILO.Ansiedade;
  return (
    <div className={e.capa_url ? className : `${className} sem-foto`} style={{ background: est.fundo, color: est.tinta, ...style }}>
      {e.capa_url ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="foto" src={e.capa_url} alt="" loading="lazy" />
          <span className="veu" aria-hidden="true" />
        </>
      ) : null}
      {e.palavra ? <span className="capa-p" style={{ fontSize: tam }}>{e.palavra}</span> : null}
    </div>
  );
}
