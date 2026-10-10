import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Endereço antigo da área da paciente (e-mails já enviados): segue funcionando.
  async redirects() {
    return [{ source: "/area-da-paciente/:caminho*", destination: "/area-paciente/:caminho*", permanent: true }];
  },
};

export default nextConfig;
