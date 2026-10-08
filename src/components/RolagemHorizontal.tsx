"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Faixa que rola para o lado. No celular, o dedo basta; com mouse aparecem
 * setas nas pontas (só quando há conteúdo escondido daquele lado), e a roda
 * do mouse com Shift também rola.
 */
export function RolagemHorizontal({ children, className = "", rotulo, papel }: { children: ReactNode; className?: string; rotulo?: string; papel?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [lados, setLados] = useState({ esq: false, dir: false });

  const medir = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setLados({ esq: el.scrollLeft > 4, dir: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    for (const filho of el.children) ro.observe(filho);
    return () => ro.disconnect();
  }, [medir, children]);

  const rolar = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.75, behavior: "smooth" });

  const seta = (dir: 1 | -1) => (
    <button
      type="button"
      onClick={() => rolar(dir)}
      aria-label={dir > 0 ? "Ver mais à direita" : "Ver mais à esquerda"}
      className={`rolagem-seta vidro absolute top-1/2 z-10 hidden size-8 -translate-y-1/2 items-center justify-center rounded-full text-ink-2 hover:text-ink [@media(hover:hover)]:inline-flex ${dir > 0 ? "right-0" : "left-0"}`}
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d={dir > 0 ? "m9 6 6 6-6 6" : "m15 6-6 6 6 6"} />
      </svg>
    </button>
  );

  return (
    <div className="relative">
      {lados.esq && seta(-1)}
      <div
        ref={ref}
        onScroll={medir}
        role={papel ?? (rotulo ? "group" : undefined)}
        aria-label={rotulo}
        className={`rolagem-faixa ${className}`}
        data-esq={lados.esq || undefined}
        data-dir={lados.dir || undefined}
      >
        {children}
      </div>
      {lados.dir && seta(1)}
    </div>
  );
}
