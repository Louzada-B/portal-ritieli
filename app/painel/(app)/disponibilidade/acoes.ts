"use server";

import { revalidatePath } from "next/cache";
import { supabaseServidor } from "../../../lib/supabase/servidor";
import { deLocal, minutos } from "../../../lib/agenda";
import { ehAdmin } from "../../../lib/sessao";

export type DiaForm = { dia_semana: number; ativo: boolean; inicio: string; fim: string; pausa: boolean; pausa_inicio: string; pausa_fim: string };
export type Resultado = { erro?: string; ok?: string };

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function salvarSemana(dias: DiaForm[], antecedencia: number, janela: number): Promise<Resultado> {
  if (!Array.isArray(dias) || dias.length !== 7) return { erro: "Dados da semana incompletos." };
  for (const d of dias) {
    if (!HORA.test(d.inicio) || !HORA.test(d.fim)) return { erro: "Horário inválido." };
    if (!d.ativo) continue;
    if (minutos(d.fim) <= minutos(d.inicio)) return { erro: "Em algum dia, o fim está antes do início." };
    if (d.pausa) {
      if (!HORA.test(d.pausa_inicio) || !HORA.test(d.pausa_fim)) return { erro: "Intervalo inválido." };
      const ok = minutos(d.pausa_fim) > minutos(d.pausa_inicio) && minutos(d.pausa_inicio) >= minutos(d.inicio) && minutos(d.pausa_fim) <= minutos(d.fim);
      if (!ok) return { erro: "O intervalo precisa ficar dentro do horário do dia." };
    }
  }
  if (![0, 12, 24, 36, 48, 60, 72].includes(antecedencia)) return { erro: "Antecedência inválida." };
  if (janela < 7 || janela > 60) return { erro: "Período inválido." };

  const sb = await supabaseServidor();
  const linhas = dias.map((d) => ({
    dia_semana: d.dia_semana,
    ativo: d.ativo,
    inicio: d.inicio,
    fim: d.fim,
    pausa_inicio: d.ativo && d.pausa ? d.pausa_inicio : null,
    pausa_fim: d.ativo && d.pausa ? d.pausa_fim : null,
  }));
  const r1 = await sb.from("semana_padrao").upsert(linhas, { onConflict: "dia_semana" });
  if (r1.error) return { erro: "Não deu para salvar a semana. Tente de novo." };
  const r2 = await sb.from("config_agenda").update({ antecedencia_horas: antecedencia, janela_dias: janela, atualizado_em: new Date().toISOString() }).eq("id", 1);
  if (r2.error) return { erro: "Não deu para salvar as regras. Tente de novo." };
  revalidatePath("/painel/disponibilidade");
  return { ok: "Alterações salvas." };
}

const DATA = /^\d{4}-\d{2}-\d{2}$/;

export async function adicionarBloqueio(dados: { tipo: "dia" | "dias" | "horas"; data: string; ate: string; de: string; ateHora: string; motivo: string }): Promise<Resultado> {
  if (!DATA.test(dados.data)) return { erro: "Escolha a data." };
  const [a, m, d] = dados.data.split("-").map(Number);
  let inicio: Date;
  let fim: Date;
  if (dados.tipo === "dia") {
    inicio = deLocal(a, m - 1, d);
    fim = deLocal(a, m - 1, d + 1);
  } else if (dados.tipo === "dias") {
    if (!DATA.test(dados.ate)) return { erro: "Escolha a data final." };
    const [a2, m2, d2] = dados.ate.split("-").map(Number);
    inicio = deLocal(a, m - 1, d);
    fim = deLocal(a2, m2 - 1, d2 + 1);
  } else {
    if (!HORA.test(dados.de) || !HORA.test(dados.ateHora)) return { erro: "Escolha o horário." };
    const i = minutos(dados.de);
    const f = minutos(dados.ateHora);
    if (f <= i) return { erro: "O fim precisa ser depois do início." };
    inicio = deLocal(a, m - 1, d, Math.floor(i / 60), i % 60);
    fim = deLocal(a, m - 1, d, Math.floor(f / 60), f % 60);
  }
  if (fim <= inicio) return { erro: "A data final precisa ser depois da inicial." };
  if (fim.getTime() < Date.now()) return { erro: "Essa data já passou." };
  const sb = await supabaseServidor();
  const { error } = await sb.from("bloqueios").insert({ inicio: inicio.toISOString(), fim: fim.toISOString(), motivo: dados.motivo.trim().slice(0, 200) || null });
  if (error) return { erro: "Não deu para bloquear. Tente de novo." };
  revalidatePath("/painel/disponibilidade");
  return { ok: "Data bloqueada." };
}

