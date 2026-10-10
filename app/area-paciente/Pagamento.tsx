"use client";

import { useState } from "react";
import PixCopia from "./PixCopia";
import { reais } from "../lib/formato";
import { linkWhatsApp } from "../conteudo";
import { pixCopiaECola } from "../lib/pix";

type Pix = { chave: string | null; nome: string; cidade: string };
type Devida = { id: string; quando: string; centavos: number; liberada: boolean };

// Cartão "Pagamento em aberto". Por padrão o Pix é do total em aberto.
// Se a Ritieli liberou sessões para pagar separado, a paciente pode escolher só essas.
export default function PagamentoAberto({ devidas, pix }: { devidas: Devida[]; pix: Pix }) {
  const liberadas = devidas.filter((d) => d.liberada);
  const [modo, setModo] = useState<"tudo" | "algumas">("tudo");
  const [marcadas, setMarcadas] = useState<string[]>([]);
  const total = devidas.reduce((a, d) => a + d.centavos, 0);
  const escolhidas = liberadas.filter((d) => marcadas.includes(d.id));
  const soma = escolhidas.reduce((a, d) => a + d.centavos, 0);
  const centavos = modo === "tudo" ? total : soma;
  const alternar = (id: string) => setMarcadas((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));

  return (
    <section className="card" aria-labelledby="pg-t">
      <div className="card-h"><h2 className="card-t" id="pg-t">Pagamento em aberto</h2><span className="pill p-av">{devidas.length} {devidas.length > 1 ? "sessões" : "sessão"}</span></div>

      {liberadas.length ? (
        <div className="pa-modo" role="group" aria-label="O que pagar">
          <button type="button" className={modo === "tudo" ? "pa-chip on" : "pa-chip"} onClick={() => setModo("tudo")}>Pagar tudo</button>
          <button type="button" className={modo === "algumas" ? "pa-chip on" : "pa-chip"} onClick={() => setModo("algumas")}>Pagar só algumas</button>
        </div>
      ) : null}

      {modo === "algumas" ? (
        <div className="pa-sel">
          <span style={{ fontSize: 14, color: "#6B5A5E" }}>A Ritieli liberou estas sessões para você pagar separado:</span>
          {liberadas.map((d) => (
            <label key={d.id} className="pa-opc"><input type="checkbox" checked={marcadas.includes(d.id)} onChange={() => alternar(d.id)} /><span>{d.quando}</span><b>{reais(d.centavos)}</b></label>
          ))}
        </div>
      ) : null}

      {centavos > 0 ? <div className="valor">{reais(centavos)}</div> : null}
      {modo === "algumas" && !escolhidas.length ? (
        <span style={{ color: "#6B5A5E", fontSize: 14 }}>Marque as sessões que vai pagar agora.</span>
      ) : (
        <>
          <span style={{ color: "#6B5A5E", fontSize: 14 }}>Pagamento por Pix. Depois que a Ritieli conferir, o pagamento aparece como pago aqui.</span>
          {pix.chave ? (
            <PixCopia key={`${modo}-${centavos}`} codigo={pixCopiaECola({ chave: pix.chave, nome: pix.nome, cidade: pix.cidade, centavos })} />
          ) : (
            <a className="bt pa-bt-p" href={linkWhatsApp("Olá, Ritieli! Pode me passar a chave Pix para eu fazer o pagamento?")} target="_blank" rel="noopener">Pedir a chave Pix à Ritieli</a>
          )}
        </>
      )}
    </section>
  );
}
