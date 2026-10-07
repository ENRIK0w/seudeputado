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
  Votacao,
  VotacaoResumo,
  VotoParlamentar,
} from "../src/lib/types";
import { tituloVotacao } from "../src/lib/formato";

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
  const { orientacoes, porPartido, votos, ...r } = v;
  return r;
}

export async function gravarDataset(ds: Dataset) {
  await rm(DATA, { recursive: true, force: true });
  await rm(PUB, { recursive: true, force: true });

  const ordenados = [...ds.parlamentares].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  await gravar(path.join(DATA, "parlamentares.json"), ordenados.map(resumo));

  for (const p of ordenados) {
    const votos = [...(ds.votosPorSlug[p.slug] ?? [])].sort((a, b) => b.data.localeCompare(a.data));
    await gravar(path.join(DATA, "parlamentares", `${p.slug}.json`), { ...p, votosRecentes: votos.slice(0, VOTOS_RECENTES) });
    await gravar(path.join(PUB, "votos", `${p.slug}.json`), votos);
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

  console.log(
    `✓ ${ordenados.length} parlamentares, ${votacoes.length} votações, ${Object.keys(ds.municipios).length} municípios gravados`,
  );
}
