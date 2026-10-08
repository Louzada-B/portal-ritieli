import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type Paciente = {
  id: string;
  tipo: "adulta" | "crianca";
  nome: string;
  idade: number | null;
  whatsapp: string | null;
  email: string | null;
  cidade: string | null;
  escola: string | null;
  cpf_cripto: string | null;
  cpf_final: string | null;
  nascimento_cripto: string | null;
  emergencia_cripto: string | null;
  valor_centavos: number | null;
  tipo_valor: "normal" | "social";
  fixo_dia: number | null;
  fixo_hora: string | null;
  meet_link: string | null;
  google_evento_id: string | null;
  status: "ativo" | "encerrado";
  desde: string;
  fim: string | null;
  retomado_em: string | null;
  pedido_id: string | null;
  ficha_em: string | null;
  criado_em: string;
};

export type Responsavel = {
  id: string;
  nome: string;
  whatsapp: string | null;
  email: string | null;
  cpf_cripto: string | null;
  cpf_final: string | null;
  nascimento_cripto: string | null;
  parentesco: string | null;
  financeiro: boolean;
  legal: boolean;
  ordem: number;
};

export type Termo = {
  id: string;
  paciente_id: string;
  resumo: string;
  status: "enviado" | "aceito" | "cancelado";
  enviado_em: string;
  aceito_em: string | null;
  aceite_nome: string | null;
};

export async function responsaveisDe(sb: SupabaseClient, pacienteId: string): Promise<Responsavel[]> {
  const { data } = await sb
    .from("paciente_responsaveis")
    .select("parentesco, financeiro, legal, ordem, responsaveis(id, nome, whatsapp, email, cpf_cripto, cpf_final, nascimento_cripto)")
    .eq("paciente_id", pacienteId)
    .order("ordem");
  return (data ?? []).map((l) => {
    const r = l.responsaveis as unknown as Omit<Responsavel, "parentesco" | "financeiro" | "legal" | "ordem">;
    return { ...r, parentesco: l.parentesco, financeiro: l.financeiro, legal: l.legal, ordem: l.ordem };
  });
}

// Para quem mandar mensagens: a própria paciente ou o primeiro responsável.
export function contatoPrincipal(p: Paciente, resps: Responsavel[]) {
  if (p.tipo === "crianca" && resps[0]) return { nome: resps[0].nome, whatsapp: resps[0].whatsapp, email: resps[0].email };
  return { nome: p.nome, whatsapp: p.whatsapp, email: p.email };
}
