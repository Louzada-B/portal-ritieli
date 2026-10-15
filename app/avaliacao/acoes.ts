"use server";

import { supabaseAdmin } from "../lib/supabase/admin";
import { anotarTentativa, ipHash, passouDoLimite } from "../lib/pacienteAuth";


export type RespostaAvaliacao = {
  palestra: string;
  nota: number;
  clareza: number;
  duracao: number;
  maisUtil: string;
  melhorar: string;
  site: string; // campo-isca: pessoas não veem, robôs preenchem
};

const limpar = (t: string) => t.replace(/\s+/g, " ").trim().slice(0, 1000);

// Grava uma avaliação anônima. Não guarda nome, e-mail nem IP (o IP vira só um hash temporário na tabela de tentativas, contra robôs).
export async function enviarAvaliacao(r: RespostaAvaliacao): Promise<{ ok?: true; erro?: string }> {
  if (r.site) return { ok: true };
  const palestra = /^[a-z0-9-]{1,60}$/.test(r.palestra) ? r.palestra : "palestra";
  const ok = (n: number) => Number.isInteger(n) && n >= 1 && n <= 5;
  const nota = Number(r.nota), clareza = Number(r.clareza), duracao = Number(r.duracao);
  if (!ok(nota) || !ok(clareza) || !ok(duracao)) return { erro: "Responda as três primeiras perguntas." };
  const sb = supabaseAdmin();
  const chave = `avaliacao:${await ipHash()}`;
  if (await passouDoLimite(sb, chave, 150, 60)) return { erro: "Muitas respostas seguidas desta rede. Tente de novo mais tarde." };
  await anotarTentativa(sb, chave);
  const { error } = await sb.from("avaliacoes_palestra").insert({
    palestra,
    nota,
    clareza,
    duracao,
    mais_util: limpar(r.maisUtil || "") || null,
    melhorar: limpar(r.melhorar || "") || null,
  });
  if (error) return { erro: "Não deu para enviar agora. Tente de novo em instantes." };
  return { ok: true };
}
