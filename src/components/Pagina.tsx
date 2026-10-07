import type { ReactNode } from "react";

/** Conteúdo de cada página; na primeira carga do site os filhos diretos entram em cascata. */
export function Pagina({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`cascata ${className}`}>{children}</div>;
}
