"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Marca com data-visivel os elementos [data-animar] quando entram na tela — o CSS
 * (globals.css, "Animações disparadas…") anima a partir daí. Acompanha elementos
 * que aparecem depois (navegação, dados carregados no navegador).
 */
export function Revelador() {
  const path = usePathname();
  useEffect(() => {
    const io = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (!e.isIntersecting) continue;
          (e.target as HTMLElement).dataset.visivel = "";
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    const observar = () => document.querySelectorAll("[data-animar]:not([data-visivel])").forEach((el) => io.observe(el));
    observar();
    const mo = new MutationObserver(observar);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [path]);
  return null;
}

/** Roda antes da primeira pintura: liga as animações (se o usuário não pediu menos movimento). */
export const SCRIPT_ANIMACAO = `try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.dataset.anim=''}catch(e){}`;
