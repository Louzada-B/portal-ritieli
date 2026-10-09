import Link from "next/link";
import Casca from "../Casca";
import Icone from "../Icone";
import { FormContato, FormTroca } from "../FormDados";
import { exigirAcesso } from "../../lib/pacienteAuth";
import { supabaseAdmin } from "../../lib/supabase/admin";
import { termoAceito } from "../../lib/pacienteDados";
import { decifrarOuVazio } from "../../lib/cripto";
import { cpfMascarado, fone } from "../../lib/formato";
import TermoDocumento from "../../componentes/TermoDocumento";

export const dynamic = "force-dynamic";

const dataBR = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "numeric", month: "long", year: "numeric" }).format(new Date(iso.length === 10 ? iso + "T12:00:00Z" : iso));

export default async function MeusDados({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const ctx = await exigirAcesso((await searchParams).p);
  const p = ctx.atual;
  const termo = await termoAceito(supabaseAdmin(), p.id);
  const nasc = decifrarOuVazio(p.nascimento_cripto);
  const emerg = decifrarOuVazio(p.emergencia_cripto);

  return (
    <Casca ctx={ctx} aba="dados">
      <div className="pag-h"><h1>Meus <em>dados.</em></h1><p>Para corrigir nome, CPF ou nascimento, fale com a Ritieli.</p></div>

      <div className="grade2">
        <section className="card" aria-labelledby="d-c">
          <h2 className="card-t" id="d-c">Cadastro</h2>
          <dl className="dados">
            <div><dt>Nome</dt><dd>{p.nome}</dd></div>
            <div><dt>CPF</dt><dd>{p.cpf_final ? cpfMascarado(p.cpf_final) : "Não informado"}</dd></div>
            <div><dt>Nascimento</dt><dd>{nasc ? dataBR(nasc) : "Não informado"}</dd></div>
            <div><dt>E-mail</dt><dd>{p.email || ctx.acesso.email}</dd></div>
          </dl>
          <h3 className="card-t" style={{ fontSize: 16 }}>Contato (você pode atualizar)</h3>
          <FormContato key={p.id} pacienteId={p.id} whatsapp={p.whatsapp || ""} cidade={p.cidade || ""} emergencia={emerg} />
        </section>

        <div style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>
          <section className="card" aria-labelledby="d-s">
            <h2 className="card-t" id="d-s">Senha</h2>
            <span style={{ fontSize: 14, color: "#6B5A5E" }}>{ctx.acesso.senha_trocada_em ? `Última troca em ${dataBR(ctx.acesso.senha_trocada_em)}.` : "Você criou a sua senha no primeiro acesso."}</span>
            <FormTroca />
          </section>

          <section className="card" aria-labelledby="d-t">
            <h2 className="card-t" id="d-t">Termo de consentimento</h2>
            {termo ? (
              <>
                <span className="pill p-ok" style={{ alignSelf: "flex-start" }}><Icone nome="check" tam={14} />Aceito em {dataBR(termo.aceitoEm)}</span>
                {termo.conteudo ? (
                  <details className="termo-ver">
                    <summary className="bt2" style={{ listStyle: "none" }}>Ver termo</summary>
                    <div style={{ marginTop: 14 }}><TermoDocumento c={termo.conteudo} publico /></div>
                  </details>
                ) : null}
              </>
            ) : <span style={{ color: "#6B5A5E" }}>O termo ainda não foi aceito. A Ritieli envia o link pelo WhatsApp.</span>}
          </section>

          <section className="card" aria-labelledby="d-l">
            <h2 className="card-t" id="d-l"><Icone nome="escudo" tam={20} /> Seus dados e a LGPD</h2>
            <span style={{ fontSize: 14, color: "#6B5A5E" }}>As anotações clínicas da terapia não ficam nesta área. Para saber como os seus dados são guardados, ou pedir cópia ou correção, veja a <Link href="/privacidade">Política de privacidade</Link>.</span>
          </section>
        </div>
      </div>
    </Casca>
  );
}
