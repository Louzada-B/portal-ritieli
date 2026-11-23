"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Icone from "./Icone";
import { sair } from "../acoes";

type Item = { href: string; nome: string; curto: string; icone: string; emBreve?: boolean; contar?: boolean };

export const ITENS: Item[] = [
  { href: "/painel", nome: "Visão geral", curto: "Início", icone: "inicio" },
  { href: "/painel/pedidos", nome: "Pedidos", curto: "Pedidos", icone: "pedidos", contar: true },
  { href: "/painel/disponibilidade", nome: "Disponibilidade", curto: "Horários", icone: "horarios" },
  { href: "/painel/pacientes", nome: "Pacientes", curto: "Pacientes", icone: "pacientes" },
  { href: "/painel/sessoes", nome: "Sessões e pagamentos", curto: "Sessões", icone: "sessoes" },
];
const CONTEUDO: Item[] = [
  { href: "/painel/escritos", nome: "Escritos", curto: "Escritos", icone: "escritos" },
  { href: "/painel/termos", nome: "Termos", curto: "Termos", icone: "termos" },
  { href: "/painel/avaliacoes", nome: "Avaliações", curto: "Avaliações", icone: "estrela" },
];

function ItemLat({ item, atual, n }: { item: Item; atual: boolean; n: number }) {
  if (item.emBreve) {
    return (
      <span className="li" aria-disabled="true" style={{ opacity: 0.55, cursor: "default" }}>
        <Icone nome={item.icone} />
        <span>{item.nome}</span>
        <span className="bd" style={{ background: "rgba(242,201,209,.25)", color: "#F6E5E7", fontWeight: 600 }}>em breve</span>
      </span>
    );
  }
  return (
    <Link className={atual ? "li atual" : "li"} href={item.href} aria-current={atual ? "page" : undefined}>
      <Icone nome={item.icone} />
      <span>{item.nome}</span>
      {item.contar && n > 0 ? <span className="bd">{n}</span> : null}
    </Link>
  );
}

function Lista({ pedidos, caminho }: { pedidos: number; caminho: string }) {
  const ativo = (h: string) => (h === "/painel" ? caminho === "/painel" : caminho.startsWith(h));
  return (
    <>
      <nav aria-label="Painel">
        {ITENS.map((i) => <ItemLat key={i.nome} item={i} atual={ativo(i.href)} n={pedidos} />)}
        <span className="lat-grupo">Conteúdo</span>
        {CONTEUDO.map((i) => <ItemLat key={i.nome} item={i} atual={ativo(i.href)} n={0} />)}
      </nav>
    </>
  );
}

function Pe() {
  return (
    <div className="lat-pe">
      <Link className="li" href="/painel/ajuda"><Icone nome="escritos" /><span>Ajuda</span></Link>
      <a className="li" href="/" target="_blank" rel="noopener"><Icone nome="site" /><span>Ver o site</span></a>
      <div className="eu">
        <img src="/ritieli.webp" alt="" />
        <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.3, minWidth: 0 }}>
          <span style={{ fontWeight: 700, color: "#FFFFFF" }}>Ritieli Hermes</span>
          <span style={{ fontSize: 12, color: "#F2C9D1" }}>CRP 07/46564</span>
        </span>
        <form action={sair} style={{ marginLeft: "auto" }}>
          <button type="submit" aria-label="Sair" style={{ color: "#F2C9D1", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", background: "none", border: 0, cursor: "pointer" }}>
            <Icone nome="sair" />
          </button>
        </form>
      </div>
    </div>
  );
}

// Barra lateral (computador).
export function Lateral({ pedidos }: { pedidos: number }) {
  const caminho = usePathname();
  return (
    <aside className="lat">
      <span className="lat-ass">Ritieli Hermes</span>
      <span className="lat-sub">Painel</span>
      <Lista pedidos={pedidos} caminho={caminho} />
      <Pe />
    </aside>
  );
}

// Barra de abas (celular).
export function Abas({ pedidos }: { pedidos: number }) {
  const caminho = usePathname();
  const ativo = (h: string) => (h === "/painel" ? caminho === "/painel" : caminho.startsWith(h));
  return (
    <nav className="tab" aria-label="Painel">
      {ITENS.filter((i) => !i.emBreve).map((i) => (
        <Link key={i.nome} className={ativo(i.href) ? "ti atual" : "ti"} href={i.href} aria-current={ativo(i.href) ? "page" : undefined}>
          <Icone nome={i.icone} tam={22} />
          <span>{i.curto}</span>
          {i.contar && pedidos > 0 ? <span className="bd">{pedidos}</span> : null}
        </Link>
      ))}
    </nav>
  );
}

// Topo do celular com o botão do menu completo.
export function TopoCelular({ titulo, sub, pedidos }: { titulo: string; sub?: string; pedidos: number }) {
  const [aberto, setAberto] = useState(false);
  const caminho = usePathname();
  return (
    <>
      <header className="m-topo">
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span className="t">{titulo}</span>
          {sub ? <span className="d">{sub}</span> : null}
        </div>
        <button type="button" className="mb" onClick={() => setAberto(true)} aria-label="Abrir menu"><Icone nome="menu" /></button>
      </header>
      {aberto ? (
        <div className="m-menu" onClick={() => setAberto(false)}>
          <div className="sh" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px 12px" }}>
              <span className="lat-ass" style={{ fontSize: 34 }}>Ritieli Hermes</span>
              <button type="button" onClick={() => setAberto(false)} aria-label="Fechar menu" style={{ width: 44, height: 44, borderRadius: "50%", border: "1px solid rgba(242,201,209,.5)", background: "none", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Icone nome="fechar" /></button>
            </div>
            <div onClick={() => setAberto(false)} style={{ display: "contents" }}>
              <Lista pedidos={pedidos} caminho={caminho} />
            </div>
            <Pe />
          </div>
        </div>
      ) : null}
    </>
  );
}