export async function removerBloqueio(id: string): Promise<Resultado> {
  const sb = await supabaseServidor();
  const { error } = await sb.from("bloqueios").delete().eq("id", id);
  if (error) return { erro: "Não deu para remover. Tente de novo." };
  revalidatePath("/painel/disponibilidade");
  return { ok: "Bloqueio removido." };
}

export async function ajustarGoogle(campo: "bloquear_site" | "enviar_eventos", valor: boolean): Promise<Resultado> {
  const { ehAdmin } = await import("../../../lib/sessao");
  if (!(await ehAdmin())) return { erro: "Sessão expirada. Entre de novo." };
  const { supabaseAdmin } = await import("../../../lib/supabase/admin");
  const { error } = await supabaseAdmin().from("google_conexao").update({ [campo]: valor }).eq("id", 1);
  (await import("../../../lib/google")).limparCacheGoogle();
  if (error) return { erro: "Não deu para salvar. Tente de novo." };
  revalidatePath("/painel/disponibilidade");
  return { ok: "Salvo." };
}

export async function desconectarGoogle(): Promise<Resultado> {
  const { ehAdmin } = await import("../../../lib/sessao");
  if (!(await ehAdmin())) return { erro: "Sessão expirada. Entre de novo." };
  const { supabaseAdmin } = await import("../../../lib/supabase/admin");
  const { conexao, decifrar } = await import("../../../lib/google");
  const con = await conexao();
  if (con) {
    try {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(decifrar(con.refresh_token_cripto))}`, { method: "POST" });
    } catch {}
  }
  await supabaseAdmin().from("google_conexao").delete().eq("id", 1);
  (await import("../../../lib/google")).limparCacheGoogle();
  revalidatePath("/painel/disponibilidade");
  return { ok: "Google Agenda desconectada." };
}

// Chave Pix que a paciente vê na área dela (copia e cola). Nunca vai para o site público.
export async function salvarPix(d: { chave: string; nome: string; cidade: string }): Promise<Resultado> {
  if (!(await ehAdmin())) return { erro: "Sessão expirada. Entre de novo no painel." };
  const chave = (d.chave || "").trim();
  const nome = (d.nome || "").trim();
  const cidade = (d.cidade || "").trim();
  if (chave && (/\s/.test(chave) || chave.length > 77)) return { erro: "A chave Pix não pode ter espaços e vai até 77 caracteres. Telefone: +55 e o número, sem espaços." };
  if (chave && (!nome || !cidade)) return { erro: "Preencha também o nome e a cidade que aparecem no Pix." };
  const sb = await supabaseServidor();
  const { error } = await sb.from("config_agenda").update({ pix_chave: chave || null, pix_nome: nome || "Ritieli Hermes", pix_cidade: cidade || "Porto Alegre" }).eq("id", 1);
  if (error) return { erro: "Não deu para salvar. Tente de novo." };
  revalidatePath("/painel/disponibilidade");
  return { ok: chave ? "Chave Pix salva. A paciente já vê o código na área dela." : "Chave Pix removida. A paciente verá o aviso para pedir a chave." };
}
