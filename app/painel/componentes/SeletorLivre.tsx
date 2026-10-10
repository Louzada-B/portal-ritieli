"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { DiaLivre } from "../../lib/livres";

type Resposta = { ok: DiaLivre[] } | { erro: string };
type Valor = { data: string; hora: string };

const MN = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const DS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

// Escolha de dia e horário só entre os que estão realmente livres na agenda:
// um calendário do mês com os dias livres em destaque e, ao lado, as horas do dia escolhido.
// Para um caso especial, "Outro dia ou horário" abre o seletor manual (`manual`); o sistema ainda confere conflito ao salvar.
export default function SeletorLivre({ carregar, valor, onChange, manual, recarregar }: {
  carregar: () => Promise<Resposta>;
  valor: Valor;
  onChange: (v: Valor) => void;
  manual: ReactNode;
  recarregar?: string;
}) {
  const [dias, setDias] = useState<DiaLivre[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [outro, setOutro] = useState(false);
  const [cal, setCal] = useState<{ ano: number; mes: number } | null>(null);

  useEffect(() => {
    let vivo = true;
    setDias(null);
    setErro(null);
    carregar().then((r) => {
      if (!vivo) return;
      if ("erro" in r) setErro(r.erro);
      else setDias(r.ok);
    }).catch(() => { if (vivo) setErro("Não deu para carregar os horários livres."); });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recarregar]);

  const porData = useMemo(() => new Map((dias ?? []).map((d) => [d.data, d])), [dias]);
  const meses = useMemo(() => [...new Set((dias ?? []).map((d) => d.data.slice(0, 7)))], [dias]);

  // O calendário abre no mês do primeiro dia livre (ou no do dia já escolhido).
  useEffect(() => {
    if (!dias || cal) return;
    const ref = (valor.data && porData.has(valor.data) ? valor.data : dias[0]?.data) || null;
    if (ref) { const [a, m] = ref.split("-").map(Number); setCal({ ano: a, mes: m - 1 }); }
  }, [dias, cal, valor.data, porData]);

  const dia = porData.get(valor.data) ?? null;
  const chave = cal ? `${cal.ano}-${String(cal.mes + 1).padStart(2, "0")}` : "";
  const iMes = meses.indexOf(chave);
  const mover = (n: number) => {
    const alvo = meses[iMes + n];
    if (alvo) { const [a, m] = alvo.split("-").map(Number); setCal({ ano: a, mes: m - 1 }); }
  };
  const primeiro = cal ? new Date(Date.UTC(cal.ano, cal.mes, 1)).getUTCDay() : 0;
  const nDias = cal ? new Date(Date.UTC(cal.ano, cal.mes + 1, 0)).getUTCDate() : 0;
  const rotDia = (iso: string) => { const [a, m, d] = iso.split("-").map(Number); return `${DS[new Date(Date.UTC(a, m - 1, d)).getUTCDay()]}, ${d} ${MS[m - 1]}`; };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {dias === null && !erro ? <span style={{ fontSize: 13, color: "#8A7A7E" }}>Conferindo a sua agenda…</span> : null}
      {erro ? <span className="aviso erro" role="status">{erro}</span> : null}
      {dias && !dias.length ? <span style={{ fontSize: 13, color: "#8A7A7E" }}>Não há horário livre nos próximos 30 dias. Use “Outro dia ou horário”.</span> : null}

      {dias && dias.length && cal && !outro ? (
        <div className="slv">
          <div className="cal cal-in" aria-label="Dias livres">
            <div className="cal-h">
              <button type="button" aria-label="Mês anterior" onClick={() => mover(-1)} disabled={iMes <= 0}>‹</button>
              <b>{MN[cal.mes]} {cal.ano}</b>
              <button type="button" aria-label="Próximo mês" onClick={() => mover(1)} disabled={iMes < 0 || iMes >= meses.length - 1}>›</button>
            </div>
            <div className="cal-g">
              {["D", "S", "T", "Q", "Q", "S", "S"].map((w, i) => <span key={i} className="ds">{w}</span>)}
              {Array.from({ length: primeiro }, (_, i) => <span key={`v${i}`} className="cd vazio" />)}
              {Array.from({ length: nDias }, (_, i) => {
                const d = i + 1;
                const iso = `${chave}-${String(d).padStart(2, "0")}`;
                const livre = porData.has(iso);
                return <button key={d} type="button" disabled={!livre} className={["cd", livre ? "livre" : "off", valor.data === iso ? "sel" : ""].filter(Boolean).join(" ")} onClick={() => { const dd = porData.get(iso)!; onChange({ data: iso, hora: dd.horas.includes(valor.hora) ? valor.hora : dd.horas[0] }); }}>{d}</button>;
              })}
            </div>
            <span className="slv-leg"><i /> dia com horário livre</span>
          </div>
          <div className="slv-h">
            {dia ? (
              <>
                <span className="slv-t">Horários livres · {rotDia(dia.data)}</span>
                <div className="slv-hs" role="group" aria-label="Horários livres">
                  {dia.horas.map((h) => <button key={h} type="button" className={valor.hora === h ? "slv-h1 on" : "slv-h1"} onClick={() => onChange({ data: valor.data, hora: h })}>{h}</button>)}
                </div>
              </>
            ) : <span className="slv-t" style={{ fontWeight: 500 }}>Escolha um dia livre no calendário.</span>}
          </div>
        </div>
      ) : null}

      <span>
        <button type="button" className="mini2" onClick={() => setOutro(!outro)} aria-expanded={outro}>{outro ? "Voltar para os horários livres" : "Outro dia ou horário"}</button>
      </span>
      {outro ? <div style={{ display: "flex", flexDirection: "column", gap: 8 }}><span style={{ fontSize: 13, color: "#8A7A7E" }}>Fora da lista de livres. Ao salvar, o sistema ainda confere a disponibilidade e os conflitos.</span>{manual}</div> : null}
    </div>
  );
}
