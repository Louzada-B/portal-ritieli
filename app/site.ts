// Endereço público do site. Quando o domínio próprio entrar, basta definir NEXT_PUBLIC_SITE_URL na Vercel.
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");
