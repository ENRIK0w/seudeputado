import Link from "next/link";
import type { ReactNode } from "react";
import { corPartido } from "@/lib/partidos";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`card p-5 ${className}`}>{children}</section>;
}

/** Cabeçalho de seção: número opcional ("01"), título em serifa e complemento à direita. */
export function CabecalhoCard({ titulo, aside, numero }: { titulo: ReactNode; aside?: ReactNode; numero?: string }) {
  return (
    <div className="mb-5 flex items-baseline justify-between gap-3 border-b border-line pb-3">
      <h2 className="titulo flex items-baseline gap-2.5 text-[21px] text-ink">
        {numero && <span className="secao-num text-[15px]">{numero}</span>}
        {titulo}
      </h2>
      {aside && <div className="shrink-0 text-sm text-muted">{aside}</div>}
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
export function Barra({ valor, cor = "var(--accent)", altura = 4, indice = 0 }: { valor: number; cor?: string; altura?: number; indice?: number }) {
  return (
    <div className="w-full rounded-full bg-card-2" style={{ height: altura }} data-animar>
      <div
        className="anim-barra h-full rounded-full"
        style={{ width: `${Math.max(0, Math.min(1, valor)) * 100}%`, background: cor, ["--i" as string]: indice }}
      />
    </div>
  );
}

export function Metrica({ rotulo, valor, detalhe, tamanho = 30 }: { rotulo: string; valor: ReactNode; detalhe?: ReactNode; tamanho?: number }) {
  return (
    <div>
      <div className="rotulo">{rotulo}</div>
      <div className="numero mt-2 leading-none whitespace-nowrap text-ink" style={{ fontSize: tamanho }}>
        {valor}
      </div>
      {detalhe && <div className="mt-1.5 text-xs text-muted">{detalhe}</div>}
    </div>
  );
}

export function LinkSeta({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-[13.5px] text-ink-2 underline-offset-4 hover:text-ink hover:underline">
      {children} →
    </Link>
  );
}

export function Vazio({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-sm text-muted">{children}</p>;
}

/** Abertura das páginas de lista: chapéu, título grande em serifa e linha de apoio. */
export function CabecalhoPagina({ rotulo, titulo, children }: { rotulo: string; titulo: ReactNode; children?: ReactNode }) {
  return (
    <header className="mb-8 border-b border-line pb-6">
      <div className="rotulo">{rotulo}</div>
      <h1 className="display mt-3 text-ink">{titulo}</h1>
      {children && <p className="texto-longo mt-3 text-ink-2">{children}</p>}
    </header>
  );
}
