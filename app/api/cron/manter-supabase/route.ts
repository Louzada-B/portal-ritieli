import { supabaseAdmin } from "../../../lib/supabase/admin";

// Rotina só para o Supabase gratuito não pausar por falta de uso. Roda uma vez por dia (vercel.json),
// não depende de CRON_SECRET nem dos lembretes: só faz duas leituras leves e não devolve nenhum dado.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sb = supabaseAdmin();
    const [a, b] = await Promise.all([
      sb.from("pacientes").select("id", { count: "exact", head: true }),
      sb.from("envios_email").select("id", { count: "exact", head: true }),
    ]);
    if (a.error || b.error) throw a.error ?? b.error;
    return Response.json({ ok: true });
  } catch (e) {
    console.error("Manter Supabase:", e);
    return Response.json({ ok: false }, { status: 500 });
  }
}
