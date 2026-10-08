"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Folha de vidro que sobe de baixo com detalhes (no desktop, flutua no meio).
 * Fecha com o X, tocando fora, com Esc ou arrastando a alça para baixo.
 * `fechar` deve ser estável (useCallback) — o efeito depende dele.
 */
export function Folha({ rotulo, titulo, fechar, children }: { rotulo?: ReactNode; titulo: ReactNode; fechar: () => void; children: ReactNode }) {
  const botao = useRef<HTMLButtonElement>(null);
  const inicioToque = useRef<number | null>(null);
  const [arraste, setArraste] = useState(0);

  useEffect(() => {
    botao.current?.focus();
    const esc = (ev: KeyboardEvent) => ev.key === "Escape" && fechar();
    window.addEventListener("keydown", esc);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", esc);
      document.body.style.overflow = overflow;
    };
  }, [fechar]);

  return createPortal(
    <>
      <div className="folha-fundo" onClick={fechar} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="folha-titulo"
        className="folha vidro"
        style={arraste ? { transform: `translateY(${arraste}px)`, transition: "none" } : undefined}
      >
        {/* Alça: arrastar para baixo fecha */}
        <div
          className="flex shrink-0 cursor-grab justify-center pt-2.5 pb-1"
          onTouchStart={(ev) => (inicioToque.current = ev.touches[0].clientY)}
          onTouchMove={(ev) => inicioToque.current != null && setArraste(Math.max(0, ev.touches[0].clientY - inicioToque.current))}
          onTouchEnd={() => {
            if (arraste > 90) fechar();
            setArraste(0);
            inicioToque.current = null;
          }}
        >
          <span className="h-[5px] w-10 rounded-full bg-[color-mix(in_srgb,var(--ink)_22%,transparent)]" />
        </div>
        <div className="flex shrink-0 items-start justify-between gap-3 px-5 pt-1 pb-3">
          <div className="min-w-0">
            {rotulo && <div className="rotulo flex flex-wrap gap-x-2">{rotulo}</div>}
            <h3 id="folha-titulo" className="titulo mt-1.5 text-[22px] leading-tight text-ink">
              {titulo}
            </h3>
          </div>
          <button
            ref={botao}
            onClick={fechar}
            aria-label="Fechar"
            className="pressionavel -mr-1 inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--ink)_8%,transparent)] text-ink-2 hover:text-ink"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto overscroll-contain px-5 pb-6">{children}</div>
      </div>
    </>,
    document.body,
  );
}

/** Pares rótulo/valor no corpo das folhas. */
export function Ficha({ itens }: { itens: [ReactNode, ReactNode][] }) {
  return (
    <dl className="divisor mb-5 border-y border-line text-sm">
      {itens.map(([k, v], i) => (
        <div key={i} className="flex items-baseline justify-between gap-4 py-2.5">
          <dt className="shrink-0 text-muted">{k}</dt>
          <dd className="min-w-0 text-right text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Subtítulo de seção dentro da folha. */
export const SubFolha = ({ children }: { children: ReactNode }) => <h4 className="rotulo mt-5 mb-2">{children}</h4>;
