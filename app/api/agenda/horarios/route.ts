import { NextResponse } from "next/server";
import { agendaLiberada, montarAgenda } from "../../../lib/agendaPublica";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await agendaLiberada())) return NextResponse.json({ aberta: false });
  try {
    const { duracao, dias } = await montarAgenda();
    return NextResponse.json({ aberta: true, duracao, dias }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ aberta: true, erro: true, dias: [] }, { status: 500 });
  }
}
