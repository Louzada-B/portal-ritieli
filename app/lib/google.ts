import "server-only";
import { cifrar, decifrar } from "./cripto";
import { supabaseAdmin } from "./supabase/admin";
import { siteUrl } from "../site";
import type { Periodo } from "./agenda";

// Cores dos eventos criados pelo portal na Google Agenda (para a Ritieli reconhecer de longe).
// Códigos do Google: 3 = Uva (sessões), 4 = Flamingo (conversas iniciais).
export const COR_SESSAO = "3";
export const COR_CONVERSA = "4";

// Conexão com o Google Agenda da Ritieli: horários ocupados e eventos com Meet.
// A autorização fica no banco criptografada com a CHAVE_CRIPTO.
export { cifrar, decifrar };

export const ESCOPOS = ["https://www.googleapis.com/auth/calendar.events", "https://www.googleapis.com/auth/calendar.freebusy"];
export const redirectGoogle = () => `${siteUrl}/api/google/retorno`;

export function urlAutorizacao(estado: string) {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectGoogle(),
    response_type: "code",
    scope: ESCOPOS.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state: estado,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

async function token(params: Record<string, string>) {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, ...params }),
    cache: "no-store",
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`google token: ${j.error || r.status}`);
  return j as { access_token: string; refresh_token?: string; scope?: string };
}

export async function trocarCodigo(code: string) {
  return token({ code, grant_type: "authorization_code", redirect_uri: redirectGoogle() });
}

type Conexao = { refresh_token_cripto: string; bloquear_site: boolean; enviar_eventos: boolean; email: string | null };

export async function conexao(): Promise<Conexao | null> {
  if (conexaoCache && conexaoCache.ate > Date.now()) return conexaoCache.dados;
  const { data } = await supabaseAdmin().from("google_conexao").select("refresh_token_cripto, bloquear_site, enviar_eventos, email").eq("id", 1).maybeSingle();
  conexaoCache = { dados: (data as Conexao) ?? null, ate: Date.now() + 30 * 1000 };
  return conexaoCache.dados;
}

// Guarda o token de acesso na memória do servidor (vale 1 hora no Google; usamos 50 min)
// e o resultado de "ocupados" por 60 segundos, para o painel não esperar o Google a cada clique.
let tokenCache: { valor: string; ate: number; chave: string } | null = null;
let ocupadosCache: { dados: Periodo[]; ate: number; dias: number } | null = null;
let conexaoCache: { dados: Conexao | null; ate: number } | null = null;

export function limparCacheGoogle() {
  tokenCache = null;
  ocupadosCache = null;
  conexaoCache = null;
}

async function acesso(con: Conexao) {
  if (tokenCache && tokenCache.chave === con.refresh_token_cripto && tokenCache.ate > Date.now()) return tokenCache.valor;
  const t = await token({ refresh_token: decifrar(con.refresh_token_cripto), grant_type: "refresh_token" });
  tokenCache = { valor: t.access_token, ate: Date.now() + 50 * 60 * 1000, chave: con.refresh_token_cripto };
  return t.access_token;
}

// Horários ocupados na agenda principal, para bloquear o site.
export async function ocupadosGoogle(dias: number): Promise<{ periodos: Periodo[]; erro: boolean }> {
  const con = await conexao();
  if (!con || !con.bloquear_site) return { periodos: [], erro: false };
  if (ocupadosCache && ocupadosCache.ate > Date.now() && ocupadosCache.dias >= dias) return { periodos: ocupadosCache.dados, erro: false };
  const at = await acesso(con);
  const inicio = new Date();
  const fim = new Date(inicio.getTime() + (dias + 1) * 86400 * 1000);
  const [ev, fb] = await Promise.all([eventosOcupados(at, inicio, fim), livreOcupado(at, inicio, fim)]);
  if (!ev || !fb) return { periodos: [], erro: true };
  const periodos = [...ev, ...fb].map((p) => ({ inicio: p.inicio, fim: p.fim }));
  ocupadosCache = { dados: periodos, ate: Date.now() + 60 * 1000, dias };
  return { periodos, erro: false };
}

