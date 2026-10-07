"use client";

import { useMemo, useState } from "react";
import type { VotacaoResumo } from "@/lib/types";
import { VotacaoItem } from "./VotacaoItem";

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export function ListaVotacoes({ votacoes }: { votacoes: VotacaoResumo[] }) {
  const [casa, setCasa] = useState<"todas" | "camara" | "senado">("todas");
  const [q, setQ] = useState("");
  const [limite, setLimite] = useState(40);
  const lista = useMemo(() => {
    const t = norm(q.trim());
    return votacoes.filter((v) => (casa === "todas" || v.casa === casa) && (!t || norm(`${v.proposicao ?? ""} ${v.descricao} ${v.ementa ?? ""}`).includes(t)));
  }, [votacoes, casa, q]);

  return (
    <div>
      <div className="pilulas mb-3">
        {(
          [
            ["todas", "Todas"],
            ["camara", "Câmara"],
            ["senado", "Senado"],
          ] as const
        ).map(([id, r]) => (
          <button key={id} className="pilula" data-ativa={casa === id} onClick={() => setCasa(id)}>
            {r}
          </button>
        ))}
      </div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar por tema ou número (ex.: PEC 45, reforma tributária)"
        aria-label="Buscar votação"
        className="w-full rounded-lg border border-line bg-card px-4 py-2.5 text-[15px] text-ink outline-none placeholder:text-muted focus:border-accent"
      />
      <p className="mt-4 text-sm text-muted">{lista.length} votações nominais em plenário</p>
      <div className="card divisor mt-2 px-5">
        {lista.slice(0, limite).map((v) => (
          <VotacaoItem key={v.id} v={v} />
        ))}
      </div>
      {lista.length > limite && (
        <button onClick={() => setLimite((l) => l + 80)} className="mt-3 w-full rounded-lg border border-line py-2.5 text-sm text-ink-2 hover:text-ink">
          Mostrar mais ({lista.length - limite})
        </button>
      )}
    </div>
  );
}
