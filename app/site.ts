// Endereço público do site. Quando o domínio próprio entrar, basta definir NEXT_PUBLIC_SITE_URL na Vercel.
// No ambiente de teste (preview "staging" da Vercel) os links apontam sempre para o próprio teste, nunca para o site real.
export const ehTeste = process.env.VERCEL_ENV === "preview";
export const siteUrl =
  (ehTeste && process.env.VERCEL_BRANCH_URL ? `https://${process.env.VERCEL_BRANCH_URL}` : undefined) ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");
