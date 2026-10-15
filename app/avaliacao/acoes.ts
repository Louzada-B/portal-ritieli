"use server";

import { supabaseAdmin } from "../lib/supabase/admin";
import { anotarTentativa, ipHash, passouDoLimite } from "../lib/pacienteAuth";

const CLAREZA = ["sim", "em_parte", "nao"] as const;
const DURACAO = ["curta", "na_medida", "longa"] as const;

export type RespostaAvaliacao = {
  palestra: string;
  nota: number;
  clareza: string;
  duracao: string;
  maisUtil: string;
  melhorar: string;
  site: string; // campo-isca: pessoas não veem, robôs preenchem
};

const limpar = (t: string) => t.replace(/\s+/g, " ").trim().slice(0, 1000);

// Grava uma avaliação anônima. Não guarda nome, e-mail nem IP (o IP vira só um hash temporário na tabela de tentativas, contra robôs).
export async function enviarAvaliacao(r: RespostaAvaliacao): Promise<{ ok?: true; erro?: string }> {
  if (r.site) return { ok: true };
  const palestra = /^[a-z0-9-]{1,60}$/.test(r.palestra) ? r.palestra : "palestra";
  const nota = Math.round(Number(r.nota));
  if (!(nota >= 1 && nota <= 5)) return { erro: "Escolha uma nota de 1 a 5." };
  if (!CLAREZA.includes(r.clareza as (typeof CLAREZA)[number])) return { erro: "Responda se o conteúdo foi claro." };
  if (!DURACAO.includes(r.duracao as (typeof DURACAO)[number])) return { erro: "Responda sobre o tempo da palestra." };
  const sb = supabaseAdmin();
  const chave = `avaliacao:${await ipHash()}`;
  if (await passouDoLimite(sb, chave, 150, 60)) return { erro: "Muitas respostas seguidas desta rede. Tente de novo mais tarde." };
  await anotarTentativa(sb, chave);
  const { error } = await sb.from("avaliacoes_palestra").insert({
    palestra,
    nota,
    clareza: r.clareza,
    duracao: r.duracao,
    mais_util: limpar(r.maisUtil || "") || null,
    melhorar: limpar(r.melhorar || "") || null,
  });
  if (error) return { erro: "Não deu para enviar agora. Tente de novo em instantes." };
  return { ok: true };
}
