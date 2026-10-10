"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import Icone from "../../componentes/Icone";
import { cpfMascarado, fone, reais, iniciais, fixoTexto, waLink, DIAS_PLURAL } from "../../../lib/formato";
import { criarPaciente, atualizarPaciente, linkFicha, marcarEnviado, verCpf, verPessoais, salvarPessoais, salvarCpf, adicionarResponsavel, definirFinanceiro, gerarSala, encerrarPaciente, reativarPaciente, excluirPaciente, acertarAgenda, liberarPagamento, type DadosNovo } from "./acoes";
import { criarAcesso, reenviarSenha, alternarAcesso } from "./acessoAcoes";
import type { AcessoInfo } from "../../../lib/pacienteAcesso";
import { listarLivresFixo } from "../livres";
import type { OpcaoFixa } from "../../../lib/livres";

type Item = {
  id: string; tipo: "adulta" | "crianca"; nome: string; idade: number | null; whatsapp: string | null; email: string | null;
  cpfFinal: string | null; temNascimento: boolean; temEmergencia: boolean; valor: number | null; tipoValor: "normal" | "social";
  fixoDia: number | null; fixoHora: string | null; meet: string | null; status: "ativo" | "encerrado"; desde: string; fim: string | null; fichaEm: string | null;
  escola: string | null; cidade: string | null; lembretes: boolean;
  selo?: { t: string; cls: string } | null;
  cad: { ficha: string; termo: string; fichaTxt: string; termoTxt: string; etiqueta: string; cls: string; pendente: boolean };
};
type LinhaSessao = { id: string; quando: string; status: "agendada" | "realizada" | "falta" | "cancelada"; pago: boolean; recibo: boolean };
type ResumoSessoes = { realizadas: number; faltas: number; proximas: number; pagasFrente: number; pagasFrenteAte: string | null; devendo: number; devendoValor: number; credito: number; creditoValor: number; recibos: number };
type FichaAba = "dados" | "ficha" | "sessoes" | "acesso" | "situacao";
const FICHA_ABAS: [FichaAba, string][] = [["dados", "Dados"], ["ficha", "Ficha e termo"], ["sessoes", "Sessões e pagamentos"], ["acesso", "Sala e acesso"], ["situacao", "Situação"]];
type Detalhe = {
  acessos: AcessoInfo[];
  responsaveis: { id: string; nome: string; whatsapp: string | null; email: string | null; cpfFinal: string | null; parentesco: string | null; financeiro: boolean }[];
  ficha: { criado_em: string; expira_em: string; preenchida_em: string | null } | null;
  termo: { id: string; resumo: string; status: string; enviado_em: string; aceito_em: string | null } | null;
  temProntuario?: boolean;
  guarda?: { motivo: "encerrar" | "prazo"; ate: string | null } | null;
  sessoes?: { abertas: { id: string; quando: string; valor: number | null; liberada: boolean }[]; resumo: ResumoSessoes; ultimas: LinhaSessao[]; proximas: LinhaSessao[] };
} | null;
type PedidoBase = { id: string; nome: string; whatsapp: string; email: string; para_quem: "mim" | "filho"; idade_crianca: number | null } | null;

const dataBR = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "numeric", month: "long", year: "numeric" }).format(new Date(iso.length === 10 ? iso + "T12:00:00Z" : iso));
const mesAno = (iso: string) => new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "America/Sao_Paulo" }).format(new Date(iso + "T12:00:00Z"));

function BlocoAcesso({ quem, email, acesso, pend, criar, reenviar, alternar }: {
  quem: string; email: string | null; acesso?: AcessoInfo; pend: boolean;
  criar: () => void; reenviar: (id: string) => void; alternar: (id: string, ativo: boolean) => void;
}) {
  const estado = !acesso ? null : !acesso.ativo ? { t: "Desativado", c: "pill p-ur" } : acesso.senhaPropria ? { t: "Ativo", c: "pill p-ok" } : { t: "Aguardando o primeiro acesso", c: "pill p-av" };
  return (
    <div className="resp">
      <span style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <b style={{ fontSize: 15 }}>{quem}</b>
        {estado ? <span className={estado.c}>{estado.t}</span> : <span className="pill p-in">Sem acesso</span>}
      </span>
      <span style={{ fontSize: 14, color: "#5A3A41" }}>
        {acesso ? `Login: ${acesso.email}` : email ? `E-mail: ${email}` : "Sem e-mail no cadastro. Complete em Editar dados."}
        {acesso?.ultimoAcesso ? ` · Último acesso: ${dataBR(acesso.ultimoAcesso)}` : acesso ? " · Ainda não entrou" : ""}
        {acesso?.provisoriaVale ? " · Senha provisória válida" : ""}
      </span>
      <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {!acesso ? (
          <button type="button" className="mini2" disabled={pend || !email} onClick={criar}>Criar acesso e enviar senha</button>
        ) : (
          <>
            {acesso.ativo ? <button type="button" className="mini2" disabled={pend} onClick={() => reenviar(acesso.id)}>Reenviar senha provisória</button> : null}
            <button type="button" className="mini2" disabled={pend} onClick={() => alternar(acesso.id, !acesso.ativo)}>{acesso.ativo ? "Desativar" : "Reativar"}</button>
          </>
        )}
      </span>
    </div>
  );
}

function Aviso({ m }: { m: { t: string; erro?: boolean } | null }) {
  return m ? <div className={m.erro ? "aviso erro" : "aviso ok"} role="status">{m.t}</div> : null;
}

const hojeBR = () => new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10);
const diaBR = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" }).format(new Date(iso + "T12:00:00Z")).replace(/\./g, "");
const diasAte = (iso: string) => Math.round((new Date(iso + "T12:00:00Z").getTime() - new Date(hojeBR() + "T12:00:00Z").getTime()) / 86400000);

function CamposPeriodo({ desde, fim, setDesde, setFim }: { desde: string; fim: string; setDesde: (v: string) => void; setFim: (v: string) => void }) {
  return (
    <>
      <div className="fc-g">
        <div className="fc"><label htmlFor="pe-ini">Início do acompanhamento</label><input id="pe-ini" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} /></div>
        <div className="fc"><label htmlFor="pe-fim">Fim previsto <span style={{ fontWeight: 500, color: "#8A7A7E" }}>(opcional)</span></label><input id="pe-fim" type="date" value={fim} min={desde} onChange={(e) => setFim(e.target.value)} /></div>
      </div>
      <span style={{ fontSize: 13, color: "#6B5A5E", marginTop: -6 }}>O horário fixo fica reservado na agenda só entre essas datas. Sem fim previsto, segue até você encerrar.</span>
    </>
  );
}

