import "server-only";
import { cifrar, decifrar } from "./cripto";
import { supabaseAdmin } from "./supabase/admin";
import { siteUrl } from "../site";
import type { Periodo } from "./agenda";

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
  const r = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    headers: { Authorization: `Bearer ${at}`, "Content-Type": "application/json" },
    body: JSON.stringify({ timeMin: inicio.toISOString(), timeMax: fim.toISOString(), timeZone: "America/Sao_Paulo", items: [{ id: "primary" }] }),
    cache: "no-store",
  });
  if (!r.ok) return { periodos: [], erro: true };
  const j = await r.json();
  const busy = (j.calendars?.primary?.busy ?? []) as { start: string; end: string }[];
  const periodos = busy.map((b) => ({ inicio: new Date(b.start), fim: new Date(b.end) }));
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
export async function criarEventoSemanal(p: { chave: string; titulo: string; inicio: Date; duracaoMin: number; descricao: string }) {
  const con = await conexao();
  if (!con) throw new Error("sem_google");
  const at = await acesso(con);
  const fim = new Date(p.inicio.getTime() + p.duracaoMin * 60000);
  const r = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1", {
    method: "POST",
    headers: { Authorization: `Bearer ${at}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      summary: p.titulo,
      description: p.descricao,
      start: { dateTime: p.inicio.toISOString(), timeZone: "America/Sao_Paulo" },
      end: { dateTime: fim.toISOString(), timeZone: "America/Sao_Paulo" },
      recurrence: ["RRULE:FREQ=WEEKLY"],
      conferenceData: { createRequest: { requestId: p.chave, conferenceSolutionKey: { type: "hangoutsMeet" } } },
      reminders: { useDefault: true },
    }),
    cache: "no-store",
  });
  const j = await r.json();
  ocupadosCache = null;
  if (!r.ok) throw new Error(`google semanal: ${j.error?.message || r.status}`);
  return { id: j.id as string, meet: (j.hangoutLink as string) || null };
}
