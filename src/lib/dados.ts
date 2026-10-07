// Leitura dos JSON gerados pelo pipeline. Só roda no build (Server Components).
import "server-only";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { cache } from "react";
import type { Composicao, Meta, Parlamentar, ParlamentarResumo, Votacao, VotacaoResumo } from "./types";

const DATA = path.join(process.cwd(), "data");

function ler<T>(arquivo: string): T {
  const file = path.join(DATA, arquivo);
  if (!existsSync(file)) {
    throw new Error(`Arquivo ${file} não existe. Rode "npm run dados" (dados reais) ou "npm run dados:exemplo" (fictícios).`);
  }
  return JSON.parse(readFileSync(file, "utf8")) as T;
}

export const listarParlamentares = cache(() => ler<ParlamentarResumo[]>("parlamentares.json"));
export const obterParlamentar = cache((slug: string) => ler<Parlamentar>(`parlamentares/${slug}.json`));
export const listarVotacoes = cache(() => ler<VotacaoResumo[]>("votacoes.json"));
export const obterVotacao = cache((id: string) => ler<Votacao>(`votacoes/${id}.json`));
export const obterComposicao = cache(() => ler<Composicao[]>("composicao.json"));
export const obterMeta = cache(() => ler<Meta>("meta.json"));

export const indiceVotacoes = cache(() => new Map(listarVotacoes().map((v) => [v.id, v])));
export const indiceParlamentares = cache(() => new Map(listarParlamentares().map((p) => [p.slug, p])));
