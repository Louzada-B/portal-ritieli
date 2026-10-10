"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { supabaseAdmin } from "../lib/supabase/admin";
import {
  ROTA,
  abrirSessao,
  anotarTentativa,
  conferirSenha,
  encerrarSessaoAtual,
  erroDeSenha,
  hashCurto,
  hashSenha,
  ipHash,
  novaProvisoria,
  pacientesDoAcesso,
  passouDoLimite,
  acessoDaAcao,
  sessaoAtual,
} from "../lib/pacienteAuth";
import { emailSenhaProvisoria, emailParaRitieli, primeiroNome } from "../lib/emails";
import { cifrarOuNulo } from "../lib/cripto";
import { normalizarFone, fone as foneFmt } from "../lib/formato";
import { fmtQuando } from "../lib/agenda";

export type EstadoForm = { erro?: string; ok?: string };

const MUITAS = "Muitas tentativas. Espere alguns minutos e tente de novo.";
const normalizar = (v: FormDataEntryValue | null) => String(v || "").trim().toLowerCase().slice(0, 254);

export async function entrar(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const mail = normalizar(form.get("email"));
  const senha = String(form.get("senha") || "").slice(0, 200);
  const manter = form.get("manter") === "on";
  if (!mail || !senha) return { erro: "Preencha o e-mail e a senha." };

  const sb = supabaseAdmin();
  const chEmail = `pa-falha:${hashCurto(mail)}`;
  const chIp = `pa-falha-ip:${await ipHash()}`;
  if ((await passouDoLimite(sb, chEmail, 6, 15)) || (await passouDoLimite(sb, chIp, 25, 15))) return { erro: MUITAS };

  const { data: a } = await sb
    .from("acessos_paciente")
    .select("id, ativo, paciente_id, responsavel_id, senha_hash, prov_hash, prov_expira_em")
    .eq("email", mail)
    .maybeSingle();
  const provVale = !!a?.prov_hash && !!a.prov_expira_em && new Date(a.prov_expira_em as string).getTime() > Date.now();
  // As duas conferências sempre rodam, para o tempo de resposta não indicar se o e-mail existe.
  const okSenha = await conferirSenha(senha, a?.senha_hash as string | null | undefined);
  const okProv = await conferirSenha(senha, provVale ? (a!.prov_hash as string) : null);
  if (!a || (!okSenha && !okProv)) {
    await anotarTentativa(sb, chEmail);
    await anotarTentativa(sb, chIp);
    return { erro: "E-mail ou senha incorretos." };
  }
  if (!a.ativo || !(await pacientesDoAcesso(sb, a as { paciente_id: string | null; responsavel_id: string | null })).length) {
    return { erro: "Seu acesso não está disponível no momento. Fale com a Ritieli." };
  }

  // Entrou com a provisória (e não com a senha própria): tem que criar a senha nova.
  const trocar = !okSenha && okProv;
  await abrirSessao(sb, a.id as string, { manter, trocarSenha: trocar });
  await sb.from("acessos_paciente").update({ ultimo_acesso_em: new Date().toISOString() }).eq("id", a.id);
  redirect(trocar ? `${ROTA}/nova-senha` : ROTA);
}

export async function esqueciSenha(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const mail = normalizar(form.get("email"));
  if (!mail || !mail.includes("@")) return { erro: "Escreva o seu e-mail no campo acima." };
  // Mesma resposta para qualquer e-mail, para não revelar quais têm acesso.
  const resposta: EstadoForm = { ok: "Se esse e-mail tiver acesso, a senha provisória chega em instantes. Confira também o spam." };

  const sb = supabaseAdmin();
  const chEmail = `pa-rec:${hashCurto(mail)}`;
  const chIp = `pa-rec-ip:${await ipHash()}`;
  if ((await passouDoLimite(sb, chEmail, 3, 60)) || (await passouDoLimite(sb, chIp, 10, 60))) return resposta;
  await anotarTentativa(sb, chEmail);
  await anotarTentativa(sb, chIp);

  // O resto roda depois da resposta: o tempo não muda se o e-mail existe ou não.
  after(async () => {
    try {
      const { data: a } = await sb.from("acessos_paciente").select("id, nome, ativo, paciente_id, responsavel_id").eq("email", mail).maybeSingle();
      if (!a?.ativo || !(await pacientesDoAcesso(sb, a as { paciente_id: string | null; responsavel_id: string | null })).length) return;
      const prov = await novaProvisoria();
      await sb.from("acessos_paciente").update({ prov_hash: prov.hash, prov_expira_em: prov.expira }).eq("id", a.id);
      await emailSenhaProvisoria({ para: mail, nome: a.nome as string, senha: prov.senha, primeiraVez: false });
    } catch (e) {
      console.error("Senha provisória:", e);
    }
  });
  return resposta;
}