// Cria o evento da conversa inicial na agenda dela, com sala do Meet.
export async function criarEvento(p: { id: string; titulo: string; inicio: Date; fim: Date; descricao: string }) {
  const con = await conexao();
  if (!con || !con.enviar_eventos) return null;
  const at = await acesso(con);
  const r = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1", {
    method: "POST",
    headers: { Authorization: `Bearer ${at}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      summary: p.titulo,
      description: p.descricao,
      start: { dateTime: p.inicio.toISOString(), timeZone: "America/Sao_Paulo" },
      end: { dateTime: p.fim.toISOString(), timeZone: "America/Sao_Paulo" },
      conferenceData: { createRequest: { requestId: p.id, conferenceSolutionKey: { type: "hangoutsMeet" } } },
      reminders: { useDefault: true },
      colorId: COR_CONVERSA,
    }),
    cache: "no-store",
  });
  const j = await r.json();
  ocupadosCache = null;
  if (!r.ok) throw new Error(`google evento: ${j.error?.message || r.status}`);
  return { id: j.id as string, meet: (j.hangoutLink as string) || null };
}

export async function apagarEvento(id: string) {
  const con = await conexao();
  if (!con) return;
  const at = await acesso(con);
  await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${at}` },
    cache: "no-store",
  });
  ocupadosCache = null;
}

// Sessões semanais: evento que se repete toda semana no horário fixo, com sala do Meet.
// O link é o mesmo em todas as sessões, e o evento bloqueia o horário na agenda do site.
// "ate" (aaaa-mm-dd) é o último dia da série; sem ele, segue até encerrar.
// "conferencia" reaproveita a sala de um evento anterior (o link não muda).
export function regraSemanal(ate?: string | null) {
  if (!ate) return "RRULE:FREQ=WEEKLY";
  const [a, m, d] = ate.split("-").map(Number);
  // 23:59:59 em Brasília = 02:59:59 UTC do dia seguinte.
  const u = new Date(Date.UTC(a, m - 1, d, 23, 59, 59) + 3 * 3600000);
  const z = u.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return `RRULE:FREQ=WEEKLY;UNTIL=${z}`;
}

async function gcal(caminho: string, init: RequestInit = {}) {
  const con = await conexao();
  if (!con) throw new Error("sem_google");
  const at = await acesso(con);
  const r = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/${caminho}`, {
    ...init,
    headers: { Authorization: `Bearer ${at}`, "Content-Type": "application/json", ...(init.headers || {}) },
    cache: "no-store",
  });
  const j = r.status === 204 ? {} : await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`google: ${j.error?.message || r.status}`);
  return j;
}

export async function criarEventoSemanal(p: { chave: string; titulo: string; inicio: Date; duracaoMin: number; descricao: string; ate?: string | null; conferencia?: unknown }) {
  const fim = new Date(p.inicio.getTime() + p.duracaoMin * 60000);
  const j = await gcal("events?conferenceDataVersion=1", {
    method: "POST",
    body: JSON.stringify({
      summary: p.titulo,
      description: p.descricao,
      start: { dateTime: p.inicio.toISOString(), timeZone: "America/Sao_Paulo" },
      end: { dateTime: fim.toISOString(), timeZone: "America/Sao_Paulo" },
      recurrence: [regraSemanal(p.ate)],
      conferenceData: p.conferencia || { createRequest: { requestId: p.chave, conferenceSolutionKey: { type: "hangoutsMeet" } } },
      reminders: { useDefault: true },
      colorId: COR_SESSAO,
    }),
  });
  ocupadosCache = null;
  return { id: j.id as string, meet: (j.hangoutLink as string) || null };
}

export async function obterEvento(id: string) {
  return gcal(`events/${encodeURIComponent(id)}`);
}

// Muda só o último dia da série (ou tira o fim, com null).
export async function mudarFimSerie(id: string, ate: string | null) {
  await gcal(`events/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ recurrence: [regraSemanal(ate)] }) });
  ocupadosCache = null;
}

