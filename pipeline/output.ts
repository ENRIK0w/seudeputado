import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  Composicao,
  EleicaoMapa,
  ItemBusca,
  Meta,
  MunicipioDados,
  Parlamentar,
  ParlamentarResumo,
  Projeto,
  Votacao,
  VotacaoResumo,
  VotoParlamentar,
} from "../src/lib/types";
import { chaveProposicao, tituloVotacao } from "../src/lib/formato";
import { compactarVotos } from "../src/lib/votosCompactos";

export interface Dataset {
  parlamentares: Parlamentar[];
  votacoes: Votacao[];
  votosPorSlug: Record<string, VotoParlamentar[]>;
  eleicaoMapas: Record<string, EleicaoMapa>;
  malhas: Record<string, unknown>;
  municipios: Record<string, MunicipioDados>;
  meta: Meta;
}

const RAIZ = path.resolve(".");
const DATA = path.join(RAIZ, "data"); // lido no build (server components)
const PUB = path.join(RAIZ, "public", "data"); // baixado pelo navegador
const VOTOS_RECENTES = 30;

async function gravar(file: string, dados: unknown) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(dados));
}

function resumo(p: Parlamentar): ParlamentarResumo {
  const { slug, casa, idOrigem, nome, partido, uf, foto, emExercicio, metricas } = p;
  return { slug, casa, idOrigem, nome, partido, uf, foto, emExercicio, metricas };
}

function resumoVotacao(v: Votacao): VotacaoResumo {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { orientacoes, porPartido, votos, referencias, ...r } = v;
  return r;
}

/** Grupo do arquivo de um projeto: os projetos ficam em 100 arquivos (data/projetos/00..99.json). */
export const grupoProjeto = (id: string) => id.replace(/\D/g, "").slice(-2).padStart(2, "0");

/** Junta as autorias de todos os parlamentares por projeto e liga cada um às votações dele. */
function montarProjetos(parlamentares: Parlamentar[], votacoes: Votacao[]) {
  const votacoesPorChave = new Map<string, string[]>();
  for (const v of [...votacoes].sort((a, b) => b.data.localeCompare(a.data))) {
    const k = chaveProposicao(v.proposicao);
    if (k) votacoesPorChave.set(k, [...(votacoesPorChave.get(k) ?? []), v.id]);
  }
  const projetos = new Map<string, Projeto>();
  for (const p of parlamentares) {
    for (const pr of p.proposicoes) {
      const votacoesDoProjeto = votacoesPorChave.get(chaveProposicao(pr.sigla) ?? "") ?? [];
      pr.votacoes = votacoesDoProjeto.length;
      const { principal, votacoes: _n, ...dados } = pr; // eslint-disable-line @typescript-eslint/no-unused-vars
      const proj = projetos.get(pr.id) ?? { ...dados, casa: p.casa, autores: [], votacoes: votacoesDoProjeto };
      proj.autores.push({ slug: p.slug, principal });
      projetos.set(pr.id, proj);
    }
  }
  // Autor principal primeiro, depois os coautores
  for (const proj of projetos.values()) proj.autores.sort((a, b) => Number(b.principal) - Number(a.principal));
  return projetos;
}

export async function gravarDataset(ds: Dataset) {
  await rm(DATA, { recursive: true, force: true });
  await rm(PUB, { recursive: true, force: true });

  // Antes de gravar os parlamentares: marca em cada projeto quantas votações ele teve.
  const projetos = montarProjetos(ds.parlamentares, ds.votacoes);
  const grupos = new Map<string, Record<string, Projeto>>();
  for (const [id, proj] of projetos) {
    const g = grupos.get(grupoProjeto(id)) ?? {};
    g[id] = proj;
    grupos.set(grupoProjeto(id), g);
  }
  for (const [g, lista] of grupos) await gravar(path.join(DATA, "projetos", `${g}.json`), lista);

  const ordenados = [...ds.parlamentares].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  await gravar(path.join(DATA, "parlamentares.json"), ordenados.map(resumo));

  for (const p of ordenados) {
    const votos = [...(ds.votosPorSlug[p.slug] ?? [])].sort((a, b) => b.data.localeCompare(a.data));
    await gravar(path.join(DATA, "parlamentares", `${p.slug}.json`), { ...p, votosRecentes: votos.slice(0, VOTOS_RECENTES) });
    await gravar(path.join(PUB, "votos", `${p.slug}.json`), compactarVotos(p.casa, votos));
    if (ds.eleicaoMapas[p.slug]) await gravar(path.join(PUB, "eleicao", `${p.slug}.json`), ds.eleicaoMapas[p.slug]);
  }

  const votacoes = [...ds.votacoes].sort((a, b) => b.data.localeCompare(a.data));
  await gravar(path.join(DATA, "votacoes.json"), votacoes.map(resumoVotacao));
  for (const v of votacoes) await gravar(path.join(DATA, "votacoes", `${v.id}.json`), v);
  // Índice leve para o navegador mostrar a descrição dos votos no histórico completo.
  await gravar(
    path.join(PUB, "votacoes-indice.json"),
    Object.fromEntries(votacoes.map((v) => [v.id, { d: v.data, t: tituloVotacao(v) }])),
  );

  const composicao: Composicao[] = (["camara", "senado"] as const).map((casa) => {
    const ativos = ordenados.filter((p) => p.casa === casa && p.emExercicio);
    const cont = new Map<string, number>();
    for (const p of ativos) cont.set(p.partido, (cont.get(p.partido) ?? 0) + 1);
    return {
      casa,
      total: ativos.length,
      partidos: [...cont].map(([partido, cadeiras]) => ({ partido, cadeiras })).sort((a, b) => b.cadeiras - a.cadeiras),
    };
  });
  await gravar(path.join(DATA, "composicao.json"), composicao);
  await gravar(path.join(DATA, "meta.json"), ds.meta);

  const busca: ItemBusca[] = ordenados.map(({ slug, nome, partido, uf, casa, foto, emExercicio }) => ({
    slug,
    nome,
    partido,
    uf,
    casa,
    foto,
    emExercicio,
  }));
  await gravar(path.join(PUB, "busca.json"), busca);

  for (const [uf, geo] of Object.entries(ds.malhas)) await gravar(path.join(PUB, "malhas", `${uf}.json`), geo);
  for (const m of Object.values(ds.municipios)) await gravar(path.join(PUB, "municipios", `${m.ibge}.json`), m);
  await gravar(
    path.join(PUB, "municipios-indice.json"),
    Object.values(ds.municipios).map((m) => [m.ibge, m.nome, m.uf]),
  );

  const votados = [...projetos.values()].filter((p) => p.votacoes.length).length;
  console.log(`✓ ${projetos.size} projetos (${votados} com votação em plenário)`);
  console.log(
    `✓ ${ordenados.length} parlamentares, ${votacoes.length} votações, ${Object.keys(ds.municipios).length} municípios gravados`,
  );
}
