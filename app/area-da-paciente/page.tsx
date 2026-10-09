import Casca from "./Casca";
import EntrarSessao from "./EntrarSessao";
import PedidoSessao from "./PedidoSessao";
import PagamentoAberto from "./Pagamento";
import { exigirAcesso } from "../lib/pacienteAuth";
import { supabaseAdmin } from "../lib/supabase/admin";
import { sessoesDoPaciente, pedidosDoPaciente, configPix, valorDe } from "../lib/pacienteDados";
import { fmtDiaLongo, fmtHora, local } from "../lib/agenda";
import { primeiroNome } from "../lib/formato";
import { linkWhatsApp } from "../conteudo";

export const dynamic = "force-dynamic";

export default async function Inicio({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const ctx = await exigirAcesso((await searchParams).p);
  const p = ctx.atual;
  const sb = supabaseAdmin();
  const [sessoes, pedidos, pix] = await Promise.all([sessoesDoPaciente(sb, p.id), pedidosDoPaciente(sb, p.id), configPix(sb)]);
  const agora = Date.now();
  const futuras = sessoes.filter((s) => s.status === "agendada" && new Date(s.inicio).getTime() >= agora - 3600000);
  const prox = futuras[0];
  const depois = futuras.slice(1, 5);
  const devendo = sessoes.filter((s) => (s.status === "realizada" || s.status === "falta") && !s.pago_em);
  const total = devendo.reduce((a, s) => a + valorDe(s, p.valor_centavos), 0);
  const pedidoDe = (id: string) => pedidos.find((x) => x.sessao_id === id)?.tipo ?? null;
  const wa = linkWhatsApp("Olá, Ritieli! Preciso combinar sobre a minha sessão.");
  const presencial = p.tipo === "crianca";

  return (
    <Casca ctx={ctx} aba="inicio">
      <div className="ola">
        <div><h1>Olá, <em>{primeiroNome(ctx.acesso.nome)}.</em></h1><p>{presencial ? `Acompanhamento de ${primeiroNome(p.nome)}.` : "Que bom ter você aqui."}</p></div>
        {devendo.length ? <span className="pill p-av">{devendo.length} pagamento{devendo.length > 1 ? "s" : ""} em aberto</span> : null}
      </div>

      <div className="grade1">
        <section className="card prox" aria-labelledby="px-t">
          <div className="card-h"><span className="rot" id="px-t">Próxima sessão</span></div>
          {prox ? (
            <>
              <div><p className="prox-dia">{fmtDiaLongo(new Date(prox.inicio))}</p><div className="prox-hora">{fmtHora(new Date(prox.inicio))}</div></div>
              <div className="prox-meta"><span>{presencial ? "Presencial · R. Santa Flora, 1166 · Nonoai" : "Online · Google Meet"}</span></div>
              <div className="prox-acoes">
                {!presencial ? <EntrarSessao meet={p.meet_link} inicio={prox.inicio} /> : null}
                <PedidoSessao pacienteId={p.id} sessaoId={prox.id} pedido={pedidoDe(prox.id)} menos24h={new Date(prox.inicio).getTime() - agora < 24 * 3600000} whatsapp={wa} />
              </div>
            </>
          ) : (
            <p style={{ margin: 0, color: "#F6E5E7" }}>Não há sessão marcada no momento. Para combinar um horário, fale com a Ritieli pelo WhatsApp.</p>
          )}
        </section>

        {devendo.length ? <PagamentoAberto qtd={devendo.length} centavos={total} pix={pix} /> : (
          <section className="card"><h2 className="card-t">Pagamentos</h2><p style={{ margin: 0, color: "#6B5A5E" }}>Nada em aberto. Tudo em dia.</p></section>
        )}
      </div>

      {depois.length ? (
        <section className="card secao-card" style={{ marginTop: 20 }} aria-labelledby="ps-t">
          <h2 className="card-t" id="ps-t">Próximas sessões</h2>
          <div className="lista">
            {depois.map((s) => {
              const d = new Date(s.inicio);
              const l = local(d);
              return (
                <div className="item" key={s.id}>
                  <div className="dt"><span className="d1">{["dom", "seg", "ter", "qua", "qui", "sex", "sáb"][l.semana]}</span><span className="d2">{l.dia}</span></div>
                  <div className="it-t"><b>{fmtDiaLongo(d)}</b><span>{fmtHora(d)}{pedidoDe(s.id) ? " · pedido enviado" : ""}</span></div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="semana" style={{ marginTop: 20 }}>
        <div><span className="rot">Para esta semana</span><h3>O exercício da semana chega em breve.</h3><p>Aqui vai aparecer o que a Ritieli combinar com você entre uma sessão e outra.</p></div>
      </section>
    </Casca>
  );
}
