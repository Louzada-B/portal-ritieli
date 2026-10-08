import { supabaseServidor } from "../../../lib/supabase/servidor";
import type { Escrito } from "../../../lib/escritosBase";
import { TopoCelular } from "../../componentes/Navegacao";
import Escritos from "./Escritos";

export const dynamic = "force-dynamic";

export default async function PaginaEscritos({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const q = await searchParams;
  const sb = await supabaseServidor();
  const { data } = await sb.from("escritos").select("id, slug, titulo, tema, palavra, resumo, capa_url, corpo, publicar_em, criado_em, atualizado_em").order("atualizado_em", { ascending: false });
  const todos = (data ?? []) as Escrito[];
  const agora = Date.now();
  const nPub = todos.filter((e) => e.publicar_em && new Date(e.publicar_em).getTime() <= agora).length;
  const nRasc = todos.filter((e) => !e.publicar_em).length;
  return (
    <>
      <TopoCelular titulo="Escritos" sub={`${nPub} ${nPub === 1 ? "texto" : "textos"} · ${nRasc} ${nRasc === 1 ? "rascunho" : "rascunhos"}`} pedidos={0} />
      <Escritos key={q.id || "lista"} todos={todos} selId={q.id || null} agora={agora} />
    </>
  );
}
