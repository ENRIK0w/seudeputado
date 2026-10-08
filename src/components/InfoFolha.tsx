"use client";

import { useCallback, useState, type ReactNode } from "react";
import { Folha } from "./Folha";

/** Botãozinho "i" que abre uma folha com a explicação de um número. */
export function InfoFolha({ titulo, rotulo, children }: { titulo: string; rotulo?: ReactNode; children: ReactNode }) {
  const [aberta, setAberta] = useState(false);
  const fechar = useCallback(() => setAberta(false), []);
  return (
    <>
      <button
        type="button"
        onClick={() => setAberta(true)}
        aria-label={`Como é calculado: ${titulo}`}
        aria-haspopup="dialog"
        className="pressionavel inline-flex size-[18px] items-center justify-center rounded-full border border-line text-[10.5px] leading-none font-semibold text-muted hover:border-[var(--line-forte)] hover:text-ink"
      >
        i
      </button>
      {aberta && (
        <Folha fechar={fechar} titulo={titulo} rotulo={rotulo}>
          <div className="space-y-3 text-[14.5px] leading-relaxed text-ink-2 [&_strong]:text-ink">{children}</div>
        </Folha>
      )}
    </>
  );
}
