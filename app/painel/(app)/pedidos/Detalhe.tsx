"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Icone from "../../componentes/Icone";
import { confirmarPedido, recusarPedido, excluirPedido } from "./acoes";
import type { Pedido } from "../../../lib/dados";

type Props = {
  p: Pedido;
  quando: string;
  recebido: string;
  aceite: string;
  status: [string, string];
  sugestoes: { iso: string; rot: string }[];
  voltar: string;
};

const primeiro = (n: string) => n.trim().split(/\s+/)[0];
const comAs = (q: string) => q.replace(" · ", ", às ");
const fone = (w: string) => {
  const d = w.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return w;
};
const wa = (w: string, texto: string) => {
  const d = w.replace(/\D/g, "");
  return `https://wa.me/${d.startsWith("55") && d.length > 11 ? d : "55" + d}?text=${encodeURIComponent(texto)}`;
};

export default function Detalhe({ p, quando, recebido, aceite, status, sugestoes, voltar }: Props) {
  const router = useRouter();
  const [acao, setAcao] = useState<"" | "sug" | "rec" | "exc">("");
  const [sugs, setSugs] = useState<string[]>([]);
  // Sugestões: primeiro o dia, depois o horário (até 3 no total, de dias diferentes se quiser).
  const dias = sugestoes.reduce<{ dia: string; itens: { iso: string; rot: string; hora: string }[] }[]>((acc, s) => {
    const [dia, hora] = s.rot.split(" · ");
    const g = acc.find((x) => x.dia === dia);
    if (g) g.itens.push({ ...s, hora });
    else acc.push({ dia, itens: [{ ...s, hora }] });
    return acc;
  }, []);
  const [diaSel, setDiaSel] = useState(dias[0]?.dia || "");
  const [msg, setMsg] = useState<{ t: string; erro?: boolean } | null>(null);
  const [aviso, setAviso] = useState<string | undefined>();
  const [pend, iniciar] = useTransition();

  const nome = primeiro(p.nome);
  const msgOk = p.meet_link
    ? `Olá, ${nome}! Aqui é a Ritieli. Sua conversa inicial está confirmada para ${comAs(quando)}. O link da nossa chamada é ${p.meet_link} (é só abrir no horário). Até lá!`
    : `Olá, ${nome}! Aqui é a Ritieli. Sua conversa inicial está confirmada para ${comAs(quando)}. O link da nossa chamada é [cole aqui o link]. Até lá!`;
  const msgLib = `Olá, ${nome}! Aqui é a Ritieli. Peço desculpas pela demora em responder seu pedido de conversa inicial para ${comAs(quando)}. Esse horário acabou sendo liberado, mas quero muito conversar com você. Me diga um dia e horário que fiquem bons, ou escolha um novo horário no site.`;
  const rotSugs = sugestoes.filter((s) => sugs.includes(s.iso)).map((s) => comAs(s.rot));
  const msgSug = `Olá, ${nome}! Aqui é a Ritieli. Recebi seu pedido de conversa inicial para ${comAs(quando)}, mas esse horário não vai dar certo para mim. Posso te oferecer: ${rotSugs.join("; ")}. Algum desses fica bom para você?`;

  const confirmar = (novo?: string) =>
    iniciar(async () => {
      const r = await confirmarPedido(p.id, novo);
      setMsg(r.erro ? { t: r.erro, erro: true } : { t: r.ok! });
      setAviso(r.aviso);
      if (r.ok) setAcao("");
    });
  const recusar = () =>
    iniciar(async () => {
      const r = await recusarPedido(p.id);
      setMsg(r.erro ? { t: r.erro, erro: true } : { t: r.ok! });
      if (r.ok) setAcao("");
    });

  return (
    <section className="card ped-det">
      <Link href={voltar} className="bt3 voltar-m" scroll={false}><Icone nome="voltar" tam={18} /> Todos os pedidos</Link>
      <div className="det-top">
        <span className={p.para_quem === "filho" ? "av k" : "av"}>{p.nome.split(/\s+/).slice(0, 2).map((x) => x[0]?.toUpperCase()).join("")}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 24, lineHeight: 1.2, color: "#3A1F25" }}>{p.nome}</h2>
          <span style={{ fontSize: 14, color: "#8A7A7E" }}>Pedido recebido {recebido}</span>
        </div>
        <span className={status[1]}>{status[0]}</span>
      </div>

      <div className="dados">
        <div className="dado"><span className="di"><Icone nome="calendario" tam={18} /></span><span><span className="l">Horário pedido</span><b>{quando}</b></span></div>
        <div className="dado"><span className="di"><Icone nome={p.para_quem === "filho" ? "crianca" : "pessoa"} tam={18} /></span><span><span className="l">Para quem</span><b>{p.para_quem === "filho" ? `Filho ou filha, ${p.idade_crianca} anos` : "Para ela"}</b></span></div>
        <div className="dado"><span className="di"><Icone nome="telefone" tam={18} /></span><span><span className="l">WhatsApp</span><b>{fone(p.whatsapp)}</b></span></div>
        <div className="dado"><span className="di"><Icone nome="email" tam={18} /></span><span><span className="l">E-mail</span><b style={{ wordBreak: "break-all" }}>{p.email}</b></span></div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}><span className="rot">Mensagem</span><div className="msg">{p.mensagem || "Sem mensagem."}</div></div>
      <p style={{ margin: 0, display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "#6B5A5E" }}><span style={{ color: "#2F6A45" }}><Icone nome="escudo" tam={16} /></span>Aceitou a Política de Privacidade em {aceite}.</p>

      {msg ? <div className={msg.erro ? "aviso erro" : "aviso ok"} role="status">{msg.t}</div> : null}
      {aviso ? <div className="aviso" role="status">{aviso}</div> : null}

      {p.status === "aguardando" && acao === "" ? (
        <div className="acoes">
          <button type="button" className="bt" onClick={() => confirmar()} disabled={pend}><Icone nome="ok" tam={18} />{pend ? "Confirmando…" : "Confirmar horário"}</button>
          <button type="button" className="bt2" onClick={() => setAcao("sug")}>Sugerir outro horário</button>
          <button type="button" className="bt3" onClick={() => setAcao("rec")}>Recusar</button>
        </div>
      ) : null}

      {p.status === "aguardando" && acao === "sug" ? (
        <div className="caixa sug">
          <b style={{ fontSize: 16 }}>Escolha até 3 horários livres para sugerir</b>
          {!sugestoes.length ? <span style={{ fontSize: 14, color: "#6B5A5E" }}>Nenhum horário livre nos próximos dias. Ajuste a Disponibilidade.</span> : (
            <>
              <span className="rot">1. O dia</span>
              <div className="chips dias-sug" role="group" aria-label="Dia">
                {dias.map((d) => {
                  const n = d.itens.filter((i) => sugs.includes(i.iso)).length;
                  return (
                    <button key={d.dia} type="button" className={diaSel === d.dia ? "chip on" : "chip"} aria-pressed={diaSel === d.dia} onClick={() => setDiaSel(d.dia)}>
                      {d.dia}<small style={{ display: "block", fontSize: 12, fontWeight: 500, opacity: 0.8 }}>{n ? `${n} escolhido${n > 1 ? "s" : ""}` : `${d.itens.length} livre${d.itens.length > 1 ? "s" : ""}`}</small>
                    </button>
                  );
                })}
              </div>
              <span className="rot">2. O horário</span>
              <div className="chips" role="group" aria-label="Horário">
                {(dias.find((d) => d.dia === diaSel)?.itens || []).map((s) => {
                  const on = sugs.includes(s.iso);
                  const cheio = !on && sugs.length >= 3;
                  return <button key={s.iso} type="button" className={on ? "chip on" : "chip"} aria-pressed={on} disabled={cheio} style={cheio ? { opacity: 0.45 } : undefined} onClick={() => setSugs(on ? sugs.filter((x) => x !== s.iso) : [...sugs, s.iso].sort())}>{s.hora}</button>;
                })}
              </div>
              {sugs.length ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                  <span className="rot" style={{ marginRight: 4 }}>Escolhidos ({sugs.length}/3)</span>
                  {sugestoes.filter((s) => sugs.includes(s.iso)).map((s) => (
                    <button key={s.iso} type="button" className="mini2" onClick={() => setSugs(sugs.filter((x) => x !== s.iso))} aria-label={`Tirar ${s.rot}`}>{s.rot} ✕</button>
                  ))}
                </div>
              ) : null}
            </>
          )}
          {sugs.length ? <div className="prev">{msgSug}</div> : null}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <a href={sugs.length ? wa(p.whatsapp, msgSug) : undefined} aria-disabled={!sugs.length} target="_blank" rel="noopener" className="bt" style={sugs.length ? undefined : { opacity: 0.5, pointerEvents: "none" }}><Icone nome="whats" tam={18} />Enviar sugestão pelo WhatsApp</a>
            <button type="button" className="bt3" onClick={() => setAcao("")}>Cancelar</button>
          </div>
          {sugs.length === 1 ? (
            <div style={{ borderTop: "1px solid #EFE3E5", paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 14, color: "#5A3A41" }}>A pessoa respondeu que fica bom? Confirme direto nesse horário.</span>
              <button type="button" className="bt2" onClick={() => confirmar(sugs[0])} disabled={pend} style={{ alignSelf: "flex-start", width: "auto" }}>Confirmar em {sugestoes.find((s) => s.iso === sugs[0])?.rot}</button>
            </div>
          ) : null}
        </div>
      ) : null}

      {p.status === "aguardando" && acao === "rec" ? (
        <div className="caixa rec">
          <b style={{ fontSize: 16 }}>Recusar este pedido?</b>
          <span style={{ fontSize: 14, color: "#5A3A41" }}>O horário volta a ficar livre no site. Você pode avisar a pessoa e indicar outro caminho.</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <button type="button" className="bt" onClick={recusar} disabled={pend} style={{ background: "#A3322A" }}>Recusar pedido</button>
            <button type="button" className="bt3" onClick={() => setAcao("")}>Cancelar</button>
          </div>
        </div>
      ) : null}

      {p.status === "confirmado" ? (
        <div className="caixa ok">
          <b style={{ fontSize: 16, color: "#2F6A45", display: "flex", gap: 8, alignItems: "center" }}><Icone nome="ok" tam={18} />Horário confirmado e reservado na agenda</b>
          <span style={{ fontSize: 14, color: "#3A1F25" }}>Agora é só mandar a confirmação. A mensagem já está pronta:</span>
          <div className="prev">{msgOk}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}><a href={wa(p.whatsapp, msgOk)} target="_blank" rel="noopener" className="bt"><Icone nome="whats" tam={18} />Abrir no WhatsApp</a></div>
          <Link href={`/painel/pacientes?novo=1&pedido=${p.id}`} className="bt2" style={{ alignSelf: "flex-start", width: "auto" }}>Depois da conversa: cadastrar como paciente</Link>
          {p.meet_link ? (
            <span style={{ fontSize: 13, color: "#4F5B4E", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><Icone nome="video" tam={16} />Sala criada no Google Meet: <b>{p.meet_link.replace("https://", "")}</b>. O link já está na mensagem acima e fica salvo na ficha.</span>
          ) : null}
        </div>
      ) : null}

      {p.status === "recusado" ? <div className="caixa rec"><b style={{ fontSize: 16 }}>Pedido recusado.</b><span style={{ fontSize: 14, color: "#5A3A41" }}>O horário voltou a aparecer no site.</span></div> : null}

      {p.status === "liberado" ? (
        <div className="caixa rec" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <b style={{ fontSize: 16 }}>Liberado depois de 48 horas sem resposta.</b>
          <span style={{ fontSize: 14, color: "#5A3A41" }}>O horário voltou para o site. Para avisar a pessoa, a mensagem já está pronta:</span>
          <div className="prev">{msgLib}</div>
          <div><a href={wa(p.whatsapp, msgLib)} target="_blank" rel="noopener" className="bt"><Icone nome="whats" tam={18} />Abrir no WhatsApp</a></div>
        </div>
      ) : null}
      {p.status !== "aguardando" && acao !== "exc" ? (
        <button type="button" className="mini2" style={{ alignSelf: "flex-start", color: "#A3322A", borderColor: "#F2C9D1" }} onClick={() => setAcao("exc")}><Icone nome="lixo" tam={16} />Excluir pedido</button>
      ) : null}
      {acao === "exc" ? (
        <div className="caixa rec">
          <b style={{ fontSize: 16 }}>Excluir este pedido de vez?</b>
          <span style={{ fontSize: 14, color: "#5A3A41" }}>Apaga os dados do pedido. Se a conversa ainda não aconteceu, o evento sai da sua agenda. Não dá para desfazer.</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <button type="button" className="bt" disabled={pend} style={{ background: "#A3322A", width: "auto" }} onClick={() => iniciar(async () => { const r = await excluirPedido(p.id); if (r.erro) { setMsg({ t: r.erro, erro: true }); return setAcao(""); } router.push(voltar, { scroll: false }); })}>{pend ? "Excluindo…" : "Excluir pedido"}</button>
            <button type="button" className="bt3" onClick={() => setAcao("")}>Cancelar</button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
