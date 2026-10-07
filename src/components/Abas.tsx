"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/** Abas em pílula com indicador que desliza; o conteúdo novo entra suavemente. */
export function Abas({ abas, pequenas = false }: { abas: { rotulo: string; conteudo: ReactNode }[]; pequenas?: boolean }) {
  const [ativa, setAtiva] = useState(0);
  const botoes = useRef<(HTMLButtonElement | null)[]>([]);
  const [ind, setInd] = useState<{ x: number; w: number } | null>(null);

  useLayoutEffect(() => {
    const medir = () => {
      const b = botoes.current[ativa];
      if (b) setInd({ x: b.offsetLeft, w: b.offsetWidth });
    };
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, [ativa]);

  return (
    <div>
      <div className={`${pequenas ? "mb-4 inline-flex gap-1" : "pilulas mb-4"} relative`} role="tablist">
        {ind && (
          <span
            className={`indicador pointer-events-none absolute left-0 ${pequenas ? "top-0 bottom-0 rounded-md bg-card-2" : "top-[3px] bottom-[3px] rounded-[7px] bg-card shadow-[0_0_0_0.5px_var(--line),0_2px_6px_rgb(0_0_0/0.08),inset_0_1px_0_var(--vidro-brilho)]"}`}
            style={{ transform: `translateX(${ind.x}px)`, width: ind.w }}
            aria-hidden
          />
        )}
        {abas.map((a, i) => (
          <button
            key={a.rotulo}
            ref={(el) => {
              botoes.current[i] = el;
            }}
            role="tab"
            aria-selected={i === ativa}
            data-ativa={i === ativa}
            onClick={() => setAtiva(i)}
            className={`com-indicador pressionavel relative ${pequenas ? "pilula !flex-none !px-3 !py-1 !text-sm" : "pilula"}`}
          >
            {a.rotulo}
          </button>
        ))}
      </div>
      {abas.map((a, i) => (
        // key muda a cada troca: o conteúdo reentra com a animação "surgir"
        <div key={i === ativa ? `ativa-${i}` : i} role="tabpanel" hidden={i !== ativa} className={i === ativa ? "animate-[surgir_500ms_var(--expo)_both]" : ""}>
          {a.conteudo}
        </div>
      ))}
    </div>
  );
}
