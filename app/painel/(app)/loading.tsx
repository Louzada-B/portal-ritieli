// Aparece na hora do clique enquanto a página busca os dados.
export default function Carregando() {
  return (
    <>
      <header className="topo"><div><div className="esq" style={{ width: 280, height: 38 }} /><div className="esq" style={{ width: 200, height: 16, marginTop: 10 }} /></div></header>
      <header className="m-topo"><div className="esq" style={{ width: 160, height: 24 }} /></header>
      <main className="conteudo" aria-busy="true" aria-label="Carregando">
        <div className="esq" style={{ height: 110, borderRadius: 24 }} />
        <div className="esq-grade">
          <div className="esq" style={{ height: 320, borderRadius: 24 }} />
          <div className="esq" style={{ height: 320, borderRadius: 24 }} />
        </div>
      </main>
    </>
  );
}
