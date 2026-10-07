import { ViewTransition, type ReactNode } from "react";

/**
 * Envolve o conteúdo de cada página: na navegação, a página antiga se recolhe e a
 * nova chega com leve zoom e desfoque (CSS .pagina em globals.css). Os filhos
 * diretos entram em cascata.
 */
export function Pagina({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <ViewTransition enter="pagina" exit="pagina" default="none">
      <div className={`cascata ${className}`}>{children}</div>
    </ViewTransition>
  );
}

/** Elemento que "voa" entre páginas (ex.: foto e nome do parlamentar da lista para o perfil). */
export function Compartilhado({ nome, children }: { nome: string; children: ReactNode }) {
  return (
    <ViewTransition name={nome} share="morph" default="none">
      {children}
    </ViewTransition>
  );
}
