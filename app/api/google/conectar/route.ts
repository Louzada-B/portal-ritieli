import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { ehAdmin } from "../../../lib/sessao";
import { urlAutorizacao } from "../../../lib/google";

export async function GET(request: NextRequest) {
  if (!(await ehAdmin())) return NextResponse.redirect(new URL("/painel/entrar", request.url));
  const estado = randomBytes(24).toString("hex");
  const r = NextResponse.redirect(urlAutorizacao(estado));
  r.cookies.set("google_estado", estado, { httpOnly: true, secure: true, sameSite: "lax", path: "/api/google", maxAge: 600 });
  return r;
}
