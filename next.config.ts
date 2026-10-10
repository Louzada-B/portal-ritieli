import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cada app instalado (área da(o) paciente e painel) tem o seu service worker, com escopo próprio.
  async headers() {
    const sw = (arquivo: string, escopo: string) => ({
      source: `/pwa/${arquivo}`,
      headers: [
        { key: "Service-Worker-Allowed", value: escopo },
        { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
      ],
    });
    return [sw("sw-paciente.js", "/area-paciente"), sw("sw-painel.js", "/painel")];
  },
  // Endereço antigo da área da paciente (e-mails já enviados): segue funcionando.
  async redirects() {
    return [{ source: "/area-da-paciente/:caminho*", destination: "/area-paciente/:caminho*", permanent: true }];
  },
};

export default nextConfig;
