"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// Faz os blocos marcados com a classe "revela" surgirem suavemente ao rolar a página.
// Roda de novo a cada troca de página, para não deixar blocos escondidos ao navegar.
export default function Revela() {
  const caminho = usePathname();

  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    document.documentElement.classList.add("anima");

    const obs = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visivel");
            obs.unobserve(e.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px" }
    );

    const observar = () =>
      document.querySelectorAll<HTMLElement>(".revela:not(.visivel)").forEach((el) => obs.observe(el));
    observar();

    // Pega também blocos que aparecem depois (por exemplo, ao abrir um cartão).
    const mut = new MutationObserver(observar);
    mut.observe(document.body, { childList: true, subtree: true });

    return () => {
      obs.disconnect();
      mut.disconnect();
    };
  }, [caminho]);

  return null;
}
