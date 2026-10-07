"use client";

import Link from "next/link";
import { useState } from "react";
import { COR_VOTO, ROTULO_VOTO } from "@/lib/formato";
import { corPartido } from "@/lib/partidos";
import type { VotoTipo } from "@/lib/types";

/** [slug, nome, partido, uf] — formato compacto para não inflar o HTML da página. */
export type Votante = [string, string, string, string];

/** Lista nominal por tipo de voto. Os nomes só são renderizados quando o grupo é aberto. */
export function VotoAVoto({ grupos }: { grupos: { voto: VotoTipo; votantes: Votante[] }[] }) {
  const [abertos, setAbertos] = useState(() => new Set(grupos.filter((g) => g.votantes.length <= 20).map((g) => g.voto)));
  // Só monta a lista depois da primeira abertura (o HTML fica leve); depois mantém para animar o fechamento.
  const [montados, setMontados] = useState(abertos);
  const alternar = (v: VotoTipo) => {
    setMontados((m) => new Set(m).add(v));
    setAbertos((s) => {
      const n = new Set(s);
      if (n.has(v)) n.delete(v);
      else n.add(v);
      return n;
    });
  };

  return (
    <div className="space-y-2">
      {grupos.map(({ voto, votantes }) => {
        const aberto = abertos.has(voto);
        return (
          <div key={voto} className="rounded-2xl bg-card-2 px-4">
            <button onClick={() => alternar(voto)} aria-expanded={aberto} className="pressionavel flex w-full items-center justify-between py-3">
              <span className="inline-flex items-center gap-2 font-medium text-ink">
                <span className="size-2.5 rounded-sm" style={{ background: COR_VOTO[voto] }} aria-hidden />
                {ROTULO_VOTO[voto]} <span className="text-ink-2">{votantes.length}</span>
              </span>
              <span className={`text-sm text-muted transition-transform ${aberto ? "rotate-180" : ""}`}>↓</span>
            </button>
            <div className="expansivel" data-aberto={aberto}>
              <div>
            {montados.has(voto) && (
              <ul className="grid gap-x-4 pb-3 sm:grid-cols-2 lg:grid-cols-3">
                {votantes.map(([slug, nome, partido, uf]) => (
                  <li key={slug}>
                    <Link href={`/p/${slug}/`} className="flex items-center gap-2 py-1.5 text-sm hover:underline hover:underline-offset-4">
                      <span className="size-2 shrink-0 rounded-full" style={{ background: corPartido(partido) }} aria-hidden />
                      <span className="truncate text-ink">{nome}</span>
                      <span className="shrink-0 text-xs text-muted">
                        {partido}-{uf}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
