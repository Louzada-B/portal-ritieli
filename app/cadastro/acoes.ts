"use server";

import { supabaseAdmin } from "../lib/supabase/admin";
import { fichaPorToken } from "../lib/links";
import { cifrar } from "../lib/cripto";
import { cpfValido, soDigitos, normalizarFone, fone } from "../lib/formato";
import { avisarRitieli } from "../lib/aviso";

export type DadosFicha = {
  aceite: boolean;
  // adulta, ou responsável quando for criança
  nome: string;
  parentesco: string;
  cpf: string;
  nascimento: string;
  whatsapp: string;
  email: string;
  cidade: string;
  // criança
  cNome: string;
  cNascimento: string;
  escola: string;
  // emergência
  eNome: string;
  eTelefone: string;
};

const DATA = /^(\d{2})\/(\d{2})\/(\d{4})$/;
function dataOk(v: string) {
  const m = DATA.exec(v.trim());
  if (!m) return false;
  const [d, mes, a] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(a, mes - 1, d));
  return dt.getUTCDate() === d && dt.getUTCMonth() === mes - 1 && a > 1900 && dt.getTime() < Date.now();
}
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function enviarFicha(token: string, d: DadosFicha): Promise<{ erro?: string; ok?: boolean }> {
  const ficha = await fichaPorToken(token);
  if (!ficha || ficha.expirado) return { erro: "Este link expirou. Peça um novo para a Ritieli pelo WhatsApp." };
  if (ficha.preenchida_em) return { erro: "Esta ficha já foi enviada. Se precisar corrigir algo, fale com a Ritieli." };
  if (!d.aceite) return { erro: "É preciso autorizar o uso dos dados para continuar." };

  const sb = supabaseAdmin();
  const { data: p } = await sb.from("pacientes").select("id, tipo, nome").eq("id", ficha.paciente_id).single();
  if (!p) return { erro: "Ficha não encontrada." };

  if (d.nome.trim().length < 5) return { erro: "Escreva o nome completo." };
  if (!cpfValido(d.cpf)) return { erro: "Confira o CPF." };
  const wa = normalizarFone(d.whatsapp);
  if (!wa) return { erro: "Confira o WhatsApp, com DDD." };
  if (!EMAIL.test(d.email.trim())) return { erro: "Confira o e-mail." };
  if (d.eNome.trim().length < 2 || !normalizarFone(d.eTelefone)) return { erro: "Preencha o contato de emergência com nome e telefone." };
  const cpf = soDigitos(d.cpf);
  const emergencia = `${d.eNome.trim()} · ${fone(normalizarFone(d.eTelefone)!)}`;
  const agora = new Date().toISOString();

  if (p.tipo === "adulta") {
    if (!dataOk(d.nascimento)) return { erro: "Confira a data de nascimento (dd/mm/aaaa)." };
    const { error } = await sb
      .from("pacientes")
      .update({
        nome: d.nome.trim(),
        cpf_cripto: cifrar(cpf),
        cpf_final: cpf.slice(-2),
        nascimento_cripto: cifrar(d.nascimento.trim()),
        whatsapp: wa,
        email: d.email.trim().toLowerCase(),
        cidade: d.cidade.trim().slice(0, 120) || null,
        emergencia_cripto: cifrar(emergencia),
        ficha_em: agora,
        atualizado_em: agora,
      })
      .eq("id", p.id);
    if (error) return { erro: "Não deu para enviar agora. Tente de novo em instantes." };
  } else {
    if (d.cNome.trim().length < 5) return { erro: "Escreva o nome completo da criança ou do adolescente." };
    if (!dataOk(d.cNascimento)) return { erro: "Confira a data de nascimento da criança (dd/mm/aaaa)." };
    const { error } = await sb
      .from("pacientes")
      .update({
        nome: d.cNome.trim(),
        nascimento_cripto: cifrar(d.cNascimento.trim()),
        escola: d.escola.trim().slice(0, 160) || null,
        cidade: d.cidade.trim().slice(0, 120) || null,
        emergencia_cripto: cifrar(emergencia),
        ficha_em: agora,
        atualizado_em: agora,
      })
      .eq("id", p.id);
    if (error) return { erro: "Não deu para enviar agora. Tente de novo em instantes." };
    const dadosResp = { nome: d.nome.trim(), cpf_cripto: cifrar(cpf), cpf_final: cpf.slice(-2), whatsapp: wa, email: d.email.trim().toLowerCase() };
    const { data: ligacao } = await sb.from("paciente_responsaveis").select("responsavel_id").eq("paciente_id", p.id).order("ordem").limit(1);
    if (ligacao?.[0]) {
      await sb.from("responsaveis").update(dadosResp).eq("id", ligacao[0].responsavel_id);
      if (d.parentesco.trim()) await sb.from("paciente_responsaveis").update({ parentesco: d.parentesco.trim().slice(0, 40) }).eq("paciente_id", p.id).eq("responsavel_id", ligacao[0].responsavel_id);
    } else {
      const { data: r } = await sb.from("responsaveis").insert(dadosResp).select("id").single();
      if (r) await sb.from("paciente_responsaveis").insert({ paciente_id: p.id, responsavel_id: r.id, parentesco: d.parentesco.trim().slice(0, 40) || null, financeiro: true, legal: true, ordem: 1 });
    }
  }

  await sb.from("fichas").update({ preenchida_em: agora }).eq("id", ficha.id);
  try {
    await avisarRitieli({ titulo: "Ficha de cadastro preenchida", nome: p.tipo === "adulta" ? d.nome.trim() : d.cNome.trim(), texto: "Os dados já estão no painel. Agora é só gerar o termo em Termos.", caminho: `/painel/pacientes?id=${p.id}` });
  } catch {}
  return { ok: true };
}
