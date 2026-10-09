import { redirect } from "next/navigation";
import FormNovaSenha from "../FormNovaSenha";
import Lado from "../Lado";
import Icone from "../Icone";
import { ROTA, exigirSessao } from "../../lib/pacienteAuth";

export default async function NovaSenha() {
  const s = await exigirSessao();
  if (!s.trocarSenha) redirect(ROTA);
  return (
    <div className="pac raiz ent">
      <Lado titulo={<>Boas-vindas! Agora, <em>sua senha.</em></>} texto="Por segurança, a senha provisória só vale para este primeiro acesso." />
      <div className="ent-f">
        <div className="ent-box">
          <div><span className="pill p-on" style={{ marginBottom: 12 }}>Primeiro acesso</span><h1 className="h1">Crie a sua senha</h1><p style={{ margin: "6px 0 0", color: "#6B5A5E" }}>Você entrou com a senha provisória. Escolha uma senha só sua para os próximos acessos.</p></div>
          <FormNovaSenha />
          <p className="nota"><span style={{ color: "#7A2335", flex: "0 0 auto" }}><Icone nome="escudo" tam={18} /></span>Não compartilhe sua senha. Se esquecer, use &quot;Esqueci minha senha&quot; na tela de entrada.</p>
        </div>
      </div>
    </div>
  );
}
