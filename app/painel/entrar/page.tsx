import FormEntrar from "./FormEntrar";

export default async function Entrar({ searchParams }: { searchParams: Promise<{ motivo?: string }> }) {
  const { motivo } = await searchParams;
  const avisos: Record<string, string> = {
    inatividade: "Faz mais de 10 dias que o painel não era aberto. Por segurança, entre de novo.",
    link: "Esse link de troca de senha expirou ou já foi usado. Peça um novo em \"Esqueci minha senha\".",
  };
  return (
    <div className="ent">
      <div className="ent-a">
        <svg className="forma" viewBox="0 0 200 200" width="520" height="520" style={{ right: -200, bottom: -200, opacity: 0.14 }} aria-hidden="true"><path fill="#F2C9D1" d="M43.1,-58.6C55.3,-49.2,64,-35.4,68.5,-20.1C73,-4.8,73.3,12,66.7,25.4C60.1,38.8,46.6,48.8,31.9,56.8C17.2,64.8,1.3,70.8,-15.3,69.6C-31.9,68.4,-49.2,60,-59.6,46.4C-70,32.8,-73.6,14,-70.4,-2.9C-67.2,-19.8,-57.3,-34.8,-44.3,-44.2C-31.3,-53.6,-15.7,-57.4,0.3,-57.8C16.2,-58.2,30.9,-68,43.1,-58.6Z" transform="translate(100 100)" /></svg>
        <div style={{ position: "relative", display: "flex", flexDirection: "column" }}>
          <span style={{ fontFamily: "'Mrs Saint Delafield', 'Instrument Serif', cursive", fontSize: 52, lineHeight: 1.25, color: "#FFFFFF", padding: "4px 12px 0 4px", marginBottom: -6 }}>Ritieli Hermes</span>
          <span style={{ fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: "#F2C9D1", fontWeight: 700 }}>Painel · área restrita</span>
        </div>
        <p className="grande" style={{ position: "relative", margin: 0, fontWeight: 700, fontSize: 52, lineHeight: 1.05, letterSpacing: "-0.03em", color: "#FFFFFF", maxWidth: 480 }}>
          Seu consultório, organizado <em style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontWeight: 400, fontSize: 60, letterSpacing: 0, color: "#F2C9D1" }}>com calma.</em>
        </p>
        <p className="cit" style={{ position: "relative", margin: 0, fontSize: 15, color: "#EBD3D8", maxWidth: 420 }}>Pedidos da agenda, horários, pacientes e pagamentos em um só lugar.</p>
      </div>
      <div className="ent-f">
        <div className="ent-box">
          <div>
            <h1 style={{ margin: 0, fontWeight: 700, fontSize: 30, lineHeight: 1.15, letterSpacing: "-0.02em", color: "#7A2335" }}>Entrar no painel</h1>
            <p style={{ margin: "6px 0 0", color: "#6B5A5E" }}>Use o e-mail e a senha que você cadastrou.</p>
          </div>
          {motivo && avisos[motivo] ? <div className="aviso">{avisos[motivo]}</div> : null}
          <FormEntrar />
          <p style={{ margin: 0, display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: "#8A7A7E", lineHeight: 1.5 }}>
            <span style={{ color: "#7A2335", flex: "0 0 auto" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /><path d="M9 12l2 2 4-4" /></svg></span>
            Conexão protegida. Os dados de pacientes ficam visíveis só para você.
          </p>
        </div>
      </div>
    </div>
  );
}
