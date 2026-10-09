"use server";

import { revalidatePath } from "next/cache";
import { supabaseServidor } from "../../../lib/supabase/servidor";
import { supabaseAdmin } from "../../../lib/supabase/admin";
import { ehAdmin } from "../../../lib/sessao";
import { responsaveisDe } from "../../../lib/pacientes";
import { novaProvisoria } from "../../../lib/pacienteAuth";
import { emailSenhaProvisoria } from "../../../lib/emails";

export type ResultadoAcesso = { erro?: string; ok?: string };

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const NEGADO: ResultadoAcesso = { erro: "Sessão expirada. Entre de novo no painel." };
const ATUALIZAR = () => revalidatePath("/painel/pacientes");

// Cria o acesso e manda a senha provisória por e-mail.
// Adulta: usa o e-mail da própria paciente. Criança: o login é de um responsável (que vê todos os filhos ligados a ele).
export async function criarAcesso(pacienteId: string, responsavelId: string | null): Promise<ResultadoAcesso> {
  if (!(await ehAdmin())) return NEGADO;
  const rls = await supabaseServidor();
  const { data: p } = await rls.from("pacientes").select("id, tipo, nome, email, status").eq("id", pacienteId).maybeSingle();
  if (!p) return { erro: "Paciente não encontrada." };
  if (p.status !== "ativo") return { erro: "O acompanhamento está encerrado. Reative antes de liberar o acesso." };

  let nome: string;
  let email: string;
  if (p.tipo === "crianca") {
    if (!responsavelId) return { erro: "Escolha o responsável que vai ter o acesso." };
    const resp = (await responsaveisDe(rls, pacienteId)).find((r) => r.id === responsavelId);
    if (!resp) return { erro: "Esse responsável não está ligado a este paciente." };
    nome = resp.nome;
    email = (resp.email || "").trim().toLowerCase();
  } else {
    nome = p.nome as string;
    email = ((p.email as string | null) || "").trim().toLowerCase();
  }
  if (!EMAIL.test(email)) return { erro: "Falta um e-mail válido no cadastro. Complete e tente de novo." };

  const sb = supabaseAdmin();
  const { data: jaTem } = await sb
    .from("acessos_paciente")
    .select("id")
    .eq(p.tipo === "crianca" ? "responsavel_id" : "paciente_id", p.tipo === "crianca" ? responsavelId! : pacienteId)
    .maybeSingle();
  if (jaTem) return { erro: "Já existe acesso para esta pessoa. Use “Reenviar senha provisória”." };

  const prov = await novaProvisoria();
  const { error } = await sb.from("acessos_paciente").insert({
    email,
    nome,
    paciente_id: p.tipo === "crianca" ? null : pacienteId,
    responsavel_id: p.tipo === "crianca" ? responsavelId : null,
    prov_hash: prov.hash,
    prov_expira_em: prov.expira,
  });
  if (error) {
    if (error.code === "23505") return { erro: "Esse e-mail já tem acesso a outro cadastro. Use um e-mail diferente." };
    return { erro: "Não deu para criar o acesso. Tente de novo." };
  }
  const enviado = await emailSenhaProvisoria({ para: email, nome, senha: prov.senha, primeiraVez: true });
  ATUALIZAR();
  return enviado
    ? { ok: `Acesso criado. A senha provisória foi para ${email} e vale 24 horas.` }
    : { erro: "Acesso criado, mas o e-mail não saiu. Use “Reenviar senha provisória”." };
}

export async function reenviarSenha(acessoId: string): Promise<ResultadoAcesso> {
  if (!(await ehAdmin())) return NEGADO;
  const sb = supabaseAdmin();
  const { data: a } = await sb.from("acessos_paciente").select("id, email, nome, ativo, senha_trocada_em").eq("id", acessoId).maybeSingle();
  if (!a) return { erro: "Acesso não encontrado." };
  if (!a.ativo) return { erro: "O acesso está desativado. Reative antes de reenviar." };
  const prov = await novaProvisoria();
  const { error } = await sb.from("acessos_paciente").update({ prov_hash: prov.hash, prov_expira_em: prov.expira }).eq("id", acessoId);
  if (error) return { erro: "Não deu para gerar a senha. Tente de novo." };
  const enviado = await emailSenhaProvisoria({ para: a.email as string, nome: a.nome as string, senha: prov.senha, primeiraVez: !a.senha_trocada_em });
  ATUALIZAR();
  return enviado ? { ok: `Nova senha provisória enviada para ${a.email}.` } : { erro: "O e-mail não saiu. Tente de novo." };
}

export async function alternarAcesso(acessoId: string, ativo: boolean): Promise<ResultadoAcesso> {
  if (!(await ehAdmin())) return NEGADO;
  const sb = supabaseAdmin();
  const { error } = await sb.from("acessos_paciente").update({ ativo }).eq("id", acessoId);
  if (error) return { erro: "Não deu para alterar o acesso." };
  if (!ativo) await sb.from("acessos_sessao").delete().eq("acesso_id", acessoId); // derruba quem está conectada
  ATUALIZAR();
  return { ok: ativo ? "Acesso reativado." : "Acesso desativado. Quem estava conectada saiu." };
}
