"use client";

import Link from "next/link";
import { useState } from "react";
import { data } from "@/lib/formato";
import type { ProposicaoResumo } from "@/lib/types";
import { ListaComMais } from "../ListaComMais";
import { Vazio } from "../ui";

type Filtro = "todos" | "autor" | "coautor";

function Item({ p }: { p: ProposicaoResumo }) {
  return (
    <li className="py-2.5">
      <Link href={`/projetos/${p.id}/`} className="group block">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <span className="font-medium text-ink-2">{p.sigla}</span>
          <span>{data(p.data)}</span>
          <span className={`rounded-md px-1.5 ${p.principal ? "bg-accent/15 text-accent" : "border border-line"}`}>{p.principal ? "autor" : "coautor"}</span>
          {p.situacao && <span className="truncate">· {p.situacao}</span>}
          {!!p.votacoes && (
            <span className="inline-flex items-center gap-1 text-ink-2">
              <span className="size-1.5 rounded-full bg-accent" aria-hidden />
              {p.votacoes === 1 ? "1 votação" : `${p.votacoes} votações`}
            </span>
          )}
        </div>
        <p className="mt-0.5 line-clamp-2 text-[14px] leading-snug text-ink group-hover:underline group-hover:underline-offset-4">{p.ementa}</p>
      </Link>
    </li>
  );
}

export function Proposicoes({ proposicoes }: { proposicoes: ProposicaoResumo[] }) {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  if (proposicoes.length === 0) return <Vazio>Nenhum projeto apresentado nesta legislatura.</Vazio>;
  const principais = proposicoes.filter((p) => p.principal).length;
  const porTipo = new Map<string, number>();
  for (const p of proposicoes) porTipo.set(p.sigla.split(" ")[0], (porTipo.get(p.sigla.split(" ")[0]) ?? 0) + 1);
  const lista = proposicoes.filter((p) => filtro === "todos" || (filtro === "autor") === p.principal);
  const opcoes: [Filtro, string, number][] = [
    ["todos", "Todos", proposicoes.length],
    ["autor", "Autor", principais],
    ["coautor", "Coautor", proposicoes.length - principais],
  ];
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {opcoes.map(([id, rotulo, n]) => (
          <button
            key={id}
            onClick={() => setFiltro(id)}
            className="chip pressionavel"
            data-ativo={filtro === id}
          >
            {rotulo} <span className="opacity-70">{n}</span>
          </button>
        ))}
        <span className="text-xs text-muted">{[...porTipo].map(([t, n]) => `${n} ${t}`).join(" · ")}</span>
      </div>
      <div className="mt-1">
        {/* key: ao trocar o filtro a lista volta a mostrar só os primeiros */}
        <ListaComMais key={filtro} itens={lista.map((p) => <Item key={p.id} p={p} />)} rotulo="projetos" />
      </div>
    </div>
  );
}
