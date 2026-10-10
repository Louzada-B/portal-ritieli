import "server-only";
import { supabaseAdmin } from "./supabase/admin";
import { ehAdmin } from "./sessao";

// Lado do painel: quais acessos à área da(o) paciente existem. Nunca devolve hashes.
export type AcessoInfo = {
  id: string;
  email: string;
  nome: string;
  responsavelId: string | null;
  ativo: boolean;
  ultimoAcesso: string | null;
  senhaPropria: boolean; // já trocou a provisória
  provisoriaVale: boolean; // há uma provisória ainda dentro do prazo
};

export async function acessosDoPaciente(pacienteId: string, responsavelIds: string[]): Promise<AcessoInfo[]> {
  if (!(await ehAdmin())) return [];
  const sb = supabaseAdmin();
  const filtro = [`paciente_id.eq.${pacienteId}`, ...responsavelIds.map((r) => `responsavel_id.eq.${r}`)].join(",");
  const { data } = await sb
    .from("acessos_paciente")
    .select("id, email, nome, responsavel_id, ativo, ultimo_acesso_em, senha_trocada_em, prov_hash, prov_expira_em")
    .or(filtro)
    .order("criado_em");
  const agora = Date.now();
  return (data ?? []).map((a) => ({
    id: a.id as string,
    email: a.email as string,
    nome: a.nome as string,
    responsavelId: (a.responsavel_id as string | null) ?? null,
    ativo: !!a.ativo,
    ultimoAcesso: (a.ultimo_acesso_em as string | null) ?? null,
    senhaPropria: !!a.senha_trocada_em,
    provisoriaVale: !!a.prov_hash && !!a.prov_expira_em && new Date(a.prov_expira_em as string).getTime() > agora,
  }));
}
