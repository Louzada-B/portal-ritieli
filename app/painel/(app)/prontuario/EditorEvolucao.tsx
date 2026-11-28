"use client";

import { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle, Color } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import { Placeholder } from "@tiptap/extensions";
import { CORES_EVOLUCAO, COR_REALCE, type NoRico } from "./TextoRico";

// Editor da evolução: negrito, itálico, sublinhado, título, listas, realce e 5 cores.
// Entrega o texto puro (para conferir se está vazio) e o documento formatado (que vai cifrado).
export default function EditorEvolucao({ aoMudar, placeholder }: { aoMudar: (v: { texto: string; doc: NoRico | null }) => void; placeholder: string }) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [3] }, blockquote: false, code: false, codeBlock: false, horizontalRule: false, strike: false, link: false }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: false }),
      Placeholder.configure({ placeholder }),
    ],
    editorProps: { attributes: { class: "ed-area", "aria-label": "Nova evolução", "aria-multiline": "true", role: "textbox" } },
    onUpdate: ({ editor: e }) => {
      const texto = e.getText({ blockSeparator: "\n" }).trim();
      aoMudar({ texto, doc: texto ? (e.getJSON() as NoRico) : null });
    },
  });

  // Estado dos botões (ligado/desligado), atualizado a cada mudança no editor.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!editor) return;
    const f = () => setTick((t) => t + 1);
    editor.on("transaction", f);
    return () => { editor.off("transaction", f); };
  }, [editor]);
  const st = editor ? {
    b: editor.isActive("bold"), i: editor.isActive("italic"), u: editor.isActive("underline"), h: editor.isActive("heading", { level: 3 }),
    ul: editor.isActive("bulletList"), ol: editor.isActive("orderedList"), mk: editor.isActive("highlight"),
    cor: (editor.getAttributes("textStyle").color as string | undefined)?.toLowerCase() ?? "", vazio: editor.isEmpty,
  } : null;

  if (!editor) return <div className="ed"><div className="ed-area" style={{ color: "#8A7A7E" }}>Carregando o editor…</div></div>;
  const est = st ?? { b: false, i: false, u: false, h: false, ul: false, ol: false, mk: false, cor: "", vazio: true };
  const c = () => editor.chain().focus();
  const Bt = ({ on, rot, onClick, children }: { on: boolean; rot: string; onClick: () => void; children: React.ReactNode }) => (
    <button type="button" className={on ? "ed-bt on" : "ed-bt"} aria-pressed={on} aria-label={rot} title={rot} onMouseDown={(e) => e.preventDefault()} onClick={onClick}>{children}</button>
  );

  return (
    <div className="ed">
      <div className="ed-barra" role="toolbar" aria-label="Formatação">
        <Bt on={est.b} rot="Negrito (Ctrl+B)" onClick={() => c().toggleBold().run()}><b>N</b></Bt>
        <Bt on={est.i} rot="Itálico (Ctrl+I)" onClick={() => c().toggleItalic().run()}><i style={{ fontFamily: "Georgia, serif" }}>I</i></Bt>
        <Bt on={est.u} rot="Sublinhado (Ctrl+U)" onClick={() => c().toggleUnderline().run()}><u>S</u></Bt>
        <span className="ed-sep" />
        <Bt on={est.h} rot="Título" onClick={() => c().toggleHeading({ level: 3 }).run()}><b style={{ fontSize: 13 }}>T</b></Bt>
        <Bt on={est.ul} rot="Lista com marcadores" onClick={() => c().toggleBulletList().run()}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4" cy="6" r="1" fill="currentColor" /><circle cx="4" cy="12" r="1" fill="currentColor" /><circle cx="4" cy="18" r="1" fill="currentColor" /></svg>
        </Bt>
        <Bt on={est.ol} rot="Lista numerada" onClick={() => c().toggleOrderedList().run()}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M10 6h10M10 12h10M10 18h10" /><text x="1.5" y="8.5" fontSize="7" fill="currentColor" stroke="none" fontFamily="Arial">1</text><text x="1.5" y="14.5" fontSize="7" fill="currentColor" stroke="none" fontFamily="Arial">2</text><text x="1.5" y="20.5" fontSize="7" fill="currentColor" stroke="none" fontFamily="Arial">3</text></svg>
        </Bt>
        <span className="ed-sep" />
        <Bt on={est.mk} rot="Realce (marca-texto)" onClick={() => c().toggleHighlight().run()}><span style={{ background: COR_REALCE, padding: "0 4px", borderRadius: 3, fontWeight: 700, color: "#3A1F25" }}>R</span></Bt>
        <span className="ed-sep" />
        {CORES_EVOLUCAO.map((k) => {
          const on = k.cor.toLowerCase() === est.cor || (k.nome === "Preto" && !est.cor);
          return (
            <button key={k.cor} type="button" className={on ? "ed-cor on" : "ed-cor"} aria-pressed={on} aria-label={`Cor: ${k.nome}`} title={k.nome}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => (k.nome === "Preto" ? c().unsetColor().run() : c().setColor(k.cor).run())}>
              <span style={{ background: k.cor }} />
            </button>
          );
        })}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
