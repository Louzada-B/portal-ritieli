import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { local, deLocal, fmtDiaLongo, fmtHora } from "./agenda";
import { PRAZO_HORAS } from "./dados";
import {
  enviarUmaVez,
  emailLembreteSessao,
  emailLembreteConversa,
  emailFichaPendente,
  emailTermoPendente,
  emailParaRitieli,
} from "./emails";

// Lembretes por e-mail, rodados uma vez por dia (ver vercel.json).
//  Para a pessoa: sessão 2 dias antes · conversa inicial no dia · ficha parada (3 dias) · termo parado (2 dias)
//  Para a Ritieli: pedido perto de vencer · fim previsto em até 7 dias
// Cada e-mail sai uma única vez (tabela envios_email). Falhou? Tenta de novo na rodada seguinte.

const DIA = 86400000;
const pausa = () => new Promise((r) => setTimeout(r, 600)); // o Resend aceita poucos envios por segundo

const dataBr = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "numeric", month: "long" }).format(new Date(iso));

type Pac = { id: string; tipo: "adulta" | "crianca"; nome: string; email: string | null; meet_link: string | null; lembretes_email: boolean; status: string; ficha_em: string | null; fim: string | null };
type Contato = { nome: string; email: string };

export type Resumo = Record<string, number>;

// Para quem vai o e-mail: a própria pessoa ou, no caso de criança, o primeiro responsável com e-mail.
async function contatos(sb: SupabaseClient, pacs: Pac[]) {
  const criancas = pacs.filter((p) => p.tipo === "crianca").map((p) => p.id);
  const resp = new Map<string, Contato>();
  if (criancas.length) {
    const { data } = await sb.from("paciente_responsaveis").select("paciente_id, ordem, responsaveis(nome, email)").in("paciente_id", criancas).order("ordem");
    for (const l of data ?? []) {
      const r = l.responsaveis as unknown as { nome: string; email: string | null } | null;
      if (r?.email && !resp.has(l.paciente_id as string)) resp.set(l.paciente_id as string, { nome: r.nome, email: r.email });
    }
  }
  return (p: Pac): Contato | null => {
    if (!p.lembretes_email) return null;
    const r = resp.get(p.id);
    if (r) return r;
    return p.email ? { nome: p.tipo === "crianca" ? "responsável" : p.nome, email: p.email } : null;
  };
}

async function pacientesPor(sb: SupabaseClient, ids: string[]) {
  const mapa = new Map<string, Pac>();
  if (!ids.length) return mapa;
  const { data } = await sb.from("pacientes").select("id, tipo, nome, email, meet_link, lembretes_email, status, ficha_em, fim").in("id", ids);
  for (const p of (data ?? []) as Pac[]) mapa.set(p.id, p);
  return mapa;
}

