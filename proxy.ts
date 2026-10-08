import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Protege o painel: renova a sessão, manda para o login quem não está logada
// e pede a senha de novo depois de 10 dias sem abrir o painel.
const DEZ_DIAS = 10 * 24 * 60 * 60 * 1000;
const COOKIE_VISTO = "painel_visto";
const LIVRES = ["/painel/entrar", "/painel/retorno"];

export async function proxy(request: NextRequest) {
  let resposta = NextResponse.next({ request });

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (lista) => {
        lista.forEach(({ name, value }) => request.cookies.set(name, value));
        resposta = NextResponse.next({ request });
        lista.forEach(({ name, value, options }) => resposta.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const logada = !!data?.claims;
  const caminho = request.nextUrl.pathname;
  const livre = LIVRES.some((p) => caminho.startsWith(p));

  const irPara = (destino: string, motivo?: string) => {
    const url = request.nextUrl.clone();
    url.pathname = destino;
    url.search = motivo ? `?motivo=${motivo}` : "";
    const r = NextResponse.redirect(url);
    resposta.cookies.getAll().forEach((c) => r.cookies.set(c));
    return r;
  };

  if (!logada) {
    return livre ? resposta : irPara("/painel/entrar");
  }

  const visto = Number(request.cookies.get(COOKIE_VISTO)?.value || 0);
  if (visto && Date.now() - visto > DEZ_DIAS && caminho !== "/painel/entrar") {
    await supabase.auth.signOut();
    const r = irPara("/painel/entrar", "inatividade");
    r.cookies.delete(COOKIE_VISTO);
    return r;
  }

  if (caminho === "/painel/entrar") return irPara("/painel");

  resposta.cookies.set(COOKIE_VISTO, String(Date.now()), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/painel",
    maxAge: 60 * 60 * 24 * 400,
  });
  return resposta;
}

export const config = {
  matcher: ["/painel/:path*", "/painel"],
};
