"use client";

import { useEffect, useState } from "react";
import Icone from "./Icone";

// O botão da chamada libera 10 minutos antes e fecha 90 minutos depois do início.
export default function EntrarSessao({ meet, inicio }: { meet: string | null; inicio: string }) {
  const [agora, setAgora] = useState<number | null>(null);
  useEffect(() => {
    setAgora(Date.now());
    const t = setInterval(() => setAgora(Date.now()), 20000);
    return () => clearInterval(t);
  }, []);
  const ini = new Date(inicio).getTime();
  const livre = !!meet && agora !== null && agora >= ini - 10 * 60000 && agora <= ini + 90 * 60000;
  if (!meet) return null;
  return (
    <>
      {livre ? (
        <a className="bt" href={meet} target="_blank" rel="noopener"><Icone nome="video" tam={20} />Entrar na sessão</a>
      ) : (
        <button type="button" className="bt" disabled><Icone nome="video" tam={20} />Entrar na sessão</button>
      )}
      {!livre ? <span className="dica">O botão libera 10 minutos antes do horário.</span> : null}
    </>
  );
}