export async function rodarLembretes(sb: SupabaseClient): Promise<Resumo> {
  const agora = new Date();
  const l = local(agora);
  const diaIni = (n: number) => deLocal(l.ano, l.mes, l.dia + n);
  const hojeStr = `${l.ano}-${String(l.mes + 1).padStart(2, "0")}-${String(l.dia).padStart(2, "0")}`;
  const r: Resumo = { sessao: 0, conversa: 0, ficha: 0, termo: 0, pedido_vencer: 0, fim_previsto: 0 };

  // 1. Sessões de amanhã e depois de amanhã, que ainda não receberam o lembrete.
  {
    const { data: ses } = await sb
      .from("sessoes").select("id, paciente_id, inicio").eq("status", "agendada")
      .gte("inicio", diaIni(1).toISOString()).lt("inicio", diaIni(3).toISOString()).order("inicio");
    const pacs = await pacientesPor(sb, [...new Set((ses ?? []).map((s) => s.paciente_id as string))]);
    const contato = await contatos(sb, [...pacs.values()]);
    for (const s of ses ?? []) {
      const p = pacs.get(s.paciente_id as string);
      const c = p && contato(p);
      if (!p || !c) continue;
      const inicio = new Date(s.inicio as string);
      const ok = await enviarUmaVez(sb, "lembrete_sessao", `${s.id}:${s.inicio}`, () =>
        emailLembreteSessao({ para: c.email, nome: c.nome, sessaoDe: p.tipo === "crianca" ? p.nome : undefined, dia: fmtDiaLongo(inicio), hora: fmtHora(inicio), meet: p.meet_link }),
      );
      if (ok) r.sessao++, await pausa();
    }
  }

  // 2. Conversa inicial de hoje. Se foi confirmada hoje mesmo, o e-mail de confirmação já serve.
  {
    const { data: ped } = await sb
      .from("pedidos").select("id, nome, email, inicio, meet_link, respondido_em").eq("status", "confirmado")
      .gte("inicio", new Date(agora.getTime() + 30 * 60000).toISOString()).lt("inicio", diaIni(1).toISOString());
    for (const p of ped ?? []) {
      if (!p.meet_link || !p.email) continue;
      if (p.respondido_em && new Date(p.respondido_em as string) >= diaIni(0)) continue;
      const inicio = new Date(p.inicio as string);
      const ok = await enviarUmaVez(sb, "lembrete_conversa", `${p.id}:${p.inicio}`, () =>
        emailLembreteConversa({ para: p.email as string, nome: p.nome as string, hora: fmtHora(inicio), meet: p.meet_link as string }),
      );
      if (ok) r.conversa++, await pausa();
    }
  }

  // 3. Ficha enviada há 3 dias ou mais e ainda não preenchida (só a ficha mais recente de cada paciente).
  {
    const { data: fs } = await sb.from("fichas").select("id, paciente_id, expira_em, preenchida_em, enviada_em").order("criado_em", { ascending: false });
    const ultima = new Map<string, NonNullable<typeof fs>[number]>();
    for (const f of fs ?? []) if (!ultima.has(f.paciente_id as string)) ultima.set(f.paciente_id as string, f);
    const pend = [...ultima.values()].filter(
      (f) => !f.preenchida_em && f.enviada_em && new Date(f.enviada_em as string).getTime() <= agora.getTime() - 3 * DIA && new Date(f.expira_em as string) > agora,
    );
    const pacs = await pacientesPor(sb, pend.map((f) => f.paciente_id as string));
    const contato = await contatos(sb, [...pacs.values()]);
    for (const f of pend) {
      const p = pacs.get(f.paciente_id as string);
      const c = p && contato(p);
      if (!p || !c || p.status !== "ativo" || p.ficha_em) continue;
      const ok = await enviarUmaVez(sb, "lembrete_ficha", f.id as string, () =>
        emailFichaPendente({ para: c.email, nome: c.nome, paciente: p.tipo === "crianca" ? p.nome : undefined, ate: dataBr(f.expira_em as string) }),
      );
      if (ok) r.ficha++, await pausa();
    }
  }

  // 4. Termo enviado há 2 dias ou mais e ainda não aceito.
  {
    const { data: ts } = await sb.from("termos").select("id, paciente_id, status, link_enviado_em").neq("status", "cancelado").order("enviado_em", { ascending: false });
    const aceitos = new Set((ts ?? []).filter((t) => t.status === "aceito").map((t) => t.paciente_id as string));
    const ultimo = new Map<string, NonNullable<typeof ts>[number]>();
    for (const t of ts ?? []) if (!ultimo.has(t.paciente_id as string)) ultimo.set(t.paciente_id as string, t);
    const pend = [...ultimo.values()].filter(
      (t) => t.status === "enviado" && !aceitos.has(t.paciente_id as string) && t.link_enviado_em && new Date(t.link_enviado_em as string).getTime() <= agora.getTime() - 2 * DIA,
    );
    const pacs = await pacientesPor(sb, pend.map((t) => t.paciente_id as string));
    const contato = await contatos(sb, [...pacs.values()]);
    for (const t of pend) {
      const p = pacs.get(t.paciente_id as string);
      const c = p && contato(p);
      if (!p || !c || p.status !== "ativo") continue;
      const ok = await enviarUmaVez(sb, "lembrete_termo", t.id as string, () =>
        emailTermoPendente({ para: c.email, nome: c.nome, paciente: p.tipo === "crianca" ? p.nome : undefined }),
      );
      if (ok) r.termo++, await pausa();
    }
  }

  // 5. Para a Ritieli: pedido esperando há 12h ou mais. A rodada é diária, então o aviso chega
  //    com 12 a 36 horas ainda sobrando dos 48 do prazo.
  {
    const { data: ped } = await sb
      .from("pedidos").select("id, nome, criado_em").eq("status", "aguardando")
      .lte("criado_em", new Date(agora.getTime() - 12 * 3600000).toISOString())
      .gt("criado_em", new Date(agora.getTime() - PRAZO_HORAS * 3600000).toISOString());
    for (const p of ped ?? []) {
      const resta = Math.max(1, Math.floor(PRAZO_HORAS - (agora.getTime() - new Date(p.criado_em as string).getTime()) / 3600000));
      const ok = await enviarUmaVez(sb, "pedido_vencer", p.id as string, () =>
        emailParaRitieli({ assunto: `Pedido de conversa perto de vencer · ${p.nome}`, titulo: "Pedido perto de vencer", nome: p.nome as string, texto: `Faltam cerca de ${resta} horas para responder. Depois disso o horário é liberado no site.`, caminho: "/painel/pedidos" }),
      );
      if (ok) r.pedido_vencer++, await pausa();
    }
  }

  // 6. Para a Ritieli: acompanhamento com fim previsto nos próximos 7 dias.
  {
    const ate = new Date(diaIni(7).getTime());
    const ateStr = `${local(ate).ano}-${String(local(ate).mes + 1).padStart(2, "0")}-${String(local(ate).dia).padStart(2, "0")}`;
    const { data: ps } = await sb.from("pacientes").select("id, nome, fim").eq("status", "ativo").gte("fim", hojeStr).lte("fim", ateStr);
    for (const p of ps ?? []) {
      const dias = Math.round((Date.parse(`${p.fim}T00:00:00Z`) - Date.parse(`${hojeStr}T00:00:00Z`)) / DIA);
      const quando = dias === 0 ? "hoje" : dias === 1 ? "amanhã" : `em ${dias} dias`;
      const fimBr = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "numeric", month: "long" }).format(new Date(`${p.fim}T00:00:00Z`));
      const ok = await enviarUmaVez(sb, "fim_previsto", `${p.id}:${p.fim}`, () =>
        emailParaRitieli({ assunto: `Fim do acompanhamento ${quando} · ${p.nome}`, titulo: "Fim previsto chegando", nome: p.nome as string, texto: `O acompanhamento tem fim previsto ${quando} (${fimBr}). Se for continuar, ajuste a data em Editar dados. Se for encerrar, o prontuário fica guardado por 5 anos.`, caminho: `/painel/pacientes?id=${p.id}` }),
      );
      if (ok) r.fim_previsto++, await pausa();
    }
  }

  return r;
}
