"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITENS = [
  { href: "/", rotulo: "Início" },
  { href: "/parlamentares/", rotulo: "Parlamentares" },
  { href: "/votacoes/", rotulo: "Votações" },
  { href: "/cidade/", rotulo: "Sua cidade" },
];

export function Navegacao() {
  const path = usePathname();
  return (
    <nav className="pilulas" aria-label="Seções">
      {ITENS.map((i) => {
        const ativa = i.href === "/" ? path === "/" : path.startsWith(i.href.replace(/\/$/, ""));
        return (
          <Link key={i.href} href={i.href} className="pilula" data-ativa={ativa} aria-current={ativa ? "page" : undefined}>
            {i.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
