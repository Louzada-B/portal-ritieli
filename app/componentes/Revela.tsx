"use client";

import { useEffect } from "react";

// Faz os blocos marcados com a classe "revela" surgirem suavemente ao rolar a página.
export default function Revela() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".revela"));
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
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);
  return null;
}
