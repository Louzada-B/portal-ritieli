import { supabaseServidor } from "../../../lib/supabase/servidor";
import { supabaseAdmin } from "../../../lib/supabase/admin";
import { carregarRegras, horariosTomados, periodos } from "../../../lib/dados";
import { horariosLivres, local, deLocal, fmtDiaCurto, fmtHora, fmtDiaLongo } from "../../../lib/agenda";
import { ocupadosGoogle } from "../../../lib/google";
import { TopoCelular } from "../../componentes/Navegacao";
import FormDisponibilidade from "./FormDisponibilidade";

export default async function Disponibilidade({ searchParams }: { searchParams: Promise<{ google?: string }> }) {
  const { google } = await searchParams;
  const sb = await supabaseServidor();
  const regras = await carregarRegras(sb);
  const tomados = await horariosTomados(sb, regras.config.duracao_conversa_min);
  const { data: con } = await supabaseAdmin().from("google_conexao").select("email, bloquear_site, enviar_eventos").eq("id", 1).maybeSingle();
  const g = await ocupadosGoogle(regras.config.janela_dias).catch(() => ({ periodos: [], erro: true }));

  const livres = horariosLivres({ config: regras.config, semana: regras.semana, bloqueios: periodos(regras.bloqueios), ocupados: [...tomados, ...g.periodos] });
  const hoje = local(new Date());
  const previa = Array.from({ length: 7 }, (_, i) => {
    const dia = deLocal(hoje.ano, hoje.mes, hoje.dia + i + 1);
    const l = local(dia);
    const doDia = livres.filter((h) => { const x = local(h); return x.ano === l.ano && x.mes === l.mes && x.dia === l.dia; });
    const aberto = regras.semana.find((s) => s.dia_semana === l.semana)?.ativo;
    return { dia: fmtDiaCurto(dia), txt: !aberto ? "Sem atendimento" : doDia.length ? doDia.map(fmtHora).join(" · ") : "Tudo ocupado", fechado: !aberto || !doDia.length };
  });

  const bloqueios = regras.bloqueios.map((b) => {
    const i = new Date(b.inicio);
    const f = new Date(b.fim);
    const diaInteiro = local(i).h === 0 && local(i).min === 0 && local(f).h === 0 && local(f).min === 0;
    const ultimoDia = new Date(f.getTime() - 1);
    let rot: string;
    if (diaInteiro) {
      const mesmo = fmtDiaLongo(i) === fmtDiaLongo(ultimoDia);
      rot = mesmo ? fmtDiaLongo(i) : `${fmtDiaLongo(i)} a ${fmtDiaLongo(ultimoDia)}`;
    } else {
      rot = `${fmtDiaLongo(i)} · ${fmtHora(i)} às ${fmtHora(f)}`;
    }
    return { id: b.id, rot, motivo: b.motivo || "" };
  });

  const googleInfo = {
    conectada: !!con,
    email: con?.email || "",
    bloquear: con?.bloquear_site ?? true,
    enviar: con?.enviar_eventos ?? true,
    erro: !!con && g.erro,
    aviso: google || "",
    ocupados: g.periodos.slice(0, 6).map((p) => `${fmtDiaCurto(p.inicio)} · ${fmtHora(p.inicio)} às ${fmtHora(p.fim)}`),
  };

  return (
    <>
      <header className="topo"><div><h1>Seus <em>horários.</em></h1><div className="data">Quando a agenda do site mostra horários para a conversa inicial</div></div></header>
      <TopoCelular titulo="Horários" sub="Disponibilidade da agenda" pedidos={0} />
      <main className="conteudo">
        <FormDisponibilidade semana={regras.semana} config={regras.config} bloqueios={bloqueios} previa={previa} google={googleInfo} />
      </main>
    </>
  );
}
