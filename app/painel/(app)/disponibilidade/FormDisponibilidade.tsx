"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Icone from "../../componentes/Icone";
import { salvarSemana, adicionarBloqueio, removerBloqueio, ajustarGoogle, desconectarGoogle, type DiaForm } from "./acoes";
import type { Config, DiaSemana } from "../../../lib/agenda";

const NOMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const ORDEM = [1, 2, 3, 4, 5, 6, 0];
const HORAS = Array.from({ length: 17 }, (_, k) => `${String(k + 6).padStart(2, "0")}:00`);
const ANTEC = [0, 12, 24, 36, 48, 60, 72];

type Props = {
  semana: DiaSemana[];
  config: Config;
  bloqueios: { id: string; rot: string; motivo: string }[];
  previa: { dia: string; txt: string; fechado: boolean }[];
  google: { conectada: boolean; email: string; bloquear: boolean; enviar: boolean; erro: boolean; aviso: string; ocupados: string[] };
};

function Hora({ valor, mudar, rotulo }: { valor: string; mudar: (v: string) => void; rotulo: string }) {
  const opcoes = HORAS.includes(valor) ? HORAS : [...HORAS, valor].sort();
  return (
    <select className="hsel" value={valor} onChange={(e) => mudar(e.target.value)} aria-label={rotulo}>
      {opcoes.map((h) => <option key={h} value={h}>{h}</option>)}
    </select>
  );
}

