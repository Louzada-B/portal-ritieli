import { NextResponse, type NextRequest } from "next/server";
import { ehAdmin } from "../../../lib/sessao";
import { cifrar, trocarCodigo } from "../../../lib/google";
import { supabaseAdmin } from "../../../lib/supabase/admin";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const voltar = (status: string) => {
    const r = NextResponse.redirect(new URL(`/painel/disponibilidade?google=${status}`, request.url));
    r.cookies.delete({ name: "google_estado", path: "/api/google" });
    return r;
  };
  if (!(await ehAdmin())) return NextResponse.redirect(new URL("/painel/entrar", request.url));
  const estado = request.cookies.get("google_estado")?.value;
  if (!estado || estado !== url.searchParams.get("state")) return voltar("erro");
  const code = url.searchParams.get("code");
  if (!code) return voltar("cancelado");
  try {
    const t = await trocarCodigo(code);
    if (!t.refresh_token) return voltar("erro");
    const { error } = await supabaseAdmin().from("google_conexao").upsert({
      id: 1,
      email: process.env.AVISO_EMAIL || null,
      refresh_token_cripto: cifrar(t.refresh_token),
      conectado_em: new Date().toISOString(),
    });
    if (error) return voltar("erro");
    return voltar("ok");
  } catch {
    return voltar("erro");
  }
}
