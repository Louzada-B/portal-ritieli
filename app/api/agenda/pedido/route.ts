import { NextResponse, type NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { agendaLiberada, montarAgenda } from "../../../lib/agendaPublica";
import { supabaseAdmin } from "../../../lib/supabase/admin";
import { avisarPedidoNovo } from "../../../lib/aviso";
import { fmtQuando } from "../../../lib/agenda";

export const dynamic = "force-dynamic";

const erro = (codigo: string, msg: string, status = 400) => NextResponse.json({ ok: false, codigo, msg }, { status });

async function turnstileOk(token: string, ip: string) {
  const segredo = process.env.TURNSTILE_SECRET_KEY;
  if (!segredo) return true;
  if (!token) return false;
  const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: new URLSearchParams({ secret: segredo, response: token, remoteip: ip }),
  });
  const j = await r.json().catch(() => ({}));
  return !!j.success;
}

export async function POST(request: NextRequest) {
  if (!(await agendaLiberada())) return erro("fechada", "A agenda ainda não está aberta.", 403);

  let b: Record<string, unknown>;
  try {
    b = await request.json();
  } catch {
    return erro("dados", "Não deu para ler o pedido.");
  }
  const txt = (k: string, max: number) => String(b[k] ?? "").trim().slice(0, max);
  const paraQuem = b.para_quem === "filho" ? "filho" : b.para_quem === "mim" ? "mim" : null;
  const nome = txt("nome", 120);
  const email = txt("email", 254).toLowerCase();
  let wa = txt("whatsapp", 30).replace(/\D/g, "");
  if (wa.length >= 12 && wa.startsWith("55")) wa = wa.slice(2);
  const mensagem = txt("mensagem", 2000);
  const idade = paraQuem === "filho" ? parseInt(txt("idade", 10).replace(/\D/g, ""), 10) : null;
  const inicio = new Date(txt("inicio", 40));

  if (!paraQuem) return erro("dados", "Escolha para quem é a conversa.");
  if (nome.length < 2) return erro("nome", "Escreva seu nome.");
  if (wa.length < 10 || wa.length > 11) return erro("whatsapp", "Confira o WhatsApp, com DDD.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return erro("email", "Confira o e-mail.");
  if (paraQuem === "filho" && (!idade || idade < 5 || idade > 16)) return erro("idade", "O atendimento é para crianças e adolescentes de 5 a 16 anos.");
  if (b.aceite !== true) return erro("aceite", "É preciso aceitar a Política de Privacidade.");
  if (Number.isNaN(inicio.getTime())) return erro("horario", "Escolha um horário.");

  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "sem-ip";
  if (!(await turnstileOk(txt("token", 4000), ip))) return erro("robo", "Não deu para confirmar que você não é um robô. Recarregue a página e tente de novo.");

  const sb = supabaseAdmin();
  const chave = createHash("sha256").update(`${ip}|${process.env.CRON_SECRET || ""}`).digest("hex");
  const desde = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count } = await sb.from("tentativas").select("id", { count: "exact", head: true }).eq("chave", chave).gte("criado_em", desde);
  if ((count ?? 0) >= 5) return erro("limite", "Muitos pedidos seguidos. Se precisar, fale comigo pelo WhatsApp.", 429);
  await sb.from("tentativas").insert({ chave });

  const { count: ativos } = await sb.from("pedidos").select("id", { count: "exact", head: true }).eq("whatsapp", wa).eq("status", "aguardando");
  if ((ativos ?? 0) > 0) return erro("ja_tem", "Você já tem um pedido aguardando minha confirmação. Eu respondo pelo WhatsApp em até 48 horas.", 409);

  const { livres } = await montarAgenda();
  if (!livres.has(inicio.getTime())) return erro("ocupado", "Esse horário acabou de ser reservado. Escolha outro, por favor.", 409);

  const { error } = await sb.from("pedidos").insert({
    para_quem: paraQuem,
    nome,
    whatsapp: wa,
    email,
    idade_crianca: idade,
    mensagem: mensagem || null,
    inicio: inicio.toISOString(),
    aceite_politica_em: new Date().toISOString(),
  });
  if (error) {
    if (error.code === "23505") return erro("ocupado", "Esse horário acabou de ser reservado. Escolha outro, por favor.", 409);
    return erro("falha", "Não deu para enviar agora. Tente de novo em instantes.", 500);
  }

  const quando = fmtQuando(inicio);
  try {
    await avisarPedidoNovo({ nome, quando, paraFilho: paraQuem === "filho" });
  } catch {}
  return NextResponse.json({ ok: true, quando });
}
