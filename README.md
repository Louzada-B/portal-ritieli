# Portal Ritieli Hermes · Psicóloga

Site e, futuramente, painel da psicóloga Ritieli Hermes (CRP 07/46564).
Feito em Next.js e publicado na Vercel.

## Onde mexer

- **Textos da página inicial:** `app/conteudo.ts` (títulos, parágrafos, etapas, contatos)
- **Aparência:** `app/globals.css`
- **Estrutura da página inicial:** `app/page.tsx`
- **Foto:** `public/ritieli.webp`

## Situação atual

- [x] Página inicial (desktop e celular)
- [ ] Quem sou, Infantil, Escritos, Dúvidas, Privacidade
- [ ] Agenda da conversa inicial (ligada ao Google Agenda)
- [ ] Painel e prontuário

Enquanto a agenda não está ligada, o quadro "Próximos horários livres" mostra
os próximos dias de atendimento com horários de exemplo. Links para páginas
ainda não feitas mostram a tela "Esta página está quase pronta".

## Rodar no computador

```bash
npm install
npm run dev
```

Depois, abra http://localhost:3000.
