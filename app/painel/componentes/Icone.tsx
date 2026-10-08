// Ícones do painel, os mesmos traços do esboço.
const P: Record<string, React.ReactNode> = {
  inicio: <path d="M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />,
  pedidos: (<><path d="M4 13l2.5-7h11L20 13v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" /><path d="M4 13h4.5l1.5 2.5h4l1.5-2.5H20" /></>),
  horarios: (<><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>),
  pacientes: (<><circle cx="9" cy="8.5" r="3.2" /><path d="M3.5 19c.7-3.2 2.9-5 5.5-5s4.8 1.8 5.5 5" /><path d="M15.5 5.6a3 3 0 0 1 0 5.8M17 14.3c1.8.5 3 2.1 3.5 4.7" /></>),
  sessoes: (<><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M7 15h4" /></>),
  escritos: (<><path d="M5 19c3-1 5-3 7-6l6-6a2.1 2.1 0 0 0-3-3l-6 6c-3 2-5 4-6 7z" /><path d="M4 20l2-2" /></>),
  termos: (<><path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></>),
  site: (<><path d="M14 4h6v6M20 4l-8 8" /><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></>),
  sair: (<><path d="M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3" /><path d="M10 16l-4-4 4-4M6 12h10" /></>),
  menu: <path d="M4 7h16M4 12h16M4 17h10" />,
  busca: (<><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></>),
  fechar: <path d="M6 6l12 12M18 6L6 18" />,
  ok: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  whats: <path d="M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.6-5.2A8.5 8.5 0 1 1 21 12z" />,
  voltar: <path d="M19 12H5M11 6l-6 6 6 6" />,
  calendario: (<><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>),
  pessoa: (<><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" /></>),
  crianca: (<><circle cx="12" cy="7" r="3" /><path d="M7 21v-4a5 5 0 0 1 10 0v4" /></>),
  telefone: <path d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z" />,
  email: (<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>),
  escudo: (<><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /><path d="M9 12l2 2 4-4" /></>),
  video: (<><rect x="3" y="6" width="13" height="12" rx="2" /><path d="M16 10l5-3v10l-5-3" /></>),
  mais: <path d="M12 5v14M5 12h14" />,
  baixar: (<><path d="M12 4v11M7.5 10.5L12 15l4.5-4.5" /><path d="M5 19h14" /></>),
  reenviar: (<><path d="M20 11a8 8 0 1 0-2.3 5.7" /><path d="M20 5v6h-6" /></>),
  lixo: <path d="M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  olho: (<><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="2.8" /></>),
  google: (<><path d="M20 12.2c0-.6-.1-1.2-.2-1.7H12v3.3h4.5a3.9 3.9 0 0 1-1.7 2.5v2.1h2.7c1.6-1.5 2.5-3.6 2.5-6.2z" /><path d="M12 20.5c2.3 0 4.2-.8 5.5-2.1l-2.7-2.1c-.8.5-1.7.8-2.8.8-2.2 0-4-1.5-4.7-3.4H4.5v2.2A8.5 8.5 0 0 0 12 20.5z" /><path d="M7.3 13.7a5 5 0 0 1 0-3.4V8.1H4.5a8.5 8.5 0 0 0 0 7.8z" /><path d="M12 6.9c1.2 0 2.4.4 3.3 1.3l2.4-2.4A8.5 8.5 0 0 0 4.5 8.1l2.8 2.2C8 8.4 9.8 6.9 12 6.9z" /></>),
};

export default function Icone({ nome, tam = 20, largura = 1.8 }: { nome: keyof typeof P | string; tam?: number; largura?: number }) {
  return (
    <svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={largura} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {P[nome]}
    </svg>
  );
}
