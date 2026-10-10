import { NextResponse } from "next/server";
import { acessoDaAcao, ROTA } from "../../../../lib/pacienteAuth";
import { supabaseAdmin } from "../../../../lib/supabase/admin";

export const dynamic = "force-dynamic";

// Abre um anexo só se ele pertencer a um exercício do paciente que está logado.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const ctx = await acessoDaAcao(url.searchParams.get("p"));
  if (!ctx) return NextResponse.redirect(new URL(`${ROTA}/entrar`, req.url));
  const sb = supabaseAdmin();
  const { data: a } = await sb.from("exercicio_anexos").select("caminho, nome, exercicio_id").eq("id", id).maybeSingle();
  if (!a) return new NextResponse("Não encontrado", { status: 404 });
  const { data: ex } = await sb.from("exercicios").select("paciente_id").eq("id", a.exercicio_id as string).maybeSingle();
  if (!ex || !ctx.pacientes.some((p) => p.id === ex.paciente_id)) return new NextResponse("Não encontrado", { status: 404 });
  const { data, error } = await sb.storage.from("exercicios").createSignedUrl(a.caminho as string, 120, { download: a.nome as string });
  if (error || !data) return new NextResponse("Não deu para abrir o arquivo.", { status: 500 });
  const r = NextResponse.redirect(data.signedUrl);
  r.headers.set("Cache-Control", "no-store");
  return r;
}
