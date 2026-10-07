import Link from "next/link";
import type { ReactNode } from "react";
import { corPartido } from "@/lib/partidos";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`card p-5 ${className}`}>{children}</section>;
}

export function CabecalhoCard({ titulo, aside }: { titulo: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-3">
      <h2 className="text-[17px] font-medium text-ink">{titulo}</h2>
      {aside && <div className="text-sm text-muted">{aside}</div>}
    </div>
  );
}

/** Sigla do partido: marca colorida + texto em tinta neutra (identidade nunca só pela cor). */
export function Partido({ sigla, uf, className = "" }: { sigla: string; uf?: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm text-ink-2 ${className}`}>
      <span className="size-2 rounded-full" style={{ background: corPartido(sigla) }} aria-hidden />
      {sigla}
      {uf && <span className="text-muted">· {uf}</span>}
    </span>
  );
}

export function Avatar({ nome, foto, partido, tamanho = 40 }: { nome: string; foto?: string; partido: string; tamanho?: number }) {
  const iniciais = nome
    .split(" ")
    .filter((p) => /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(p) && p.length > 2)
    .slice(0, 2)
    .map((p) => p[0])
    .join("");
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-card-2 font-medium text-ink-2"
      style={{ width: tamanho, height: tamanho, fontSize: tamanho * 0.36, boxShadow: `0 0 0 2px var(--card), 0 0 0 3px ${corPartido(partido)}` }}
    >
      {foto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={foto} alt="" className="size-full object-cover object-top" loading="lazy" />
      ) : (
        iniciais
      )}
    </span>
  );
}

/** Barra fina de progresso 0–1, ponta arredondada. */
export function Barra({ valor, cor = "var(--accent)", altura = 4 }: { valor: number; cor?: string; altura?: number }) {
  return (
    <div className="w-full rounded-full bg-card-2" style={{ height: altura }}>
      <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(1, valor)) * 100}%`, background: cor }} />
    </div>
  );
}

export function Metrica({ rotulo, valor, detalhe }: { rotulo: string; valor: ReactNode; detalhe?: ReactNode }) {
  return (
    <div>
      <div className="text-sm text-muted">{rotulo}</div>
      <div className="numero mt-1 text-[28px] leading-none text-ink">{valor}</div>
      {detalhe && <div className="mt-1.5 text-xs text-muted">{detalhe}</div>}
    </div>
  );
}

export function LinkSeta({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-sm text-ink-2 underline-offset-4 hover:text-ink hover:underline">
      {children} →
    </Link>
  );
}

export function Vazio({ children }: { children: ReactNode }) {
  return <p className="rounded-xl bg-card-2 px-4 py-6 text-center text-sm text-muted">{children}</p>;
}
