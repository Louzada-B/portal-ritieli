import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { siteUrl } from "../site";
import { contato, linkWhatsApp } from "../conteudo";

// E-mails automáticos do site. Sai do endereço do domínio (AVISO_REMETENTE) pelo Resend.
// Regra da casa: nenhum e-mail leva dado clínico. Links de ficha e termo NÃO vão por e-mail:
// esses seguem só pelo WhatsApp, enviados à mão pela Ritieli.

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export const primeiroNome = (n: string) => n.trim().split(/\s+/)[0] || n;

type Botao = { texto: string; url: string };

function moldura(o: { etiqueta: string; titulo: string; paragrafos: string[]; botao?: Botao; rodape: string }) {
  const btn = o.botao
    ? `<a href="${esc(o.botao.url)}" style="display:inline-block;background:#7A2335;color:#FFFFFF;text-decoration:none;border-radius:999px;padding:13px 22px;font-weight:700;font-size:15px">${esc(o.botao.texto)}</a>`
    : "";
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#F8F3F0;font-family:Arial,Helvetica,sans-serif;color:#3A1F25">
<div style="max-width:520px;margin:0 auto;padding:32px 20px"><div style="background:#FFFFFF;border-radius:24px;padding:28px">
<p style="margin:0 0 6px;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#9A5A67;font-weight:700">${esc(o.etiqueta)}</p>
<h1 style="margin:0 0 16px;font-size:24px;line-height:1.2;color:#7A2335">${esc(o.titulo)}</h1>
${o.paragrafos.map((p) => `<p style="margin:0 0 14px;font-size:16px;line-height:1.5;color:#3A1F25">${p}</p>`).join("\n")}
${btn ? `<p style="margin:8px 0 0">${btn}</p>` : ""}
</div>
<p style="margin:16px 4px 0;font-size:12px;line-height:1.5;color:#8A7A7E">${o.rodape}</p>
</div></body></html>`;
}

const RODAPE_PACIENTE = `E-mail automático de ${contato.nome}, psicóloga (${contato.crp}). Para falar com ela, responda esta mensagem ou chame no WhatsApp.`;
const RODAPE_LEMBRETE = `${RODAPE_PACIENTE} Se preferir não receber estes lembretes, é só avisar.`;

async function enviar(p: { para: string; assunto: string; html: string; respostaPara?: string }): Promise<boolean> {
  const chave = process.env.RESEND_API_KEY;
  if (!chave || !p.para) return false;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.AVISO_REMETENTE || "Portal Ritieli <onboarding@resend.dev>",
        to: [p.para],
        subject: p.assunto,
        html: p.html,
        ...(p.respostaPara ? { reply_to: p.respostaPara } : {}),
      }),
    });
    if (!r.ok) console.error("Resend recusou o e-mail:", r.status, await r.text().catch(() => ""));
    return r.ok;
  } catch (e) {
    console.error("Falha ao enviar e-mail:", e);
    return false;
  }
}

// Para a pessoa: as respostas chegam no e-mail pessoal da Ritieli.
const paraPessoa = (para: string, assunto: string, html: string) => enviar({ para, assunto, html, respostaPara: process.env.AVISO_EMAIL || undefined });

// ---------- controle: um e-mail de cada tipo por assunto, nunca repetido ----------

export async function reservar(sb: SupabaseClient, tipo: string, chave: string) {
  const { error } = await sb.from("envios_email").insert({ tipo, chave });
  if (error && error.code !== "23505") console.error("envios_email:", error.message);
  return !error;
}

export async function liberar(sb: SupabaseClient, tipo: string, chave: string) {
  await sb.from("envios_email").delete().eq("tipo", tipo).eq("chave", chave);
}

// Reserva, envia e, se o envio falhar, libera para tentar de novo na próxima rodada.
export async function enviarUmaVez(sb: SupabaseClient, tipo: string, chave: string, fn: () => Promise<boolean>) {
  if (!(await reservar(sb, tipo, chave))) return false;
  const ok = await fn().catch(() => false);
  if (!ok) await liberar(sb, tipo, chave);
  return ok;
}

// ---------- para a pessoa ----------

export function emailConversaConfirmada(d: { para: string; nome: string; dia: string; hora: string; meet: string; minutos: number }) {
  return paraPessoa(
    d.para,
    `Sua conversa inicial está confirmada · ${d.dia}, ${d.hora}`,
    moldura({
      etiqueta: "Conversa inicial confirmada",
      titulo: `Tudo certo, ${primeiroNome(d.nome)}!`,
      paragrafos: [
        `Sua conversa inicial com a ${esc(contato.nome)} está marcada para <b>${esc(d.dia)}, às ${esc(d.hora)}</b>.`,
        `Ela é gratuita e dura cerca de ${d.minutos} minutos. No horário, é só abrir o link abaixo.`,
        `Se precisar mudar o horário, responda este e-mail ou chame no WhatsApp.`,
      ],
      botao: { texto: "Entrar na chamada", url: d.meet },
      rodape: RODAPE_PACIENTE,
    }),
  );
}

export function emailLembreteSessao(d: { para: string; nome: string; sessaoDe?: string; dia: string; hora: string; meet: string | null }) {
  return paraPessoa(
    d.para,
    `Lembrete: ${d.sessaoDe ? `sessão de ${d.sessaoDe}` : "sua sessão"} · ${d.dia}, ${d.hora}`,
    moldura({
      etiqueta: "Lembrete de sessão",
      titulo: `Olá, ${primeiroNome(d.nome)}!`,
      paragrafos: [
        `${d.sessaoDe ? `A sessão de <b>${esc(primeiroNome(d.sessaoDe))}</b>` : "Sua sessão"} está marcada para <b>${esc(d.dia)}, às ${esc(d.hora)}</b>.`,
        d.meet ? `O link da chamada é o de sempre. Se precisar, está aqui embaixo.` : `Se precisar remarcar, avise com antecedência pelo WhatsApp.`,
      ],
      botao: d.meet ? { texto: "Entrar na chamada", url: d.meet } : { texto: "Falar no WhatsApp", url: linkWhatsApp() },
      rodape: RODAPE_LEMBRETE,
    }),
  );
}

export function emailLembreteConversa(d: { para: string; nome: string; hora: string; meet: string }) {
  return paraPessoa(
    d.para,
    `Hoje, às ${d.hora}: sua conversa inicial`,
    moldura({
      etiqueta: "Lembrete da conversa inicial",
      titulo: `Hoje é o dia, ${primeiroNome(d.nome)}!`,
      paragrafos: [`Sua conversa inicial com a ${esc(contato.nome)} é <b>hoje, às ${esc(d.hora)}</b>. No horário, é só abrir o link abaixo.`],
      botao: { texto: "Entrar na chamada", url: d.meet },
      rodape: RODAPE_PACIENTE,
    }),
  );
}

// Ficha e termo: o e-mail só lembra. O link continua só no WhatsApp.
export function emailFichaPendente(d: { para: string; nome: string; paciente?: string; ate: string }) {
  return paraPessoa(
    d.para,
    "Lembrete: falta preencher a ficha de cadastro",
    moldura({
      etiqueta: "Ficha de cadastro",
      titulo: `Olá, ${primeiroNome(d.nome)}!`,
      paragrafos: [
        `A ${esc(contato.nome)} te enviou pelo WhatsApp o link da <b>ficha de cadastro${d.paciente ? ` de ${esc(primeiroNome(d.paciente))}` : ""}</b>, e ela ainda não foi preenchida.`,
        `O link vale até <b>${esc(d.ate)}</b>. Se não encontrar a mensagem, peça outro pelo WhatsApp.`,
      ],
      botao: { texto: "Pedir o link pelo WhatsApp", url: linkWhatsApp("Olá, Ritieli! Preciso do link da ficha de cadastro de novo.") },
      rodape: RODAPE_LEMBRETE,
    }),
  );
}

export function emailTermoPendente(d: { para: string; nome: string; paciente?: string }) {
  return paraPessoa(
    d.para,
    "Lembrete: falta ler e aceitar o termo",
    moldura({
      etiqueta: "Termo de consentimento",
      titulo: `Olá, ${primeiroNome(d.nome)}!`,
      paragrafos: [
        `A ${esc(contato.nome)} te enviou pelo WhatsApp o link do <b>termo de consentimento${d.paciente ? ` de ${esc(primeiroNome(d.paciente))}` : ""}</b>, e ele ainda não foi aceito.`,
        `Se não encontrar a mensagem, peça o link de novo pelo WhatsApp.`,
      ],
      botao: { texto: "Pedir o link pelo WhatsApp", url: linkWhatsApp("Olá, Ritieli! Preciso do link do termo de consentimento de novo.") },
      rodape: RODAPE_LEMBRETE,
    }),
  );
}

// Senha provisória da área da(o) paciente: vale 24 horas e só serve para o primeiro acesso (ou para recuperar o acesso).
export function emailSenhaProvisoria(d: { para: string; nome: string; senha: string; primeiraVez: boolean }) {
  const caixa = `<span style="display:inline-block;background:#F6E5E7;color:#7A2335;border-radius:12px;padding:12px 18px;font-family:Menlo,Consolas,monospace;font-size:22px;font-weight:700;letter-spacing:.08em">${esc(d.senha)}</span>`;
  return paraPessoa(
    d.para,
    d.primeiraVez ? "Seu acesso à área da(o) paciente" : "Sua senha provisória",
    moldura({
      etiqueta: "Área da(o) paciente",
      titulo: d.primeiraVez ? `Boas-vindas, ${primeiroNome(d.nome)}!` : `Olá, ${primeiroNome(d.nome)}!`,
      paragrafos: [
        d.primeiraVez
          ? `A ${esc(contato.nome)} criou o seu acesso à área da(o) paciente, onde ficam as suas sessões, o link da chamada e os pagamentos.`
          : `Você pediu uma senha provisória para entrar na área da(o) paciente.`,
        `Entre com este e-mail e a senha provisória abaixo. Ela vale por <b>24 horas</b> e, ao entrar, você cria a sua própria senha.`,
        caixa,
        `Não compartilhe esta senha com ninguém. Se você não pediu isto, pode ignorar este e-mail.`,
      ],
      botao: { texto: "Entrar na área da(o) paciente", url: `${siteUrl}/area-paciente/entrar` },
      rodape: RODAPE_PACIENTE,
    }),
  );
}

// Resposta da Ritieli a um pedido feito na área da(o) paciente (sem dado clínico).
export function emailPedidoRespondido(d: { para: string; nome: string; tipo: "remarcar" | "cancelar"; resultado: "confirmado" | "recusado"; sessao: string; novoHorario?: string }) {
  const remarcar = d.tipo === "remarcar";
  const assunto = d.resultado === "recusado" ? "Sobre o seu pedido" : remarcar ? "Remarcação confirmada" : "Cancelamento confirmado";
  const texto =
    d.resultado === "recusado"
      ? `A ${esc(contato.nome)} viu o seu pedido ${remarcar ? "de remarcação" : "de cancelamento"} da sessão de <b>${esc(d.sessao)}</b> e não conseguiu atendê-lo. A sessão continua como estava. Se quiser, combine outra opção pelo WhatsApp.`
      : remarcar
        ? `A sua sessão de <b>${esc(d.sessao)}</b> foi remarcada para <b>${esc(d.novoHorario || "")}</b>.`
        : `O cancelamento da sessão de <b>${esc(d.sessao)}</b> foi confirmado.`;
  return paraPessoa(
    d.para,
    assunto,
    moldura({
      etiqueta: "Área da(o) paciente",
      titulo: `Olá, ${primeiroNome(d.nome)}!`,
      paragrafos: [texto, `Você pode ver tudo na sua área.`],
      botao: { texto: "Abrir a área da(o) paciente", url: `${siteUrl}/area-paciente/entrar` },
      rodape: RODAPE_PACIENTE,
    }),
  );
}

// ---------- para a Ritieli (sem dado clínico) ----------

export function emailParaRitieli(d: { assunto: string; titulo: string; nome: string; texto: string; caminho: string }) {
  const para = process.env.AVISO_EMAIL;
  if (!para) return Promise.resolve(false);
  return enviar({
    para,
    assunto: d.assunto,
    html: moldura({
      etiqueta: d.titulo,
      titulo: d.nome,
      paragrafos: [esc(d.texto)],
      botao: { texto: "Abrir o painel", url: `${siteUrl}${d.caminho}` },
      rodape: "Aviso automático do seu site. Os dados ficam só no painel.",
    }),
  });
}
