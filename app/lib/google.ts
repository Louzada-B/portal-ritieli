import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { supabaseAdmin } from "./supabase/admin";
import { siteUrl } from "../site";
import type { Periodo } from "./agenda";

// Conexão com o Google Agenda da Ritieli: horários ocupados e eventos com Meet.
// A autorização fica no banco criptografada com a CHAVE_CRIPTO.

export const ESCOPOS = ["https://www.googleapis.com/auth/calendar.events", "https://www.googleapis.com/auth/calendar.freebusy"];
export const redirectGoogle = () => `${siteUrl}/api/google/retorno`;

function chave() {
  const k = process.env.CHAVE_CRIPTO;
  if (!k) throw new Error("CHAVE_CRIPTO ausente");
  return createHash("sha256").update(k).digest();
}

export function cifrar(texto: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", chave(), iv);
  const dados = Buffer.concat([c.update(texto, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), dados].map((b) => b.toString("base64")).join(".");
}

export function decifrar(pacote: string) {
  const [iv, tag, dados] = pacote.split(".").map((p) => Buffer.from(p, "base64"));
  const d = createDecipheriv("aes-256-gcm", chave(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(dados), d.final()]).toString("utf8");
}

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
  const { data } = await supabaseAdmin().from("google_conexao").select("refresh_token_cripto, bloquear_site, enviar_eventos, email").eq("id", 1).maybeSingle();
  return (data as Conexao) ?? null;
}

async function acesso(con: Conexao) {
  const t = await token({ refresh_token: decifrar(con.refresh_token_cripto), grant_type: "refresh_token" });
  return t.access_token;
}

// Horários ocupados na agenda principal, para bloquear o site.
export async function ocupadosGoogle(dias: number): Promise<{ periodos: Periodo[]; erro: boolean }> {
  const con = await conexao();
  if (!con || !con.bloquear_site) return { periodos: [], erro: false };
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
  return { periodos: busy.map((b) => ({ inicio: new Date(b.start), fim: new Date(b.end) })), erro: false };
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
}
