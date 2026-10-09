const CAMINHOS: Record<string, React.ReactNode> = {
  video: (<><rect x="3" y="6" width="13" height="12" rx="2" /><path d="M16 10l5-3v10l-5-3" /></>),
  casa: <path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z" />,
  calendario: (<><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M8 3v4M16 3v4M3.5 10h17" /></>),
  cartao: (<><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M7 15h4" /></>),
  pessoa: (<><circle cx="12" cy="8" r="4" /><path d="M4.5 20c1.5-4 4.5-5.5 7.5-5.5s6 1.5 7.5 5.5" /></>),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  baixar: <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />,
  olho: (<><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="2.8" /></>),
  escudo: (<><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /><path d="M9 12l2 2 4-4" /></>),
};

export type NomeIcone = keyof typeof CAMINHOS;

export default function Icone({ nome, tam = 20, espessura }: { nome: NomeIcone; tam?: number; espessura?: number }) {
  const e = espessura ?? (nome === "check" ? 2.6 : nome === "baixar" ? 2 : 1.8);
  return (
    <svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={e} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {CAMINHOS[nome]}
    </svg>
  );
}
