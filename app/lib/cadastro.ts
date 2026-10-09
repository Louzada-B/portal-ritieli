import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// Situação do cadastro de cada paciente: ficha de cadastro + termo de consentimento.
export type EstadoFicha = "preenchida" | "sem_link" | "nao_enviada" | "aguardando" | "vencida";
export type EstadoTermo = "aceito" | "depois" | "sem" | "nao_enviado" | "aguardando";

export type Cadastro = {
  ficha: EstadoFicha;
  termo: EstadoTermo;
  fichaTxt: string;
  termoTxt: string;
  etiqueta: string; // o que falta, em uma frase curta
  cls: string; // classe da etiqueta
  pendente: boolean;
};

type FichaLinha = { paciente_id: string; criado_em: string; expira_em: string; preenchida_em: string | null; enviada_em: string | null };
type TermoLinha = { paciente_id: string; status: string; enviado_em: string; aceito_em: string | null; link_enviado_em: string | null };

const dia = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "numeric", month: "short" }).format(new Date(iso)).replace(".", "");
const ha = (iso: string) => {
  const n = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return n <= 0 ? "hoje" : n === 1 ? "há 1 dia" : `há ${n} dias`;
};

export function situacao(fichaEm: string | null, ficha: FichaLinha | null, termo: TermoLinha | null): Cadastro {
  let f: EstadoFicha;
  let fichaTxt: string;
  if (fichaEm) {
    f = "preenchida";
    fichaTxt = `Preenchida em ${dia(fichaEm)}`;
  } else if (!ficha) {
    f = "sem_link";
    fichaTxt = "Falta enviar a ficha";
  } else if (new Date(ficha.expira_em).getTime() <= Date.now()) {
    f = "vencida";
    fichaTxt = `Link vencido${ficha.enviada_em ? `, enviado em ${dia(ficha.enviada_em)}` : ""}`;
  } else if (!ficha.enviada_em) {
    f = "nao_enviada";
    fichaTxt = "Link gerado, falta mandar";
  } else {
    f = "aguardando";
    fichaTxt = `Enviada em ${dia(ficha.enviada_em)} (${ha(ficha.enviada_em)}), aguardando`;
  }

  const ativo = termo && termo.status !== "cancelado" ? termo : null;
  let t: EstadoTermo;
  let termoTxt: string;
  if (ativo?.status === "aceito") {
    t = "aceito";
    termoTxt = `Aceito em ${dia(ativo.aceito_em!)}`;
  } else if (ativo) {
    if (ativo.link_enviado_em) {
      t = "aguardando";
      termoTxt = `Enviado em ${dia(ativo.link_enviado_em)} (${ha(ativo.link_enviado_em)}), aguardando`;
    } else {
      t = "nao_enviado";
      termoTxt = "Termo gerado, falta mandar";
    }
  } else if (f !== "preenchida") {
    t = "depois";
    termoTxt = "Depois da ficha";
  } else {
    t = "sem";
    termoTxt = "Falta enviar o termo";
  }

  let etiqueta = "Cadastro completo";
  let cls = "pill p-ok";
  if (f === "sem_link" || f === "nao_enviada") (etiqueta = "Falta enviar a ficha"), (cls = "pill p-ur");
  else if (f === "vencida") (etiqueta = "Link da ficha venceu"), (cls = "pill p-ur");
  else if (f === "aguardando") (etiqueta = "Aguardando a ficha"), (cls = "pill p-av");
  else if (t === "sem" || t === "nao_enviado") (etiqueta = "Falta enviar o termo"), (cls = "pill p-ur");
  else if (t === "aguardando") (etiqueta = "Aguardando o termo"), (cls = "pill p-av");

  return { ficha: f, termo: t, fichaTxt, termoTxt, etiqueta, cls, pendente: !(f === "preenchida" && t === "aceito") };
}

// Última ficha e último termo (não cancelado) de cada paciente, de uma vez.
export async function cadastrosDe(
  sb: SupabaseClient,
  pacs: { id: string; ficha_em: string | null }[],
): Promise<Map<string, Cadastro>> {
  const [{ data: fs }, { data: ts }] = await Promise.all([
    sb.from("fichas").select("paciente_id, criado_em, expira_em, preenchida_em, enviada_em").order("criado_em", { ascending: false }),
    sb.from("termos").select("paciente_id, status, enviado_em, aceito_em, link_enviado_em").order("enviado_em", { ascending: false }),
  ]);
  const ultF = new Map<string, FichaLinha>();
  for (const x of (fs ?? []) as FichaLinha[]) if (!ultF.has(x.paciente_id)) ultF.set(x.paciente_id, x);
  const ultT = new Map<string, TermoLinha>();
  for (const x of (ts ?? []) as TermoLinha[]) {
    const atual = ultT.get(x.paciente_id);
    // aceito vale mais que pendente; cancelado só se for o único
    if (!atual || (atual.status === "cancelado" && x.status !== "cancelado")) ultT.set(x.paciente_id, x);
  }
  const m = new Map<string, Cadastro>();
  for (const p of pacs) m.set(p.id, situacao(p.ficha_em, ultF.get(p.id) ?? null, ultT.get(p.id) ?? null));
  return m;
}
