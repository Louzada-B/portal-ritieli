"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { supabaseNavegador } from "../../../lib/supabase/navegador";
import Icone from "../../componentes/Icone";
import * as cofre from "./cofre";
import { salvarParRecados } from "./acoes";
import { criarExercicio, excluirExercicio, excluirAnexoExercicio, registrarAnexoExercicio, urlAnexoExercicio } from "./exercicioAcoes";

export type ExItem = {
  id: string; titulo: string; instrucoes: string; link: string; prazo: string | null; criadoEm: string; concluidoEm: string | null; recadoE2E: string;
  anexos: { id: string; nome: string; tipo: string; tamanho: number }[];
};

const ACEITOS = "application/pdf,image/png,image/jpeg,image/webp,audio/mpeg,audio/mp4,audio/x-m4a,audio/wav";
const MAX = 10_000_000;
const dia = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "numeric", month: "short" }).format(new Date(iso.length === 10 ? iso + "T12:00:00Z" : iso)).replace(".", "");
const tam = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`);

// Envia os arquivos direto do navegador para o armazenamento privado e registra cada um.
async function enviar(pacienteId: string, exercicioId: string, arquivos: File[]): Promise<string | null> {
  const sb = supabaseNavegador();
  for (const f of arquivos) {
    const caminho = `${pacienteId}/${exercicioId}/${crypto.randomUUID()}`;
    const { error } = await sb.storage.from("exercicios").upload(caminho, f, { contentType: f.type, upsert: false });
    if (error) return `Não deu para enviar “${f.name}”.`;
    const r = await registrarAnexoExercicio(exercicioId, { caminho, nome: f.name, tipo: f.type, tamanho: f.size });
    if (r.erro) {
      await sb.storage.from("exercicios").remove([caminho]);
      return r.erro;
    }
  }
  return null;
}

function validar(arquivos: File[]): string | null {
  for (const f of arquivos) {
    if (f.size > MAX) return `“${f.name}” passa de 10 MB.`;
    if (!ACEITOS.split(",").includes(f.type)) return `“${f.name}”: use PDF, imagem (PNG, JPG, WEBP) ou áudio (MP3, M4A, WAV).`;
  }
  return null;
}

export default function Exercicios({ pacienteId, itens, ativo, par }: { pacienteId: string; itens: ExItem[]; ativo: boolean; par: { pub: string; privCripto: string } | null }) {
  const router = useRouter();
  const [pend, iniciar] = useTransition();
  const [aberto, setAberto] = useState(false);
  const [msg, setMsg] = useState<{ t: string; erro?: boolean } | null>(null);
  const [titulo, setTitulo] = useState("");
  const [instr, setInstr] = useState("");
  const [link, setLink] = useState("");
  const [prazo, setPrazo] = useState("");
  const [arqs, setArqs] = useState<File[]>([]);
  const entrada = useRef<HTMLInputElement>(null);
  const [mais, setMais] = useState<string | null>(null);
  const [recados, setRecados] = useState<Record<string, string | null>>({});
  // Decifra aqui, no navegador, os recados deixados pelas pacientes.
  useEffect(() => {
    if (!par) return;
    let vivo = true;
    (async () => {
      const r: Record<string, string | null> = {};
      for (const x of itens) if (x.recadoE2E) r[x.id] = await cofre.decifrarRecado(par.privCripto, x.recadoE2E);
      if (vivo) setRecados(r);
    })();
    return () => { vivo = false; };
  }, [itens, par]);
  const ativar = () => iniciar(async () => {
    try {
      const novo = await cofre.criarParRecados();
      const r = await salvarParRecados(novo.pub, novo.privCripto);
      setMsg(r.erro ? { t: r.erro, erro: true } : { t: r.ok! });
      if (r.ok) router.refresh();
    } catch {
      setMsg({ t: "Não deu para ativar. Abra o prontuário de novo e tente.", erro: true });
    }
  });
  const maisEntrada = useRef<HTMLInputElement>(null);

  const limpar = () => { setTitulo(""); setInstr(""); setLink(""); setPrazo(""); setArqs([]); setAberto(false); };

  const salvar = () => iniciar(async () => {
    setMsg(null);
    const v = validar(arqs);
    if (v) return setMsg({ t: v, erro: true });
    const r = await criarExercicio(pacienteId, { titulo, instrucoes: instr, link, prazo });
    if (r.erro || !r.id) return setMsg({ t: r.erro || "Não deu para salvar.", erro: true });
    const e = await enviar(pacienteId, r.id, arqs);
    if (e) setMsg({ t: `O exercício foi criado, mas ${e} Abra-o abaixo e anexe de novo.`, erro: true });
    else setMsg({ t: "Exercício criado. A pessoa vê quando entrar na área dela." });
    limpar();
    router.refresh();
  });

  const apagar = (id: string) => {
    if (!confirm("Excluir este exercício e os anexos? Não dá para desfazer.")) return;
    iniciar(async () => { const r = await excluirExercicio(id); setMsg(r.erro ? { t: r.erro, erro: true } : { t: r.ok! }); router.refresh(); });
  };
  const apagarAnexo = (id: string) => iniciar(async () => { const r = await excluirAnexoExercicio(id); setMsg(r.erro ? { t: r.erro, erro: true } : { t: r.ok! }); router.refresh(); });
  const abrir = (id: string) => iniciar(async () => {
    const r = await urlAnexoExercicio(id);
    if (r.url) window.open(r.url, "_blank", "noopener");
    else setMsg({ t: r.erro || "Não deu para abrir.", erro: true });
  });
  const anexarMais = (files: FileList | null) => {
    const id = mais;
    setMais(null);
    const lista = Array.from(files || []);
    if (!id || !lista.length) return;
    const v = validar(lista);
    if (v) return setMsg({ t: v, erro: true });
    iniciar(async () => {
      const e = await enviar(pacienteId, id, lista);
      setMsg(e ? { t: e, erro: true } : { t: "Anexo guardado." });
      router.refresh();
    });
  };

  const abertos = itens.filter((x) => !x.concluidoEm);
  const feitos = itens.filter((x) => x.concluidoEm);
  const cartao = (x: ExItem) => (
    <div key={x.id} className="resp" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
        <b style={{ fontSize: 15 }}>{x.titulo}</b>
        {x.concluidoEm ? <span className="pill p-ok">Feito em {dia(x.concluidoEm)}</span> : x.prazo ? <span className="pill p-av">Até {dia(x.prazo)}</span> : <span className="pill">Sem prazo</span>}
      </div>
      <span style={{ fontSize: 14, color: "#5A3A41", whiteSpace: "pre-wrap" }}>{x.instrucoes}</span>
      {x.link ? <a href={x.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, fontWeight: 700, overflowWrap: "anywhere" }}>{x.link}</a> : null}
      {x.anexos.map((a) => (
        <div key={a.id} style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", fontSize: 13 }}>
          <button type="button" className="mini2" disabled={pend} onClick={() => abrir(a.id)}>{a.nome}</button>
          <span style={{ color: "#8A7A7E" }}>{tam(a.tamanho)}</span>
          <button type="button" className="mini2" style={{ color: "#A3322A", borderColor: "#F2C9D1" }} disabled={pend} onClick={() => apagarAnexo(a.id)}>Remover</button>
        </div>
      ))}
      {x.recadoE2E ? (
        <div style={{ background: "#FFFFFF", borderRadius: 12, padding: "10px 12px", fontSize: 14 }}>
          <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#8A7A7E" }}>Recado da pessoa</span>
          {recados[x.id] ? <span style={{ whiteSpace: "pre-wrap" }}>{recados[x.id]}</span> : <span style={{ color: "#8A7A7E" }}>{x.id in recados ? "Não foi possível abrir este recado." : "Abrindo…"}</span>}
        </div>
      ) : x.concluidoEm ? <span style={{ fontSize: 13, color: "#8A7A7E" }}>Marcou como feito, sem recado.</span> : null}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button type="button" className="mini2" disabled={pend} onClick={() => { setMais(x.id); maisEntrada.current?.click(); }}>Anexar arquivo</button>
        <button type="button" className="mini2" style={{ color: "#A3322A", borderColor: "#F2C9D1" }} disabled={pend} onClick={() => apagar(x.id)}>Excluir exercício</button>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <h2 className="card-t"><Icone nome="escritos" tam={20} />Exercícios</h2>
      <input ref={maisEntrada} type="file" accept={ACEITOS} multiple hidden onChange={(e) => { anexarMais(e.target.files); e.target.value = ""; }} />
      {msg ? <div className={msg.erro ? "aviso erro" : "aviso"} role="status">{msg.t}</div> : null}
      {!par ? (
        <div className="aviso" role="status" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <b>Ative os recados protegidos</b>
          <span>Enquanto não ativar, as pacientes não conseguem deixar recado nos exercícios. Ao ativar, cada recado é cifrado no aparelho da paciente e só este prontuário aberto consegue ler (nem o servidor lê).</span>
          <button type="button" className="mini2" style={{ alignSelf: "flex-start" }} disabled={pend} onClick={ativar}>{pend ? "Ativando…" : "Ativar recados protegidos"}</button>
        </div>
      ) : null}
      {abertos.length ? abertos.map(cartao) : <span style={{ fontSize: 13, color: "#8A7A7E" }}>Nenhum exercício em andamento.</span>}
      {feitos.length ? (
        <details>
          <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#5A3A41" }}>Feitos ({feitos.length})</summary>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>{feitos.map(cartao)}</div>
        </details>
      ) : null}
      {!ativo ? <span style={{ fontSize: 13, color: "#8A7A7E" }}>O acompanhamento está encerrado; não dá para criar exercício novo.</span> : !aberto ? (
        <button type="button" className="mini2" style={{ alignSelf: "flex-start" }} onClick={() => setAberto(true)}>Novo exercício</button>
      ) : (
        <div className="caixa rec" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <b style={{ fontSize: 16 }}>Novo exercício</b>
          <div className="fc"><label htmlFor={`ex-t-${pacienteId}`}>Título</label><input id={`ex-t-${pacienteId}`} type="text" maxLength={120} value={titulo} onChange={(e) => setTitulo(e.target.value)} /></div>
          <div className="fc"><label htmlFor={`ex-i-${pacienteId}`}>Instruções</label><textarea id={`ex-i-${pacienteId}`} rows={5} maxLength={5000} value={instr} onChange={(e) => setInstr(e.target.value)} /></div>
          <div className="fc"><label htmlFor={`ex-l-${pacienteId}`}>Link (opcional)</label><input id={`ex-l-${pacienteId}`} type="url" inputMode="url" placeholder="https://" value={link} onChange={(e) => setLink(e.target.value)} /></div>
          <div className="fc" style={{ maxWidth: 260 }}><label htmlFor={`ex-p-${pacienteId}`}>Prazo (opcional)</label><input id={`ex-p-${pacienteId}`} type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} /></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <input ref={entrada} type="file" accept={ACEITOS} multiple hidden onChange={(e) => { setArqs([...arqs, ...Array.from(e.target.files || [])]); e.target.value = ""; }} />
            <button type="button" className="mini2" style={{ alignSelf: "flex-start" }} onClick={() => entrada.current?.click()}>Anexar arquivos</button>
            {arqs.map((f, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
                <span style={{ overflowWrap: "anywhere" }}>{f.name} · {tam(f.size)}</span>
                <button type="button" className="mini2" onClick={() => setArqs(arqs.filter((_, j) => j !== i))}>Tirar</button>
              </div>
            ))}
            <span style={{ fontSize: 12, color: "#8A7A7E" }}>PDF, imagem ou áudio, até 10 MB cada.</span>
          </div>
          <span style={{ fontSize: 13, color: "#8A7A7E" }}>Ninguém recebe aviso: a pessoa vê o exercício ao entrar na área dela. O texto fica criptografado no servidor, porque a paciente precisa abrir; os anexos ficam em armazenamento privado. Só o recado dela tem proteção de ponta a ponta.</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <button type="button" className="bt" style={{ width: "auto" }} disabled={pend || titulo.trim().length < 2 || instr.trim().length < 2} onClick={salvar}>{pend ? "Salvando…" : "Criar exercício"}</button>
            <button type="button" className="bt3" disabled={pend} onClick={limpar}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
