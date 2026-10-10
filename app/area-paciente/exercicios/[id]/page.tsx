import Link from "next/link";
import { notFound } from "next/navigation";
import Casca from "../../Casca";
import FormExercicio from "../FormExercicio";
import { exigirAcesso, ROTA } from "../../../lib/pacienteAuth";
import { supabaseAdmin } from "../../../lib/supabase/admin";
import { exerciciosDoPaciente } from "../../../lib/exercicios";

export const dynamic = "force-dynamic";

const dia = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "numeric", month: "long" }).format(new Date(iso.length === 10 ? iso + "T12:00:00Z" : iso));
const tam = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`);

const rotulo = (t: string) => (t === "application/pdf" ? "PDF" : t.startsWith("image/") ? "Imagem" : t.startsWith("audio/") ? "Áudio" : "Arquivo");

export default async function Exercicio({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ p?: string }> }) {
  const { id } = await params;
  const ctx = await exigirAcesso((await searchParams).p);
  const p = ctx.atual;
  // Só lista os exercícios do paciente atual; um id de outra pessoa cai no "não encontrado".
  const x = (await exerciciosDoPaciente(supabaseAdmin(), p.id)).find((e) => e.id === id);
  if (!x) notFound();
  const { data: ch } = await supabaseAdmin().from("prontuario_chave").select("pub_recados").eq("id", 1).maybeSingle();
  const pub = (ch?.pub_recados as string | null) ?? null;
  const sufixo = ctx.pacientes.length > 1 ? `?p=${p.id}` : "";
  return (
    <Casca ctx={ctx} aba="exercicios">
      <p style={{ margin: "0 0 8px" }}><Link href={`${ROTA}/exercicios${sufixo}`} style={{ fontWeight: 700, fontSize: 14 }}>← Todos os exercícios</Link></p>
      <div className="pag-h"><h1>{x.titulo}</h1><p>{x.concluidoEm ? `Feito em ${dia(x.concluidoEm)}.` : x.prazo ? `Combinado até ${dia(x.prazo)}.` : "Sem prazo."}</p></div>
      <section className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <p style={{ margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{x.instrucoes}</p>
        {x.link ? <a href={x.link} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, overflowWrap: "anywhere" }}>Abrir o link do exercício</a> : null}
        {x.anexos.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span className="rot">Arquivos</span>
            {x.anexos.map((a, i) => (
              <a key={a.id} href={`${ROTA}/exercicios/anexo/${a.id}${sufixo}`} style={{ fontWeight: 700, overflowWrap: "anywhere" }}>{rotulo(a.tipo)} {i + 1} <span style={{ fontWeight: 400, color: "#8A7A7E" }}>· {tam(a.tamanho)}</span></a>
            ))}
          </div>
        ) : null}
      </section>
      <section className="card" style={{ marginTop: 16 }}>
        {x.concluidoEm && x.recadoE2E ? <p style={{ margin: "0 0 12px", color: "#5A3A41" }}>Você deixou um recado protegido para a Ritieli.</p> : null}
        <FormExercicio key={`${x.id}-${x.concluidoEm ?? ""}`} pacienteId={p.id} id={x.id} feito={!!x.concluidoEm} chavePublica={pub} />
      </section>
    </Casca>
  );
}
