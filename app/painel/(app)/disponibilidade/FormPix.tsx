"use client";

import { useState, useTransition } from "react";
import Icone from "../../componentes/Icone";
import { salvarPix } from "./acoes";

export default function FormPix({ chave, nome, cidade }: { chave: string; nome: string; cidade: string }) {
  const [c, setC] = useState(chave);
  const [n, setN] = useState(nome);
  const [ci, setCi] = useState(cidade);
  const [aviso, setAviso] = useState<{ t: string; erro?: boolean } | null>(null);
  const [pend, iniciar] = useTransition();
  return (
    <section className="card" style={{ marginTop: 20 }}>
      <h2 className="card-t"><Icone nome="escudo" />Pagamento por Pix</h2>
      <span style={{ fontSize: 14, color: "#5A3A41" }}>Na área da paciente aparece o Pix copia e cola com o valor da sessão. Você marca como pago à mão, depois de conferir no seu banco.</span>
      {aviso ? <div className={aviso.erro ? "aviso erro" : "aviso ok"} role="status">{aviso.t}</div> : null}
      <div className="fc"><label htmlFor="pix-chave">Chave Pix</label><input id="pix-chave" value={c} onChange={(e) => setC(e.target.value)} autoComplete="off" placeholder="E-mail, CPF, telefone (+55…) ou chave aleatória" /></div>
      <div className="fc-g">
        <div className="fc"><label htmlFor="pix-nome">Nome que aparece no Pix</label><input id="pix-nome" value={n} onChange={(e) => setN(e.target.value)} maxLength={25} /></div>
        <div className="fc"><label htmlFor="pix-cidade">Cidade</label><input id="pix-cidade" value={ci} onChange={(e) => setCi(e.target.value)} maxLength={15} /></div>
      </div>
      <button type="button" className="bt" style={{ alignSelf: "flex-start", width: "auto" }} disabled={pend} onClick={() => iniciar(async () => { const r = await salvarPix({ chave: c, nome: n, cidade: ci }); setAviso(r.erro ? { t: r.erro, erro: true } : { t: r.ok || "Salvo." }); })}>{pend ? "Salvando…" : "Salvar Pix"}</button>
    </section>
  );
}
