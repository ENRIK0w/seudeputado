import { data } from "@/lib/formato";
import type { ProposicaoResumo } from "@/lib/types";
import { Vazio } from "../ui";

function Item({ p }: { p: ProposicaoResumo }) {
  return (
    <li className="py-3">
      <a href={p.url} target="_blank" rel="noreferrer" className="group block">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <span className="font-medium text-ink-2">{p.sigla}</span>
          <span>{data(p.data)}</span>
          {!p.principal && <span className="rounded-full border border-line px-2">coautor</span>}
        </div>
        <p className="mt-1 line-clamp-3 text-[15px] leading-snug text-ink group-hover:underline group-hover:underline-offset-4">{p.ementa}</p>
        {p.situacao && <p className="mt-1 text-xs text-ink-2">{p.situacao}</p>}
      </a>
    </li>
  );
}

export function Proposicoes({ proposicoes }: { proposicoes: ProposicaoResumo[] }) {
  if (proposicoes.length === 0) return <Vazio>Nenhum projeto apresentado nesta legislatura.</Vazio>;
  const principais = proposicoes.filter((p) => p.principal).length;
  const porTipo = new Map<string, number>();
  for (const p of proposicoes) porTipo.set(p.sigla.split(" ")[0], (porTipo.get(p.sigla.split(" ")[0]) ?? 0) + 1);
  return (
    <div>
      <p className="text-sm text-ink-2">
        <strong className="text-ink">{principais}</strong> como autor principal · {proposicoes.length - principais} como coautor ·{" "}
        {[...porTipo].map(([t, n]) => `${n} ${t}`).join(", ")}
      </p>
      <ul className="divisor mt-2">
        {proposicoes.slice(0, 6).map((p) => (
          <Item key={p.id} p={p} />
        ))}
      </ul>
      {proposicoes.length > 6 && (
        <details className="group">
          <summary className="cursor-pointer list-none py-2 text-sm text-ink-2 hover:text-ink">
            Ver todos os {proposicoes.length} projetos ↓
          </summary>
          <ul className="divisor">
            {proposicoes.slice(6).map((p) => (
              <Item key={p.id} p={p} />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
