import Casca from "../Casca";
import PagamentoAberto from "../Pagamento";
import { exigirAcesso } from "../../lib/pacienteAuth";
import { supabaseAdmin } from "../../lib/supabase/admin";
import { sessoesDoPaciente, configPix, valorDe, devidasDe } from "../../lib/pacienteDados";
import { fmtDiaCurto, local } from "../../lib/agenda";
import { reais } from "../../lib/formato";
import { linkWhatsApp } from "../../conteudo";

export const dynamic = "force-dynamic";

const dm = (iso: string) => {
  const l = local(new Date(iso));
  return `${String(l.dia).padStart(2, "0")}/${String(l.mes + 1).padStart(2, "0")}`;
};

export default async function Pagamentos({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const ctx = await exigirAcesso((await searchParams).p);
  const p = ctx.atual;
  const sb = supabaseAdmin();
  const [sessoes, pix] = await Promise.all([sessoesDoPaciente(sb, p.id), configPix(sb)]);
  const devendo = sessoes.filter((s) => (s.status === "realizada" || s.status === "falta") && !s.pago_em);
  const total = devendo.reduce((a, s) => a + valorDe(s, p.valor_centavos), 0);
  const pagas = sessoes.filter((s) => s.pago_em && s.status !== "cancelada").sort((a, b) => b.inicio.localeCompare(a.inicio));
  const recibos = pagas.filter((s) => !!s.recibo_em).length;

  return (
    <Casca ctx={ctx} aba="pagamentos">
      <div className="pag-h"><h1>Seus <em>pagamentos.</em></h1><p>Pagamento por Pix. A Ritieli confere e marca como pago.</p></div>

      <div className="resumos">
        <div className="resumo"><span className="s">Em aberto</span><b>{reais(total) || "R$ 0"}</b></div>
        <div className="resumo"><span className="s">Recibos disponíveis</span><b>{recibos}</b></div>
        <div className="resumo"><span className="s">Valor da sessão</span><b>{reais(p.valor_centavos) || "A combinar"}</b></div>
      </div>

      {devendo.length ? <div style={{ marginTop: 20 }}><PagamentoAberto devidas={devidasDe(sessoes, p.valor_centavos)} pix={pix} /></div> : null}

      <section className="card" style={{ marginTop: 20 }} aria-labelledby="ph-t">
        <h2 className="card-t" id="ph-t">Histórico</h2>
        {pagas.length ? (
          <div className="tab" role="table">
            <div className="tr th" role="row"><span>Sessão</span><span>Valor</span><span>Confirmado em</span><span className="c-forma">Forma</span><span>Recibo</span></div>
            {pagas.slice(0, 60).map((s) => (
              <div className="tr" role="row" key={s.id}>
                <span>{fmtDiaCurto(new Date(s.inicio))}</span>
                <span>{reais(valorDe(s, p.valor_centavos))}</span>
                <span>{dm(s.pago_em!)}</span>
                <span className="c-forma">Pix</span>
                <span>{s.recibo_em ? (
                  <span style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <span className="pill p-ok">Recibo emitido</span>
                    <a href={linkWhatsApp(`Olá, Ritieli! Pode me enviar o recibo da sessão de ${fmtDiaCurto(new Date(s.inicio))}?`)} target="_blank" rel="noopener">Solicitar recibo</a>
                  </span>
                ) : <span className="pill p-av">Aguardando recibo</span>}</span>
              </div>
            ))}
          </div>
        ) : <p style={{ margin: 0, color: "#6B5A5E" }}>Os pagamentos confirmados vão aparecer aqui.</p>}
      </section>
    </Casca>
  );
}
