import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ritieli Hermes · Psicóloga",
    short_name: "Ritieli Hermes",
    description: "Terapia Cognitivo-Comportamental online e atendimento de crianças e adolescentes.",
    start_url: "/",
    display: "browser",
    background_color: "#F8F3F0",
    theme_color: "#F6E5E7",
    lang: "pt-BR",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
