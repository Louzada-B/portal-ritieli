"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { DiaLivre } from "../../lib/livres";

type Resposta = { ok: DiaLivre[] } | { erro: string };
type Valor = { data: string; hora: string };

// Escolha de dia e horário só entre os que estão realmente livres na agenda.
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

  const dia = dias?.find((d) => d.data === valor.data) ?? null;
  const estilo = (on: boolean): React.CSSProperties => ({ font: "inherit", fontSize: 14, fontWeight: 600, padding: "7px 13px", borderRadius: 999, cursor: "pointer", border: `1.5px solid ${on ? "#7A2335" : "#E2CCD0"}`, background: on ? "#7A2335" : "#FFFFFF", color: on ? "#FFFFFF" : "#3A1F25", whiteSpace: "nowrap" });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {dias === null && !erro ? <span style={{ fontSize: 13, color: "#8A7A7E" }}>Conferindo a sua agenda…</span> : null}
      {erro ? <span className="aviso erro" role="status">{erro}</span> : null}
      {dias && !dias.length ? <span style={{ fontSize: 13, color: "#8A7A7E" }}>Não há horário livre nos próximos 30 dias. Use “Outro dia ou horário”.</span> : null}
      {dias && dias.length ? (
        <>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#5A3A41" }}>Dias livres</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {dias.map((d) => <button key={d.data} type="button" style={estilo(valor.data === d.data && !outro)} onClick={() => { setOutro(false); onChange({ data: d.data, hora: d.horas.includes(valor.hora) ? valor.hora : d.horas[0] }); }}>{d.rot}</button>)}
          </div>
          {dia && !outro ? (
            <>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#5A3A41" }}>Horários</span>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {dia.horas.map((h) => <button key={h} type="button" style={estilo(valor.hora === h)} onClick={() => onChange({ data: valor.data, hora: h })}>{h}</button>)}
              </div>
            </>
          ) : null}
        </>
      ) : null}
      <span>
        <button type="button" className="mini2" onClick={() => setOutro(!outro)} aria-expanded={outro}>{outro ? "Voltar para os horários livres" : "Outro dia ou horário"}</button>
      </span>
      {outro ? <div style={{ display: "flex", flexDirection: "column", gap: 8 }}><span style={{ fontSize: 13, color: "#8A7A7E" }}>Fora da lista de livres. Ao salvar, o sistema ainda confere a disponibilidade e os conflitos.</span>{manual}</div> : null}
    </div>
  );
}
