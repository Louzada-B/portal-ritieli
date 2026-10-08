import type { ConteudoTermo } from "../lib/termoTexto";
import { mascararCpf } from "../lib/termoTexto";

// O documento do termo, o mesmo texto no painel ("papel") e na página de aceite ("publico").
export default function TermoDocumento({ c, publico = false, rodape }: { c: ConteudoTermo; publico?: boolean; rodape?: React.ReactNode }) {
  const inf = c.tipo === "crianca";
  const D = ({ v, ph }: { v: string; ph: string }) => (publico ? <b>{v || ph}</b> : <span className={v ? "pre" : "pre vazio"}>{v || ph}</span>);
  const corpo = (
    <>
      {inf ? (
        <p>Eu, <D v={c.responsavel?.nome || ""} ph="[nome do responsável]" />, CPF <D v={mascararCpf(c.responsavel?.cpf || "")} ph="[CPF do responsável]" />, responsável legal por <D v={c.nome} ph="[nome completo]" />, autorizo o atendimento psicológico oferecido por Ritieli Hermes e declaro estar de acordo com as condições abaixo.</p>
      ) : (
        <p>Eu, <D v={c.nome} ph="[nome completo]" />, CPF <D v={mascararCpf(c.cpf)} ph="[CPF do cadastro]" />, declaro que fui informada(o) sobre as condições do atendimento psicológico oferecido por Ritieli Hermes e concordo com elas.</p>
      )}
      <h3>1. Sobre o atendimento</h3>
      <p>O acompanhamento segue a Terapia Cognitivo-Comportamental, com sessões semanais de 50 minutos.</p>
      <h3>2. Onde acontece</h3>
      {inf ? (
        <p>As sessões com a criança ou o adolescente acontecem presencialmente, na R. Santa Flora, 1166, no bairro Nonoai, em Porto Alegre. Os encontros com os responsáveis podem ser online, pelo Google Meet.</p>
      ) : (
        <p>As sessões acontecem online, por <D v={c.plataforma} ph="[plataforma de vídeo]" />, em sala exclusiva da paciente, conforme a Resolução CFP nº 9/2024. As sessões não são gravadas. A paciente se compromete a estar em um local reservado, com boa conexão.</p>
      )}
      <h3>3. Sigilo</h3>
      <p>Tudo o que for conversado é sigiloso, conforme o Código de Ética Profissional do Psicólogo. O sigilo só pode ser quebrado nas situações previstas no Código, como risco grave à vida.</p>
      {inf ? <p>Os responsáveis recebem devolutivas sobre o processo, preservando, sempre que possível, o que a criança ou o adolescente compartilha em confiança.</p> : null}
      <h3>4. Valor e pagamento</h3>
      <p>Valor por sessão: <D v={c.valor} ph="[valor]" />, pago por <D v={c.pagamento} ph="pix" />. O pagamento pode ser feito após cada sessão ou antecipado, para várias sessões de uma vez. O recibo é emitido pelo Receita Saúde.</p>
      <h3>5. Faltas e cancelamentos</h3>
      <p>{publico ? c.faltas : <D v={c.faltas} ph="[política de faltas]" />}</p>
      <h3>6. Emergências</h3>
      <p>Em situação de crise, ligue 188 (CVV) ou 192 (SAMU). Contato de emergência indicado: <D v={c.emergencia} ph="[contato de emergência do cadastro]" />.</p>
      <h3>7. Dados pessoais</h3>
      <p>Os dados são tratados conforme a Lei Geral de Proteção de Dados e a Política de Privacidade do site, apenas para fins do atendimento, e ficam guardados com criptografia.</p>
      <h3>8. Encerramento</h3>
      <p>O atendimento pode ser encerrado a qualquer momento, por qualquer uma das partes, com uma conversa de fechamento sempre que possível.</p>
    </>
  );
  if (publico)
    return (
      <div className="termo-box doc" tabIndex={0} aria-label="Termo de consentimento">
        <p className="doc-t">Termo de consentimento para atendimento psicológico</p>
        <p className="doc-s">Ritieli Hermes · Psicóloga · CRP 07/46564</p>
        {corpo}
        <p style={{ marginTop: 14 }}>Porto Alegre, {c.data}.</p>
        {rodape}
      </div>
    );
  return (
    <article className="papel">
      <h2>Termo de consentimento para atendimento psicológico</h2>
      <p className="sub">Ritieli Hermes · Psicóloga · CRP 07/46564</p>
      {corpo}
      <p style={{ marginTop: 22 }}>Porto Alegre, {c.data}.</p>
      {rodape}
    </article>
  );
}
