// Faixa rosada à esquerda das telas de entrada e de criar senha.
export default function Lado({ titulo, texto }: { titulo: React.ReactNode; texto: string }) {
  return (
    <div className="ent-a">
      <svg viewBox="0 0 200 200" width="520" height="520" style={{ position: "absolute", pointerEvents: "none", right: -190, bottom: -200 }} aria-hidden="true"><path fill="#EFCBD2" d="M43.1,-58.6C55.3,-49.2,64,-35.4,68.5,-20.1C73,-4.8,73.3,12,66.7,25.4C60.1,38.8,46.6,48.8,31.9,56.8C17.2,64.8,1.3,70.8,-15.3,69.6C-31.9,68.4,-49.2,60,-59.6,46.4C-70,32.8,-73.6,14,-70.4,-2.9C-67.2,-19.8,-57.3,-34.8,-44.3,-44.2C-31.3,-53.6,-15.7,-57.4,0.3,-57.8C16.2,-58.2,30.9,-68,43.1,-58.6Z" transform="translate(100 100)" /></svg>
      <svg viewBox="0 0 200 200" width="220" height="220" style={{ position: "absolute", pointerEvents: "none", left: -70, top: "38%" }} aria-hidden="true"><path fill="#E9D3C7" d="M38.5,-49.3C50.4,-41.6,60.5,-30,64.3,-16.4C68.1,-2.8,65.6,12.8,58.2,25.3C50.8,37.8,38.5,47.2,24.8,53.6C11.1,60,-4,63.4,-18.9,60.4C-33.8,57.4,-48.5,48,-57.6,34.7C-66.7,21.4,-70.2,4.2,-66.4,-11C-62.6,-26.2,-51.5,-39.4,-38.4,-47C-25.3,-54.6,-12.7,-56.6,0.6,-57.3C13.8,-58,26.6,-57,38.5,-49.3Z" transform="translate(100 100)" /></svg>
      <div style={{ position: "relative", display: "flex", flexDirection: "column" }}><span className="ass">Ritieli Hermes</span><span className="sub">Área da paciente</span></div>
      <p className="grande">{titulo}</p>
      <p className="cit">{texto}</p>
    </div>
  );
}
