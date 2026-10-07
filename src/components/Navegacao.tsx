"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";

const ITENS = [
  { href: "/", rotulo: "Início" },
  { href: "/parlamentares/", rotulo: "Parlamentares" },
  { href: "/votacoes/", rotulo: "Votações" },
  { href: "/cidade/", rotulo: "Sua cidade" },
];

/** Menu do desktop/tablet: abas de texto com uma "lente" de vidro que desliza até a ativa. */
export function Navegacao() {
  const path = usePathname();
  const links = useRef<(HTMLAnchorElement | null)[]>([]);
  const [lente, setLente] = useState<{ x: number; w: number } | null>(null);
  const ativa = ITENS.findIndex((i) => (i.href === "/" ? path === "/" : path.startsWith(i.href.replace(/\/$/, ""))));

  useLayoutEffect(() => {
    const medir = () => {
      const a = links.current[ativa];
      setLente(a ? { x: a.offsetLeft, w: a.offsetWidth } : null);
    };
    medir();
    // As fontes podem chegar depois e mudar a largura dos itens
    document.fonts?.ready.then(medir);
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, [ativa]);

  return (
    <nav className="menu-vidro" aria-label="Seções">
      {lente && <span className="lente-nav" style={{ transform: `translateX(${lente.x}px)`, width: lente.w }} aria-hidden />}
      {ITENS.map((i, n) => (
        <Link
          key={i.href}
          href={i.href}
          ref={(el) => {
            links.current[n] = el;
          }}
          className="menu-vidro-item"
          data-ativa={n === ativa}
          aria-current={n === ativa ? "page" : undefined}
        >
          {i.rotulo}
        </Link>
      ))}
    </nav>
  );
}