function CamposFixo({ dia, hora, setDia, setHora, pacienteId }: { dia: string; hora: string; setDia: (v: string) => void; setHora: (v: string) => void; pacienteId?: string }) {
  const [opcoes, setOpcoes] = useState<OpcaoFixa[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [outro, setOutro] = useState(false);
  useEffect(() => {
    let vivo = true;
    listarLivresFixo(pacienteId).then((r) => { if (!vivo) return; if ("erro" in r) setErro(r.erro); else setOpcoes(r.ok); }).catch(() => { if (vivo) setErro("Não deu para carregar os horários livres."); });
    return () => { vivo = false; };
  }, [pacienteId]);
  const atual = opcoes?.find((o) => String(o.dia) === dia) ?? null;
  const manual = (
    <div className="fc-g">
      <div className="fc"><label htmlFor="fx-dia">Dia fixo</label>
        <select id="fx-dia" value={dia} onChange={(e) => setDia(e.target.value)}>
          <option value="">A definir</option>
          {DIAS_PLURAL.map((d, i) => <option key={d} value={String(i)}>{d}</option>)}
        </select>
      </div>
      <div className="fc"><label htmlFor="fx-hora">Horário</label><input id="fx-hora" type="time" step={900} value={hora} onChange={(e) => setHora(e.target.value)} /></div>
    </div>
  );
  if (outro || erro || (opcoes && (!opcoes.length || (dia && !atual)))) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {erro ? <span className="aviso erro" role="status">{erro}</span> : <span style={{ fontSize: 13, color: "#8A7A7E" }}>{opcoes && !opcoes.length ? "Nenhum horário fixo livre em todas as próximas semanas." : opcoes && dia && !atual && !outro ? "O horário fixo atual não está livre em todas as próximas semanas (há algo marcado em alguma delas). Escolha outro ou ajuste a agenda." : "Fora da lista de livres. Ao salvar, o painel ainda confere a disponibilidade e os conflitos."}</span>}
        {manual}
        {opcoes && opcoes.length ? <span><button type="button" className="mini2" onClick={() => { setOutro(false); if (dia && !atual) { setDia(""); setHora(""); } }}>Voltar para os horários livres</button></span> : null}
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div className="fc-g">
        <div className="fc"><label htmlFor="fx-dia">Dia fixo</label>
          <select id="fx-dia" value={dia} disabled={!opcoes} onChange={(e) => { const v = e.target.value; setDia(v); const o = opcoes?.find((x) => String(x.dia) === v); if (!v) setHora(""); else if (o && !o.horas.includes(hora)) setHora(o.horas[0]); }}>
            <option value="">{opcoes ? "A definir" : "Conferindo a agenda…"}</option>
            {(opcoes ?? []).map((o) => <option key={o.dia} value={String(o.dia)}>{DIAS_PLURAL[o.dia]}</option>)}
          </select>
        </div>
        <div className="fc"><label htmlFor="fx-hora">Horário</label>
          <select id="fx-hora" value={hora} disabled={!atual} onChange={(e) => setHora(e.target.value)}>
            {atual ? atual.horas.map((h) => <option key={h} value={h}>{h}</option>) : <option value="">—</option>}
          </select>
        </div>
      </div>
      <span style={{ fontSize: 13, color: "#8A7A7E" }}>Só aparecem dias e horários livres em todas as próximas 12 semanas. <button type="button" className="mini2" style={{ marginLeft: 4 }} onClick={() => setOutro(true)}>Outro dia ou horário</button></span>
    </div>
  );
}

function NovoPaciente({ pedido, aoFechar }: { pedido: PedidoBase; aoFechar: () => void }) {
  const router = useRouter();
  const [pend, iniciar] = useTransition();
  const [msg, setMsg] = useState<{ t: string; erro?: boolean } | null>(null);
  const filho = pedido?.para_quem === "filho";
  const [d, setD] = useState<DadosNovo>({
    tipo: filho ? "crianca" : "adulta",
    nome: filho ? "" : pedido?.nome || "",
    idade: filho && pedido?.idade_crianca ? String(pedido.idade_crianca) : "",
    whatsapp: !filho ? fone(pedido?.whatsapp) : "",
    email: !filho ? pedido?.email || "" : "",
    cpf: "",
    rNome: filho ? pedido?.nome || "" : "",
    rParentesco: "",
    rWhatsapp: filho ? fone(pedido?.whatsapp) : "",
    rEmail: filho ? pedido?.email || "" : "",
    rCpf: "",
    valor: "",
    tipoValor: "normal",
    fixoDia: "",
    fixoHora: "",
    desde: hojeBR(),
    fim: "",
    pedidoId: pedido?.id,
  });
  const set = (o: Partial<DadosNovo>) => setD({ ...d, ...o });
  const salvar = () =>
    iniciar(async () => {
      const r = await criarPaciente(d);
      if (r.erro) return setMsg({ t: r.erro, erro: true });
      router.push(`/painel/pacientes?id=${r.id}`);
    });
  const inf = d.tipo === "crianca";

  return (
    <section className="card">
      <div className="form-c" style={{ background: "transparent", padding: 0 }}>
        <h2 className="card-t"><Icone nome="pacientes" />Novo paciente</h2>
        {pedido ? <div className="aviso ok">Dados trazidos do pedido de {pedido.nome}. Confira e complete.</div> : null}
        <div className="fc"><span className="lb">Atendimento</span><div className="seg">
          <button type="button" className={!inf ? "on" : ""} onClick={() => set({ tipo: "adulta" })}>Adulta · online</button>
          <button type="button" className={inf ? "on" : ""} onClick={() => set({ tipo: "crianca" })}>Criança ou adolescente</button>
        </div></div>
        <div className="fc-g">
          <div className="fc"><label htmlFor="n-nome">Nome do paciente</label><input id="n-nome" type="text" placeholder="Nome completo" value={d.nome} onChange={(e) => set({ nome: e.target.value })} /></div>
          {inf ? (
            <div className="fc"><label htmlFor="n-idade">Idade</label><input id="n-idade" type="text" inputMode="numeric" placeholder="Ex.: 7" value={d.idade} onChange={(e) => set({ idade: e.target.value })} /></div>
          ) : (
            <div className="fc"><label htmlFor="n-wa">WhatsApp</label><input id="n-wa" type="tel" placeholder="(51) 90000-0000" value={d.whatsapp} onChange={(e) => set({ whatsapp: fone(e.target.value) })} /></div>
          )}
        </div>
        {!inf ? (
          <div className="fc-g">
            <div className="fc"><label htmlFor="n-mail">E-mail</label><input id="n-mail" type="email" placeholder="email@exemplo.com" value={d.email} onChange={(e) => set({ email: e.target.value })} /></div>
            <div className="fc"><label htmlFor="n-cpf">CPF (opcional agora)</label><input id="n-cpf" type="text" inputMode="numeric" placeholder="000.000.000-00" value={d.cpf} onChange={(e) => set({ cpf: e.target.value })} /></div>
          </div>
        ) : (
          <div className="resp" style={{ gap: 12 }}>
            <b style={{ fontSize: 15 }}>Responsável que acompanha</b>
            <div className="fc-g">
              <div className="fc"><label htmlFor="r-nome">Nome do responsável</label><input id="r-nome" type="text" placeholder="Nome completo" value={d.rNome} onChange={(e) => set({ rNome: e.target.value })} /></div>
              <div className="fc"><label htmlFor="r-par">Parentesco</label><input id="r-par" type="text" placeholder="Ex.: mãe, pai, avó" value={d.rParentesco} onChange={(e) => set({ rParentesco: e.target.value })} /></div>
            </div>
            <div className="fc-g">
              <div className="fc"><label htmlFor="r-wa">WhatsApp</label><input id="r-wa" type="tel" placeholder="(51) 90000-0000" value={d.rWhatsapp} onChange={(e) => set({ rWhatsapp: fone(e.target.value) })} /></div>
              <div className="fc"><label htmlFor="r-mail">E-mail</label><input id="r-mail" type="email" placeholder="email@exemplo.com" value={d.rEmail} onChange={(e) => set({ rEmail: e.target.value })} /></div>
            </div>
            <div className="fc-g">
              <div className="fc"><label htmlFor="r-cpf">CPF do responsável (opcional agora)</label><input id="r-cpf" type="text" inputMode="numeric" placeholder="000.000.000-00" value={d.rCpf} onChange={(e) => set({ rCpf: e.target.value })} /></div>
              <div />
            </div>
            <span style={{ fontSize: 13, color: "#6B5A5E" }}>Dá para incluir o segundo responsável depois, na ficha.</span>
          </div>
        )}
        <div className="fc-g">
          <div className="fc"><label htmlFor="n-valor">Valor da sessão</label><div className="valor-in"><span>R$</span><input id="n-valor" type="text" inputMode="decimal" placeholder="160" value={d.valor} onChange={(e) => set({ valor: e.target.value })} /></div></div>
          <div className="fc"><label htmlFor="n-tv">Tipo de valor</label><select id="n-tv" value={d.tipoValor} onChange={(e) => set({ tipoValor: e.target.value as "normal" | "social" })}><option value="normal">Valor normal</option><option value="social">Valor social</option></select></div>
        </div>
        <CamposFixo dia={d.fixoDia} hora={d.fixoHora} setDia={(v) => set({ fixoDia: v })} setHora={(v) => set({ fixoHora: v })} />
        <CamposPeriodo desde={d.desde} fim={d.fim} setDesde={(v) => set({ desde: v })} setFim={(v) => set({ fim: v })} />
        <span style={{ fontSize: 13, color: "#6B5A5E" }}>Depois de salvar, envie a ficha de cadastro pelo WhatsApp: a pessoa preenche CPF, data de nascimento e contato de emergência num link seguro. Com a ficha preenchida, você gera o termo em Termos.</span>
        <Aviso m={msg} />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" className="bt" onClick={salvar} disabled={pend} style={{ width: "auto" }}>{pend ? "Salvando…" : "Salvar paciente"}</button>
          <button type="button" className="bt3" onClick={aoFechar}>Cancelar</button>
        </div>
      </div>
    </section>
  );
}

