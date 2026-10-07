"use client";

import { useState, type ReactNode } from "react";

/**
 * Lista compacta: mostra os primeiros `inicial` itens, com "Ver mais" (mais
 * `passo`), "Ver todos (N)" e "Mostrar menos". Os itens chegam já renderizados
 * (podem vir de um Server Component).
 */
export function ListaComMais({
  itens,
  inicial = 5,
  passo = 10,
  className = "divisor",
  rotulo = "itens",
}: {
  itens: ReactNode[];
  inicial?: number;
  passo?: number;
  className?: string;
  rotulo?: string;
}) {
  const [limite, setLimite] = useState(inicial);
  const total = itens.length;
  const restantes = total - limite;
  return (
    <div>
      <ul className={className}>{itens.slice(0, limite)}</ul>
      {total > inicial && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          {restantes > 0 && (
            <>
              <button onClick={() => setLimite((l) => l + passo)} className="chip pressionavel">
                Ver mais
              </button>
              {restantes > passo && (
                <button onClick={() => setLimite(total)} className="chip pressionavel">
                  Ver todos ({total})
                </button>
              )}
            </>
          )}
          {limite > inicial && (
            <button onClick={() => setLimite(inicial)} className="pressionavel rounded-full px-3 py-1 text-muted hover:text-ink">
              Mostrar menos
            </button>
          )}
          <span className="ml-auto text-xs text-muted">
            {Math.min(limite, total)} de {total} {rotulo}
          </span>
        </div>
      )}
    </div>
  );
}
