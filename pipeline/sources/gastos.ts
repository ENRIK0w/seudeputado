import type { Gastos } from "../../src/lib/types";

export interface Despesa {
  categoria: string;
  fornecedor: string;
  documento: string;
  /** "2024-03" */
  mes: string;
  valor: number;
}

const arred = (n: number) => Math.round(n * 100) / 100;

function titulo(s: string) {
  const t = s.trim().toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function agregarGastos(despesas: Despesa[]): Gastos {
  const cat = new Map<string, number>();
  const forn = new Map<string, { fornecedor: string; documento: string; total: number }>();
  const mes = new Map<string, number>();
  let total = 0;
  for (const d of despesas) {
    total += d.valor;
    const c = titulo(d.categoria || "Outros");
    cat.set(c, (cat.get(c) ?? 0) + d.valor);
    const chave = d.documento || d.fornecedor;
    const f = forn.get(chave) ?? { fornecedor: d.fornecedor, documento: d.documento, total: 0 };
    f.total += d.valor;
    forn.set(chave, f);
    mes.set(d.mes, (mes.get(d.mes) ?? 0) + d.valor);
  }
  return {
    total: arred(total),
    porCategoria: [...cat].map(([categoria, t]) => ({ categoria, total: arred(t) })).sort((a, b) => b.total - a.total),
    topFornecedores: [...forn.values()]
      .map((f) => ({ ...f, total: arred(f.total) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10),
    porMes: [...mes].map(([m, t]) => ({ mes: m, total: arred(t) })).sort((a, b) => a.mes.localeCompare(b.mes)),
  };
}
