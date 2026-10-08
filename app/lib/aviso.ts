import "server-only";
import { siteUrl } from "../site";

// Avisa a Ritieli por e-mail que chegou um pedido novo.
// Sem domínio próprio, o Resend só entrega no e-mail da dona da conta, que é ela.
// A mensagem da pessoa não vai no e-mail: fica só no painel.
export async function avisarPedidoNovo(p: { nome: string; quando: string; paraFilho: boolean }) {
  const chave = process.env.RESEND_API_KEY;
  const para = process.env.AVISO_EMAIL;
  if (!chave || !para) return;
  const link = `${siteUrl}/painel/pedidos`;
  const quem = p.paraFilho ? "para o filho ou a filha" : "para ela";
  const html = `<!doctype html><html><body style="margin:0;background:#F8F3F0;font-family:Arial,Helvetica,sans-serif;color:#3A1F25">
<div style="max-width:520px;margin:0 auto;padding:32px 20px">
<div style="background:#FFFFFF;border-radius:24px;padding:28px">
<p style="margin:0 0 6px;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#9A5A67;font-weight:700">Pedido de conversa inicial</p>
<h1 style="margin:0 0 16px;font-size:24px;line-height:1.2;color:#7A2335">${esc(p.nome)}</h1>
<p style="margin:0 0 4px;font-size:16px"><b>${esc(p.quando)}</b></p>
<p style="margin:0 0 22px;font-size:15px;color:#5A3A41">Conversa ${quem}. Responda em até 48 horas.</p>
<a href="${link}" style="display:inline-block;background:#7A2335;color:#FFFFFF;text-decoration:none;border-radius:999px;padding:13px 22px;font-weight:700;font-size:15px">Abrir o painel</a>
</div>
<p style="margin:16px 4px 0;font-size:12px;color:#8A7A7E">Aviso automático do seu site. Os dados da pessoa ficam só no painel.</p>
</div></body></html>`;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.AVISO_REMETENTE || "Portal Ritieli <onboarding@resend.dev>",
      to: [para],
      subject: `Novo pedido de conversa · ${p.quando}`,
      html,
    }),
  });
}

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
