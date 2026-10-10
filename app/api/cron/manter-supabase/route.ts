import { supabaseAdmin } from "../../../lib/supabase/admin";

// Rotina só para o Supabase gratuito não pausar por falta de uso. A Vercel chama todos os dias (vercel.json);
// a cada 5 dias grava uma linha "check" com a data em `keepalive` e apaga a anterior. Nos outros dias só faz
// uma leitura leve. Não depende de CRON_SECRET nem dos lembretes e não devolve nenhum dado.
export const dynamic = "force-dynamic";

const INTERVALO_MS = 5 * 24 * 60 * 60 * 1000;

export async function GET() {
  try {
    const sb = supabaseAdmin();
    const { data, error } = await sb.from("keepalive").select("id, checado_em").order("id", { ascending: false }).limit(1);
    if (error) throw error;
    const ultima = data?.[0];
    const vencida = !ultima || Date.now() - new Date(ultima.checado_em).getTime() >= INTERVALO_MS;
    if (vencida) {
      const { error: e1 } = await sb.from("keepalive").insert({ status: "check" });
      if (e1) throw e1;
      if (ultima) {
        const { error: e2 } = await sb.from("keepalive").delete().lte("id", ultima.id);
        if (e2) throw e2;
      }
    }
    return Response.json({ ok: true });
  } catch (e) {
    console.error("Manter Supabase:", e);
    return Response.json({ ok: false }, { status: 500 });
  }
}
