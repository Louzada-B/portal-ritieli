import "server-only";
import { cache } from "react";
import { createHash, randomBytes, randomInt, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "./supabase/admin";

// Login da área da(o) paciente. É separado do login do painel (não usa o Supabase Auth):
// quem entra aqui nunca recebe uma sessão que valha no painel ou direto no banco.
// Senhas e códigos de sessão ficam no banco só como hash. Tudo que a paciente vê é
// buscado pelo servidor, sempre filtrado pelos pacientes que o login dela pode ver.

const scrypt = promisify(scryptCb) as (senha: string, sal: Buffer, tamanho: number) => Promise<Buffer>;

export const ROTA = "/area-paciente";
export const COOKIE = "pa_sessao";
const DOZE_HORAS = 12 * 3600 * 1000;
const TRINTA_DIAS = 30 * 86400 * 1000;
export const PROVISORIA_VALE_MS = 24 * 3600 * 1000;

// ---------- senhas ----------

const SAL_FALSO = Buffer.alloc(16, 7);

export async function hashSenha(senha: string) {
  const sal = randomBytes(16);
  const chave = await scrypt(senha, sal, 64);
  return `s1$${sal.toString("base64")}$${chave.toString("base64")}`;
}

// Sem hash guardado, faz a mesma conta mesmo assim, para o tempo não revelar se o e-mail existe.
export async function conferirSenha(senha: string, guardado: string | null | undefined) {
  if (senha.length > 200) return false;
  if (!guardado) {
    await scrypt(senha, SAL_FALSO, 64);
    return false;
  }
  const [versao, sal, hash] = guardado.split("$");
  if (versao !== "s1" || !sal || !hash) return false;
  const esperado = Buffer.from(hash, "base64");
  const obtido = await scrypt(senha, Buffer.from(sal, "base64"), esperado.length);
  return obtido.length === esperado.length && timingSafeEqual(obtido, esperado);
}

export function erroDeSenha(s: string): string | null {
  if (s.length < 8) return "Use pelo menos 8 caracteres.";
  if (s.length > 128) return "Use no máximo 128 caracteres.";
  if (!/[A-Za-zÀ-ÿ]/.test(s) || !/[0-9]/.test(s)) return "Use letras e números.";
  return null;
}

// Sem 0/O, 1/l/I: a pessoa pode precisar digitar.
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
export async function novaProvisoria() {
  let senha = "";
  for (let i = 0; i < 10; i++) senha += ALFABETO[randomInt(ALFABETO.length)];
  return { senha, hash: await hashSenha(senha), expira: new Date(Date.now() + PROVISORIA_VALE_MS).toISOString() };
}

// ---------- limite de tentativas (usa a tabela "tentativas") ----------

export const hashCurto = (t: string) => createHash("sha256").update(`pa|${t}`).digest("hex").slice(0, 24);

export async function ipHash() {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") || "").split(",")[0].trim() || h.get("x-real-ip") || "sem-ip";
  return hashCurto(ip);
}

export async function passouDoLimite(sb: SupabaseClient, chave: string, max: number, minutos: number) {
  const desde = new Date(Date.now() - minutos * 60000).toISOString();
  const { count } = await sb.from("tentativas").select("id", { count: "exact", head: true }).eq("chave", chave).gte("criado_em", desde);
  return (count ?? 0) >= max;
}
export async function anotarTentativa(sb: SupabaseClient, chave: string) {
  await sb.from("tentativas").insert({ chave });
}

// ---------- sessão ----------

const hashSessao = (token: string) => createHash("sha256").update(`pa-sessao|${token}`).digest("hex");

export async function abrirSessao(sb: SupabaseClient, acessoId: string, o: { manter: boolean; trocarSenha: boolean }) {
  const token = randomBytes(32).toString("base64url");
  const duracao = o.manter ? TRINTA_DIAS : DOZE_HORAS;
  await sb.from("acessos_sessao").delete().eq("acesso_id", acessoId).lt("expira_em", new Date().toISOString());
  const { error } = await sb.from("acessos_sessao").insert({
    acesso_id: acessoId,
    token_hash: hashSessao(token),
    trocar_senha: o.trocarSenha,
    expira_em: new Date(Date.now() + duracao).toISOString(),
  });
  if (error) throw new Error("Não deu para abrir a sessão");
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: ROTA,
    ...(o.manter ? { maxAge: duracao / 1000 } : {}),
  });
}

