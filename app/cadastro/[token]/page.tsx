import type { Metadata } from "next";
import Moldura from "../../componentes/Moldura";
import { fichaPorToken } from "../../lib/links";
import { supabaseAdmin } from "../../lib/supabase/admin";
import { linkWhatsApp } from "../../conteudo";
import FormFicha from "./FormFicha";
import "../../agendar/agendar.css";
import "../cadastro.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ficha de cadastro · Ritieli Hermes", robots: { index: false, follow: false } };

export default async function Cadastro({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ficha = await fichaPorToken(token);
  let estado: "ok" | "expirado" | "usado" | "invalido" = "invalido";
  let tipo: "adulta" | "crianca" = "adulta";
  let nomeCrianca = "";
  let resp = { nome: "", whatsapp: "", email: "", parentesco: "" };
  let adulta = { nome: "", whatsapp: "", email: "" };
  if (ficha) {
    estado = ficha.preenchida_em ? "usado" : ficha.expirado ? "expirado" : "ok";
    const sb = supabaseAdmin();
    const { data: p } = await sb.from("pacientes").select("tipo, nome, whatsapp, email").eq("id", ficha.paciente_id).single();
    if (p) {
      tipo = p.tipo;
      if (p.tipo === "crianca") {
        nomeCrianca = p.nome;
        const { data: l } = await sb.from("paciente_responsaveis").select("parentesco, responsaveis(nome, whatsapp, email)").eq("paciente_id", ficha.paciente_id).order("ordem").limit(1);
        const r = l?.[0]?.responsaveis as unknown as { nome: string; whatsapp: string | null; email: string | null } | undefined;
        if (r) resp = { nome: r.nome, whatsapp: r.whatsapp || "", email: r.email || "", parentesco: l?.[0]?.parentesco || "" };
      } else {
        adulta = { nome: p.nome, whatsapp: p.whatsapp || "", email: p.email || "" };
      }
    }
  }
  return (
    <Moldura atual="">
      <FormFicha token={token} estado={estado} tipo={tipo} nomeCrianca={nomeCrianca} resp={resp} adulta={adulta} whats={linkWhatsApp("Olá, Ritieli! Preciso de um novo link da ficha de cadastro.")} />
    </Moldura>
  );
}
