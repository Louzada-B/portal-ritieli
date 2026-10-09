import { redirect } from "next/navigation";
import FormEntrar from "../FormEntrar";
import Lado from "../Lado";
import Icone from "../Icone";
import { ROTA, sessaoAtual } from "../../lib/pacienteAuth";

export default async function Entrar({ searchParams }: { searchParams: Promise<{ motivo?: string }> }) {
  const s = await sessaoAtual();
  if (s) redirect(s.trocarSenha ? `${ROTA}/nova-senha` : ROTA);
  const { motivo } = await searchParams;
  const avisos: Record<string, string> = {
    encerrado: "Seu acesso a esta área não está mais disponível. Se precisar de algo, fale com a Ritieli.",
  };
  return (
    <div className="pac raiz ent">
      <Lado titulo={<>Seu espaço, <em>com cuidado.</em></>} texto="Suas sessões, o link da chamada, pagamentos, recibos e o seu termo, sempre à mão." />
      <div className="ent-f">
        <div className="ent-box">
          <div><h1 className="h1">Entrar na sua área</h1><p style={{ margin: "6px 0 0", color: "#6B5A5E" }}>Use o e-mail cadastrado e a sua senha.</p></div>
          {motivo && avisos[motivo] ? <div className="aviso" role="status">{avisos[motivo]}</div> : null}
          <FormEntrar />
          <div style={{ background: "#F6E5E7", borderRadius: 16, padding: "14px 16px", fontSize: 14, color: "#5A3A41", lineHeight: 1.5 }}><b style={{ color: "#7A2335" }}>Primeiro acesso?</b> Use a senha provisória que chegou no seu e-mail. Em seguida, você cria a sua senha.</div>
          <p className="nota"><span style={{ color: "#7A2335", flex: "0 0 auto" }}><Icone nome="escudo" tam={18} /></span>Conexão protegida. Só você vê os seus dados. As anotações clínicas da terapia não ficam nesta área.</p>
        </div>
      </div>
    </div>
  );
}