const ST_S: Record<LinhaSessao["status"], [string, string]> = { agendada: ["Agendada", "pill p-on"], realizada: ["Realizada", "pill p-ok"], falta: ["Falta", "pill p-ur"], cancelada: ["Cancelada", "pill p-ne"] };
const PG_S = (l: LinhaSessao): [string, string] =>
  l.status === "cancelada" ? (l.pago ? ["Crédito", "pill p-av"] : ["Sem cobrança", "pill p-ne"])
  : l.status === "agendada" ? (l.pago ? ["Pago", "pill p-ok"] : ["A pagar", "pill p-ne"])
  : l.pago ? ["Pago", "pill p-ok"] : ["Pendente", "pill p-av"];

function BlocoSessoes({ id, nome, s }: { id: string; nome: string; s: NonNullable<NonNullable<Detalhe>["sessoes"]> }) {
  const r = s.resumo;
  const router = useRouter();
  const [pend, iniciar] = useTransition();
  const [aviso, setAviso] = useState<{ t: string; erro?: boolean } | null>(null);
  const acertar = () => iniciar(async () => {
    const res = await acertarAgenda(id);
    setAviso(res.erro ? { t: res.erro, erro: true } : { t: res.ok! });
    if (res.ok) router.refresh();
  });
  const dia = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "numeric", month: "short" }).format(new Date(iso)).replace(".", "");
  const situacao = r.devendo
    ? `Deve ${r.devendo} ${r.devendo === 1 ? "sessão" : "sessões"}${r.devendoValor ? ` · ${reais(r.devendoValor)}` : ""}`
    : `Tudo em dia${r.pagasFrente ? ` · ${r.pagasFrente} ${r.pagasFrente === 1 ? "sessão paga" : "sessões pagas"} à frente${r.pagasFrenteAte ? ` (até ${dia(r.pagasFrenteAte)})` : ""}` : ""}`;
  const num = (rot: string, v: string, sub?: string) => <div className="dado"><span><span className="l">{rot}</span><b>{v}</b>{sub ? <span style={{ display: "block", fontSize: 12, color: "#8A7A7E" }}>{sub}</span> : null}</span></div>;
  const lista = (titulo: string, xs: LinhaSessao[]) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: "#5A3A41" }}>{titulo}</span>
      {xs.length ? xs.map((l) => {
        const [st, sc] = ST_S[l.status];
        const [pg, pc] = PG_S(l);
        return <div key={l.id} style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", fontSize: 14 }}><b style={{ minWidth: 118 }}>{l.quando}</b><span className={sc}>{st}</span><span className={pc}>{pg}</span></div>;
      }) : <span style={{ fontSize: 13, color: "#8A7A7E" }}>Nenhuma.</span>}
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <span className="rot">Sessões e pagamentos</span>
      <div className={r.devendo ? "aviso erro" : "aviso ok"} role="status" style={{ fontWeight: 600 }}>{situacao}</div>
      <div className="dados">
        {num("Realizadas", String(r.realizadas), r.faltas ? `e ${r.faltas} ${r.faltas === 1 ? "falta" : "faltas"}` : undefined)}
        {num("Próximas", String(r.proximas), "agendadas")}
        {num("Pagas à frente", String(r.pagasFrente))}
        {num("A receber", r.devendo ? `${r.devendo} · ${reais(r.devendoValor) || "R$ 0"}` : "0")}
        {num("Crédito", r.credito ? `${r.credito} · ${reais(r.creditoValor) || "R$ 0"}` : "0")}
        {num("Recibos a emitir", String(r.recibos))}
      </div>
      <div className="resp" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
        {lista("Próximas", s.proximas)}
        {lista("Últimas", s.ultimas)}
      </div>
      {s.abertas.length ? (
        <div className="resp" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#5A3A41" }}>Pagamento por sessão</span>
          <span style={{ fontSize: 13, color: "#6B5A5E" }}>Por padrão a paciente paga tudo o que está em aberto num Pix só. Libere uma sessão para ela poder pagá-la separado.</span>
          {s.abertas.map((a) => (
            <div key={a.id} style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", fontSize: 14 }}>
              <b style={{ minWidth: 118 }}>{a.quando}</b>
              <span>{reais(a.valor) || "sem valor"}</span>
              {a.liberada ? <span className="pill p-ok">Liberada para pagar separado</span> : null}
              <button type="button" className="mini2" disabled={pend} onClick={() => iniciar(async () => { const res = await liberarPagamento(a.id, !a.liberada); setAviso(res.erro ? { t: res.erro, erro: true } : { t: res.ok! }); if (res.ok) router.refresh(); })}>{a.liberada ? "Tirar liberação" : "Liberar pagar separado"}</button>
            </div>
          ))}
        </div>
      ) : null}
      {aviso ? <div className={aviso.erro ? "aviso erro" : "aviso ok"} role="status">{aviso.t}</div> : null}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
        <Link href={`/painel/sessoes?busca=${encodeURIComponent(nome)}`} style={{ fontSize: 13, fontWeight: 700 }}>Ver todas em Sessões →</Link>
        <button type="button" className="mini2" onClick={acertar} disabled={pend} title="Confere a agenda do Google e deixa cada sessão igual ao painel">
          <Icone nome="calendario" tam={14} />{pend ? "Conferindo a agenda…" : "Conferir agenda do Google"}
        </button>
      </div>
    </div>
  );
}