// Uma ocorrência da série, pelo horário original dela (mesmo se já foi movida ou cancelada).
// O Google dá às ocorrências o id "<série>_<início original em UTC>"; se não achar assim,
// procura entre as ocorrências próximas e confere o horário original exato.
// Nunca devolve outra ocorrência no lugar: sem a certa, dá erro.
const carimbo = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
type Instancia = { id: string; status?: string; start?: { dateTime?: string }; originalStartTime?: { dateTime?: string } };
const mesmaHora = (iso: string | undefined, d: Date) => !!iso && Math.abs(new Date(iso).getTime() - d.getTime()) < 1000;

export async function instanciaDaSerie(id: string, original: Date): Promise<Instancia> {
  const direto = (await gcal(`events/${encodeURIComponent(`${id}_${carimbo(original)}`)}`).catch(() => null)) as Instancia | null;
  if (direto && mesmaHora(direto.originalStartTime?.dateTime, original)) return direto;
  const dia = 24 * 3600000;
  const q = new URLSearchParams({ showDeleted: "true", maxResults: "2500", timeMin: new Date(original.getTime() - 120 * dia).toISOString(), timeMax: new Date(original.getTime() + 120 * dia).toISOString() });
  const lista = await gcal(`events/${encodeURIComponent(id)}/instances?${q}`);
  const inst = ((lista.items || []) as Instancia[]).find((x) => mesmaHora(x.originalStartTime?.dateTime, original));
  if (!inst) throw new Error("sem_ocorrencia");
  return inst;
}

// Move uma única ocorrência da série (as outras continuam iguais, com a mesma sala).
export async function moverOcorrencia(id: string, original: Date, novoInicio: Date, duracaoMin: number) {
  const inst = await instanciaDaSerie(id, original);
  const fim = new Date(novoInicio.getTime() + duracaoMin * 60000);
  await gcal(`events/${encodeURIComponent(inst.id)}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "confirmed", start: { dateTime: novoInicio.toISOString(), timeZone: "America/Sao_Paulo" }, end: { dateTime: fim.toISOString(), timeZone: "America/Sao_Paulo" } }),
  });
  ocupadosCache = null;
}

// Compromissos da agenda principal numa janela, lidos evento por evento.
// Pega o que o "livre/ocupado" do Google às vezes deixa passar (ex.: evento marcado como
// "Disponível"): qualquer compromisso com horário conta, menos os que ela recusou.
// Eventos de dia inteiro (aniversários, lembretes) não bloqueiam.
async function eventosOcupados(at: string, inicio: Date, fim: Date): Promise<Periodo[] | null> {
  const lista: Periodo[] = [];
  let pagina: string | undefined;
  for (let i = 0; i < 10; i++) {
    const q = new URLSearchParams({ timeMin: inicio.toISOString(), timeMax: fim.toISOString(), singleEvents: "true", maxResults: "2500", showDeleted: "false" });
    if (pagina) q.set("pageToken", pagina);
    const r = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${q}`, { headers: { Authorization: `Bearer ${at}` }, cache: "no-store" });
    if (!r.ok) return null;
    const j = await r.json();
    for (const e of (j.items ?? []) as { status?: string; start?: { dateTime?: string }; end?: { dateTime?: string }; summary?: string; attendees?: { self?: boolean; responseStatus?: string }[] }[]) {
      if (e.status === "cancelled" || !e.start?.dateTime || !e.end?.dateTime) continue;
      if ((e.attendees ?? []).some((a) => a.self && a.responseStatus === "declined")) continue;
      lista.push({ inicio: new Date(e.start.dateTime), fim: new Date(e.end.dateTime), titulo: e.summary || undefined });
    }
    pagina = j.nextPageToken;
    if (!pagina) break;
  }
  return lista;
}

async function livreOcupado(at: string, inicio: Date, fim: Date): Promise<Periodo[] | null> {
  const r = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    headers: { Authorization: `Bearer ${at}`, "Content-Type": "application/json" },
    body: JSON.stringify({ timeMin: inicio.toISOString(), timeMax: fim.toISOString(), timeZone: "America/Sao_Paulo", items: [{ id: "primary" }] }),
    cache: "no-store",
  });
  if (!r.ok) return null;
  const j = await r.json();
  return ((j.calendars?.primary?.busy ?? []) as { start: string; end: string }[]).map((b) => ({ inicio: new Date(b.start), fim: new Date(b.end) }));
}

