"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { pct, reaisCompacto, UFS } from "@/lib/formato";
import type { ParlamentarResumo } from "@/lib/types";
import { Avatar, Partido } from "./ui";

type Ordem = "nome" | "participacao" | "fidelidade" | "governo" | "gasto" | "emendas";
const ORDENS: { id: Ordem; rotulo: string }[] = [
  { id: "nome", rotulo: "Nome" },
  { id: "participacao", rotulo: "Participação" },
  { id: "fidelidade", rotulo: "Fidelidade ao partido" },
  { id: "governo", rotulo: "Alinhamento ao governo" },
  { id: "gasto", rotulo: "Gasto da cota" },
  { id: "emendas", rotulo: "Emendas pagas" },
];

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const valor = (p: ParlamentarResumo, o: Ordem): number => {
  const m = p.metricas;
  switch (o) {
    case "participacao":
      return m.participacao ?? -1;
    case "fidelidade":
      return m.fidelidadePartidaria ?? -1;
    case "governo":
      return m.alinhamentoGoverno ?? -1;
    case "gasto":
      return m.gastoCotaTotal;
    case "emendas":
      return m.emendasPagasTotal;
    default:
      return 0;
  }
};

const exibir = (p: ParlamentarResumo, o: Ordem) => {
  const m = p.metricas;
  if (o === "gasto") return reaisCompacto(m.gastoCotaTotal);
  if (o === "emendas") return reaisCompacto(m.emendasPagasTotal);
  if (o === "fidelidade") return pct(m.fidelidadePartidaria, 0);
  if (o === "governo") return pct(m.alinhamentoGoverno, 0);
  return pct(m.participacao, 0);
};

const select = "rounded-full border border-line bg-card px-3 py-2 text-sm text-ink outline-none focus:border-accent";

export function ListaParlamentares({ todos }: { todos: ParlamentarResumo[] }) {
  const [casa, setCasa] = useState<"todas" | "camara" | "senado">("todas");
  const [uf, setUf] = useState("");
  const [partido, setPartido] = useState("");
  const [q, setQ] = useState("");
  const [ordem, setOrdem] = useState<Ordem>("nome");
  const [exercicio, setExercicio] = useState(true);
  const [limite, setLimite] = useState(60);

  const partidos = useMemo(() => [...new Set(todos.map((p) => p.partido))].sort(), [todos]);
  const lista = useMemo(() => {
    const t = norm(q.trim());
    const r = todos.filter(
      (p) =>
        (casa === "todas" || p.casa === casa) &&
        (!uf || p.uf === uf) &&
        (!partido || p.partido === partido) &&
        (!exercicio || p.emExercicio) &&
        (!t || norm(p.nome).includes(t)),
    );
    if (ordem !== "nome") r.sort((a, b) => valor(b, ordem) - valor(a, ordem));
    return r;
  }, [todos, casa, uf, partido, q, ordem, exercicio]);

  return (
    <div>
      <div className="pilulas mb-3">
        {(
          [
            ["todas", "Todos"],
            ["camara", "Deputados"],
            ["senado", "Senadores"],
          ] as const
        ).map(([id, r]) => (
          <button key={id} className="pilula" data-ativa={casa === id} onClick={() => setCasa(id)}>
            {r}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome" aria-label="Filtrar por nome" className={`${select} min-w-40 flex-1`} />
        <select value={uf} onChange={(e) => setUf(e.target.value)} className={select} aria-label="Estado">
          <option value="">Todos os estados</option>
          {UFS.map((u) => (
            <option key={u}>{u}</option>
          ))}
        </select>
        <select value={partido} onChange={(e) => setPartido(e.target.value)} className={select} aria-label="Partido">
          <option value="">Todos os partidos</option>
          {partidos.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <select value={ordem} onChange={(e) => setOrdem(e.target.value as Ordem)} className={select} aria-label="Ordenar por">
          {ORDENS.map((o) => (
            <option key={o.id} value={o.id}>
              Ordenar: {o.rotulo}
            </option>
          ))}
        </select>
        <label className="inline-flex items-center gap-2 px-2 text-sm text-ink-2">
          <input type="checkbox" checked={exercicio} onChange={(e) => setExercicio(e.target.checked)} className="accent-[var(--accent)]" />
          só em exercício
        </label>
      </div>

      <p className="mt-4 text-sm text-muted">{lista.length} parlamentares</p>
      <ul className="card divisor mt-2 overflow-hidden">
        {lista.slice(0, limite).map((p) => (
          <li key={p.slug}>
            <Link href={`/p/${p.slug}/`} className="flex items-center gap-3 px-4 py-3 hover:bg-card-2">
              <Avatar nome={p.nome} foto={p.foto} partido={p.partido} tamanho={40} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-ink">{p.nome}</span>
                <span className="flex items-center gap-2">
                  <Partido sigla={p.partido} uf={p.uf} />
                  <span className="text-xs text-muted">{p.casa === "camara" ? "Câmara" : "Senado"}</span>
                </span>
              </span>
              <span className="text-right">
                <span className="numero block text-lg text-ink">{exibir(p, ordem)}</span>
                <span className="text-xs text-muted">{ORDENS.find((o) => o.id === (ordem === "nome" ? "participacao" : ordem))!.rotulo.toLowerCase()}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {lista.length > limite && (
        <button onClick={() => setLimite((l) => l + 120)} className="mt-3 w-full rounded-full border border-line py-2.5 text-sm text-ink-2 hover:text-ink">
          Mostrar mais ({lista.length - limite})
        </button>
      )}
    </div>
  );
}
