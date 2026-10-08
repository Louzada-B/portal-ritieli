import { supabaseServidor } from "../../../lib/supabase/servidor";
import { decifrarOuVazio } from "../../../lib/cripto";
import { cpfFormatado } from "../../../lib/formato";
import { responsaveisDe, type Paciente } from "../../../lib/pacientes";
import { mascararCpf, type ConteudoTermo } from "../../../lib/termoTexto";
import { TopoCelular } from "../../componentes/Navegacao";
import Termos, { type ItemHist, type PacNovo } from "./Termos";

export const dynamic = "force-dynamic";

const dia = (iso: string, hora = false) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "numeric", month: "short", ...(hora ? { hour: "2-digit", minute: "2-digit" } : {}) }).format(new Date(iso)).replace(".", "");
const longo = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)).replace(" às", ", às");

export default async function PaginaTermos({ searchParams }: { searchParams: Promise<{ t?: string; paciente?: string; aba?: string }> }) {
  const q = await searchParams;
  const sb = await supabaseServidor();
  const [{ data: termos }, { data: pacs }, { data: cfg }] = await Promise.all([
    sb.from("termos").select("id, paciente_id, resumo, status, enviado_em, aceito_em, aceite_nome, conteudo_cripto, pacientes(nome)").order("enviado_em", { ascending: false }),
    sb.from("pacientes").select("*").eq("status", "ativo").order("nome"),
    sb.from("config_agenda").select("politica_faltas").eq("id", 1).single(),
  ]);

  const curto = (n: string) => {
    const p = n.trim().split(/\s+/);
    return p.length > 1 ? `${p[0]} ${p[p.length - 1][0]}.` : p[0];
  };

  const lista = termos ?? [];
  const sel = lista.find((t) => t.id === q.t) || lista[0];
  const hist: ItemHist[] = lista.map((t) => {
    const nome = (t.pacientes as unknown as { nome: string } | null)?.nome || "Paciente";
    return {
      id: t.id,
      pac: curto(nome),
      tipo: t.resumo,
      enviado: `Enviado em ${dia(t.enviado_em)}`,
      status: t.status,
      st: t.status === "aceito" ? `Aceito em ${dia(t.aceito_em!, true)}` : t.status === "enviado" ? "Aguardando aceite" : "Cancelado",
      reg:
        t.status === "aceito"
          ? `Aceito eletronicamente por ${t.aceite_nome} em ${longo(t.aceito_em!)}, pelo link pessoal enviado por WhatsApp. Registro guardado com data, hora e versão do termo.`
          : t.status === "enviado"
            ? "Aguardando o aceite eletrônico. Quando a paciente aceitar pelo link, a data e a hora aparecem aqui."
            : "Termo cancelado. O link deixou de valer.",
      como: t.status === "aceito" ? (t.resumo.startsWith("Infantil") ? "Aceite online pela responsável" : "Aceite online") : "Link enviado pelo WhatsApp",
    };
  });
  let doc: ConteudoTermo | null = null;
  if (sel) {
    try {
      doc = JSON.parse(decifrarOuVazio(sel.conteudo_cripto)) as ConteudoTermo;
    } catch {
      doc = null;
    }
  }

  // Pacientes para um termo novo, com os dados que vêm do cadastro.
  const ativos = (pacs ?? []) as Paciente[];
  const escolhido = ativos.find((p) => p.id === q.paciente) || ativos[0];
  const opcoes = ativos.map((p) => ({ id: p.id, n: curto(p.nome) }));
  let novo: PacNovo | null = null;
  if (escolhido) {
    const inf = escolhido.tipo === "crianca";
    const resps = inf ? await responsaveisDe(sb, escolhido.id) : [];
    const r = resps.find((x) => x.legal) || resps[0];
    const cpfCompleto = cpfFormatado(decifrarOuVazio(inf ? r?.cpf_cripto : escolhido.cpf_cripto));
    const { data: ficha } = await sb.from("fichas").select("criado_em, preenchida_em").eq("paciente_id", escolhido.id).order("criado_em", { ascending: false }).limit(1).maybeSingle();
    novo = {
      id: escolhido.id,
      tipo: escolhido.tipo,
      nome: escolhido.nome,
      resp: r ? `${r.nome}${r.parentesco ? ` (${r.parentesco})` : ""}` : "",
      respNome: r?.nome || "",
      respId: r?.id || null,
      cpf: cpfCompleto ? mascararCpf(cpfCompleto) : "",
      nasc: inf ? (escolhido.idade != null ? `${escolhido.idade} anos` : "Não preenchido") : decifrarOuVazio(escolhido.nascimento_cripto) || "Não preenchido",
      emerg: decifrarOuVazio(escolhido.emergencia_cripto),
      ficha: ficha?.preenchida_em ? `Ficha preenchida em ${dia(ficha.preenchida_em)}` : ficha ? `Ficha enviada em ${dia(ficha.criado_em)} · aguardando` : "Ficha ainda não enviada",
      valor: escolhido.valor_centavos != null ? String(escolhido.valor_centavos / 100).replace(".", ",") : "",
      tipoValor: escolhido.tipo_valor,
      whatsapp: inf ? r?.whatsapp || "" : escolhido.whatsapp || "",
    };
  }

  const pend = hist.filter((h) => h.status === "enviado").length;
  const dataHoje = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "numeric", month: "long", year: "numeric" }).format(new Date());

  return (
    <>
      <header className="topo"><div><h1>Termo de <em>consentimento.</em></h1><div className="data">Envie, acompanhe e consulte os termos dos pacientes</div></div></header>
      <TopoCelular titulo="Termos" sub="Histórico e novos termos" pedidos={0} />
      <main className="conteudo">
        <Termos
          key={`${sel?.id || ""}-${escolhido?.id || ""}-${q.aba || ""}`}
          hist={hist}
          selId={sel?.id || null}
          doc={doc}
          pacientes={opcoes}
          novo={novo}
          faltasPadrao={cfg?.politica_faltas || ""}
          dataHoje={dataHoje}
          pendentes={pend}
          tabInicial={q.paciente || !hist.length ? "novo" : "hist"}
          abaInicial={q.aba === "doc" ? "doc" : "form"}
        />
      </main>
    </>
  );
}
