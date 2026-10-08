import type { NextConfig } from "next";

const DOMINIO = "psicologaritielihermes.com.br";

const nextConfig: NextConfig = {
  // O endereço antigo da Vercel passa a levar para o domínio próprio.
  async redirects() {
    return [
      {
        source: "/:caminho*",
        has: [{ type: "host", value: "portal-ritieli.vercel.app" }],
        destination: `https://${DOMINIO}/:caminho*`,
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
