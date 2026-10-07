"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { reais, reaisCompacto } from "@/lib/formato";

type Formato = "numero" | "pct" | "pct0" | "reais" | "reaisCompacto";

const fmt: Record<Formato, (n: number) => string> = {
  numero: (n) => Math.round(n).toLocaleString("pt-BR"),
  pct: (n) => `${(n * 100).toFixed(1).replace(".", ",")}%`,
  pct0: (n) => `${Math.round(n * 100)}%`,
  reais,
  reaisCompacto,
};

/**
 * Número que conta de 0 até o valor quando aparece na tela. O HTML do servidor já
 * traz o valor final (sem JS ou com "reduzir movimento", ele fica parado).
 */
export function Contador({ valor, formato = "numero", duracao = 1100 }: { valor: number | null; formato?: Formato; duracao?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [atual, setAtual] = useState<number | null>(valor);

  // Antes da primeira pintura após hidratar: zera (o CSS mantém escondido até entrar na tela).
  useLayoutEffect(() => {
    if (valor != null && document.documentElement.hasAttribute("data-anim") && !ref.current?.hasAttribute("data-visivel")) setAtual(0);
  }, [valor]);

  useEffect(() => {
    if (valor == null || !document.documentElement.hasAttribute("data-anim")) return;
    const el = ref.current!;
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const passo = (t: number) => {
        const p = Math.min(1, (t - t0) / duracao);
        setAtual(valor * (1 - Math.pow(1 - p, 4))); // ease-out quart
        if (p < 1) raf = requestAnimationFrame(passo);
      };
      raf = requestAnimationFrame(passo);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [valor, duracao]);

  return (
    <span ref={ref} className="contador tabular-nums" data-animar>
      {atual == null ? "—" : fmt[formato](atual)}
    </span>
  );
}
