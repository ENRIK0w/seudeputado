"use client";

import { useState, type ReactNode } from "react";

/** Abas em pílula; o conteúdo de cada aba é renderizado no servidor e só alternado aqui. */
export function Abas({ abas, pequenas = false }: { abas: { rotulo: string; conteudo: ReactNode }[]; pequenas?: boolean }) {
  const [ativa, setAtiva] = useState(0);
  return (
    <div>
      <div className={pequenas ? "mb-4 inline-flex gap-1" : "pilulas mb-4"} role="tablist">
        {abas.map((a, i) => (
          <button
            key={a.rotulo}
            role="tab"
            aria-selected={i === ativa}
            data-ativa={i === ativa}
            onClick={() => setAtiva(i)}
            className={pequenas ? "pilula !flex-none !px-3 !py-1 !text-sm" : "pilula"}
          >
            {a.rotulo}
          </button>
        ))}
      </div>
      {abas.map((a, i) => (
        <div key={a.rotulo} role="tabpanel" hidden={i !== ativa}>
          {a.conteudo}
        </div>
      ))}
    </div>
  );
}