function Ficha({ p, det }: { p: Item; det: NonNullable<Detalhe> }) {
  const router = useRouter();
  const [pend, iniciar] = useTransition();
  const [msg, setMsg] = useState<{ t: string; erro?: boolean } | null>(null);
  const [cpfs, setCpfs] = useState<Record<string, string>>({});
  const [pessoais, setPessoais] = useState<{ nascimento: string; emergencia: string } | null>(null);
  const [edP, setEdP] = useState<null | { nascimento: string; eNome: string; eTelefone: string }>(null);
  const [cpfNovo, setCpfNovo] = useState("");
  const [editando, setEditando] = useState(false);
  const [e, setE] = useState({ nome: p.nome, idade: p.idade ? String(p.idade) : "", whatsapp: fone(p.whatsapp), email: p.email || "", valor: p.valor != null ? String(p.valor / 100).replace(".", ",") : "", tipoValor: p.tipoValor, fixoDia: p.fixoDia != null ? String(p.fixoDia) : "", fixoHora: p.fixoHora || "", desde: p.desde, fim: p.fim || "", lembretes: p.lembretes });
  const [aba, setAba] = useState<FichaAba>("dados");
  const [encerrando, setEncerrando] = useState<string | null>(null);
  const [reat, setReat] = useState<{ data: string; dia: string; hora: string } | null>(null);
  // Retomada sugerida: o dia seguinte ao encerramento, ou hoje se ele já passou.
  const abrirReat = () => {
    const h = hojeBR();
    const depoisFim = p.fim ? new Date(Date.parse(p.fim + "T12:00:00Z") + 86400000).toISOString().slice(0, 10) : h;
    setReat({ data: depoisFim > h ? depoisFim : h, dia: p.fixoDia != null ? String(p.fixoDia) : "", hora: p.fixoHora || "" });
    setEncerrando(null);
  };
  const [novoResp, setNovoResp] = useState<null | { nome: string; parentesco: string; whatsapp: string; email: string; cpf: string; financeiro: boolean }>(null);
  const [envio, setEnvio] = useState<{ link: string; para: string; texto: string; ref?: string } | null>(null);
  const inf = p.tipo === "crianca";
  const av = (r: { erro?: string; ok?: string }) => setMsg(r.erro ? { t: r.erro, erro: true } : r.ok ? { t: r.ok } : null);

  const mostrarCpf = (id: string, quem: "paciente" | "responsavel") =>
    iniciar(async () => {
      if (cpfs[id]) return setCpfs({ ...cpfs, [id]: "" });
      const r = await verCpf(id, quem);
      if (r.erro) return av(r);
      setCpfs({ ...cpfs, [id]: r.valor! });
    });

  const fichaTxt = p.cad.fichaTxt;
  const termoTxt = p.cad.termoTxt;

  return (
    <>
      <div className="det-top">
        <span className={inf ? "av k" : "av"}>{iniciais(p.nome)}</span>
        <div style={{ flex: "1 1 180px", minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 24, lineHeight: 1.2, color: "#3A1F25" }}>{p.nome}</h2>
          <span style={{ fontSize: 14, color: "#8A7A7E" }}>{p.status === "ativo" ? `Em acompanhamento desde ${mesAno(p.desde)}` : `Acompanhamento encerrado${p.fim ? ` em ${diaBR(p.fim)}` : ""}`}</span>
        </div>
        <span className={inf ? "pill p-in" : "pill p-on"}>{inf ? "Criança ou adolescente" : "Adulta · online"}</span>
      </div>
      <Aviso m={msg} />
      <nav className="fi-abas" role="tablist" aria-label="Seções da ficha">
        {FICHA_ABAS.map(([k, n]) => <button key={k} type="button" role="tab" aria-selected={aba === k} className={aba === k ? "fi-aba on" : "fi-aba"} onClick={() => setAba(k)}>{n}</button>)}
      </nav>

      {aba === "dados" ? (
      <>
      {editando ? (
        <div className="form-c">
          <div className="fc-g">
            <div className="fc"><label htmlFor="e-nome">Nome</label><input id="e-nome" value={e.nome} onChange={(x) => setE({ ...e, nome: x.target.value })} /></div>
            {inf ? <div className="fc"><label htmlFor="e-idade">Idade</label><input id="e-idade" inputMode="numeric" value={e.idade} onChange={(x) => setE({ ...e, idade: x.target.value })} /></div>
              : <div className="fc"><label htmlFor="e-wa">WhatsApp</label><input id="e-wa" type="tel" value={e.whatsapp} onChange={(x) => setE({ ...e, whatsapp: fone(x.target.value) })} /></div>}
          </div>
          {!inf ? <div className="fc"><label htmlFor="e-mail">E-mail</label><input id="e-mail" type="email" value={e.email} onChange={(x) => setE({ ...e, email: x.target.value })} /></div> : null}
          <div className="fc-g">
            <div className="fc"><label htmlFor="e-valor">Valor da sessão</label><div className="valor-in"><span>R$</span><input id="e-valor" inputMode="decimal" value={e.valor} onChange={(x) => setE({ ...e, valor: x.target.value })} /></div></div>
            <div className="fc"><label htmlFor="e-tv">Tipo de valor</label><select id="e-tv" value={e.tipoValor} onChange={(x) => setE({ ...e, tipoValor: x.target.value as "normal" | "social" })}><option value="normal">Valor normal</option><option value="social">Valor social</option></select></div>
          </div>
          <CamposFixo pacienteId={p.id} dia={e.fixoDia} hora={e.fixoHora} setDia={(v) => setE({ ...e, fixoDia: v })} setHora={(v) => setE({ ...e, fixoHora: v })} />
          <label className="chk"><input type="checkbox" checked={e.lembretes} onChange={() => setE({ ...e, lembretes: !e.lembretes })} /><span>Enviar lembretes por e-mail (sessão, ficha, termo)</span></label>
          {p.status === "ativo" ? <CamposPeriodo desde={e.desde} fim={e.fim} setDesde={(v) => setE({ ...e, desde: v })} setFim={(v) => setE({ ...e, fim: v })} /> : null}
          {edP ? (
            <>
              <div className="fc-g">
                <div className="fc"><label htmlFor="ep-nasc">Nascimento{inf ? " da criança" : ""}</label><input id="ep-nasc" type="text" inputMode="numeric" placeholder="dd/mm/aaaa" value={edP.nascimento} onChange={(x) => setEdP({ ...edP, nascimento: x.target.value })} /></div>
                <div></div>
              </div>
              <div className="fc-g">
                <div className="fc"><label htmlFor="ep-en">Contato de emergência · nome</label><input id="ep-en" type="text" placeholder="Nome e parentesco" value={edP.eNome} onChange={(x) => setEdP({ ...edP, eNome: x.target.value })} /></div>
                <div className="fc"><label htmlFor="ep-et">Contato de emergência · telefone</label><input id="ep-et" type="tel" placeholder="(51) 90000-0000" value={edP.eTelefone} onChange={(x) => setEdP({ ...edP, eTelefone: fone(x.target.value) })} /></div>
              </div>
              <span style={{ fontSize: 13, color: "#6B5A5E", marginTop: -6 }}>Nascimento e contato de emergência ficam criptografados. Deixe em branco para apagar.</span>
            </>
          ) : null}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" className="bt" style={{ width: "auto" }} disabled={pend} onClick={() => iniciar(async () => { const r = await atualizarPaciente(p.id, e); if (r.erro) return av(r); if (edP) { const r2 = await salvarPessoais(p.id, edP); if (r2.erro) return av(r2); setPessoais(null); } av(r); setEditando(false); router.refresh(); })}>Salvar</button>
            <button type="button" className="bt3" onClick={() => { setEditando(false); setEdP(null); }}>Cancelar</button>
          </div>
        </div>
      ) : (
        <>
          {p.status === "ativo" && p.fim && diasAte(p.fim) <= 7 ? (
            <div className="aviso" role="status">{diasAte(p.fim) < 0 ? `O fim previsto (${diaBR(p.fim)}) já passou e o horário fixo não está mais reservado.` : `O acompanhamento termina em ${diaBR(p.fim)}.`} Prorrogue em <b>Editar dados</b> ou encerre o acompanhamento.</div>
          ) : null}
          <div className="dados">
            {inf ? <div className="dado"><span className="di"><Icone nome="crianca" tam={18} /></span><span><span className="l">Idade</span><b>{p.idade ? `${p.idade} anos` : "—"}</b></span></div> : null}
            <div className="dado"><span className="di"><Icone nome="horarios" tam={18} /></span><span><span className="l">Horário fixo</span><b>{fixoTexto(p.fixoDia, p.fixoHora)}</b></span></div>
            <div className="dado"><span className="di"><Icone nome="calendario" tam={18} /></span><span><span className="l">Período</span><b>{`De ${diaBR(p.desde)} ${p.fim ? `até ${diaBR(p.fim)}` : "· sem data de fim"}`}</b></span></div>
            <div className="dado"><span className="di"><Icone nome="sessoes" tam={18} /></span><span><span className="l">Valor da sessão</span><b>{p.valor != null ? `${reais(p.valor)}${p.tipoValor === "social" ? " · social" : ""}` : "A definir"}</b></span></div>
            {!inf ? (
              <>
                <div className="dado"><span className="di"><Icone nome="telefone" tam={18} /></span><span><span className="l">WhatsApp</span><b>{fone(p.whatsapp) || "—"}</b></span></div>
                <div className="dado"><span className="di"><Icone nome="email" tam={18} /></span><span><span className="l">E-mail</span><b style={{ wordBreak: "break-all" }}>{p.email || "—"}</b></span></div>
              </>
            ) : null}
            <div className="dado"><span className="di"><Icone nome="email" tam={18} /></span><span><span className="l">Lembretes por e-mail</span><b>{!p.lembretes ? "Desligados" : (inf ? det.responsaveis.some((r) => r.email) || p.email : p.email) ? "Ligados" : "Ligados, mas falta um e-mail"}</b></span></div>
            <div className="dado"><span className="di"><Icone nome="termos" tam={18} /></span><span><span className="l">Ficha de cadastro</span><b>{fichaTxt}</b></span></div>
            <div className="dado"><span className="di"><Icone nome="escudo" tam={18} /></span><span><span className="l">Termo de consentimento</span><b>{termoTxt}</b></span></div>
          </div>
          <button type="button" className="mini2" style={{ alignSelf: "flex-start" }} disabled={pend} onClick={() => iniciar(async () => { const v = await verPessoais(p.id); const i = v.emergencia.lastIndexOf(" · "); setEdP({ nascimento: v.nascimento, eNome: i >= 0 ? v.emergencia.slice(0, i) : v.emergencia, eTelefone: i >= 0 ? v.emergencia.slice(i + 3) : "" }); setEditando(true); })}>Editar dados</button>
        </>
      )}

      {!inf ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span className="rot">CPF · para recibo e termo</span>
          {p.cpfFinal ? (
            <div className="cofre">
              <span style={{ display: "inline-flex", gap: 8, alignItems: "center", fontWeight: 700, fontSize: 16 }}><span style={{ color: "#2F6A45" }}><Icone nome="escudo" tam={16} /></span>{cpfs[p.id] || cpfMascarado(p.cpfFinal)}</span>
              <button type="button" className="mini2" onClick={() => mostrarCpf(p.id, "paciente")}><Icone nome="olho" tam={16} />{cpfs[p.id] ? "Esconder" : "Ver"}</button>
            </div>
          ) : (
            <div className="resp" style={{ gap: 10 }}>
              <span style={{ fontSize: 14, color: "#5A3A41" }}>Ainda não informado. O jeito mais seguro é a própria pessoa preencher pela ficha de cadastro.</span>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: 13, color: "#8A7A7E" }}>ou digite aqui:</span>
                <input type="text" inputMode="numeric" placeholder="000.000.000-00" value={cpfNovo} onChange={(x) => setCpfNovo(x.target.value)} aria-label="CPF" style={{ font: "inherit", fontSize: 14, border: "1px solid #E2CCD0", borderRadius: 10, padding: "6px 10px", minHeight: 34, width: 150 }} />
                <button type="button" className="mini2" onClick={() => iniciar(async () => av(await salvarCpf(p.id, "paciente", cpfNovo)))}>Salvar</button>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {p.temNascimento || p.temEmergencia ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span className="rot">Dados da ficha</span>
          <div className="cofre" style={{ flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
            {pessoais ? (
              <>
                {pessoais.nascimento ? <span><b>Nascimento:</b> {pessoais.nascimento}</span> : null}
                {pessoais.emergencia ? <span><b>Contato de emergência:</b> {pessoais.emergencia}</span> : null}
                {p.escola ? <span><b>Escola:</b> {p.escola}</span> : null}
                {p.cidade ? <span><b>Cidade:</b> {p.cidade}</span> : null}
              </>
            ) : <span style={{ fontSize: 14, color: "#5A3A41" }}>Nascimento e contato de emergência ficam guardados com criptografia. Para corrigir, use Editar dados.</span>}
            <button type="button" className="mini2" onClick={() => iniciar(async () => setPessoais(pessoais ? null : await verPessoais(p.id)))}><Icone nome="olho" tam={16} />{pessoais ? "Esconder" : "Ver"}</button>
          </div>
        </div>
      ) : null}

      {inf ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="sec-t"><span className="rot">Responsáveis</span><button type="button" className="mini2" onClick={() => setNovoResp({ nome: "", parentesco: "", whatsapp: "", email: "", cpf: "", financeiro: false })}>Adicionar</button></div>
          {det.responsaveis.map((r) => (
            <div key={r.id} className="resp">
              <span style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}><b style={{ fontSize: 15 }}>{r.nome}</b>{r.parentesco ? <span className="pill p-in">{r.parentesco}</span> : null}</span>
              <span className="lin">
                {r.whatsapp ? <span><Icone nome="telefone" tam={14} />{fone(r.whatsapp)}</span> : null}
                {r.email ? <span><Icone nome="email" tam={14} />{r.email}</span> : null}
                <span><Icone nome="escudo" tam={14} />CPF {r.cpfFinal ? cpfs[r.id] || cpfMascarado(r.cpfFinal) : "não informado"}</span>
              </span>
              <span style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                {r.financeiro ? <span style={{ fontSize: 13, color: "#2F6A45", fontWeight: 600 }}>Responsável financeiro · recibos no nome dele(a)</span> : det.responsaveis.length > 1 ? <button type="button" className="mini2" disabled={pend} onClick={() => iniciar(async () => av(await definirFinanceiro(p.id, r.id)))}>Tornar financeiro</button> : null}
                {r.cpfFinal ? <button type="button" className="mini2" onClick={() => mostrarCpf(r.id, "responsavel")}>{cpfs[r.id] ? "Esconder CPF" : "Ver CPF"}</button> : null}
              </span>
            </div>
          ))}
          {novoResp ? (
            <div className="form-c">
              <div className="fc-g">
                <div className="fc"><label htmlFor="nr-nome">Nome</label><input id="nr-nome" value={novoResp.nome} onChange={(x) => setNovoResp({ ...novoResp, nome: x.target.value })} /></div>
                <div className="fc"><label htmlFor="nr-par">Parentesco</label><input id="nr-par" placeholder="Ex.: pai" value={novoResp.parentesco} onChange={(x) => setNovoResp({ ...novoResp, parentesco: x.target.value })} /></div>
              </div>
              <div className="fc-g">
                <div className="fc"><label htmlFor="nr-wa">WhatsApp</label><input id="nr-wa" type="tel" value={novoResp.whatsapp} onChange={(x) => setNovoResp({ ...novoResp, whatsapp: fone(x.target.value) })} /></div>
                <div className="fc"><label htmlFor="nr-mail">E-mail</label><input id="nr-mail" type="email" value={novoResp.email} onChange={(x) => setNovoResp({ ...novoResp, email: x.target.value })} /></div>
              </div>
              <div className="fc-g">
                <div className="fc"><label htmlFor="nr-cpf">CPF (opcional)</label><input id="nr-cpf" inputMode="numeric" value={novoResp.cpf} onChange={(x) => setNovoResp({ ...novoResp, cpf: x.target.value })} /></div>
                <label className="chk" style={{ alignSelf: "end" }}><input type="checkbox" checked={novoResp.financeiro} onChange={() => setNovoResp({ ...novoResp, financeiro: !novoResp.financeiro })} /><span>Responsável financeiro{det.responsaveis.some((x) => x.financeiro) ? " (troca o atual)" : ""}</span></label>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" className="bt" style={{ width: "auto" }} disabled={pend} onClick={() => iniciar(async () => { const r = await adicionarResponsavel(p.id, novoResp); av(r); if (r.ok) setNovoResp(null); })}>Adicionar</button>
                <button type="button" className="bt3" onClick={() => setNovoResp(null)}>Cancelar</button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      </>
      ) : null}

      {aba === "ficha" ? (
      <>
      {p.status === "ativo" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span className="rot">Cadastro</span>
          <div className="cad-g">
            <div className="cad-p"><span className="l">1 · Ficha de cadastro</span><span className={p.cad.ficha === "preenchida" ? "pill p-ok" : p.cad.ficha === "aguardando" ? "pill p-av" : "pill p-ur"}>{p.cad.fichaTxt}</span></div>
            <div className="cad-p"><span className="l">2 · Termo de consentimento</span><span className={p.cad.termo === "aceito" ? "pill p-ok" : p.cad.termo === "aguardando" ? "pill p-av" : p.cad.termo === "depois" ? "pill p-ne" : "pill p-ur"}>{p.cad.termoTxt}</span></div>
          </div>
          {p.cad.ficha === "preenchida" && p.cad.termo !== "aceito" ? (
            <Link href={det.termo && det.termo.status === "enviado" ? `/painel/termos?t=${det.termo.id}&aba=doc` : `/painel/termos?paciente=${p.id}`} className="mini2" style={{ alignSelf: "flex-start" }}>
              {p.cad.termo === "sem" ? "Gerar o termo" : p.cad.termo === "nao_enviado" ? "Abrir o termo e mandar" : "Ver o termo ou reenviar"} <span aria-hidden="true">→</span>
            </Link>
          ) : null}
        </div>
      ) : null}


      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span className="rot">Ficha de cadastro</span>
        <div className="resp" style={{ gap: 10 }}>
          <span style={{ fontSize: 14, color: "#5A3A41" }}>{p.fichaEm ? "A ficha foi preenchida. Você pode gerar o termo em Termos." : "A pessoa preenche CPF, nascimento e contato de emergência num link pessoal, válido por 7 dias."}</span>
          {envio ? (
            <>
              <div className="prev" style={{ fontSize: 14 }}>{envio.texto}</div>
              <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {envio.para ? <a href={waLink(envio.para, envio.texto)} target="_blank" rel="noopener" className="bt" style={{ width: "auto", minHeight: 40, padding: "9px 16px", fontSize: 14 }} onClick={() => { if (envio.ref) marcarEnviado("ficha", envio.ref).then(() => router.refresh()); }}><Icone nome="whats" tam={16} />Abrir no WhatsApp</a> : <span style={{ fontSize: 13, color: "#A3322A" }}>Sem WhatsApp cadastrado: copie o link.</span>}
                <button type="button" className="mini2" onClick={() => navigator.clipboard?.writeText(envio.link).then(() => av({ ok: "Link copiado." }))}>Copiar link</button>
              </span>
            </>
          ) : (
            <button type="button" className="mini2" style={{ alignSelf: "flex-start" }} disabled={pend} onClick={() => iniciar(async () => { const r = await linkFicha(p.id); if (r.erro) return av(r); setEnvio({ link: r.link!, para: r.para!, texto: r.texto!, ref: r.ref }); })}>
              <Icone nome="whats" tam={16} />{p.fichaEm ? "Enviar a ficha de novo" : det.ficha ? "Enviar a ficha de novo" : "Enviar ficha pelo WhatsApp"}
            </button>
          )}
        </div>
      </div>
      </>
      ) : null}

      {aba === "sessoes" ? (
      <>
      {det.sessoes ? <BlocoSessoes key={p.id} id={p.id} nome={p.nome} s={det.sessoes} /> : null}
      </>
      ) : null}

      {aba === "acesso" ? (
      <>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span className="rot">Sala de atendimento</span>
        {p.meet ? (
          <>
            <div className="sala">
              <span style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}><span style={{ color: "#7A2335", flex: "0 0 auto" }}><Icone nome="video" tam={18} /></span><code>{p.meet.replace("https://", "")}</code></span>
              <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" className="mini2" onClick={() => navigator.clipboard?.writeText(p.meet!).then(() => av({ ok: "Link copiado." }))}>Copiar</button>
                <a href={p.meet} target="_blank" rel="noopener" className="mini2">Abrir</a>
                <button type="button" className="mini2" disabled={pend} onClick={() => iniciar(async () => av(await gerarSala(p.id)))}>Gerar outro</button>
              </span>
            </div>
            <span style={{ fontSize: 13, color: "#8A7A7E" }}>O mesmo link vale para todas as sessões. A sessão semanal está na sua agenda do Google e bloqueia esse horário no site.</span>
          </>
        ) : (
          <>
            <button type="button" className="bt2" style={{ alignSelf: "flex-start", width: "auto" }} disabled={pend} onClick={() => iniciar(async () => av(await gerarSala(p.id)))}><Icone nome="video" tam={18} />{pend ? "Criando…" : "Gerar link do Google Meet"}</button>
            <span style={{ fontSize: 13, color: "#8A7A7E" }}>Cria a sessão semanal no horário fixo, na sua agenda do Google, com a sala do Meet.</span>
          </>
        )}
        {inf ? <span style={{ fontSize: 14, color: "#5A3A41" }}>Sessões com a criança ou o adolescente: presencial, na R. Santa Flora, 1166 · Nonoai. Encontros com os responsáveis: online, pela sala do Google Meet.</span> : null}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span className="rot">Área da(o) paciente</span>
        {p.status !== "ativo" ? (
          <div className="resp"><span style={{ fontSize: 14, color: "#5A3A41" }}>O acesso fica desligado enquanto o acompanhamento está encerrado. Ao reativar, o login volta a funcionar.</span></div>
        ) : inf ? (
          det.responsaveis.length ? det.responsaveis.map((r) => {
            const a = det.acessos.find((x) => x.responsavelId === r.id);
            return <BlocoAcesso key={r.id} quem={`${r.nome}${r.parentesco ? ` (${r.parentesco})` : ""}`} email={r.email} acesso={a} pend={pend} criar={() => iniciar(async () => av(await criarAcesso(p.id, r.id)))} reenviar={(id) => iniciar(async () => av(await reenviarSenha(id)))} alternar={(id, ativo) => iniciar(async () => av(await alternarAcesso(id, ativo)))} />;
          }) : <div className="resp"><span style={{ fontSize: 14, color: "#5A3A41" }}>Cadastre um responsável com e-mail para liberar o acesso. O login é dele(a) e mostra os filhos ligados a ele(a).</span></div>
        ) : (
          <BlocoAcesso quem={p.nome} email={p.email} acesso={det.acessos[0]} pend={pend} criar={() => iniciar(async () => av(await criarAcesso(p.id, null)))} reenviar={(id) => iniciar(async () => av(await reenviarSenha(id)))} alternar={(id, ativo) => iniciar(async () => av(await alternarAcesso(id, ativo)))} />
        )}
        <span style={{ fontSize: 13, color: "#8A7A7E" }}>A senha provisória vai por e-mail, vale 24 horas e é trocada no primeiro acesso. O acesso se desliga sozinho quando o acompanhamento é encerrado.</span>
      </div>
      </>
      ) : null}

      {aba === "situacao" ? (
      <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <Link href={`/painel/prontuario/${p.id}`} className="bt"><Icone nome="escudo" tam={18} />Prontuário</Link>
        <Link href={`/painel/prontuario/${p.id}?aba=exe`} className="bt2"><Icone nome="escritos" tam={18} />Exercícios</Link>
        <Link href={`/painel/termos?paciente=${p.id}`} className="bt2"><Icone nome="termos" tam={18} />Termos</Link>
        {p.status === "ativo" ? (
          <button type="button" className="bt3" disabled={pend} onClick={() => setEncerrando(hojeBR())}>Encerrar acompanhamento</button>
        ) : (
          <button type="button" className="bt3" disabled={pend} onClick={abrirReat}>Reativar acompanhamento</button>
        )}
      </div>
      {reat ? (
        <div className="caixa rec" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <b style={{ fontSize: 16 }}>Reativar o acompanhamento</b>
          <span style={{ fontSize: 14, color: "#5A3A41" }}>{p.fim ? `As sessões até o encerramento (${diaBR(p.fim)}) ficam como estão. ` : ""}As novas sessões começam na data da retomada, no dia e horário fixos abaixo. Antes de salvar, o painel confere a sua disponibilidade e qualquer conflito de agenda.</span>
          <div className="fc" style={{ maxWidth: 260 }}><label htmlFor="reat-data">Retomar a partir de</label><input id="reat-data" type="date" value={reat.data} min={hojeBR()} onChange={(x) => setReat({ ...reat, data: x.target.value })} /></div>
          <CamposFixo pacienteId={p.id} dia={reat.dia} hora={reat.hora} setDia={(v) => setReat({ ...reat, dia: v })} setHora={(v) => setReat({ ...reat, hora: v })} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <button type="button" className="bt" style={{ width: "auto" }} disabled={pend || !reat.data} onClick={() => iniciar(async () => { const r = await reativarPaciente(p.id, { retomada: reat.data, fixoDia: reat.dia, fixoHora: reat.hora }); av(r); if (r.ok) setReat(null); })}>{pend ? "Reativando…" : "Reativar"}</button>
            <button type="button" className="bt3" onClick={() => setReat(null)}>Cancelar</button>
          </div>
        </div>
      ) : null}
      {encerrando !== null ? (
        <div className="caixa rec" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <b style={{ fontSize: 16 }}>Encerrar o acompanhamento</b>
          <span style={{ fontSize: 14, color: "#5A3A41" }}>A sessão semanal para na data da última sessão. O que já aconteceu continua na agenda e no histórico, e as sessões agendadas depois dessa data saem.</span>
          <div className="fc" style={{ maxWidth: 260 }}><label htmlFor="enc-data">Data da última sessão</label><input id="enc-data" type="date" value={encerrando} min={p.desde} onChange={(x) => setEncerrando(x.target.value)} /></div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <button type="button" className="bt" style={{ width: "auto" }} disabled={pend || !encerrando} onClick={() => iniciar(async () => { const r = await encerrarPaciente(p.id, encerrando); av(r); if (r.ok) setEncerrando(null); })}>{pend ? "Encerrando…" : "Encerrar"}</button>
            <button type="button" className="bt3" onClick={() => setEncerrando(null)}>Cancelar</button>
          </div>
        </div>
      ) : null}
      {det.guarda ? (
        <div className="aviso" role="status" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <b>{det.guarda.motivo === "prazo" ? `Prontuário guardado até ${diaBR(det.guarda.ate!)}` : "Prontuário com guarda obrigatória"}</b>
          <span>{det.guarda.motivo === "prazo" ? "São 5 anos depois do encerramento do acompanhamento. A exclusão do paciente e dos dados fica liberada depois dessa data." : "O prontuário deve ser guardado por 5 anos depois do encerramento. Para poder excluir no futuro, encerre o acompanhamento e espere o prazo. Até lá, o paciente fica aqui, sem sessões novas."}</span>
          <Link href={`/painel/prontuario/${p.id}`} style={{ fontSize: 13, fontWeight: 700 }}>Abrir o prontuário →</Link>
        </div>
      ) : <ExcluirPaciente id={p.id} nome={p.nome} temProntuario={!!det.temProntuario} />}
      <p style={{ margin: 0, fontSize: 12, color: "#8A7A7E" }}>CPF e dados pessoais ficam guardados com criptografia e aparecem mascarados. O prontuário fica numa área à parte, com criptografia de ponta a ponta.</p>
      </>
      ) : null}

    </>
  );
}

function ExcluirPaciente({ id, nome, temProntuario }: { id: string; nome: string; temProntuario: boolean }) {
  const [guardado, setGuardado] = useState(false);
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [txt, setTxt] = useState("");
  const [erro, setErro] = useState("");
  const [pend, iniciar] = useTransition();
  if (!aberto)
    return <button type="button" className="mini2" style={{ alignSelf: "flex-start", color: "#A3322A", borderColor: "#F2C9D1" }} onClick={() => setAberto(true)}><Icone nome="lixo" tam={16} />Excluir paciente e dados</button>;
  return (
    <div className="caixa rec" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <b style={{ fontSize: 16 }}>Excluir {nome} de vez?</b>
      <span style={{ fontSize: 14, color: "#5A3A41" }}>Apaga o cadastro, a ficha, os termos e os responsáveis que não cuidam de outro paciente, e tira a sessão semanal da sua agenda. Não dá para desfazer. Use quando a pessoa pedir a exclusão dos dados.</span>
      {temProntuario ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, background: "#FBF1E6", borderRadius: 12, padding: "12px 14px" }}>
          <span style={{ fontSize: 14, color: "#8A4B12" }}>Este paciente tem prontuário. Pela Resolução CFP 001/2009, ele deve ser guardado por pelo menos 5 anos. Antes de excluir, abra o prontuário e use <b>Exportar PDF</b>.</span>
          <Link href={`/painel/prontuario/${id}`} style={{ fontSize: 13, fontWeight: 700 }}>Abrir o prontuário →</Link>
          <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 14 }}><input type="checkbox" checked={guardado} onChange={() => setGuardado(!guardado)} style={{ marginTop: 3 }} /><span>Já exportei e guardei o prontuário.</span></label>
        </div>
      ) : null}
      <div className="fc"><label htmlFor="ex-nome">Para confirmar, escreva o nome completo</label><input id="ex-nome" type="text" autoComplete="off" value={txt} onChange={(e) => setTxt(e.target.value)} placeholder={nome} /></div>
      {erro ? <div className="aviso erro" role="alert">{erro}</div> : null}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <button type="button" className="bt" style={{ background: "#A3322A", width: "auto" }} disabled={pend || txt.trim().toLowerCase() !== nome.trim().toLowerCase() || (temProntuario && !guardado)} onClick={() => iniciar(async () => { const r = await excluirPaciente(id, txt, guardado); if (r.erro) return setErro(r.erro); router.push("/painel/pacientes", { scroll: false }); })}>{pend ? "Excluindo…" : "Excluir de vez"}</button>
        <button type="button" className="bt3" onClick={() => { setAberto(false); setTxt(""); setErro(""); }}>Cancelar</button>
      </div>
    </div>
  );
}

