"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const icone = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {d}
  </svg>
);

const ABAS = [
  { href: "/", rotulo: "Início", icone: icone(<path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" />) },
  {
    href: "/parlamentares/",
    rotulo: "Parlamentares",
    icone: icone(
      <>
        <circle cx="9" cy="8.5" r="3.2" />
        <path d="M3.5 19.5c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" />
        <path d="M15.5 5.6a3.2 3.2 0 0 1 0 5.8M17.5 14.8c1.6.6 2.7 2.2 3 4.7" />
      </>,
    ),
  },
  {
    href: "/votacoes/",
    rotulo: "Votações",
    icone: icone(
      <>
        <rect x="4" y="4" width="16" height="16" rx="4" />
        <path d="m8.5 12.2 2.4 2.4 4.8-5" />
      </>,
    ),
  },
  {
    href: "/cidade/",
    rotulo: "Sua cidade",
    icone: icone(
      <>
        <path d="M12 21s-6.5-5.8-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.2 12 21 12 21Z" />
        <circle cx="12" cy="10" r="2.3" />
      </>,
    ),
  },
];

/** Barra de abas flutuante em vidro (só no celular); a "lente" desliza até a aba ativa. */
export function BarraAbas() {
  const path = usePathname();
  const ativa = ABAS.findIndex((a) => (a.href === "/" ? path === "/" : path.startsWith(a.href.replace(/\/$/, ""))));
  return (
    <nav className="barra-abas vidro grid grid-cols-4 md:hidden" aria-label="Seções" style={{ ["--n" as string]: ABAS.length }}>
      {ativa >= 0 && <span className="lente" style={{ ["--i" as string]: ativa }} aria-hidden />}
      {ABAS.map((a, i) => (
        <Link key={a.href} href={a.href} data-ativa={i === ativa} aria-current={i === ativa ? "page" : undefined}>
          {a.icone}
          {a.rotulo}
        </Link>
      ))}
    </nav>
  );
}
