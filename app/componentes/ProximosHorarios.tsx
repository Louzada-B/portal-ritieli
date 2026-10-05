"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { agendaExemplo, rotas } from "../conteudo";

type Horario = { rot: string; num: string; mes: string; hora: string };

const NOMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

// Por enquanto calcula os próximos dias de atendimento com horários de exemplo.
// Quando a agenda estiver ligada ao Google Agenda, os horários virão de lá.
function proximos(): Horario[] {
  const lista: Horario[] = [];
  const d = new Date();
  while (lista.length < 3) {
    d.setDate(d.getDate() + 1);
    if (agendaExemplo.diasDaSemana.includes(d.getDay())) {
      const rot = NOMES[d.getDay()];
      const num = String(d.getDate());
      lista.push({ rot, num, mes: `${rot}, ${num} ${MESES[d.getMonth()]}`, hora: agendaExemplo.horarios[lista.length] });
    }
  }
  return lista;
}

export default function ProximosHorarios() {
  const [lista, setLista] = useState<Horario[] | null>(null);
  useEffect(() => setLista(proximos()), []);

  return (
    <div className="hor-lista">
      {(lista ?? [null, null, null]).map((p, i) =>
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
        )
      )}
    </div>
  );
}
