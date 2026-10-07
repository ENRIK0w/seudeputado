"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { urlDados } from "@/lib/caminho";
import type { ItemBusca } from "@/lib/types";
import { Avatar } from "./ui";

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export function BuscaRapida({ autoFocus = false }: { autoFocus?: boolean }) {
  const [itens, setItens] = useState<ItemBusca[] | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    fetch(urlDados("busca.json"))
      .then((r) => r.json())
      .then(setItens)
      .catch(() => setItens([]));
  }, []);

  const resultados = useMemo(() => {
    const t = norm(q.trim());
    if (!itens || t.length < 2) return [];
    return itens
      .filter((i) => norm(`${i.nome} ${i.partido} ${i.uf}`).includes(t))
      .sort((a, b) => Number(b.emExercicio) - Number(a.emExercicio))
      .slice(0, 8);
  }, [itens, q]);

  return (
    <div className="relative">
      <label className="flex items-center gap-3 rounded-xl border border-line bg-card px-4 py-3 shadow-[var(--sombra)] focus-within:border-accent">
        <svg viewBox="0 0 24 24" className="size-5 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus={autoFocus}
          placeholder="Busque por nome, partido ou estado"
          className="w-full bg-transparent text-[16px] text-ink outline-none placeholder:text-muted"
          aria-label="Buscar parlamentar"
        />
      </label>
      {resultados.length > 0 && (
        <ul className="popover vidro divisor absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-2xl">
          {resultados.map((r) => (
            <li key={r.slug}>
              <Link href={`/p/${r.slug}/`} className="pressionavel flex items-center gap-3 px-4 py-3 hover:bg-card-2">
                <Avatar nome={r.nome} foto={r.foto} partido={r.partido} tamanho={34} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-ink">{r.nome}</span>
                  <span className="text-sm text-muted">
                    {r.casa === "camara" ? "Deputado(a)" : "Senador(a)"} · {r.partido} · {r.uf}
                    {!r.emExercicio && " · fora do exercício"}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