export async function encerrarSessaoAtual() {
  const loja = await cookies();
  const token = loja.get(COOKIE)?.value;
  if (token) await supabaseAdmin().from("acessos_sessao").delete().eq("token_hash", hashSessao(token));
  loja.delete({ name: COOKIE, path: ROTA });
}

export type AcessoBasico = {
  id: string;
  email: string;
  nome: string;
  paciente_id: string | null;
  responsavel_id: string | null;
  senha_trocada_em: string | null;
};
export type SessaoPaciente = { id: string; trocarSenha: boolean; acesso: AcessoBasico };

// Lê o cookie e confere no banco. Vale uma vez por requisição.
export const sessaoAtual = cache(async (): Promise<SessaoPaciente | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const { data } = await supabaseAdmin()
    .from("acessos_sessao")
    .select("id, trocar_senha, expira_em, acesso:acessos_paciente(id, email, nome, paciente_id, responsavel_id, ativo, senha_trocada_em)")
    .eq("token_hash", hashSessao(token))
    .maybeSingle();
  if (!data || new Date(data.expira_em as string).getTime() <= Date.now()) return null;
  const bruto = data.acesso as unknown;
  const a = (Array.isArray(bruto) ? bruto[0] : bruto) as (AcessoBasico & { ativo: boolean }) | undefined;
  if (!a || !a.ativo) return null;
  return { id: data.id as string, trocarSenha: !!data.trocar_senha, acesso: a };
});

// ---------- quem a pessoa pode ver ----------

export type PacienteArea = {
  id: string;
  nome: string;
  tipo: "adulta" | "crianca";
  email: string | null;
  whatsapp: string | null;
  cidade: string | null;
  meet_link: string | null;
  valor_centavos: number | null;
  fixo_dia: number | null;
  fixo_hora: string | null;
  cpf_final: string | null;
  nascimento_cripto: string | null;
  emergencia_cripto: string | null;
};

const COLUNAS = "id, nome, tipo, status, email, whatsapp, cidade, meet_link, valor_centavos, fixo_dia, fixo_hora, cpf_final, nascimento_cripto, emergencia_cripto";

// Só pacientes em acompanhamento: ao encerrar, o acesso deixa de funcionar.
export async function pacientesDoAcesso(sb: SupabaseClient, a: { paciente_id: string | null; responsavel_id: string | null }): Promise<PacienteArea[]> {
  let ids: string[] = [];
  if (a.paciente_id) ids = [a.paciente_id];
  else if (a.responsavel_id) {
    const { data } = await sb.from("paciente_responsaveis").select("paciente_id").eq("responsavel_id", a.responsavel_id);
    ids = (data ?? []).map((x) => x.paciente_id as string);
  }
  if (!ids.length) return [];
  const { data } = await sb.from("pacientes").select(COLUNAS).in("id", ids).eq("status", "ativo").order("nome");
  return (data ?? []) as unknown as PacienteArea[];
}

export type Contexto = { sessaoId: string; acesso: AcessoBasico; pacientes: PacienteArea[]; atual: PacienteArea };

type Resultado = { ctx: Contexto } | { destino: string };

async function carregar(pedido?: string | null): Promise<Resultado> {
  const s = await sessaoAtual();
  if (!s) return { destino: `${ROTA}/entrar` };
  if (s.trocarSenha) return { destino: `${ROTA}/nova-senha` };
  const pacientes = await pacientesDoAcesso(supabaseAdmin(), s.acesso);
  if (!pacientes.length) {
    await supabaseAdmin().from("acessos_sessao").delete().eq("id", s.id);
    return { destino: `${ROTA}/entrar?motivo=encerrado` };
  }
  // O paciente escolhido vem da URL, mas só vale se estiver na lista liberada para este login.
  const atual = pacientes.find((p) => p.id === pedido) ?? pacientes[0];
  return { ctx: { sessaoId: s.id, acesso: s.acesso, pacientes, atual } };
}

// Para páginas: manda para o login quando não há sessão válida.
export async function exigirAcesso(pedido?: string | null): Promise<Contexto> {
  const r = await carregar(pedido);
  if ("destino" in r) redirect(r.destino);
  return r.ctx;
}

// Para ações do servidor: devolve nulo em vez de redirecionar.
export async function acessoDaAcao(pedido?: string | null): Promise<Contexto | null> {
  const r = await carregar(pedido);
  return "ctx" in r ? r.ctx : null;
}

// Para a tela de criar senha: precisa de sessão, mesmo marcada para trocar a senha.
export async function exigirSessao(): Promise<SessaoPaciente> {
  const s = await sessaoAtual();
  if (!s) redirect(`${ROTA}/entrar`);
  return s;
}
