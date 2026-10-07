import { execFileSync, spawn } from "node:child_process";
import { parse } from "csv-parse";
import iconv from "iconv-lite";
import { limparCampo } from "./util";

/** Lista as entradas de um ZIP (usa o `unzip` do sistema — disponível nos runners do GitHub). */
export function entradasZip(zip: string): string[] {
  return execFileSync("unzip", ["-Z1", zip], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
    .split("\n")
    .filter(Boolean);
}

/**
 * Percorre as linhas de um CSV dentro de um ZIP sem carregar tudo na memória.
 * Arquivos do TSE e do Portal da Transparência passam de 1 GB descompactados.
 */
export async function* linhasCsvZip(
  zip: string,
  entrada: string,
  opts: { encoding?: string; delimiter?: string } = {},
): AsyncGenerator<Record<string, string>> {
  const proc = spawn("unzip", ["-p", zip, entrada], { stdio: ["ignore", "pipe", "inherit"] });
  const parser = proc.stdout.pipe(iconv.decodeStream(opts.encoding ?? "latin1")).pipe(
    parse({
      columns: (h: string[]) => h.map((c) => c.replace(/^﻿/, "").trim()),
      delimiter: opts.delimiter ?? ";",
      relax_quotes: true,
      relax_column_count: true,
      skip_empty_lines: true,
    }),
  );
  for await (const linha of parser) {
    const l = linha as Record<string, string>;
    for (const k in l) l[k] = limparCampo(l[k]);
    yield l;
  }
}
