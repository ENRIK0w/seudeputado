import { readFileSync } from "node:fs";
import { parse } from "csv-parse/sync";
import { unzipSync } from "fflate";
import iconv from "iconv-lite";
import type { VotoTipo } from "../../src/lib/types";

/** Remove acentos, caixa e pontuação: "José da Silva Jr." → "JOSE DA SILVA JR". */
export function normalizarNome(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function somenteDigitos(s: string | null | undefined): string {
  return (s ?? "").replace(/\D+/g, "");
}

/** "1.234,56" ou "1234.56" → 1234.56 */
export function numeroBR(s: string | number | null | undefined): number {
  if (typeof s === "number") return s;
  if (!s) return 0;
  const t = s.trim();
  const n = t.includes(",") ? Number(t.replace(/\./g, "").replace(",", ".")) : Number(t);
  return Number.isFinite(n) ? n : 0;
}

/** "31/12/2024" ou "2024-12-31T..." → "2024-12-31" */
export function dataISO(s: string | null | undefined): string | null {
  if (!s) return null;
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return iso ? iso[1] : null;
}

export function mapearVoto(v: string | null | undefined): VotoTipo | "liberado" | null {
  if (!v) return null;
  const t = normalizarNome(v);
  if (t === "SIM") return "sim";
  if (t === "NAO") return "nao";
  if (t.startsWith("ABST")) return "abstencao";
  if (t.startsWith("OBSTR")) return "obstrucao";
  if (t.includes("ARTIGO 17") || t.includes("ART 17") || t.startsWith("PRESIDENTE")) return "art17";
  if (t.startsWith("LIBERADO")) return "liberado";
  return null;
}

export function lerCsv(buf: Buffer | Uint8Array, opts: { encoding?: "latin1" | "utf8"; delimiter?: string; pularLinhas?: number } = {}) {
  let text = iconv.decode(Buffer.from(buf), opts.encoding ?? "utf8");
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  if (opts.pularLinhas) text = text.split("\n").slice(opts.pularLinhas).join("\n");
  return parse(text, {
    columns: true,
    delimiter: opts.delimiter ?? ";",
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    trim: true,
  }) as Record<string, string>[];
}

/** Abre um ZIP e devolve só as entradas cujo nome passa no filtro. */
export function lerZip(file: string, filtro: (nome: string) => boolean): Record<string, Uint8Array> {
  return unzipSync(readFileSync(file), { filter: (f) => filtro(f.name) });
}

/** Lê um campo tolerando variações de caixa (APIs do Senado alternam PascalCase/camelCase). */
export function campo<T = unknown>(obj: unknown, ...nomes: string[]): T | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  const o = obj as Record<string, unknown>;
  for (const n of nomes) {
    if (n in o) return o[n] as T;
    const alt = n[0] === n[0].toUpperCase() ? n[0].toLowerCase() + n.slice(1) : n[0].toUpperCase() + n.slice(1);
    if (alt in o) return o[alt] as T;
  }
  return undefined;
}

/** Garante array (APIs XML→JSON devolvem objeto quando há um item só). */
export function arr<T>(x: T | T[] | null | undefined): T[] {
  if (x == null) return [];
  return Array.isArray(x) ? x : [x];
}

export function anosDaLegislatura(inicio = 2023): number[] {
  const atual = new Date().getFullYear();
  const anos: number[] = [];
  for (let a = inicio; a <= Math.min(atual, inicio + 3); a++) anos.push(a);
  return anos;
}