export default function FormDisponibilidade({ semana, config, bloqueios, previa, google }: Props) {
  const inicial: DiaForm[] = semana.map((d) => ({
    dia_semana: d.dia_semana,
    ativo: d.ativo,
    inicio: d.inicio,
    fim: d.fim,
    pausa: !!d.pausa_inicio,
    pausa_inicio: d.pausa_inicio || "12:00",
    pausa_fim: d.pausa_fim || "13:00",
  }));
  const [dias, setDias] = useState(inicial);
  const [ant, setAnt] = useState(config.antecedencia_horas);
  const [jan, setJan] = useState(config.janela_dias);
  const [mudou, setMudou] = useState(false);
  const [aviso, setAviso] = useState<{ t: string; erro?: boolean } | null>(
    google.aviso === "ok" ? { t: "Google Agenda conectada." } : google.aviso === "erro" ? { t: "Não deu para conectar o Google Agenda. Tente de novo.", erro: true } : null,
  );
  const [pend, iniciar] = useTransition();
  const [formB, setFormB] = useState(false);
  const [b, setB] = useState({ tipo: "dia" as "dia" | "dias" | "horas", data: "", ate: "", de: "09:00", ateHora: "12:00", motivo: "" });

  const mexer = (ds: number, o: Partial<DiaForm>) => {
    setDias((lista) => lista.map((d) => (d.dia_semana === ds ? { ...d, ...o } : d)));
    setMudou(true);
  };
  const avisar = (r: { erro?: string; ok?: string }) => setAviso(r.erro ? { t: r.erro, erro: true } : r.ok ? { t: r.ok } : null);
  const salvar = () => iniciar(async () => { const r = await salvarSemana(dias, ant, jan); avisar(r); if (r.ok) setMudou(false); });
  const bloquear = () => iniciar(async () => { const r = await adicionarBloqueio(b); avisar(r); if (r.ok) { setFormB(false); setB({ ...b, data: "", ate: "", motivo: "" }); } });

  const erroDia = (d: DiaForm) => {
    const m = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
    if (m(d.fim) <= m(d.inicio)) return "O fim precisa ser depois do início.";
    if (d.pausa && (m(d.pausa_fim) <= m(d.pausa_inicio) || m(d.pausa_inicio) < m(d.inicio) || m(d.pausa_fim) > m(d.fim))) return "O intervalo precisa ficar dentro do horário escolhido.";
    return "";
  };
  const temErro = dias.some((d) => d.ativo && erroDia(d));

  return (
    <>
      {aviso ? <div className={aviso.erro ? "aviso erro" : "aviso ok"} role="status">{aviso.t}</div> : null}
      <div className="disp">
        <div style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>
          <section className="card">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <h2 className="card-t"><Icone nome="calendario" />Semana padrão</h2>
              <span style={{ fontSize: 13, color: "#8A7A7E" }}>Ligue o dia, escolha o início e o fim e, se quiser, um intervalo.</span>
            </div>
            <ul className="dias">
              {ORDEM.map((ds) => {
                const d = dias.find((x) => x.dia_semana === ds)!;
                const erro = d.ativo ? erroDia(d) : "";
                return (
                  <li key={ds} className={d.ativo ? "dl" : "dl off"}>
                    <button type="button" className={d.ativo ? "sw on" : "sw"} onClick={() => mexer(ds, { ativo: !d.ativo })} aria-pressed={d.ativo}>
                      <span className="tr" aria-hidden="true" />{NOMES[ds]}
                    </button>
                    {d.ativo ? (
                      <>
                        <span className="faixa"><span className="hl2">Das</span><Hora valor={d.inicio} mudar={(v) => mexer(ds, { inicio: v })} rotulo={`Início de ${NOMES[ds]}`} /><span className="hl2">às</span><Hora valor={d.fim} mudar={(v) => mexer(ds, { fim: v })} rotulo={`Fim de ${NOMES[ds]}`} /></span>
                        <span className="pausa">
                          <label className="pchk"><input type="checkbox" checked={d.pausa} onChange={() => mexer(ds, { pausa: !d.pausa })} />Intervalo</label>
                          {d.pausa ? (<><Hora valor={d.pausa_inicio} mudar={(v) => mexer(ds, { pausa_inicio: v })} rotulo="Início do intervalo" /><span className="hl2">às</span><Hora valor={d.pausa_fim} mudar={(v) => mexer(ds, { pausa_fim: v })} rotulo="Fim do intervalo" /></>) : null}
                        </span>
                        {erro ? <span className="err">{erro}</span> : null}
                      </>
                    ) : (
                      <span style={{ fontSize: 14, color: "#8A7A7E" }}>Sem atendimento</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="card">
            <h2 className="card-t"><Icone nome="horarios" />Regras da agenda</h2>
            <div className="regras">
              <div className="rg"><span className="l">Duração da conversa inicial</span><span className="v">{config.duracao_conversa_min} minutos</span></div>
              <div className="rg"><span className="l">Um novo horário começa a cada</span><span className="v">1 hora</span></div>
              <div className="rg"><span className="l">Antecedência mínima para pedidos</span><span className="v"><span className="step">
                <button type="button" onClick={() => { const i = ANTEC.indexOf(ant); if (i > 0) { setAnt(ANTEC[i - 1]); setMudou(true); } }} aria-label="Diminuir">−</button>
                <span>{ant} h</span>
                <button type="button" onClick={() => { const i = ANTEC.indexOf(ant); if (i < ANTEC.length - 1) { setAnt(ANTEC[i + 1]); setMudou(true); } }} aria-label="Aumentar">+</button>
              </span></span></div>
              <div className="rg"><span className="l">Mostrar horários no site para os próximos</span><span className="v"><span className="step">
                <button type="button" onClick={() => { if (jan > 7) { setJan(jan - 7); setMudou(true); } }} aria-label="Diminuir">−</button>
                <span>{jan} dias</span>
                <button type="button" onClick={() => { if (jan < 56) { setJan(jan + 7); setMudou(true); } }} aria-label="Aumentar">+</button>
              </span></span></div>
            </div>
            <p style={{ margin: "14px 0 0", fontSize: 13, color: "#8A7A7E" }}>
              A agenda do site serve só para a conversa inicial de {config.duracao_conversa_min} minutos. Pedidos que você ainda não respondeu ficam guardados e não aparecem para outras pessoas. Até o módulo de Sessões ficar pronto, mantenha as sessões semanais na sua agenda do Google: com ela conectada, esses horários somem do site.
            </p>
          </section>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>
          <section className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <h2 className="card-t"><Icone nome="google" />Google Agenda</h2>
              <span className={google.conectada ? (google.erro ? "pill p-ur" : "pill p-ok") : "pill p-ne"}>{google.conectada ? (google.erro ? "Precisa reconectar" : "Conectada") : "Desconectada"}</span>
            </div>
            {google.conectada ? (
              <>
                <span style={{ fontSize: 14, color: "#5A3A41" }}>Conectada à agenda principal{google.email ? <> de <b>{google.email}</b></> : null}.</span>
                {google.erro ? <div className="aviso erro">O Google não respondeu. Se continuar, desconecte e conecte de novo.</div> : null}
                <button type="button" className={google.enviar ? "sw on" : "sw"} aria-pressed={google.enviar} style={{ fontWeight: 600, fontSize: 15 }} onClick={() => iniciar(async () => avisar(await ajustarGoogle("enviar_eventos", !google.enviar)))}>
                  <span className="tr" aria-hidden="true" />Enviar as conversas confirmadas para a minha agenda, com o link do Meet
                </button>
                <button type="button" className={google.bloquear ? "sw on" : "sw"} aria-pressed={google.bloquear} style={{ fontWeight: 600, fontSize: 15 }} onClick={() => iniciar(async () => avisar(await ajustarGoogle("bloquear_site", !google.bloquear)))}>
                  <span className="tr" aria-hidden="true" />Bloquear no site os horários ocupados na minha agenda
                </button>
                {google.bloquear ? (
                  <div style={{ background: "#F8F3F0", borderRadius: 14, padding: "12px 14px", fontSize: 14, color: "#3A1F25", display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: 12, color: "#8A7A7E" }}>Ocupado na sua agenda nos próximos dias</span>
                    {google.ocupados.length ? google.ocupados.map((o) => <span key={o}>{o}</span>) : <span>Nada marcado.</span>}
                    <span style={{ fontSize: 12, color: "#8A7A7E" }}>No site, aparece só como horário ocupado, sem o nome do compromisso.</span>
                  </div>
                ) : null}
                <button type="button" className="bt3" style={{ alignSelf: "flex-start", fontSize: 14 }} onClick={() => iniciar(async () => avisar(await desconectarGoogle()))}>Desconectar</button>
              </>
            ) : (
              <>
                <span style={{ fontSize: 14, color: "#5A3A41" }}>Conecte sua conta do Google para as conversas confirmadas irem para a sua agenda, com o Meet, e seus compromissos bloquearem o site.</span>
                <a href="/api/google/conectar" className="bt" style={{ alignSelf: "flex-start", width: "auto" }}>Conectar Google Agenda</a>
              </>
            )}
          </section>

          <section className="card">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <h2 className="card-t"><Icone nome="calendario" />Datas bloqueadas</h2>
              {!formB ? <button type="button" className="bt2" onClick={() => setFormB(true)} style={{ minHeight: 40, padding: "8px 14px", fontSize: 14, width: "auto" }}>Bloquear</button> : null}
            </div>
            {formB ? (
              <div className="form-c" style={{ marginTop: 16 }}>
                <div className="seg" role="group" aria-label="Período">
                  {([["dia", "Dia inteiro"], ["dias", "Vários dias"], ["horas", "Algumas horas"]] as const).map(([k, n]) => (
                    <button key={k} type="button" className={b.tipo === k ? "on" : ""} onClick={() => setB({ ...b, tipo: k })} aria-pressed={b.tipo === k}>{n}</button>
                  ))}
                </div>
                <div className="fc-g">
                  <div className="fc"><label htmlFor="b-data">{b.tipo === "dias" ? "De" : "Data"}</label><input id="b-data" type="date" value={b.data} onChange={(e) => setB({ ...b, data: e.target.value })} /></div>
                  {b.tipo === "dias" ? <div className="fc"><label htmlFor="b-ate">Até</label><input id="b-ate" type="date" value={b.ate} onChange={(e) => setB({ ...b, ate: e.target.value })} /></div> : null}
                  {b.tipo === "horas" ? (
                    <div className="fc"><span className="lb">Horário</span><span className="faixa"><Hora valor={b.de} mudar={(v) => setB({ ...b, de: v })} rotulo="Das" /><span className="hl2">às</span><Hora valor={b.ateHora} mudar={(v) => setB({ ...b, ateHora: v })} rotulo="Até" /></span></div>
                  ) : null}
                  <div className="fc i"><label htmlFor="b-mot">Motivo (só você vê)</label><input id="b-mot" type="text" maxLength={200} placeholder="Ex.: consulta médica" value={b.motivo} onChange={(e) => setB({ ...b, motivo: e.target.value })} /></div>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button type="button" className="bt" onClick={bloquear} disabled={pend} style={{ width: "auto" }}>Bloquear</button>
                  <button type="button" className="bt3" onClick={() => setFormB(false)}>Cancelar</button>
                </div>
              </div>
            ) : null}
            <ul className="bloq">
              {bloqueios.map((x) => (
                <li key={x.id}>
                  <span className="bi"><Icone nome="calendario" tam={18} /></span>
                  <span><b>{x.rot}</b>{x.motivo ? <span className="d">{x.motivo}</span> : null}</span>
                  <button type="button" className="rm" aria-label="Remover bloqueio" onClick={() => iniciar(async () => avisar(await removerBloqueio(x.id)))}><Icone nome="lixo" tam={18} /></button>
                </li>
              ))}
              {!bloqueios.length ? <li style={{ justifyContent: "center", color: "#8A7A7E", fontSize: 14 }}>Nenhuma data bloqueada.</li> : null}
            </ul>
          </section>

          <section className="card">
            <h2 className="card-t"><Icone nome="site" />Como aparece no site</h2>
            <ul className="site-prev">
              {previa.map((v) => <li key={v.dia} className={v.fechado ? "fech" : ""}><span style={{ fontWeight: 600 }}>{v.dia}</span><span>{v.txt}</span></li>)}
            </ul>
            {mudou ? <p style={{ margin: "10px 0 0", fontSize: 13, color: "#8A7A7E" }}>A prévia atualiza depois de salvar.</p> : null}
            <Link href="/agendar" target="_blank" className="bt3" style={{ marginTop: 8, fontSize: 14, color: "#7A2335" }}>Abrir a agenda do site</Link>
          </section>
        </div>
      </div>
      {mudou ? (
        <div className="salvar">
          <span style={{ fontSize: 15 }}>{temErro ? "Corrija os horários marcados em vermelho." : "Você tem alterações não salvas."}</span>
          <button type="button" className="bt" onClick={salvar} disabled={pend || temErro}>{pend ? "Salvando…" : "Salvar alterações"}</button>
        </div>
      ) : null}
    </>
  );
}
