"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Forma } from "../../componentes/Formas";
import { enviarFicha, type DadosFicha } from "../acoes";

const Ic = ({ d }: { d: React.ReactNode }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);
const CADEADO = (<><rect x="5" y="10.5" width="14" height="10" rx="2" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /></>);
const ESCUDO = (<><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /><path d="M9 12l2 2 4-4" /></>);
const LIXO = <path d="M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />;

const fone = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
};
const cpf = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
};
const data = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return d.replace(/(\d{2})(\d)/, "$1/$2").replace(/(\d{2})(\d)/, "$1/$2");
};

type Props = {
  token: string;
  estado: "ok" | "expirado" | "usado" | "invalido";
  tipo: "adulta" | "crianca";
  nomeCrianca: string;
  resp: { nome: string; whatsapp: string; email: string; parentesco: string };
  adulta: { nome: string; whatsapp: string; email: string };
  whats: string;
};

export default function FormFicha({ token, estado, tipo, nomeCrianca, resp, adulta, whats }: Props) {
  const filho = tipo === "crianca";
  const base = filho ? resp : { ...adulta, parentesco: "" };
  const [d, setD] = useState<DadosFicha>({
    aceite: false,
    nome: base.nome,
    parentesco: base.parentesco,
    cpf: "",
    nascimento: "",
    whatsapp: fone(base.whatsapp),
    email: base.email,
    cidade: "",
    cNome: nomeCrianca,
    cNascimento: "",
    escola: "",
    eNome: "",
    eTelefone: "",
  });
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState("");
  const [pend, iniciar] = useTransition();
  const set = (o: Partial<DadosFicha>) => setD({ ...d, ...o });

  const enviar = () =>
    iniciar(async () => {
      setErro("");
      const r = await enviarFicha(token, d);
      if (r.erro) return setErro(r.erro);
      setEnviado(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

  return (
    <section className="rosado" style={{ position: "relative", overflow: "hidden" }}>
      <Forma cor="#EFCBD2" style={{ position: "absolute", width: 480, height: 480, right: -160, top: -140 }} />
      <div className="wrap ag-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 24, minWidth: 0 }}>
          <h1 className="ag-h1">Sua ficha de <em>cadastro.</em></h1>
          <p style={{ margin: 0, color: "#5A3A41", fontSize: 18, maxWidth: 460 }}>Preencha seus dados para organizarmos o início do acompanhamento. Leva uns 3 minutos.</p>
          <ul className="ag-itens">
            <li><span className="ag-ic"><Ic d={CADEADO} /></span>Dados guardados com criptografia</li>
            <li><span className="ag-ic"><Ic d={ESCUDO} /></span>Só a Ritieli tem acesso</li>
            <li><span className="ag-ic"><Ic d={LIXO} /></span>Você pode pedir a exclusão quando quiser</li>
          </ul>
          <p className="ag-crise ag-side-extra">Este link é pessoal e vale por 7 dias. Se tiver qualquer dúvida, é só responder a mensagem no WhatsApp.</p>
        </div>

        <div className="ag-card">
          <ol className="ag-passos" aria-label="Etapas">
            <li className={enviado ? "feito" : "atual"}><span className="n">{enviado ? "✓" : "1"}</span>Seus dados</li>
            <li className={enviado ? "atual" : ""}><span className="n">2</span>Pronto</li>
          </ol>

          {estado !== "ok" && !enviado ? (
            <div className="ag-corpo">
              <h2 className="ag-t">{estado === "usado" ? "Esta ficha já foi enviada." : estado === "expirado" ? "Este link expirou." : "Link não encontrado."}</h2>
              <p style={{ margin: 0, color: "#5A3A41" }}>{estado === "usado" ? "Seus dados já chegaram para a Ritieli. Se precisar corrigir algo, é só falar com ela." : "Os links da ficha valem por 7 dias. Peça um novo para a Ritieli pelo WhatsApp."}</p>
              <div className="ag-rodape"><a className="ag-ir" href={whats} target="_blank" rel="noopener">Falar pelo WhatsApp</a></div>
            </div>
          ) : enviado ? (
            <div className="ag-corpo ok-final">
              <span className="sel"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></span>
              <h2 className="ag-t">Dados recebidos. Obrigada!</h2>
              <p style={{ margin: 0, color: "#5A3A41", maxWidth: 420 }}>Em seguida você recebe, pelo WhatsApp, o termo de consentimento já com os seus dados, para ler com calma e aceitar.</p>
              <Link href="/" className="ag-ir" style={{ margin: "8px auto 0" }}>Ir para o site</Link>
            </div>
          ) : (
            <form className="ag-corpo" onSubmit={(e) => { e.preventDefault(); enviar(); }}>
              {filho ? (
                <div className="grupo">
                  <span className="grupo-t">Dados da criança ou do adolescente</span>
                  <div className="ag-campos">
                    <div className="ag-campo inteiro"><label htmlFor="c-nome">Nome completo</label><input id="c-nome" type="text" placeholder="Nome completo" value={d.cNome} onChange={(e) => set({ cNome: e.target.value })} required /></div>
                    <div className="ag-campo"><label htmlFor="c-nasc">Data de nascimento</label><input id="c-nasc" type="text" inputMode="numeric" placeholder="dd/mm/aaaa" value={d.cNascimento} onChange={(e) => set({ cNascimento: data(e.target.value) })} required /></div>
                    <div className="ag-campo"><label htmlFor="c-esc">Escola e ano <span className="op">(opcional)</span></label><input id="c-esc" type="text" placeholder="Ex.: 2º ano" value={d.escola} onChange={(e) => set({ escola: e.target.value })} /></div>
                  </div>
                </div>
              ) : null}
              <div className="grupo">
                <span className="grupo-t">{filho ? "Dados do responsável" : "Seus dados"}</span>
                <div className="ag-campos">
                  <div className="ag-campo inteiro"><label htmlFor="d-nome">Nome completo</label><input id="d-nome" type="text" autoComplete="name" placeholder="Como no documento" value={d.nome} onChange={(e) => set({ nome: e.target.value })} required /></div>
                  {filho ? <div className="ag-campo"><label htmlFor="d-par">Parentesco</label><input id="d-par" type="text" placeholder="Ex.: mãe, pai, avó" value={d.parentesco} onChange={(e) => set({ parentesco: e.target.value })} /></div> : null}
                  <div className="ag-campo"><label htmlFor="d-cpf">CPF</label><input id="d-cpf" type="text" inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" value={d.cpf} onChange={(e) => set({ cpf: cpf(e.target.value) })} required /></div>
                  {!filho ? <div className="ag-campo"><label htmlFor="d-nasc">Data de nascimento</label><input id="d-nasc" type="text" inputMode="numeric" placeholder="dd/mm/aaaa" value={d.nascimento} onChange={(e) => set({ nascimento: data(e.target.value) })} required /></div> : null}
                  <div className="ag-campo"><label htmlFor="d-wa">WhatsApp</label><input id="d-wa" type="tel" autoComplete="tel" placeholder="(51) 90000-0000" value={d.whatsapp} onChange={(e) => set({ whatsapp: fone(e.target.value) })} required /></div>
                  <div className="ag-campo"><label htmlFor="d-mail">E-mail</label><input id="d-mail" type="email" autoComplete="email" placeholder="voce@email.com" value={d.email} onChange={(e) => set({ email: e.target.value })} required /></div>
                  <div className="ag-campo"><label htmlFor="d-cid">Cidade e estado</label><input id="d-cid" type="text" placeholder="Ex.: Porto Alegre/RS" value={d.cidade} onChange={(e) => set({ cidade: e.target.value })} /></div>
                </div>
                <span style={{ fontSize: 13, color: "#8A7A7E" }}>O CPF é usado no recibo do Receita Saúde e no termo. Ele aparece mascarado no painel da Ritieli.</span>
              </div>
              <div className="grupo">
                <span className="grupo-t">Contato de emergência</span>
                <div className="ag-campos">
                  <div className="ag-campo"><label htmlFor="e-nome">Nome e relação</label><input id="e-nome" type="text" placeholder="Ex.: Ana, irmã" value={d.eNome} onChange={(e) => set({ eNome: e.target.value })} required /></div>
                  <div className="ag-campo"><label htmlFor="e-tel">Telefone</label><input id="e-tel" type="tel" placeholder="(51) 90000-0000" value={d.eTelefone} onChange={(e) => set({ eTelefone: fone(e.target.value) })} required /></div>
                </div>
                <span style={{ fontSize: 13, color: "#8A7A7E" }}>Usado só em situação de risco.</span>
              </div>
              <label className="ag-check"><input type="checkbox" checked={d.aceite} onChange={() => set({ aceite: !d.aceite })} /><span>Autorizo o uso dos meus dados para o atendimento, conforme a <Link href="/privacidade" target="_blank">Política de Privacidade</Link>.</span></label>
              {erro ? <div className="ag-erro" role="alert">{erro}</div> : null}
              <div className="ag-rodape"><button type="submit" className="ag-ir" disabled={!d.aceite || pend}>{pend ? "Enviando…" : <>Enviar dados <span aria-hidden="true">→</span></>}</button></div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
