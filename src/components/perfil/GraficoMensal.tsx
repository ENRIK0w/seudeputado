"use client";

import { useRef, useState } from "react";
import { reaisCompacto, reaisExato } from "@/lib/formato";
import type { Gastos } from "@/lib/types";

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const rotuloMes = (m: string) => `${MESES[Number(m.slice(5, 7)) - 1]}/${m.slice(0, 4)}`;

/**
 * Gasto mensal da cota: uma coluna por mês. Passando o mouse ou o dedo, a coluna
 * em foco se destaca e um balão mostra o mês e o valor exato.
 */
export function GraficoMensal({ meses }: { meses: Gastos["porMes"] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [foco, setFoco] = useState<number | null>(null);
  const max = Math.max(...meses.map((m) => m.total), 1);
  const w = 100 / meses.length;

  const focar = (clientX: number) => {
    const r = ref.current!.getBoundingClientRect();
    const i = Math.floor(((clientX - r.left) / r.width) * meses.length);
    setFoco(Math.max(0, Math.min(meses.length - 1, i)));
  };

  const m = foco != null ? meses[foco] : null;
  const xFoco = foco != null ? (foco + 0.5) * w : 0;
  // O balão fica logo acima da coluna; o espaço reservado no topo (ESPACO) evita cobrir os totais
  const ESPACO = 52;
  const ALTURA = 112;
  const topoColuna = m ? ESPACO + ALTURA * (1 - ((m.total / max) * 30) / 32) : 0;

  return (
    <figure>
      <div
        ref={ref}
        className="relative touch-pan-y select-none"
        style={{ paddingTop: ESPACO }}
        onPointerMove={(e) => focar(e.clientX)}
        onPointerDown={(e) => focar(e.clientX)}
        onPointerLeave={(e) => e.pointerType === "mouse" && setFoco(null)}
      >
        <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="w-full" style={{ height: ALTURA }} data-animar role="img" aria-label="Gasto mensal da cota parlamentar">
          {meses.map((mes, i) => {
            const h = (mes.total / max) * 30;
            return (
              <rect
                key={mes.mes}
                className="anim-coluna"
                style={{ ["--i" as string]: i }}
                x={i * w + w * 0.15}
                y={32 - h}
                width={w * 0.7}
                height={Math.max(h, 0.3)}
                rx={0.6}
                fill="var(--accent)"
                opacity={foco == null || foco === i ? 0.9 : 0.35}
              >
                <title>{`${rotuloMes(mes.mes)}: ${reaisExato(mes.total)}`}</title>
              </rect>
            );
          })}
        </svg>
        {m && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl border border-line bg-card px-3 py-1.5 text-center text-sm whitespace-nowrap shadow-xl"
            style={{ left: `clamp(70px, ${xFoco}%, calc(100% - 70px))`, top: topoColuna - 6 }}
            role="status"
          >
            <div className="text-xs text-muted">{rotuloMes(m.mes)}</div>
            <div className="font-medium text-ink tabular-nums">{reaisExato(m.total)}</div>
          </div>
        )}
      </div>
      <figcaption className="mt-1 flex justify-between text-xs text-muted">
        <span>{rotuloMes(meses[0].mes)}</span>
        <span>maior mês: {reaisCompacto(max)}</span>
        <span>{rotuloMes(meses.at(-1)!.mes)}</span>
      </figcaption>
    </figure>
  );
}
