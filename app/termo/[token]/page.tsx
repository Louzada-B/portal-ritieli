import type { Metadata } from "next";
import Moldura from "../../componentes/Moldura";
import { termoPorToken } from "../../lib/links";
import { supabaseAdmin } from "../../lib/supabase/admin";
import { decifrarOuVazio } from "../../lib/cripto";
import { primeiroNome } from "../../lib/formato";
import type { ConteudoTermo } from "../../lib/termoTexto";
import { linkWhatsApp } from "../../conteudo";
import Aceite from "./Aceite";
import "../../agendar/agendar.css";
import "../../cadastro/cadastro.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Termo de consentimento · Ritieli Hermes", robots: { index: false, follow: false } };

export default async function PaginaTermo({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = await termoPorToken(token);
  let estado: "ok" | "aceito" | "cancelado" | "invalido" = "invalido";
  let c: ConteudoTermo | null = null;
  let sala = "";
  if (t) {
    estado = t.status === "aceito" ? "aceito" : t.status === "enviado" ? "ok" : "cancelado";
    try {
      c = JSON.parse(decifrarOuVazio(t.conteudo_cripto));
    } catch {
      c = null;
    }
    if (!c) estado = "invalido";
    const { data: p } = await supabaseAdmin().from("pacientes").select("meet_link, tipo").eq("id", t.paciente_id).single();
    if (p?.tipo === "adulta" && p.meet_link) sala = p.meet_link;
  }
  const quem = c ? primeiroNome(c.tipo === "crianca" && c.responsavel ? c.responsavel.nome : c.nome) : "";
  return (
    <Moldura atual="">
      <Aceite token={token} estado={estado} c={c} quem={quem} sala={sala} whats={linkWhatsApp("Olá, Ritieli! Preciso de um novo link do termo de consentimento.")} />
    </Moldura>
  );
}
