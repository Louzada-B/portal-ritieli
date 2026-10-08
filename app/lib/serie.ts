import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Paciente } from "./pacientes";
import { instanciaDaSerie, procurarSerie } from "./google";

// Em qual série semanal do Google está a sessão do horário fixo que começava em "original".
// Confere a série atual do paciente, depois as antigas (de antes de mudar o horário ou de
// retomar o acompanhamento) e, por fim, procura na agenda pelo título. Sem achar, dá erro.
export async function serieDaSessao(sb: SupabaseClient, p: Paciente, original: Date): Promise<string> {
  const candidatas = [p.google_evento_id, ...(p.series_antigas ?? [])].filter((x): x is string => !!x);
  for (const id of candidatas) {
    try {
      await instanciaDaSerie(id, original);
      return id;
    } catch (e) {
      if (e instanceof Error && e.message === "sem_google") throw e;
    }
  }
  const achada = await procurarSerie(`Sessão · ${p.nome}`, original);
  if (!achada) throw new Error("sem_ocorrencia");
  if (!candidatas.includes(achada)) {
    const lista = [...(p.series_antigas ?? []), achada];
    await sb.from("pacientes").update({ series_antigas: lista }).eq("id", p.id);
    p.series_antigas = lista;
  }
  return achada;
}

// Guarda a série que deixou de ser a atual (ela ainda tem sessões do período antigo).
export async function guardarSerieAntiga(sb: SupabaseClient, p: Paciente, id: string) {
  const lista = [...new Set([...(p.series_antigas ?? []), id])];
  await sb.from("pacientes").update({ series_antigas: lista }).eq("id", p.id);
  p.series_antigas = lista;
}
