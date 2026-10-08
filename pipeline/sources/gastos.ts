import type { DetalheCategoria, DetalheFornecedor, DetalheMes, DetalhesParlamentar, Gastos, NotaCota } from "../../src/lib/types";

export interface Despesa {
  categoria: string;
  fornecedor: string;
  documento: string;
  /** "2024-03" */
  mes: string;
  valor: number;
  /** Detalhes opcionais (vão só para as folhas de detalhe) */
  data?: string | null;
  descricao?: string | null;
  url?: string | null;
}

const arred = (n: number) => Math.round(n * 100) / 100;

export function titulo(s: string) {
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

const NOTAS_POR_FORNECEDOR = 8;
const FORNECEDORES_POR_CATEGORIA = 8;
const FORNECEDORES_DETALHADOS = 10;

const somar = <K,>(m: Map<K, number>, k: K, v: number) => m.set(k, (m.get(k) ?? 0) + v);
const ordenar = (m: Map<string, number>) => [...m].map(([k, total]) => ({ k, total: arred(total) })).sort((a, b) => b.total - a.total);

/**
 * Detalhes para as folhas do perfil: por categoria (com os maiores fornecedores),
 * pelos maiores fornecedores (com as maiores notas) e por mês.
 */
export function detalharGastos(despesas: Despesa[]): Omit<DetalhesParlamentar, "emendas"> {
  const chaveForn = (d: Despesa) => d.documento || d.fornecedor;

  // Categorias
  const cats = new Map<string, Despesa[]>();
  for (const d of despesas) {
    const c = titulo(d.categoria || "Outros");
    if (!cats.has(c)) cats.set(c, []);
    cats.get(c)!.push(d);
  }
  const categorias: Record<string, DetalheCategoria> = {};
  for (const [c, lista] of cats) {
    const forn = new Map<string, { nome: string; documento: string; total: number; notas: number }>();
    const anos = new Map<string, number>();
    const espec = new Map<string, number>();
    for (const d of lista) {
      const f = forn.get(chaveForn(d)) ?? { nome: d.fornecedor, documento: d.documento, total: 0, notas: 0 };
      f.total += d.valor;
      f.notas++;
      forn.set(chaveForn(d), f);
      somar(anos, d.mes.slice(0, 4), d.valor);
      // A Câmara traz a especificação antes do " · " na descrição
      const e = d.descricao?.split(" · ")[0];
      if (e && e.length < 80) somar(espec, e, d.valor);
    }
    categorias[c] = {
      total: arred(lista.reduce((s, d) => s + d.valor, 0)),
      notas: lista.length,
      fornecedores: [...forn.values()]
        .map((f) => ({ ...f, total: arred(f.total) }))
        .sort((a, b) => b.total - a.total)
        .slice(0, FORNECEDORES_POR_CATEGORIA),
      porAno: [...anos].map(([ano, t]) => ({ ano, total: arred(t) })).sort((a, b) => a.ano.localeCompare(b.ano)),
      especificacoes: espec.size > 1 ? ordenar(espec).slice(0, 6).map(({ k, total }) => ({ nome: k, total })) : [],
    };
  }

  // Maiores fornecedores (os mesmos da lista do perfil)
  const porForn = new Map<string, Despesa[]>();
  for (const d of despesas) {
    if (!porForn.has(chaveForn(d))) porForn.set(chaveForn(d), []);
    porForn.get(chaveForn(d))!.push(d);
  }
  const soma = (l: Despesa[]) => l.reduce((s, d) => s + d.valor, 0);
  const maiores = [...porForn].map(([k, l]) => [k, l, soma(l)] as const).sort((a, b) => b[2] - a[2]);
  const fornecedores: Record<string, DetalheFornecedor> = {};
  for (const [chave, lista] of maiores.slice(0, FORNECEDORES_DETALHADOS)) {
    const cs = new Map<string, number>();
    for (const d of lista) somar(cs, titulo(d.categoria || "Outros"), d.valor);
    const meses = lista.map((d) => d.mes).sort();
    const notas: NotaCota[] = [...lista]
      .sort((a, b) => b.valor - a.valor)
      .slice(0, NOTAS_POR_FORNECEDOR)
      .map((d) => ({ data: d.data ?? null, valor: arred(d.valor), categoria: titulo(d.categoria || "Outros"), descricao: d.descricao ?? null, url: d.url ?? null }));
    fornecedores[chave] = {
      nome: lista[0].fornecedor,
      documento: lista[0].documento,
      total: arred(lista.reduce((s, d) => s + d.valor, 0)),
      notas: lista.length,
      categorias: ordenar(cs).map(({ k, total }) => ({ categoria: k, total })),
      primeiro: meses[0],
      ultimo: meses.at(-1)!,
      maiores: notas,
    };
  }

  // Meses
  const porMes = new Map<string, Despesa[]>();
  for (const d of despesas) {
    if (!porMes.has(d.mes)) porMes.set(d.mes, []);
    porMes.get(d.mes)!.push(d);
  }
  const meses: Record<string, DetalheMes> = {};
  for (const [m, lista] of porMes) {
    const cs = new Map<string, number>();
    const fs = new Map<string, number>();
    for (const d of lista) {
      somar(cs, titulo(d.categoria || "Outros"), d.valor);
      somar(fs, d.fornecedor, d.valor);
    }
    meses[m] = {
      total: arred(lista.reduce((s, d) => s + d.valor, 0)),
      notas: lista.length,
      categorias: ordenar(cs).slice(0, 6).map(({ k, total }) => ({ categoria: k, total })),
      fornecedores: ordenar(fs).slice(0, 5).map(({ k, total }) => ({ nome: k, total })),
    };
  }
  return { categorias, fornecedores, meses };
}
