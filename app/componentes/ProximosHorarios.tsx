"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { rotas } from "../conteudo";

type Horario = { rot: string; num: string; mes: string; hora: string };
type Estado = { tipo: "carregando" } | { tipo: "fechada" } | { tipo: "vazia" } | { tipo: "ok"; lista: Horario[] };

// Os três próximos dias com horário livre, lidos da agenda de verdade.
export default function ProximosHorarios() {
  const [estado, setEstado] = useState<Estado>({ tipo: "carregando" });

  useEffect(() => {
    let vivo = true;
    fetch("/api/agenda/horarios", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (!vivo) return;
        if (!j.aberta) return setEstado({ tipo: "fechada" });
        const lista: Horario[] = (j.dias ?? [])
          .slice(0, 3)
          .map((d: { rot: string; num: string; mes: string; horarios: { h: string; ocupado: boolean }[] }) => ({
            rot: d.rot,
            num: d.num,
            mes: `${d.rot}, ${d.num} ${d.mes.slice(0, 3)}`,
            hora: d.horarios.find((h) => !h.ocupado)?.h ?? "",
          }));
        setEstado(lista.length ? { tipo: "ok", lista } : { tipo: "vazia" });
      })
      .catch(() => vivo && setEstado({ tipo: "fechada" }));
    return () => {
      vivo = false;
    };
  }, []);

  if (estado.tipo === "fechada" || estado.tipo === "vazia") {
    return (
      <p className="suave" style={{ margin: "8px 0 4px" }}>
        {estado.tipo === "fechada" ? "Os horários livres aparecem aqui em breve." : "Sem horários livres nos próximos dias. Fale comigo pelo WhatsApp que a gente combina."}
      </p>
    );
  }

  return (
    <div className="hor-lista">
      {(estado.tipo === "ok" ? estado.lista : [null, null, null]).map((p, i) =>
        p ? (
          <Link key={i} href={rotas.agendar} className="hor-l">
            <span className="hor-d">
              <span className="hor-rot">{p.rot}</span>
              <span className="hor-num">{p.num}</span>
            </span>
            <span className="hor-txt">
              <span>{p.mes}</span>
              <b>{p.hora}</b>
            </span>
            <span aria-hidden="true" className="hor-s">→</span>
          </Link>
        ) : (
          <span key={i} className="hor-l vazio" aria-hidden="true" />
        ),
      )}
    </div>
  );
}
