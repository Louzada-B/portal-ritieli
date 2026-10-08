"use server";

import { revalidatePath } from "next/cache";
import { supabaseServidor } from "../../../lib/supabase/servidor";
import { cifrar, decifrarOuVazio, novoToken } from "../../../lib/cripto";
import { cpfValido, cpfFormatado, soDigitos, normalizarFone, centavosDe, primeiroNome, fixoTexto } from "../../../lib/formato";
import { responsaveisDe, contatoPrincipal, type Paciente } from "../../../lib/pacientes";
import { criarEventoSemanal, apagarEvento, obterEvento, mudarFimSerie, acertarOcorrencia, renomearEvento, moverEvento } from "../../../lib/google";
import { local, deLocal } from "../../../lib/agenda";
import { siteUrl } from "../../../site";
import { conflitoFixo } from "../../../lib/conflitos";

export type Resultado = { erro?: string; ok?: string; id?: string; link?: string; para?: string; texto?: string; valor?: string };

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export type DadosNovo = {
  tipo: "adulta" | "crianca";
  nome: string;
  idade: string;
  whatsapp: string;
  email: string;
  cpf: string;
  rNome: string;
  rParentesco: string;
  rWhatsapp: string;
  rEmail: string;
  rCpf: string;
  valor: string;
  tipoValor: "normal" | "social";
  fixoDia: string;
  fixoHora: string;
  desde: string;
  fim: string;
  pedidoId?: string;
};

const DATA = /^\d{4}-\d{2}-\d{2}$/;
function validarPeriodo(d: { desde: string; fim: string }) {
  if (!DATA.test(d.desde)) return { erro: "Escolha a data de início." };
  if (d.fim && !DATA.test(d.fim)) return { erro: "Confira a data de fim." };
  if (d.fim && d.fim < d.desde) return { erro: "O fim precisa ser depois do início." };
  return { desde: d.desde, fim: d.fim || null };
}

function validarComum(d: { valor: string; fixoDia: string; fixoHora: string }) {
  const valor = d.valor.trim() ? centavosDe(d.valor) : null;
  if (d.valor.trim() && valor == null) return { erro: "Confira o valor da sessão." };
  const temFixo = d.fixoDia !== "" && d.fixoHora !== "";
  if ((d.fixoDia !== "") !== (d.fixoHora !== "")) return { erro: "Escolha o dia e o horário fixos, ou deixe os dois em branco." };
  if (temFixo && !HORA.test(d.fixoHora)) return { erro: "Horário fixo inválido." };
  return { valor, fixoDia: temFixo ? Number(d.fixoDia) : null, fixoHora: temFixo ? d.fixoHora : null };
}

