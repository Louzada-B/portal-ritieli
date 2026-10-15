import { supabaseServidor } from "../../../lib/supabase/servidor";
import { TopoCelular } from "../../componentes/Navegacao";
import { siteUrl } from "../../../site";
import { AFIRMACOES, ESCALA } from "../../../lib/avaliacao";
import GeradorQR from "./GeradorQR";

export const dynamic = "force-dynamic";

type Linha = { id: number; palestra: string; nota: number; clareza: number; duracao: number; mais_util: string | null; melhorar: string | null; criado_em: string };

const dia = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)).replace(".", "");
const pct = (n: number, t: number) => (t ? Math.round((n / t) * 100) : 0);

function Barras({ itens, total }: { itens: [string, number][]; total: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {itens.map(([rot, n]) => (
        <div key={rot} style={{ display: "grid", gridTemplateColumns: "minmax(110px,170px) 1fr 64px", gap: 10, alignItems: "center", fontSize: 14 }}>
          <span style={{ color: "#5A3A41" }}>{rot}</span>
          <span style={{ height: 10, borderRadius: 99, background: "#F6E5E7", overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: `${pct(n, total)}%`, background: "#7A2335", borderRadius: 99 }} /></span>
          <span style={{ textAlign: "right", color: "#3A1F25", fontWeight: 700 }}>{n} · {pct(n, total)}%</span>
        </div>
      ))}
    </div>
  );
}

export default async function Avaliacoes({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const q = await searchParams;
  const sb = await supabaseServidor();
  const { data } = await sb.from("avaliacoes_palestra").select("*").order("criado_em", { ascending: false }).limit(2000);
  const todas = (data ?? []) as Linha[];
  const palestras = [...new Set(todas.map((l) => l.palestra))];
  const sel = q.p && /^[a-z0-9-]{1,60}$/.test(q.p) ? q.p : palestras[0] ?? "palestra";
  const l = todas.filter((x) => x.palestra === sel);
  const total = l.length;
  const media = (c: "nota" | "clareza" | "duracao") => (total ? (l.reduce((s, x) => s + x[c], 0) / total).toFixed(1).replace(".", ",") : "–");
  const util = l.filter((x) => x.mais_util);
  const melhorar = l.filter((x) => x.melhorar);

  return (
    <>
      <header className="topo"><div><h1>Avaliações das <em>palestras.</em></h1><div className="data">Respostas anônimas do formulário do QR code</div></div></header>
      <TopoCelular titulo="Avaliações" sub="Palestras" pedidos={0} />
      <main className="conteudo">
        {palestras.length > 1 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {palestras.map((p) => <a key={p} href={`/painel/avaliacoes?p=${p}`} className={p === sel ? "bt" : "bt2"} style={{ width: "auto", minHeight: 40, padding: "8px 16px", fontSize: 14 }}>{p}</a>)}
          </div>
        ) : null}

        <GeradorQR key={sel} base={`${siteUrl}/avaliacao`} inicial={sel} />

        {!total ? (
          <section className="card"><p style={{ margin: 0, color: "#5A3A41" }}>Ainda não há respostas.</p></section>
        ) : (
          <>
            <section className="card" style={{ display: "flex", flexWrap: "wrap", gap: 28 }}>
              <div><div style={{ fontSize: 13, color: "#8A7A7E" }}>Respostas</div><div style={{ fontSize: 40, fontWeight: 700, color: "#3A1F25" }}>{total}</div></div>
              {AFIRMACOES.map((a) => (
                <div key={a.campo} style={{ maxWidth: 220 }}><div style={{ fontSize: 13, color: "#8A7A7E" }}>{a.texto}</div><div style={{ fontSize: 32, fontWeight: 700, color: "#7A2335" }}>{media(a.campo)}<span style={{ fontSize: 16, color: "#8A7A7E" }}> / 5</span></div></div>
              ))}
            </section>
            <span style={{ fontSize: 13, color: "#8A7A7E", marginTop: -8 }}>Média da escala: 1 = discordo totalmente, 5 = concordo totalmente.</span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 20 }}>
              {AFIRMACOES.map((a) => (
                <section key={a.campo} className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <h2 className="card-t">{a.texto}</h2>
                  <Barras total={total} itens={ESCALA.map((rot, k) => [rot, l.filter((x) => x[a.campo] === k + 1).length] as [string, number]).reverse()} />
                </section>
              ))}
            </div>
            {[["O que levaram de mais útil", util, "mais_util"], ["O que poderia ser melhor", melhorar, "melhorar"]].map(([titulo, lista, campo]) => (
              <section key={titulo as string} className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <h2 className="card-t">{titulo as string} <span style={{ fontWeight: 500, color: "#8A7A7E", fontSize: 14 }}>({(lista as Linha[]).length})</span></h2>
                {(lista as Linha[]).length ? (lista as Linha[]).map((x) => (
                  <div key={x.id} style={{ borderTop: "1px solid #EFE2E4", paddingTop: 10 }}>
                    <p style={{ margin: 0, color: "#3A1F25", lineHeight: 1.5 }}>{x[campo as "mais_util" | "melhorar"]}</p>
                    <span style={{ fontSize: 12, color: "#8A7A7E" }}>Nota {x.nota} · {dia(x.criado_em)}</span>
                  </div>
                )) : <p style={{ margin: 0, color: "#8A7A7E" }}>Nenhum comentário.</p>}
              </section>
            ))}
          </>
        )}
      </main>
    </>
  );
}
