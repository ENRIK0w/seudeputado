"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { urlDados } from "@/lib/caminho";
import { COR_VOTO, data, ROTULO_VOTO } from "@/lib/formato";
import type { VotoParlamentar, VotoTipo } from "@/lib/types";

type Indice = Record<string, { d: string; t: string }>;
type Filtro = "todos" | "contraPartido" | "contraGoverno" | "ausente";

const FILTROS: { id: Filtro; rotulo: string }[] = [
  { id: "todos", rotulo: "Todos" },
  { id: "contraPartido", rotulo: "Contra o partido" },
  { id: "contraGoverno", rotulo: "Contra o governo" },
  { id: "ausente", rotulo: "Ausências" },
];

const comparavel = (v: VotoTipo) => v === "sim" || v === "nao" || v === "abstencao" || v === "obstrucao";

function passa(v: VotoParlamentar, f: Filtro) {
  if (f === "ausente") return v.voto === "ausente";
  if (f === "contraPartido") return comparavel(v.voto) && v.orientacaoPartido != null && v.voto !== v.orientacaoPartido;
  if (f === "contraGoverno") return comparavel(v.voto) && v.orientacaoGoverno != null && v.voto !== v.orientacaoGoverno;
  return true;
}

function Chip({ voto }: { voto: VotoTipo }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ink">
      <span className="size-2.5 rounded-sm" style={{ background: COR_VOTO[voto] }} aria-hidden />
      {ROTULO_VOTO[voto]}
    </span>
  );
}

/**
 * Mapa de votos: cada quadrado é uma votação nominal (ordem cronológica), colorido
 * pelo voto. Abaixo, a lista filtrável. Começa com os votos recentes vindos do
 * build e carrega o histórico completo no navegador.
 */
export function HistoricoVotos({ slug, recentes, descricoes }: { slug: string; recentes: VotoParlamentar[]; descricoes: Indice }) {
  const [votos, setVotos] = useState(recentes);
  const [indice, setIndice] = useState<Indice>(descricoes);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [limite, setLimite] = useState(15);
  const [foco, setFoco] = useState<VotoParlamentar | null>(null);

  useEffect(() => {
    fetch(urlDados(`votos/${slug}.json`))
      .then((r) => r.json())
      .then(setVotos)
      .catch(() => {});
    fetch(urlDados("votacoes-indice.json"))
      .then((r) => r.json())
      .then(setIndice)
      .catch(() => {});
  }, [slug]);

  const cronologico = useMemo(() => [...votos].reverse(), [votos]);
  const filtrados = votos.filter((v) => passa(v, filtro));
  const contagem = useMemo(() => {
    const c: Partial<Record<VotoTipo, number>> = {};
    for (const v of votos) c[v.voto] = (c[v.voto] ?? 0) + 1;
    return c;
  }, [votos]);

  if (votos.length === 0) return <p className="text-sm text-muted">Nenhuma votação nominal registrada nesta legislatura.</p>;

  return (
    <div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2">
        {(["sim", "nao", "abstencao", "obstrucao", "ausente"] as VotoTipo[])
          .filter((t) => contagem[t])
          .map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm" style={{ background: COR_VOTO[t] }} aria-hidden />
              {ROTULO_VOTO[t]} <strong className="text-ink">{contagem[t]}</strong>
            </span>
          ))}
      </div>

      <div className="relative mt-3">
        <div className="flex flex-wrap gap-[3px]" role="img" aria-label={`Mapa de ${votos.length} votações`} onMouseLeave={() => setFoco(null)}>
          {cronologico.map((v) => {
            const destaque = filtro !== "todos" && passa(v, filtro);
            return (
              <Link
                key={v.votacaoId}
                href={`/votacoes/${v.votacaoId}/`}
                onMouseEnter={() => setFoco(v)}
                onFocus={() => setFoco(v)}
                aria-label={`${data(v.data)}: ${ROTULO_VOTO[v.voto]}`}
                className="size-[11px] rounded-[3px] transition-opacity"
                style={{
                  background: COR_VOTO[v.voto],
                  opacity: filtro === "todos" || destaque ? 1 : 0.18,
                  outline: foco === v ? "2px solid var(--ink)" : undefined,
                }}
              />
            );
          })}
        </div>
        <div className="mt-2 min-h-10 text-sm">
          {foco ? (
            <p className="text-ink-2">
              <span className="text-muted">{data(foco.data)}</span> · {indice[foco.votacaoId]?.t ?? "Votação"} · votou <Chip voto={foco.voto} />
              {foco.orientacaoPartido && <span className="text-muted"> · partido orientou {ROTULO_VOTO[foco.orientacaoPartido]}</span>}
            </p>
          ) : (
            <p className="text-muted">Cada quadrado é uma votação, da mais antiga à mais recente. Passe o dedo ou o mouse para ver.</p>
          )}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            onClick={() => {
              setFiltro(f.id);
              setLimite(15);
            }}
            className={`rounded-full border px-3 py-1 text-sm ${filtro === f.id ? "border-ink bg-ink text-bg" : "border-line text-ink-2 hover:text-ink"}`}
          >
            {f.rotulo} <span className="opacity-70">{votos.filter((v) => passa(v, f.id)).length}</span>
          </button>
        ))}
      </div>

      <ul className="divisor mt-3">
        {filtrados.slice(0, limite).map((v) => (
          <li key={v.votacaoId}>
            <Link href={`/votacoes/${v.votacaoId}/`} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 py-3 hover:opacity-90">
              <span className="min-w-0">
                <span className="text-xs text-muted">{data(v.data)}</span>
                <span className="line-clamp-2 block text-[15px] leading-snug text-ink">{indice[v.votacaoId]?.t ?? v.votacaoId}</span>
                <span className="text-xs text-muted">
                  {v.orientacaoPartido ? `Partido: ${ROTULO_VOTO[v.orientacaoPartido]}` : "Partido: sem orientação"}
                  {v.orientacaoGoverno && ` · Governo: ${ROTULO_VOTO[v.orientacaoGoverno]}`}
                </span>
              </span>
              <Chip voto={v.voto} />
            </Link>
          </li>
        ))}
      </ul>
      {filtrados.length > limite && (
        <button onClick={() => setLimite((l) => l + 30)} className="mt-1 py-2 text-sm text-ink-2 hover:text-ink">
          Mostrar mais ({filtrados.length - limite} restantes) ↓
        </button>
      )}
    </div>
  );
}
