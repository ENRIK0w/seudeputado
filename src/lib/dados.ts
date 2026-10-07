// Leitura dos JSON gerados pelo pipeline. Só roda no build (Server Components).
import "server-only";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { cache } from "react";
import type { Composicao, Meta, Parlamentar, ParlamentarResumo, Projeto, Votacao, VotacaoResumo } from "./types";

const DATA = path.join(process.cwd(), "data");

function ler<T>(arquivo: string): T {
  const file = path.join(DATA, arquivo);
  if (!existsSync(file)) {
    throw new Error(`Arquivo ${file} não existe. Rode "npm run dados" (dados reais) ou "npm run dados:exemplo" (fictícios).`);
  }
  return JSON.parse(readFileSync(file, "utf8")) as T;
}

export const listarParlamentares = cache(() => ler<ParlamentarResumo[]>("parlamentares.json"));
const seguro = (arquivo: string) => /^[a-z]+-[\w-]+$/i.test(arquivo);

export const obterParlamentar = cache((slug: string) =>
  seguro(slug) && existsSync(path.join(DATA, "parlamentares", `${slug}.json`)) ? ler<Parlamentar>(`parlamentares/${slug}.json`) : null,
);
export const listarVotacoes = cache(() => ler<VotacaoResumo[]>("votacoes.json"));
export const obterVotacao = cache((id: string) =>
  seguro(id) && existsSync(path.join(DATA, "votacoes", `${id}.json`)) ? ler<Votacao>(`votacoes/${id}.json`) : null,
);
// Projetos agrupados em 100 arquivos pelo fim do id (mesma regra de pipeline/output.ts).
const grupoProjeto = cache((g: string) => {
  const file = path.join(DATA, "projetos", `${g}.json`);
  return existsSync(file) ? ler<Record<string, Projeto>>(`projetos/${g}.json`) : {};
});
export const obterProjeto = (id: string): Projeto | null =>
  seguro(id) ? (grupoProjeto(id.replace(/\D/g, "").slice(-2).padStart(2, "0"))[id] ?? null) : null;
export const obterComposicao = cache(() => ler<Composicao[]>("composicao.json"));
export const obterMeta = cache(() => ler<Meta>("meta.json"));

export const indiceVotacoes = cache(() => new Map(listarVotacoes().map((v) => [v.id, v])));
export const indiceParlamentares = cache(() => new Map(listarParlamentares().map((p) => [p.slug, p])));
