"use server";

import { revalidatePath } from "next/cache";
import { supabaseServidor } from "../../../lib/supabase/servidor";
import { cifrar, decifrarOuVazio, novoToken } from "../../../lib/cripto";
import { centavosDe, cpfFormatado, primeiroNome, reais } from "../../../lib/formato";
import { responsaveisDe, contatoPrincipal, type Paciente } from "../../../lib/pacientes";
import { local, MESES } from "../../../lib/agenda";
import type { ConteudoTermo } from "../../../lib/termoTexto";
import { siteUrl } from "../../../site";

export type ResTermo = { erro?: string; ok?: string; id?: string; link?: string; para?: string; texto?: string };

const dataExtenso = (d = new Date()) => {
  const l = local(d);
  return `${l.dia} de ${MESES[l.mes]} de ${l.ano}`;
};

// Monta o texto do termo a partir do cadastro (no servidor, nunca do navegador).
async function montarConteudo(p: Paciente, combinados: { valorCentavos: number | null; tipoValor: "normal" | "social"; plataforma: string; faltas: string }) {
  const sb = await supabaseServidor();
  const resps = p.tipo === "crianca" ? await responsaveisDe(sb, p.id) : [];
  const r = resps.find((x) => x.legal) || resps[0];
  const conteudo: ConteudoTermo = {
    tipo: p.tipo,
    nome: p.nome,
    cpf: p.tipo === "adulta" ? cpfFormatado(decifrarOuVazio(p.cpf_cripto)) : "",
    responsavel: r ? { nome: r.nome, cpf: cpfFormatado(decifrarOuVazio(r.cpf_cripto)) } : null,
    emergencia: decifrarOuVazio(p.emergencia_cripto),
    valor: combinados.valorCentavos != null ? `${reais(combinados.valorCentavos)}${combinados.tipoValor === "social" ? " (valor social)" : ""}` : "",
    pagamento: "pix",
    plataforma: p.tipo === "adulta" ? combinados.plataforma.trim() || "Google Meet" : "",
    faltas: combinados.faltas.trim(),
    data: dataExtenso(),
  };
  return { conteudo, resps };
}

export async function criarTermo(pacienteId: string, d: { valor: string; tipoValor: "normal" | "social"; plataforma: string; faltas: string }): Promise<ResTermo> {
  const sb = await supabaseServidor();
  const { data: p } = await sb.from("pacientes").select("*").eq("id", pacienteId).single<Paciente>();
  if (!p) return { erro: "Paciente não encontrado." };
  const valorCentavos = centavosDe(d.valor);
  if (!valorCentavos) return { erro: "Confira o valor da sessão." };
  if (d.faltas.trim().length < 20) return { erro: "Escreva a política de faltas." };

  const { conteudo, resps } = await montarConteudo(p, { valorCentavos, tipoValor: d.tipoValor, plataforma: d.plataforma, faltas: d.faltas });
  const cpfOk = p.tipo === "crianca" ? !!conteudo.responsavel?.cpf : !!conteudo.cpf;
  if (!cpfOk) return { erro: "O cadastro ainda não tem CPF. Envie a ficha de cadastro antes." };

  // Um termo pendente por vez: o anterior, se houver, é cancelado.
  await sb.from("termos").update({ status: "cancelado" }).eq("paciente_id", p.id).eq("status", "enviado");

  const { token, hash } = novoToken();
  const { data: novo, error } = await sb
    .from("termos")
    .insert({ paciente_id: p.id, conteudo_cripto: cifrar(JSON.stringify(conteudo)), resumo: p.tipo === "crianca" ? "Infantil · responsável" : "Online", token_hash: hash })
    .select("id")
    .single();
  if (error || !novo) return { erro: "Não deu para gerar o termo. Tente de novo." };

  // O que foi combinado fica também na ficha e na política padrão.
  await Promise.all([
    sb.from("pacientes").update({ valor_centavos: valorCentavos, tipo_valor: d.tipoValor }).eq("id", p.id),
    sb.from("config_agenda").update({ politica_faltas: d.faltas.trim() }).eq("id", 1),
  ]);

  const c = contatoPrincipal(p, resps);
  const link = `${siteUrl}/termo/${token}`;
  const texto = `Olá, ${primeiroNome(c.nome)}! Aqui é a Ritieli. Preparei o termo de consentimento ${p.tipo === "crianca" ? `do atendimento de ${primeiroNome(p.nome)}` : "do nosso atendimento"}, já com os dados do cadastro. Leia com calma e, se estiver tudo certo, aceite por este link pessoal: ${link}`;
  revalidatePath("/painel/termos");
  revalidatePath("/painel/pacientes");
  return { ok: "Termo gerado. Agora é só mandar o link.", id: novo.id, link, para: c.whatsapp || "", texto };
}

// Gera um link novo (o anterior para de valer) e a mensagem pronta.
export async function reenviarTermo(id: string): Promise<ResTermo> {
  const sb = await supabaseServidor();
  const { data: t } = await sb.from("termos").select("id, paciente_id, status").eq("id", id).single();
  if (!t || t.status !== "enviado") return { erro: "Este termo não está aguardando aceite." };
  const { data: p } = await sb.from("pacientes").select("*").eq("id", t.paciente_id).single<Paciente>();
  if (!p) return { erro: "Paciente não encontrado." };
  const resps = await responsaveisDe(sb, p.id);
  const { token, hash } = novoToken();
  const { error } = await sb.from("termos").update({ token_hash: hash }).eq("id", id);
  if (error) return { erro: "Não deu para gerar o link. Tente de novo." };
  const c = contatoPrincipal(p, resps);
  const link = `${siteUrl}/termo/${token}`;
  const texto = `Olá, ${primeiroNome(c.nome)}! Aqui é a Ritieli. Segue de novo o link do termo de consentimento, para ler com calma e aceitar quando puder: ${link}`;
  return { ok: "Link novo gerado. O anterior deixou de valer.", id, link, para: c.whatsapp || "", texto };
}

export async function cancelarTermo(id: string): Promise<ResTermo> {
  const sb = await supabaseServidor();
  const { error } = await sb.from("termos").update({ status: "cancelado" }).eq("id", id).eq("status", "enviado");
  if (error) return { erro: "Não deu para cancelar. Tente de novo." };
  revalidatePath("/painel/termos");
  return { ok: "Termo cancelado. O link deixou de valer." };
}
