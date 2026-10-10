import { Lateral, Abas } from "../componentes/Navegacao";
import PrimeiroAcesso from "../../componentes/PrimeiroAcesso";
import { TOUR } from "./ajuda/conteudo";
import { supabaseServidor } from "../../lib/supabase/servidor";

export const dynamic = "force-dynamic";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const supabase = await supabaseServidor();
  const { count } = await supabase.from("pedidos").select("id", { count: "exact", head: true }).eq("status", "aguardando");
  const pedidos = count ?? 0;
  return (
    <div className="adm">
      <PrimeiroAcesso chave="painel" passos={TOUR} ajuda="/painel/ajuda" />
      <Lateral pedidos={pedidos} />
      <div className="pri">
        {children}
        <div style={{ flex: "1 0 auto" }} />
        <Abas pedidos={pedidos} />
      </div>
    </div>
  );
}