// Troca obrigatória depois de entrar com a senha provisória.
export async function definirSenha(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const s = await sessaoAtual();
  if (!s) redirect(`${ROTA}/entrar`);
  if (!s.trocarSenha) redirect(ROTA);
  const senha = String(form.get("senha") || "");
  const confirma = String(form.get("confirma") || "");
  const erro = erroDeSenha(senha);
  if (erro) return { erro };
  if (senha !== confirma) return { erro: "As duas senhas não são iguais." };

  const sb = supabaseAdmin();
  const { error } = await sb
    .from("acessos_paciente")
    .update({ senha_hash: await hashSenha(senha), prov_hash: null, prov_expira_em: null, senha_trocada_em: new Date().toISOString() })
    .eq("id", s.acesso.id);
  if (error) return { erro: "Não deu para salvar a senha. Tente de novo." };
  // Outros aparelhos conectados saem; esta sessão segue, já liberada.
  await sb.from("acessos_sessao").delete().eq("acesso_id", s.acesso.id).neq("id", s.id);
  await sb.from("acessos_sessao").update({ trocar_senha: false }).eq("id", s.id);
  redirect(ROTA);
}

// Trocar a senha estando dentro da área (Meus dados): pede a senha atual.
export async function trocarSenha(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const s = await sessaoAtual();
  if (!s || s.trocarSenha) return { erro: "Sua sessão terminou. Entre de novo." };
  const atual = String(form.get("atual") || "").slice(0, 200);
  const nova = String(form.get("nova") || "");
  const repita = String(form.get("repita") || "");
  if (!atual) return { erro: "Escreva a sua senha atual." };
  const erro = erroDeSenha(nova);
  if (erro) return { erro };
  if (nova !== repita) return { erro: "As duas senhas novas não são iguais." };

  const sb = supabaseAdmin();
  const chave = `pa-troca:${s.acesso.id}`;
  if (await passouDoLimite(sb, chave, 5, 15)) return { erro: MUITAS };
  const { data: a } = await sb.from("acessos_paciente").select("senha_hash").eq("id", s.acesso.id).maybeSingle();
  if (!(await conferirSenha(atual, a?.senha_hash as string | null | undefined))) {
    await anotarTentativa(sb, chave);
    return { erro: "A senha atual não confere." };
  }
  const { error } = await sb.from("acessos_paciente").update({ senha_hash: await hashSenha(nova), senha_trocada_em: new Date().toISOString() }).eq("id", s.acesso.id);
  if (error) return { erro: "Não deu para salvar a senha. Tente de novo." };
  await sb.from("acessos_sessao").delete().eq("acesso_id", s.acesso.id).neq("id", s.id);
  return { ok: "Senha alterada." };
}

export async function sair() {
  await encerrarSessaoAtual();
  redirect(`${ROTA}/entrar`);
}

// ---------- pedidos sobre as sessões ----------
// A paciente só PEDE. Quem remarca ou cancela é a Ritieli, no painel (agenda, Google e créditos ficam com ela).

const VINTE_QUATRO_H = 24 * 3600 * 1000;

