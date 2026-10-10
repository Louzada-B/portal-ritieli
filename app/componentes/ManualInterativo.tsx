"use client";

import "./manual.css";
import { useEffect, useMemo, useRef, useState } from "react";

export type Tarefa = { id: string; titulo: string; resumo: string; passos: string[]; dica?: string; busca?: string };
export type Pergunta = { p: string; r: string };

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Manual com busca, passo a passo e acompanhamento do que já foi lido (fica só neste navegador).
export default function ManualInterativo({ chave, tarefas, perguntas, aviso, nota }: { chave: string; tarefas: Tarefa[]; perguntas: Pergunta[]; aviso?: string; nota?: string }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const [passo, setPasso] = useState(0);
  const [vistas, setVistas] = useState<string[]>([]);
  const painel = useRef<HTMLDivElement>(null);
  const k = `manual:${chave}`;

  useEffect(() => {
    try { const v = JSON.parse(localStorage.getItem(k) || "[]"); if (Array.isArray(v)) setVistas(v.filter((x) => typeof x === "string")); } catch {}
  }, [k]);
  const marcar = (id: string) => {
    setVistas((v) => {
      if (v.includes(id)) return v;
      const n = [...v, id];
      try { localStorage.setItem(k, JSON.stringify(n)); } catch {}
      return n;
    });
  };
  const limpar = () => { setVistas([]); try { localStorage.removeItem(k); } catch {} };

  const lista = useMemo(() => {
    const t = norm(q.trim());
    if (!t) return tarefas;
    return tarefas.filter((x) => norm([x.titulo, x.resumo, x.busca ?? "", ...x.passos].join(" ")).includes(t));
  }, [q, tarefas]);
  const atual = tarefas.find((x) => x.id === sel) ?? null;
  const abrir = (id: string) => { setSel(id); setPasso(0); setTimeout(() => painel.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 30); };
  const pct = Math.round((vistas.filter((v) => tarefas.some((t) => t.id === v)).length / tarefas.length) * 100);

  return (
    <div className="mnl">
      {nota ? <p style={{ margin: 0, fontSize: 17, lineHeight: 1.55 }}>{nota}</p> : null}
      <div className="mnl-busca"><input type="search" aria-label="Buscar no manual" placeholder="Buscar: por exemplo, Pix, senha, remarcar" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="mnl-prog">
        <span>{vistas.filter((v) => tarefas.some((t) => t.id === v)).length} de {tarefas.length} tarefas vistas{vistas.length ? <> · <button type="button" onClick={limpar} style={{ background: "none", border: 0, padding: 0, font: "inherit", color: "#7A2335", textDecoration: "underline", cursor: "pointer" }}>recomeçar</button></> : null}</span>
        <div className="mnl-barra" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso do manual"><i style={{ width: `${pct}%` }} /></div>
      </div>

      {lista.length ? (
        <div className="mnl-grade" role="list">
          {lista.map((t) => (
            <button key={t.id} role="listitem" type="button" className={t.id === sel ? "mnl-tar on" : "mnl-tar"} onClick={() => abrir(t.id)} aria-pressed={t.id === sel}>
              <b>{t.titulo}{vistas.includes(t.id) ? <span className="mnl-ok">✓ visto</span> : null}</b>
              <span>{t.resumo}</span>
            </button>
          ))}
        </div>
      ) : <p className="mnl-vazio">Nada encontrado para “{q}”. Tente outra palavra ou veja as perguntas frequentes abaixo.</p>}

      {atual ? (
        <div className="mnl-pas" ref={painel} aria-live="polite">
          <span className="mnl-n">{atual.titulo} · passo {passo + 1} de {atual.passos.length}</span>
          <div className="mnl-pts" aria-hidden="true">{atual.passos.map((_, i) => <i key={i} className={i <= passo ? "f" : ""} />)}</div>
          <p className="mnl-txt" style={{ margin: 0 }}>{atual.passos[passo]}</p>
          {passo === atual.passos.length - 1 && atual.dica ? <div className="mnl-dica"><b>Dica: </b>{atual.dica}</div> : null}
          <div className="mnl-nav">
            <button type="button" className="mnl-bt s" disabled={passo === 0} onClick={() => setPasso(passo - 1)}>Anterior</button>
            {passo < atual.passos.length - 1
              ? <button type="button" className="mnl-bt" onClick={() => setPasso(passo + 1)}>Próximo</button>
              : <button type="button" className="mnl-bt" onClick={() => { marcar(atual.id); setSel(null); }}>Entendi</button>}
          </div>
          <details>
            <summary>Ver todos os passos de uma vez</summary>
            <ol className="mnl-lista" style={{ marginTop: 10 }}>{atual.passos.map((s, i) => <li key={i}>{s}</li>)}</ol>
          </details>
        </div>
      ) : null}

      {aviso ? <div className="mnl-aviso" role="note">{aviso}</div> : null}

      <h3>Perguntas frequentes</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {perguntas.map((f) => <details key={f.p}><summary>{f.p}</summary><p>{f.r}</p></details>)}
      </div>
    </div>
  );
}