// Horários ocupados na agenda do Google numa janela (sem cache), para conferir conflitos.
// Junta os eventos (com o nome do compromisso) e o livre/ocupado. Se o Google não responder, devolve null.
export async function ocupadosEntre(inicio: Date, fim: Date): Promise<Periodo[] | null> {
  const con = await conexao();
  if (!con) return [];
  const at = await acesso(con);
  const [ev, fb] = await Promise.all([eventosOcupados(at, inicio, fim), livreOcupado(at, inicio, fim)]);
  if (!ev || !fb) return null;
  return [...ev, ...fb];
}

// Evento de uma sessão avulsa. Reaproveita a sala do Meet do paciente, quando há.
export async function criarEventoUnico(p: { titulo: string; inicio: Date; duracaoMin: number; descricao: string; conferencia?: unknown }) {
  const fim = new Date(p.inicio.getTime() + p.duracaoMin * 60000);
  const j = await gcal("events?conferenceDataVersion=1", {
    method: "POST",
    body: JSON.stringify({
      summary: p.titulo,
      description: p.descricao,
      start: { dateTime: p.inicio.toISOString(), timeZone: "America/Sao_Paulo" },
      end: { dateTime: fim.toISOString(), timeZone: "America/Sao_Paulo" },
      ...(p.conferencia ? { conferenceData: p.conferencia } : {}),
      reminders: { useDefault: true },
      colorId: COR_SESSAO,
    }),
  });
  ocupadosCache = null;
  return j.id as string;
}

export async function moverEvento(id: string, inicio: Date, duracaoMin: number) {
  const fim = new Date(inicio.getTime() + duracaoMin * 60000);
  await gcal(`events/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ start: { dateTime: inicio.toISOString(), timeZone: "America/Sao_Paulo" }, end: { dateTime: fim.toISOString(), timeZone: "America/Sao_Paulo" } }),
  });
  ocupadosCache = null;
}

// Cancela (ou devolve) uma única ocorrência da série semanal.
export async function situacaoOcorrencia(id: string, original: Date, cancelar: boolean) {
  const inst = await instanciaDaSerie(id, original);
  await gcal(`events/${encodeURIComponent(inst.id)}`, { method: "PATCH", body: JSON.stringify({ status: cancelar ? "cancelled" : "confirmed" }) });
  ocupadosCache = null;
}

// Deixa uma ocorrência exatamente como deve estar (no horário certo, ativa ou cancelada).
// Devolve true quando precisou mudar algo.
export async function acertarOcorrencia(id: string, original: Date, inicio: Date, cancelada: boolean, duracaoMin: number): Promise<boolean> {
  const inst = await instanciaDaSerie(id, original);
  const estaCancelada = inst.status === "cancelled";
  if (cancelada) {
    if (estaCancelada) return false;
    await gcal(`events/${encodeURIComponent(inst.id)}`, { method: "PATCH", body: JSON.stringify({ status: "cancelled" }) });
  } else {
    if (!estaCancelada && mesmaHora(inst.start?.dateTime, inicio)) return false;
    const fim = new Date(inicio.getTime() + duracaoMin * 60000);
    await gcal(`events/${encodeURIComponent(inst.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "confirmed", start: { dateTime: inicio.toISOString(), timeZone: "America/Sao_Paulo" }, end: { dateTime: fim.toISOString(), timeZone: "America/Sao_Paulo" } }),
    });
  }
  ocupadosCache = null;
  return true;
}

// Troca o título de um evento (ex.: o nome do paciente mudou).
export async function renomearEvento(id: string, titulo: string) {
  await gcal(`events/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ summary: titulo }) });
}

// Sala do Meet de um evento, para reaproveitar em outro.
export async function salaDoEvento(id: string) {
  const ev = await obterEvento(id).catch(() => null);
  if (!ev?.conferenceData?.conferenceId) return undefined;
  const { createRequest: _c, ...resto } = ev.conferenceData;
  return resto as unknown;
}
