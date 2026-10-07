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
          <Link key={i.href} href={i.href} className="pilula pressionavel relative" data-ativa={ativa} aria-current={ativa ? "page" : undefined}>
            {/* O fundo da pílula ativa tem nome fixo: na navegação ele desliza até a nova aba. */}
            {ativa && <span className="absolute inset-0 rounded-full bg-card-2 shadow-[inset_0_0_0_1px_var(--line)]" style={{ viewTransitionName: "nav-ativa" }} aria-hidden />}
            <span className="relative">{i.rotulo}</span>
          </Link>
        );
      })}
    </nav>
  );
}