export async function pedirSessao(pacienteId: string, sessaoId: string, tipo: "remarcar" | "cancelar", mensagem: string): Promise<EstadoForm> {
  const ctx = await acessoDaAcao(pacienteId);
  if (!ctx || ctx.atual.id !== pacienteId) return { erro: "Sua sessão terminou. Entre de novo." };
  if (tipo !== "remarcar" && tipo !== "cancelar") return { erro: "Pedido inválido." };
  const texto = String(mensagem || "").trim().slice(0, 500);

  const sb = supabaseAdmin();
  const { data: s } = await sb.from("sessoes").select("id, inicio, status").eq("id", sessaoId).eq("paciente_id", pacienteId).maybeSingle();
  if (!s || s.status !== "agendada") return { erro: "Essa sessão não está mais disponível para pedido." };
  const inicio = new Date(s.inicio as string);
  if (inicio.getTime() - Date.now() < VINTE_QUATRO_H) return { erro: "Com menos de 24 horas, avise a Ritieli pelo WhatsApp." };

  const { data: abertos } = await sb.from("pedidos_paciente").select("id, sessao_id").eq("paciente_id", pacienteId).is("resolvido_em", null);
  if ((abertos ?? []).some((x) => x.sessao_id === sessaoId)) return { erro: "Você já pediu para esta sessão. A Ritieli responde em breve." };
  if ((abertos ?? []).length >= 10) return { erro: "Há muitos pedidos em aberto. Fale com a Ritieli pelo WhatsApp." };

  const { error } = await sb.from("pedidos_paciente").insert({ paciente_id: pacienteId, sessao_id: sessaoId, sessao_inicio: inicio.toISOString(), tipo, mensagem: texto || null });
  if (error) return { erro: "Não deu para enviar o pedido. Tente de novo." };

  after(async () => {
    try {
      await emailParaRitieli({
        assunto: tipo === "remarcar" ? "Pedido de remarcação" : "Pedido de cancelamento",
        titulo: tipo === "remarcar" ? "Pedido de remarcação" : "Pedido de cancelamento",
        nome: primeiroNome(ctx.atual.nome),
        texto: `Pediu ${tipo === "remarcar" ? "para remarcar" : "para cancelar"} a sessão de ${fmtQuando(inicio)}. Veja o pedido no painel.`,
        caminho: "/painel",
      });
    } catch (e) {
      console.error("Aviso de pedido:", e);
    }
  });
  revalidatePath(ROTA, "layout");
  return { ok: tipo === "remarcar" ? "Pedido enviado. A Ritieli vai combinar o novo horário com você." : "Pedido enviado. A Ritieli confirma o cancelamento com você." };
}

// ---------- meus dados ----------
// Só telefone, cidade e contato de emergência. O resto do cadastro muda com a Ritieli.

export async function salvarContato(pacienteId: string, d: { whatsapp: string; cidade: string; eNome: string; eTelefone: string }): Promise<EstadoForm> {
  const ctx = await acessoDaAcao(pacienteId);
  if (!ctx || ctx.atual.id !== pacienteId) return { erro: "Sua sessão terminou. Entre de novo." };
  const tel = String(d.whatsapp || "").trim();
  const fone = tel ? normalizarFone(tel) : null;
  if (tel && !fone) return { erro: "Confira o telefone: DDD e número." };
  const cidade = String(d.cidade || "").trim().slice(0, 80);
  // Mesmo formato do painel: "Nome e parentesco · telefone".
  const eNome = String(d.eNome || "").trim().replace(/\s*·\s*/g, " ").slice(0, 120);
  const eTel = String(d.eTelefone || "").trim();
  let emergencia = "";
  if (eNome || eTel) {
    const eFone = normalizarFone(eTel);
    if (eNome.length < 2 || !eFone) return { erro: "No contato de emergência, preencha o nome e um telefone com DDD." };
    emergencia = `${eNome} · ${foneFmt(eFone)}`;
  }
  const { error } = await supabaseAdmin()
    .from("pacientes")
    .update({ ...(fone ? { whatsapp: fone } : {}), cidade: cidade || null, emergencia_cripto: cifrarOuNulo(emergencia) })
    .eq("id", pacienteId);
  if (error) return { erro: "Não deu para salvar. Tente de novo." };
  revalidatePath(ROTA, "layout");
  return { ok: "Dados atualizados." };
}

// Dispensa o aviso da resposta a um pedido (só os pedidos do paciente que está agindo).
export async function dispensarResposta(pacienteId: string, ids: string[]): Promise<{ erro?: string }> {
  const ctx = await acessoDaAcao(pacienteId);
  if (!ctx || ctx.atual.id !== pacienteId) return { erro: "Sessão expirada. Entre de novo." };
  if (!ids.length || ids.length > 50) return {};
  const { error } = await supabaseAdmin().from("pedidos_paciente").update({ resposta_vista_em: new Date().toISOString() }).in("id", ids).eq("paciente_id", pacienteId).not("resultado", "is", null);
  if (error) return { erro: "Não deu para fechar. Tente de novo." };
  revalidatePath(ROTA, "layout");
  return {};
}
