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
    // A cascata dos cards é só para a primeira carga; nas navegações quem anima é a transição de página.
    const t = setTimeout(() => delete document.documentElement.dataset.primeiraCarga, 1500);
    return () => clearTimeout(t);
  }, []);
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
export const SCRIPT_ANIMACAO = `try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches){var h=document.documentElement;h.dataset.anim='';h.dataset.primeiraCarga=''}}catch(e){}`;
