"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { supabaseAdmin } from "../lib/supabase/admin";
import { termoPorToken } from "../lib/links";
import { decifrarOuVazio } from "../lib/cripto";
import { avisarRitieli } from "../lib/aviso";
import type { ConteudoTermo } from "../lib/termoTexto";

// Registra o aceite eletrônico: data, hora, nome de quem aceitou, IP (só o hash) e navegador.
export async function aceitarTermo(token: string, concordo: boolean): Promise<{ erro?: string; ok?: boolean }> {
  if (!concordo) return { erro: "Marque que leu e concorda com o termo." };
  const t = await termoPorToken(token);
  if (!t) return { erro: "Link não encontrado." };
  if (t.status === "aceito") return { ok: true };
  if (t.status !== "enviado") return { erro: "Este termo foi substituído. Peça um novo link para a Ritieli." };

  let c: ConteudoTermo | null = null;
  try {
    c = JSON.parse(decifrarOuVazio(t.conteudo_cripto));
  } catch {
    c = null;
  }
  const nome = c ? (c.tipo === "crianca" && c.responsavel ? c.responsavel.nome : c.nome) : "";
  const h = await headers();
  const ip = (h.get("x-forwarded-for") || "").split(",")[0].trim() || h.get("x-real-ip") || "";
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("termos")
    .update({
      status: "aceito",
      aceito_em: new Date().toISOString(),
      aceite_nome: nome,
      aceite_ip_hash: ip ? createHash("sha256").update(`ip|${ip}`).digest("hex") : null,
      aceite_navegador: (h.get("user-agent") || "").slice(0, 300),
    })
    .eq("id", t.id)
    .eq("status", "enviado")
    .select("id");
  if (error || !data?.length) return { erro: "Não deu para registrar o aceite. Tente de novo." };

  try {
    await avisarRitieli({ titulo: "Termo aceito", nome: nome || "Paciente", texto: "O termo de consentimento foi aceito pelo link. O registro, com data e hora, está em Termos.", caminho: `/painel/termos?t=${t.id}&aba=doc` });
  } catch {}
  return { ok: true };
}