export async function criarPaciente(d: DadosNovo): Promise<Resultado> {
  if (d.nome.trim().length < 2) return { erro: "Escreva o nome do paciente." };
  const comum = validarComum(d);
  if ("erro" in comum) return { erro: comum.erro };
  const per = validarPeriodo(d);
  if ("erro" in per) return { erro: per.erro };
  const sb = await supabaseServidor();
  if (comum.fixoDia != null && comum.fixoHora) {
    const c = await conflitoFixo(sb, { fixo_dia: comum.fixoDia, fixo_hora: comum.fixoHora, desde: per.desde, fim: per.fim });
    if (c) return { erro: c };
  }

  const base = {
    desde: per.desde,
    fim: per.fim,
    tipo: d.tipo,
    nome: d.nome.trim(),
    valor_centavos: comum.valor,
    tipo_valor: d.tipoValor,
    fixo_dia: comum.fixoDia,
    fixo_hora: comum.fixoHora,
    pedido_id: d.pedidoId || null,
  };

  if (d.tipo === "adulta") {
    const wa = d.whatsapp.trim() ? normalizarFone(d.whatsapp) : null;
    if (d.whatsapp.trim() && !wa) return { erro: "Confira o WhatsApp, com DDD." };
    if (d.email.trim() && !EMAIL.test(d.email.trim())) return { erro: "Confira o e-mail." };
    if (d.cpf.trim() && !cpfValido(d.cpf)) return { erro: "CPF inválido." };
    const cpf = soDigitos(d.cpf);
    const { data, error } = await sb
      .from("pacientes")
      .insert({ ...base, whatsapp: wa, email: d.email.trim().toLowerCase() || null, cpf_cripto: cpf ? cifrar(cpf) : null, cpf_final: cpf ? cpf.slice(-2) : null })
      .select("id")
      .single();
    if (error) return { erro: "Não deu para salvar. Tente de novo." };
    revalidatePath("/painel/pacientes");
    return { ok: `Paciente salvo.${await salaInicial(sb, data.id)}`, id: data.id };
  }

  const idade = parseInt(soDigitos(d.idade), 10);
  if (!idade || idade < 1 || idade > 17) return { erro: "Confira a idade da criança ou do adolescente." };
  if (d.rNome.trim().length < 2) return { erro: "Escreva o nome do responsável." };
  const rWa = d.rWhatsapp.trim() ? normalizarFone(d.rWhatsapp) : null;
  if (d.rWhatsapp.trim() && !rWa) return { erro: "Confira o WhatsApp do responsável, com DDD." };
  if (d.rEmail.trim() && !EMAIL.test(d.rEmail.trim())) return { erro: "Confira o e-mail do responsável." };
  if (d.rCpf.trim() && !cpfValido(d.rCpf)) return { erro: "CPF do responsável inválido." };
  const rCpf = soDigitos(d.rCpf);

  const { data: pac, error } = await sb.from("pacientes").insert({ ...base, idade }).select("id").single();
  if (error) return { erro: "Não deu para salvar. Tente de novo." };
  const { data: resp, error: e2 } = await sb
    .from("responsaveis")
    .insert({ nome: d.rNome.trim(), whatsapp: rWa, email: d.rEmail.trim().toLowerCase() || null, cpf_cripto: rCpf ? cifrar(rCpf) : null, cpf_final: rCpf ? rCpf.slice(-2) : null })
    .select("id")
    .single();
  if (e2) return { erro: "O paciente foi salvo, mas o responsável não. Adicione na ficha." , id: pac.id };
  await sb.from("paciente_responsaveis").insert({ paciente_id: pac.id, responsavel_id: resp.id, parentesco: d.rParentesco.trim() || null, financeiro: true, legal: true, ordem: 1 });
  revalidatePath("/painel/pacientes");
  return { ok: `Paciente salvo.${await salaInicial(sb, pac.id)}`, id: pac.id };
}

