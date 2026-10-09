import { supabaseAdmin } from "../../../lib/supabase/admin";
import { rodarLembretes } from "../../../lib/lembretes";

// Chamada uma vez por dia pela Vercel (vercel.json). A Vercel manda "Authorization: Bearer <CRON_SECRET>".
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || req.headers.get("authorization") !== `Bearer ${segredo}`) return new Response("Não autorizado", { status: 401 });
  try {
    return Response.json({ ok: true, enviados: await rodarLembretes(supabaseAdmin()) });
  } catch (e) {
    console.error("Lembretes:", e);
    return Response.json({ ok: false }, { status: 500 });
  }
}
