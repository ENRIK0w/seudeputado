"use client";

import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

/**
 * Entrada da página nova ao navegar: leve zoom e esmaecimento (CSS .pagina-entra).
 * A key troca a cada rota, então a animação roda uma vez por navegação — sem
 * snapshots do navegador, que piscavam com páginas geradas sob demanda.
 * Na primeira carga não anima aqui (quem anima é a cascata dos cards).
 */
export function TransicaoPagina({ children }: { children: ReactNode }) {
  const path = usePathname();
  const [inicial] = useState(path);
  return (
    <div key={path} className={path === inicial ? undefined : "pagina-entra"}>
      {children}
    </div>
  );
}
