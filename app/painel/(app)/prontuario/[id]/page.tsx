import { notFound } from "next/navigation";
import { supabaseServidor } from "../../../../lib/supabase/servidor";
import { decifrarOuVazio } from "../../../../lib/cripto";
import { cpfFormatado } from "../../../../lib/formato";
import { responsaveisDe, type Paciente } from "../../../../lib/pacientes";
import { mascararCpf } from "../../../../lib/termoTexto";
import { fmtDiaCurto } from "../../../../lib/agenda";
import { TopoCelular } from "../../../componentes/Navegacao";
import Prontuario from "../Prontuario";
import { exerciciosDoPaciente } from "../../../../lib/exercicios";

export const dynamic = "force-dynamic";

const curto = (n: string) => { const p = n.trim().split(/\s+/); return p.length > 1 ? `${p[0]} ${p[p.length - 1][0]}.` : p[0]; };
const dataBR = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso.length === 10 ? iso + "T12:00:00Z" : iso));
const dataHora = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)).replace(",", " às");

export default async function PaginaProntuario({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await supabaseServidor();
  const { data: p } = await sb.from("pacientes").select("*").eq("id", id).maybeSingle<Paciente>();
  if (!p) notFound();

  const [{ data: chave }, { data: evos }, { data: secoes }, { data: anexos }, { data: acessos }, { data: sess }, { data: termo }, resps] = await Promise.all([
    sb.from("prontuario_chave").select("salt_senha, iteracoes, chave_senha, salt_rec, chave_rec, pub_recados, priv_recados_cripto").eq("id", 1).maybeSingle(),
    sb.from("prontuario_evolucoes").select("id, data, rotulo, conteudo_cripto, criado_em, prontuario_correcoes(id, conteudo_cripto, criado_em)").eq("paciente_id", id).order("data", { ascending: false }).order("criado_em", { ascending: false }),
    sb.from("prontuario_secoes").select("id, tipo, conteudo_cripto, criado_em").eq("paciente_id", id).order("criado_em", { ascending: false }),
    sb.from("prontuario_anexos").select("id, caminho, meta_cripto, tamanho, criado_em").eq("paciente_id", id).order("criado_em", { ascending: false }),
    sb.from("prontuario_acessos").select("id, acao, aparelho, cidade, quando").or(`paciente_id.eq.${id},paciente_id.is.null`).order("quando", { ascending: false }).limit(40),
    sb.from("sessoes").select("id, inicio, status").eq("paciente_id", id).neq("status", "cancelada").lte("inicio", new Date(Date.now() + 86400000).toISOString()).order("inicio", { ascending: true }),
    sb.from("termos").select("aceito_em").eq("paciente_id", id).eq("status", "aceito").order("aceito_em", { ascending: false }).limit(1).maybeSingle(),
    responsaveisDe(sb, id),
  ]);

  const exercicios = await exerciciosDoPaciente(sb, id);

  // Sessões para vincular à evolução, numeradas na ordem em que aconteceram.
  let n = 0;
  const sessoes = (sess ?? []).map((s) => ({ id: s.id as string, data: new Date(s.inicio).toISOString(), rotulo: `${fmtDiaCurto(new Date(s.inicio))} · sessão ${++n}` })).reverse();

  const inf = p.tipo === "crianca";
  const r = resps.find((x) => x.legal) || resps[0];
  const cpf = cpfFormatado(decifrarOuVazio(inf ? r?.cpf_cripto : p.cpf_cripto));
  const nasc = decifrarOuVazio(p.nascimento_cripto);
  const identificacao = [
    ["Nome completo", p.nome],
    inf ? ["Responsável legal", r ? `${r.nome}${r.parentesco ? ` (${r.parentesco})` : ""}` : "Não cadastrado"] : null,
    ["Data de nascimento", nasc || (p.idade ? `${p.idade} anos` : "Não preenchida")],
    [inf ? "CPF do responsável" : "CPF", cpf ? mascararCpf(cpf) : "Não preenchido"],
    ["Contato de emergência", decifrarOuVazio(p.emergencia_cripto) || "Não preenchido"],
    ["Início do acompanhamento", dataBR(p.desde)],
    ["Termo de consentimento", termo?.aceito_em ? `Aceito em ${dataHora(termo.aceito_em)}` : "Ainda não aceito"],
  ].filter(Boolean) as [string, string][];

  const ultima = (t: string) => (secoes ?? []).find((s) => s.tipo === t) || null;
  const dem = ultima("demanda");
  const enc = ultima("encerramento");

  return (
    <>
      <TopoCelular titulo="Prontuário" sub={`${curto(p.nome)} · área protegida`} pedidos={0} />
      <Prontuario
        key={id}
        paciente={{ id, nome: p.nome, curto: curto(p.nome), tipo: p.tipo, desde: p.desde, status: p.status }}
        pacote={chave ? { salt_senha: chave.salt_senha as string, iteracoes: chave.iteracoes as number, chave_senha: chave.chave_senha as string, salt_rec: chave.salt_rec as string, chave_rec: chave.chave_rec as string } : null}
        parRecados={chave?.pub_recados && chave.priv_recados_cripto ? { pub: chave.pub_recados as string, privCripto: chave.priv_recados_cripto as string } : null}
        exercicios={exercicios}
        evolucoes={(evos ?? []).map((e) => ({
          id: e.id as string,
          data: e.data as string,
          rotulo: (e.rotulo as string | null) || "",
          cripto: e.conteudo_cripto as string,
          reg: `Registrado em ${dataHora(e.criado_em as string)}`,
          correcoes: ((e.prontuario_correcoes as unknown as { id: string; conteudo_cripto: string; criado_em: string }[]) || [])
            .sort((a, b) => a.criado_em.localeCompare(b.criado_em))
            .map((c) => ({ id: c.id, cripto: c.conteudo_cripto, quando: `Correção registrada em ${dataHora(c.criado_em)}` })),
        }))}
        demanda={dem ? { cripto: dem.conteudo_cripto as string, quando: dataHora(dem.criado_em as string), versoes: (secoes ?? []).filter((s) => s.tipo === "demanda").length } : null}
        encerramento={enc ? { cripto: enc.conteudo_cripto as string, quando: dataBR(enc.criado_em as string) } : null}
        anexos={(anexos ?? []).map((a) => ({ id: a.id as string, caminho: a.caminho as string, meta: a.meta_cripto as string, tamanho: a.tamanho as number, quando: dataBR(a.criado_em as string) }))}
        acessos={(acessos ?? []).map((a) => ({ id: a.id as string, quando: dataHora(a.quando as string), acao: a.acao as string, aparelho: [a.aparelho, a.cidade].filter(Boolean).join(" · ") || "—" }))}
        sessoes={sessoes}
        identificacao={identificacao}
      />
    </>
  );
}
