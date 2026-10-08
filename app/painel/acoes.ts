"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseServidor } from "../lib/supabase/servidor";
import { siteUrl } from "../site";

export type EstadoForm = { erro?: string; ok?: string };

async function marcarVisto() {
  const loja = await cookies();
  loja.set("painel_visto", String(Date.now()), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/painel",
    maxAge: 60 * 60 * 24 * 400,
  });
}

export async function entrar(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const email = String(form.get("email") || "").trim().toLowerCase();
  const senha = String(form.get("senha") || "");
  if (!email || !senha) return { erro: "Preencha o e-mail e a senha." };
  const supabase = await supabaseServidor();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) return { erro: "E-mail ou senha incorretos." };
  await marcarVisto();
  redirect("/painel");
}

export async function sair() {
  const supabase = await supabaseServidor();
  await supabase.auth.signOut();
  const loja = await cookies();
  loja.delete("painel_visto");
  redirect("/painel/entrar");
}

async function origem() {
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  const proto = h.get("x-forwarded-proto") || "https";
  return host ? `${proto}://${host}` : siteUrl;
}

export async function esqueciSenha(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const email = String(form.get("email") || "").trim().toLowerCase();
  if (!email) return { erro: "Escreva o e-mail cadastrado no campo acima." };
  const supabase = await supabaseServidor();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await origem()}/painel/retorno?proximo=/painel/nova-senha`,
  });
  // Mesma resposta para qualquer e-mail, para não revelar quais existem.
  return { ok: "Se esse e-mail for o cadastrado, o link chega em instantes. Confira também o spam." };
}

export async function trocarSenha(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const senha = String(form.get("senha") || "");
  const confirma = String(form.get("confirma") || "");
  if (senha.length < 10) return { erro: "Use pelo menos 10 caracteres." };
  if (senha !== confirma) return { erro: "As duas senhas não são iguais." };
  const supabase = await supabaseServidor();
  const { error } = await supabase.auth.updateUser({ password: senha });
  if (error) return { erro: "Não deu para trocar a senha. Peça um link novo e tente de novo." };
  await marcarVisto();
  redirect("/painel?senha=ok");
}
