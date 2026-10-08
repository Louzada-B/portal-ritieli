import { NextResponse, type NextRequest } from "next/server";
import { supabaseServidor } from "../../lib/supabase/servidor";

// Volta do link de troca de senha enviado por e-mail.
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const proximo = url.searchParams.get("proximo") || "/painel";
  const destino = proximo.startsWith("/painel") ? proximo : "/painel";
  if (code) {
    const supabase = await supabaseServidor();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(destino, url.origin));
  }
  return NextResponse.redirect(new URL("/painel/entrar?motivo=link", url.origin));
}