export default function Pacientes({ lista, selId, detalhe, novo, pedido, filtroInicial }: { lista: Item[]; selId: string | null; detalhe: Detalhe; novo: boolean; pedido: PedidoBase; filtroInicial: string }) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState(filtroInicial);
  const [abrirNovo, setAbrirNovo] = useState(novo);
  const FILTROS: [string, string][] = [["ativo", "Em acompanhamento"], ["cadastro", "Cadastro pendente"], ["crianca", "Crianças e adolescentes"], ["encerrado", "Encerrados"]];
  const passa = (p: Item, f: string) => (f === "ativo" ? p.status === "ativo" : f === "cadastro" ? p.status === "ativo" && p.cad.pendente : f === "crianca" ? p.status === "ativo" && p.tipo === "crianca" : p.status === "encerrado");
  const vis = useMemo(() => lista.filter((p) => passa(p, filtro) && (!busca || p.nome.toLowerCase().includes(busca.toLowerCase()))), [lista, filtro, busca]);
  const sel = selId ? lista.find((p) => p.id === selId) : undefined;

  return (
    <div className={sel ? "ped-wrap m-vendo" : "ped-wrap"}>
      <div className="barra">
        <label className="busca"><Icone nome="busca" tam={18} /><span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Buscar paciente</span><input type="search" placeholder="Buscar pelo nome" value={busca} onChange={(e) => setBusca(e.target.value)} /></label>
        <div className="filtros" role="group" aria-label="Filtrar pacientes">
          {FILTROS.map(([k, n]) => <button key={k} type="button" className={filtro === k ? "fi on" : "fi"} aria-pressed={filtro === k} onClick={() => setFiltro(k)}>{n} <b>{lista.filter((p) => passa(p, k)).length}</b></button>)}
        </div>
        <button type="button" className="bt" onClick={() => setAbrirNovo(true)}><Icone nome="pacientes" tam={18} />Novo paciente</button>
      </div>
      {abrirNovo ? <NovoPaciente pedido={pedido} aoFechar={() => { setAbrirNovo(false); if (novo) router.push("/painel/pacientes"); }} /> : null}
      <div className="ped">
        <div className="ped-lista">
          {vis.map((p) => (
            <Link key={p.id} href={`/painel/pacientes?id=${p.id}`} scroll={false} className={sel?.id === p.id ? "pi on" : "pi"}>
              <span className={p.tipo === "crianca" ? "av k" : "av"}>{iniciais(p.nome)}</span>
              <span className="tx">
                <span style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><b>{p.nome}</b><span style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>{p.selo ? <span className={p.selo.cls}>{p.selo.t}</span> : null}<span className={p.tipo === "crianca" ? "pill p-in" : "pill p-on"}>{p.tipo === "crianca" ? "Criança" : "Adulta"}</span></span></span>
                <span className="q">{fixoTexto(p.fixoDia, p.fixoHora)}</span>
                <span className="m">{p.status === "ativo" ? <span className={p.cad.cls}>{p.cad.etiqueta}</span> : "Encerrado"}{p.valor != null ? ` · ${reais(p.valor)}` : ""}</span>
              </span>
            </Link>
          ))}
          {!vis.length ? <div className="card" style={{ textAlign: "center", color: "#6B5A5E" }}><b style={{ display: "block", color: "#7A2335", fontSize: 17, marginBottom: 4 }}>{lista.length ? "Ninguém encontrado." : "Nenhum paciente ainda."}</b>{lista.length ? "Tente outro nome ou outro filtro." : "Cadastre pelo botão Novo paciente ou a partir de um pedido confirmado."}</div> : null}
        </div>
        {sel && detalhe ? (
          <section className="card ped-det">
            <Link href="/painel/pacientes" className="bt3 voltar-m" scroll={false}><Icone nome="voltar" tam={18} /> Todos os pacientes</Link>
            <Ficha key={sel.id} p={sel} det={detalhe} />
          </section>
        ) : (
          <section className="card ped-det" style={{ color: "#6B5A5E", textAlign: "center", justifyContent: "center" }}>
            {lista.length ? "Escolha um paciente na lista para ver a ficha." : "As fichas aparecem aqui."}
          </section>
        )}
      </div>
    </div>
  );
}