export async function atualizarPaciente(id: string, d: { nome: string; idade: string; whatsapp: string; email: string; valor: string; tipoValor: "normal" | "social"; fixoDia: string; fixoHora: string; desde: string; fim: string }): Promise<Resultado> {
  if (d.nome.trim().length < 2) return { erro: "Escreva o nome." };
  const comum = validarComum(d);
  if ("erro" in comum) return { erro: comum.erro };
  const per = validarPeriodo(d);
  if ("erro" in per) return { erro: per.erro };
  const wa = d.whatsapp.trim() ? normalizarFone(d.whatsapp) : null;
  if (d.whatsapp.trim() && !wa) return { erro: "Confira o WhatsApp, com DDD." };
  if (d.email.trim() && !EMAIL.test(d.email.trim())) return { erro: "Confira o e-mail." };
  const idade = d.idade.trim() ? parseInt(soDigitos(d.idade), 10) : null;
  const sb = await supabaseServidor();
  const { data: atual } = await sb.from("pacientes").select("*").eq("id", id).single<Paciente>();
  if (!atual) return { erro: "Paciente não encontrado." };
  const mudouAgenda = atual.fixo_dia !== comum.fixoDia || (atual.fixo_hora || "").slice(0, 5) !== (comum.fixoHora || "") || atual.desde !== per.desde || (atual.fim || null) !== per.fim;
  if (atual.status === "ativo" && mudouAgenda && comum.fixoDia != null && comum.fixoHora) {
    const c = await conflitoFixo(sb, { id, fixo_dia: comum.fixoDia, fixo_hora: comum.fixoHora, desde: per.desde, fim: per.fim, antigo: { dia: atual.fixo_dia, hora: atual.fixo_hora } });
    if (c) return { erro: c };
  }
  const { data: novo, error } = await sb
    .from("pacientes")
    .update({
      nome: d.nome.trim(),
      idade,
      whatsapp: wa,
      email: d.email.trim().toLowerCase() || null,
      valor_centavos: comum.valor,
      tipo_valor: d.tipoValor,
      fixo_dia: comum.fixoDia,
      fixo_hora: comum.fixoHora,
      desde: per.desde,
      fim: per.fim,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single<Paciente>();
  if (error || !novo) return { erro: "Não deu para salvar. Tente de novo." };
  revalidatePath("/painel/pacientes");
  revalidatePath("/painel/sessoes");

  // Nome novo: os eventos da agenda (série e avulsas que ainda vão acontecer) acompanham.
  if (atual.nome !== novo.nome) await renomearNaAgenda(sb, novo).catch(() => {});

  // A sessão semanal na agenda acompanha o que mudou (e nasce, se ainda não existia).
  if (!atual.google_evento_id) return { ok: `Salvo.${novo.status === "ativo" ? await salaInicial(sb, id) : ""}` };
  const mudouFixo = atual.fixo_dia !== novo.fixo_dia || (atual.fixo_hora || "").slice(0, 5) !== (novo.fixo_hora || "").slice(0, 5) || atual.desde !== novo.desde;
  try {
    if (mudouFixo) {
      const r = await refazerSerie(sb, novo, false);
      return { ok: r === "sem_serie" ? "Salvo. Sem horário fixo, a sessão semanal saiu da sua agenda a partir de hoje." : "Salvo. A sessão semanal da agenda mudou junto, com a mesma sala." };
    }
    if ((atual.fim || null) !== (novo.fim || null)) {
      await mudarFimSerie(atual.google_evento_id, novo.fim);
      return { ok: novo.fim ? "Salvo. A sessão semanal da agenda agora termina no fim previsto." : "Salvo. A sessão semanal da agenda segue sem data de fim." };
    }
  } catch {
    return { ok: "Salvo, mas a agenda do Google não respondeu. Gere a sala de novo para a agenda acompanhar." };
  }
  return { ok: "Salvo." };
}

// Link pessoal da ficha de cadastro (vale 7 dias) e a mensagem pronta para o WhatsApp.
export async function linkFicha(id: string): Promise<Resultado> {
  const sb = await supabaseServidor();
  const { data: p } = await sb.from("pacientes").select("*").eq("id", id).single<Paciente>();
  if (!p) return { erro: "Paciente não encontrado." };
  const resps = await responsaveisDe(sb, id);
  const c = contatoPrincipal(p, resps);
  const { token, hash } = novoToken();
  const { error } = await sb.from("fichas").insert({ paciente_id: id, token_hash: hash, expira_em: new Date(Date.now() + 7 * 86400000).toISOString() });
  if (error) return { erro: "Não deu para gerar o link. Tente de novo." };
  const link = `${siteUrl}/cadastro/${token}`;
  const texto = `Olá, ${primeiroNome(c.nome)}! Aqui é a Ritieli. Para organizarmos o início do acompanhamento, preencha a ficha de cadastro neste link pessoal (leva uns 3 minutos e vale por 7 dias): ${link}`;
  return { ok: "Link gerado.", link, para: c.whatsapp || "", texto };
}

export async function verCpf(id: string, quem: "paciente" | "responsavel"): Promise<Resultado> {
  const sb = await supabaseServidor();
  const tabela = quem === "paciente" ? "pacientes" : "responsaveis";
  const { data } = await sb.from(tabela).select("cpf_cripto").eq("id", id).single();
  if (!data?.cpf_cripto) return { erro: "CPF não informado." };
  return { valor: cpfFormatado(decifrarOuVazio(data.cpf_cripto)) };
}

export async function verPessoais(id: string): Promise<{ nascimento: string; emergencia: string }> {
  const sb = await supabaseServidor();
  const { data } = await sb.from("pacientes").select("nascimento_cripto, emergencia_cripto").eq("id", id).single();
  return { nascimento: decifrarOuVazio(data?.nascimento_cripto), emergencia: decifrarOuVazio(data?.emergencia_cripto) };
}

export async function salvarCpf(id: string, quem: "paciente" | "responsavel", cpf: string): Promise<Resultado> {
  if (!cpfValido(cpf)) return { erro: "CPF inválido." };
  const c = soDigitos(cpf);
  const sb = await supabaseServidor();
  const { error } = await sb.from(quem === "paciente" ? "pacientes" : "responsaveis").update({ cpf_cripto: cifrar(c), cpf_final: c.slice(-2) }).eq("id", id);
  if (error) return { erro: "Não deu para salvar. Tente de novo." };
  revalidatePath("/painel/pacientes");
  return { ok: "CPF salvo." };
}

export async function adicionarResponsavel(pacienteId: string, d: { nome: string; parentesco: string; whatsapp: string; email: string; cpf: string; financeiro: boolean }): Promise<Resultado> {
  if (d.nome.trim().length < 2) return { erro: "Escreva o nome do responsável." };
  const wa = d.whatsapp.trim() ? normalizarFone(d.whatsapp) : null;
  if (d.whatsapp.trim() && !wa) return { erro: "Confira o WhatsApp, com DDD." };
  if (d.email.trim() && !EMAIL.test(d.email.trim())) return { erro: "Confira o e-mail." };
  if (d.cpf.trim() && !cpfValido(d.cpf)) return { erro: "CPF inválido." };
  const c = soDigitos(d.cpf);
  const sb = await supabaseServidor();
  const { data: r, error } = await sb
    .from("responsaveis")
    .insert({ nome: d.nome.trim(), whatsapp: wa, email: d.email.trim().toLowerCase() || null, cpf_cripto: c ? cifrar(c) : null, cpf_final: c ? c.slice(-2) : null })
    .select("id")
    .single();
  if (error) return { erro: "Não deu para salvar. Tente de novo." };
  const { count } = await sb.from("paciente_responsaveis").select("responsavel_id", { count: "exact", head: true }).eq("paciente_id", pacienteId);
  await sb.from("paciente_responsaveis").insert({ paciente_id: pacienteId, responsavel_id: r.id, parentesco: d.parentesco.trim() || null, financeiro: d.financeiro, legal: true, ordem: (count ?? 0) + 1 });
  revalidatePath("/painel/pacientes");
  return { ok: "Responsável adicionado." };
}

const DURACAO = 50;
const isoLocal = (d: Date) => { const l = local(d); return `${l.ano}-${String(l.mes + 1).padStart(2, "0")}-${String(l.dia).padStart(2, "0")}`; };
const hojeISO = () => isoLocal(new Date());
const somaDias = (iso: string, n: number) => { const [a, m, d] = iso.split("-").map(Number); return isoLocal(deLocal(a, m - 1, d + n, 12)); };

// Primeira ocorrência do horário fixo a partir de um dia (aaaa-mm-dd), sem voltar ao passado.
function primeiraOcorrencia(dia: number, hora: string, aPartir: string) {
  const agora = Date.now();
  const [h, m] = hora.split(":").map(Number);
  const [a, mm, dd] = aPartir.split("-").map(Number);
  for (let i = 0; i < 400; i++) {
    const d = deLocal(a, mm - 1, dd + i, h, m);
    if (local(d).semana === dia && d.getTime() > agora) return d;
  }
  return null;
}

// Fecha a série antiga (mantém o passado na agenda) e cria a nova a partir da próxima sessão.
// novaSala=false reaproveita a sala do Meet, então o link continua o mesmo.
async function refazerSerie(sb: Awaited<ReturnType<typeof supabaseServidor>>, p: Paciente, novaSala: boolean, fimAntigo?: string | null): Promise<"ok" | "sem_serie"> {
  const hoje = hojeISO();
  const aPartir = [p.desde, p.retomado_em || "", hoje].sort().pop()!;
  let conferencia: unknown = undefined;
  if (p.google_evento_id) {
    const velho = await obterEvento(p.google_evento_id).catch(() => null);
    if (velho && !novaSala && velho.conferenceData?.conferenceId) {
      const { createRequest: _c, ...resto } = velho.conferenceData;
      conferencia = resto;
    }
    const inicioVelho = velho?.start?.dateTime ? isoLocal(new Date(velho.start.dateTime)) : hoje;
    // A série antiga vai até o dia antes da nova começar (ou até o fim que já tinha, se for antes).
    let corte = somaDias(aPartir, -1);
    if (fimAntigo && fimAntigo < corte) corte = fimAntigo;
    if (inicioVelho > corte) await apagarEvento(p.google_evento_id).catch(() => {});
    else await mudarFimSerie(p.google_evento_id, corte).catch(() => {});
  }
  const inicio = p.fixo_dia != null && p.fixo_hora ? primeiraOcorrencia(p.fixo_dia, p.fixo_hora.slice(0, 5), aPartir) : null;
  if (!inicio || (p.fim && isoLocal(inicio) > p.fim)) {
    await sb.from("pacientes").update({ google_evento_id: null, atualizado_em: new Date().toISOString() }).eq("id", p.id);
    return "sem_serie";
  }
  const ev = await criarEventoSemanal({
    chave: `${p.id.replace(/-/g, "")}${Date.now()}`,
    titulo: `Sessão · ${p.nome}`,
    inicio,
    duracaoMin: DURACAO,
    descricao: `Sessão semanal (${fixoTexto(p.fixo_dia, p.fixo_hora)}). Criada pelo painel.`,
    ate: p.fim,
    conferencia,
  });
  await sb.from("pacientes").update({ meet_link: ev.meet || p.meet_link, google_evento_id: ev.id, atualizado_em: new Date().toISOString() }).eq("id", p.id);
  return "ok";
}

// Com horário fixo definido, a sessão semanal e a sala do Meet já nascem junto com o cadastro:
// o horário fica reservado no site e o link já existe para o termo e as mensagens.
async function salaInicial(sb: Awaited<ReturnType<typeof supabaseServidor>>, id: string): Promise<string> {
  const { data: p } = await sb.from("pacientes").select("*").eq("id", id).single<Paciente>();
  if (!p || p.fixo_dia == null || !p.fixo_hora || p.google_evento_id) return "";
  try {
    const r = await refazerSerie(sb, p, true);
    return r === "ok" ? " A sessão semanal e a sala do Meet já estão na sua agenda." : "";
  } catch (e) {
    if (e instanceof Error && e.message === "sem_google") return " Conecte o Google Agenda em Disponibilidade para criar a sala do Meet.";
    return " A agenda do Google não respondeu: use Gerar link do Google Meet na ficha.";
  }
}

// Cria a sessão semanal na agenda, com uma sala nova do Meet.
export async function gerarSala(id: string): Promise<Resultado> {
  const sb = await supabaseServidor();
  const { data: p } = await sb.from("pacientes").select("*").eq("id", id).single<Paciente>();
  if (!p) return { erro: "Paciente não encontrado." };
  if (p.fixo_dia == null || !p.fixo_hora) return { erro: "Defina o horário fixo antes de gerar a sala." };
  try {
    const r = await refazerSerie(sb, p, true);
    revalidatePath("/painel/pacientes");
    if (r === "sem_serie") return { erro: "Não há sessões entre o início e o fim do acompanhamento. Confira as datas." };
    const { data: n } = await sb.from("pacientes").select("meet_link").eq("id", id).single();
    return n?.meet_link ? { ok: "Sala criada. A sessão semanal já está na sua agenda." } : { erro: "O evento foi para a agenda, mas o Google não criou a sala do Meet." };
  } catch (e) {
    if (e instanceof Error && e.message === "sem_google") return { erro: "Conecte o Google Agenda em Disponibilidade para gerar a sala." };
    return { erro: "O Google Agenda não respondeu. Tente de novo." };
  }
}

// Encerra na data da última sessão: a série da agenda para ali (o passado fica)
// e as sessões agendadas depois dela saem.
export async function encerrarPaciente(id: string, ultima: string): Promise<Resultado> {
  if (!DATA.test(ultima)) return { erro: "Escolha a data da última sessão." };
  const sb = await supabaseServidor();
  const { data: p } = await sb.from("pacientes").select("*").eq("id", id).single<Paciente>();
  if (!p) return { erro: "Paciente não encontrado." };
  if (ultima < p.desde) return { erro: "A última sessão precisa ser depois do início do acompanhamento." };
  const { error } = await sb.from("pacientes").update({ status: "encerrado", fim: ultima, atualizado_em: new Date().toISOString() }).eq("id", id);
  if (error) return { erro: "Não deu para salvar. Tente de novo." };
  const [a, m, d] = ultima.split("-").map(Number);
  const depois = deLocal(a, m - 1, d + 1).toISOString();
  const { data: saem } = await sb.from("sessoes").select("id, google_evento_id, pago_em").eq("paciente_id", id).eq("status", "agendada").gte("inicio", depois);
  // Sessões já pagas depois do fim não somem: viram crédito (o dinheiro já entrou).
  const pagas = (saem ?? []).filter((x) => x.pago_em).map((x) => x.id as string);
  const livres = (saem ?? []).filter((x) => !x.pago_em).map((x) => x.id as string);
  if (pagas.length) await sb.from("sessoes").update({ status: "cancelada", atualizado_em: new Date().toISOString() }).in("id", pagas);
  if (livres.length) await sb.from("sessoes").delete().in("id", livres);
  for (const x of saem ?? []) if (x.google_evento_id) await apagarEvento(x.google_evento_id as string).catch(() => {});
  let aviso = pagas.length ? ` ${pagas.length === 1 ? "Uma sessão já paga" : `${pagas.length} sessões já pagas`} depois do fim ${pagas.length === 1 ? "virou crédito" : "viraram crédito"}: aparece na ficha, para combinar a devolução (ou usar, se ela voltar).` : "";
  if (p.google_evento_id) await mudarFimSerie(p.google_evento_id, ultima).catch(() => { aviso += " A agenda do Google não respondeu: confira a sessão semanal por lá."; });
  revalidatePath("/painel/pacientes");
  revalidatePath("/painel/sessoes");
  return { ok: `Acompanhamento encerrado. A sessão semanal sai da agenda depois da última sessão.${aviso}` };
}

// Reativa a partir de uma data de retomada (hoje ou depois), com o horário fixo escolhido.
// As sessões de antes do encerramento ficam como estão; as novas começam na retomada.
export async function reativarPaciente(id: string, r: { retomada: string; fixoDia: string; fixoHora: string }): Promise<Resultado> {
  if (!DATA.test(r.retomada)) return { erro: "Escolha a data da retomada." };
  if (r.retomada < hojeISO()) return { erro: "A retomada precisa ser hoje ou depois." };
  const comum = validarComum({ valor: "", fixoDia: r.fixoDia, fixoHora: r.fixoHora });
  if ("erro" in comum) return { erro: comum.erro };
  const sb = await supabaseServidor();
  const { data: antes } = await sb.from("pacientes").select("*").eq("id", id).single<Paciente>();
  if (!antes) return { erro: "Paciente não encontrado." };
  if (antes.status === "ativo") return { erro: "O acompanhamento já está ativo." };
  if (comum.fixoDia != null && comum.fixoHora) {
    const c = await conflitoFixo(sb, { id, fixo_dia: comum.fixoDia, fixo_hora: comum.fixoHora, desde: r.retomada, fim: null, antigo: { dia: antes.fixo_dia, hora: antes.fixo_hora } });
    if (c) return { erro: c };
  }
  const { data: p } = await sb
    .from("pacientes")
    .update({ status: "ativo", fim: null, retomado_em: r.retomada, fixo_dia: comum.fixoDia, fixo_hora: comum.fixoHora, atualizado_em: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single<Paciente>();
  if (!p) return { erro: "Não deu para salvar. Tente de novo." };
  revalidatePath("/painel/pacientes");
  revalidatePath("/painel/sessoes");
  const quando = `a partir de ${r.retomada.split("-").reverse().join("/")}`;
  if (comum.fixoDia == null) {
    if (antes.google_evento_id) await sb.from("pacientes").update({ google_evento_id: null }).eq("id", id);
    return { ok: `Acompanhamento reativado ${quando}, ainda sem horário fixo. Defina o horário em Editar dados quando combinar.` };
  }
  try {
    // A série antiga termina onde já terminava (no encerramento); a nova começa na retomada.
    const r2 = await refazerSerie(sb, p, false, antes.fim);
    return { ok: r2 === "ok" ? `Acompanhamento reativado ${quando}. A sessão semanal voltou para a agenda, com a mesma sala.` : `Acompanhamento reativado ${quando}.` };
  } catch (e) {
    if (e instanceof Error && e.message === "sem_google") return { ok: `Acompanhamento reativado ${quando}. Conecte o Google Agenda em Disponibilidade para a sessão semanal entrar na agenda.` };
    return { ok: `Acompanhamento reativado ${quando}, mas a agenda do Google não respondeu. Use Conferir agenda do Google na ficha.` };
  }
}

// Exclusão definitiva (pedido da própria pessoa ou cadastro de teste): tira a sessão
// semanal da agenda e apaga ficha, termos, responsáveis só deste paciente e o cadastro.
export async function excluirPaciente(id: string, confirmacao: string, prontuarioGuardado = false): Promise<Resultado> {
  const sb = await supabaseServidor();
  const { data: p } = await sb.from("pacientes").select("id, nome, google_evento_id").eq("id", id).single();
  if (!p) return { erro: "Paciente não encontrado." };
  if (confirmacao.trim().toLowerCase() !== p.nome.trim().toLowerCase()) return { erro: "Escreva o nome completo, igual ao cadastro, para confirmar." };
  const [{ count: nEvo }, { count: nSec }, { data: anexos }] = await Promise.all([
    sb.from("prontuario_evolucoes").select("id", { count: "exact", head: true }).eq("paciente_id", id),
    sb.from("prontuario_secoes").select("id", { count: "exact", head: true }).eq("paciente_id", id),
    sb.from("prontuario_anexos").select("caminho").eq("paciente_id", id),
  ]);
  const temProntuario = (nEvo ?? 0) + (nSec ?? 0) + (anexos?.length ?? 0) > 0;
  if (temProntuario && !prontuarioGuardado) return { erro: "Exporte e guarde o prontuário antes de excluir." };
  if (anexos?.length) await sb.storage.from("prontuario").remove(anexos.map((a) => a.caminho as string));
  if (p.google_evento_id) await apagarEvento(p.google_evento_id).catch(() => {});
  const { data: avulsas } = await sb.from("sessoes").select("google_evento_id").eq("paciente_id", id).not("google_evento_id", "is", null);
  for (const x of avulsas ?? []) await apagarEvento(x.google_evento_id as string).catch(() => {});

  const { data: links } = await sb.from("paciente_responsaveis").select("responsavel_id").eq("paciente_id", id);
  const ids = (links ?? []).map((l) => l.responsavel_id as string);
  const { error } = await sb.from("pacientes").delete().eq("id", id);
  if (error) return { erro: "Não deu para excluir. Tente de novo." };
  if (ids.length) {
    // Responsáveis que não cuidam de outro paciente saem junto.
    const { data: outros } = await sb.from("paciente_responsaveis").select("responsavel_id").in("responsavel_id", ids);
    const ficam = new Set((outros ?? []).map((o) => o.responsavel_id as string));
    const sair = ids.filter((r) => !ficam.has(r));
    if (sair.length) await sb.from("responsaveis").delete().in("id", sair);
  }
  revalidatePath("/painel/pacientes");
  revalidatePath("/painel/termos");
  return { ok: "Paciente e dados excluídos." };
}

async function renomearNaAgenda(sb: Awaited<ReturnType<typeof supabaseServidor>>, p: Paciente) {
  const titulo = `Sessão · ${p.nome}`;
  if (p.google_evento_id) await renomearEvento(p.google_evento_id, titulo).catch(() => {});
  const { data: avulsas } = await sb.from("sessoes").select("google_evento_id").eq("paciente_id", p.id).eq("origem", "manual").gte("inicio", new Date().toISOString()).not("google_evento_id", "is", null);
  for (const x of avulsas ?? []) await renomearEvento(x.google_evento_id as string, titulo).catch(() => {});
}

// Confere a agenda do Google contra as sessões do painel e acerta o que estiver diferente:
// cada sessão do horário fixo no dia e hora certos, canceladas fora da agenda, e o nome em dia.
export async function acertarAgenda(id: string): Promise<{ ok?: string; erro?: string }> {
  const sb = await supabaseServidor();
  const { data: p } = await sb.from("pacientes").select("*").eq("id", id).single<Paciente>();
  if (!p) return { erro: "Paciente não encontrado." };
  const { data: sess } = await sb.from("sessoes").select("id, inicio, status, origem, remarcada_de, google_evento_id").eq("paciente_id", id).order("inicio");
  let mudou = 0;
  let falhou = 0;
  try {
    await renomearNaAgenda(sb, p);
    for (const s of sess ?? []) {
      const inicio = new Date(s.inicio);
      const cancelada = s.status === "cancelada";
      if (s.origem === "fixo" && p.google_evento_id) {
        const original = new Date(s.remarcada_de || s.inicio);
        try {
          if (await acertarOcorrencia(p.google_evento_id, original, inicio, cancelada, DURACAO)) mudou++;
        } catch (e) {
          if (e instanceof Error && e.message === "sem_google") throw e;
          falhou++;
        }
      } else if (s.origem === "manual" && s.google_evento_id && !cancelada && inicio.getTime() > Date.now()) {
        await moverEvento(s.google_evento_id, inicio, DURACAO).catch(() => { falhou++; });
      }
    }
  } catch (e) {
    if (e instanceof Error && e.message === "sem_google") return { erro: "O Google Agenda não está conectado. Conecte em Disponibilidade." };
    return { erro: "A agenda do Google não respondeu. Tente de novo em instantes." };
  }
  const extra = falhou ? ` ${falhou === 1 ? "Uma sessão não foi encontrada" : `${falhou} sessões não foram encontradas`} na série do Google (podem ser de fora do período dela).` : "";
  if (!mudou) return { ok: `A agenda do Google já estava igual ao painel.${extra}` };
  return { ok: `Agenda acertada: ${mudou === 1 ? "1 sessão corrigida" : `${mudou} sessões corrigidas`} no Google.${extra}` };
}
