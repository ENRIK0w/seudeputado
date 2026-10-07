// Coleta todas as fontes e grava data/ e public/data/.
// Uso: npm run dados [-- --tse | --sem-tse] [--sem-emendas]
//   (padrão)    reaproveita o resultado do TSE salvo em dados-base/tse/
//   --tse       baixa os arquivos do TSE (demora) e salva em dados-base/tse/ — rodar após eleições
//   --sem-tse   ignora o TSE
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Meta, MunicipioDados, Parlamentar } from "../src/lib/types";
import { calcularMetricas } from "./metricas";
import { gravarDataset, type Dataset } from "./output";
import { coletarCamara } from "./sources/camara";
import { indiceMunicipios, listarMunicipios, malhaDaUf } from "./sources/ibge";
import { coletarSenado } from "./sources/senado";
import { coletarEmendas } from "./sources/transparencia";
import { coletarTse, type ResultadoTse } from "./sources/tse";

const args = new Set(process.argv.slice(2));
const hoje = new Date().toISOString();

// Resultado do TSE versionado no repositório: só muda a cada eleição.
const DIR_TSE = path.join("dados-base", "tse");

function salvarTse(tse: ResultadoTse & { geradoEm: string }) {
  mkdirSync(DIR_TSE, { recursive: true });
  writeFileSync(path.join(DIR_TSE, "info.json"), JSON.stringify({ geradoEm: tse.geradoEm }));
  writeFileSync(path.join(DIR_TSE, "resumos.json"), JSON.stringify(tse.resumos));
  writeFileSync(path.join(DIR_TSE, "mapas.json"), JSON.stringify(tse.mapas));
  const top = Object.fromEntries(Object.entries(tse.maisVotadosPorMunicipio).map(([ibge, l]) => [ibge, l.slice(0, 15)]));
  writeFileSync(path.join(DIR_TSE, "mais-votados.json"), JSON.stringify(top));
  console.log(`  ✓ TSE salvo em ${DIR_TSE}/ (${Object.keys(tse.resumos).length} parlamentares)`);
}

function carregarTse(): (ResultadoTse & { geradoEm: string }) | null {
  const ler = (f: string) => JSON.parse(readFileSync(path.join(DIR_TSE, f), "utf8"));
  if (!existsSync(path.join(DIR_TSE, "resumos.json"))) return null;
  return {
    geradoEm: ler("info.json").geradoEm,
    resumos: ler("resumos.json"),
    mapas: ler("mapas.json"),
    maisVotadosPorMunicipio: ler("mais-votados.json"),
  };
}

async function opcional<T>(nome: string, fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (e) {
    console.error(`✗ ${nome} falhou — seguindo sem esses dados:`, e);
    return null;
  }
}

async function main() {
  const inicio = Date.now();
  const [camara, senado] = [await coletarCamara(), await coletarSenado()];
  const parlamentares: Parlamentar[] = [...camara.parlamentares, ...senado.parlamentares];
  const votosPorSlug = { ...camara.votosPorSlug, ...senado.votosPorSlug };
  const cpfPorSlug = { ...camara.cpfPorSlug, ...senado.cpfPorSlug };
  const fontes: Meta["fontes"] = [
    { nome: "Câmara dos Deputados — Dados Abertos", url: "https://dadosabertos.camara.leg.br", atualizadoEm: hoje },
    { nome: "Senado Federal — Dados Abertos", url: "https://legis.senado.leg.br/dadosabertos", atualizadoEm: hoje },
  ];

  if (!args.has("--sem-emendas")) {
    const emendas = await opcional("Emendas", () => coletarEmendas(parlamentares));
    if (emendas) {
      for (const p of parlamentares) p.emendas = (emendas[p.slug] ?? []).sort((a, b) => b.pago - a.pago);
      fontes.push({ nome: "Portal da Transparência — Emendas", url: "https://portaldatransparencia.gov.br/emendas", atualizadoEm: hoje });
    }
  }

  const ds: Dataset = {
    parlamentares,
    votacoes: [...camara.votacoes, ...senado.votacoes],
    votosPorSlug,
    eleicaoMapas: {},
    malhas: {},
    municipios: {},
    meta: { geradoEm: hoje, exemplo: false, fontes },
  };

  const municipios = await opcional("IBGE municípios", listarMunicipios);
  let maisVotados: ResultadoTse["maisVotadosPorMunicipio"] = {};
  let tse: (ResultadoTse & { geradoEm: string }) | null = null;
  if (municipios && args.has("--tse")) {
    const novo = await opcional("TSE", () => coletarTse(parlamentares, cpfPorSlug, indiceMunicipios(municipios)));
    if (novo) {
      tse = { ...novo, geradoEm: hoje };
      salvarTse(tse);
    }
  } else if (!args.has("--sem-tse")) {
    tse = carregarTse();
    if (!tse) console.warn("  ! sem resultado do TSE salvo em dados-base/tse/ — rode com --tse");
  }
  if (tse) {
    ds.eleicaoMapas = tse.mapas;
    maisVotados = tse.maisVotadosPorMunicipio;
    // O TSE grava nomes em maiúsculas ("PASSO FUNDO"); usamos a grafia do IBGE.
    const nomeIbge = new Map((municipios ?? []).map((m) => [m.ibge, m.nome]));
    for (const p of parlamentares) {
      const r = tse.resumos[p.slug];
      p.eleicao = r ? { ...r, topMunicipios: r.topMunicipios.map((t) => ({ ...t, nome: nomeIbge.get(t.ibge) ?? t.nome })) } : null;
    }
    fontes.push({ nome: "TSE — Dados Abertos", url: "https://dadosabertos.tse.jus.br", atualizadoEm: tse.geradoEm });
  }
  // Municípios (emendas + mais votados) e malhas saem sempre, mesmo sem o TSE.
  if (municipios) ds.municipios = montarMunicipios(municipios, parlamentares, maisVotados);
  for (const uf of new Set(parlamentares.map((p) => p.uf).filter(Boolean))) {
    const geo = await opcional(`Malha ${uf}`, async () => malhaDaUf(uf));
    if (geo) ds.malhas[uf] = geo;
  }

  for (const p of parlamentares) p.metricas = calcularMetricas(p, votosPorSlug[p.slug] ?? []);

  await gravarDataset(ds);
  console.log(`Pronto em ${Math.round((Date.now() - inicio) / 1000)}s`);
}

function montarMunicipios(
  municipios: { ibge: string; nome: string; uf: string }[],
  parlamentares: Parlamentar[],
  maisVotados: Record<string, { slug: string; votos: number; pct: number }[]>,
): Record<string, MunicipioDados> {
  const porSlug = new Map(parlamentares.map((p) => [p.slug, p]));
  // ibge → slug → soma das emendas
  const emendasPorIbge = new Map<string, Map<string, { empenhado: number; pago: number; quantidade: number }>>();
  for (const p of parlamentares) {
    for (const e of p.emendas) {
      if (!e.ibge) continue;
      const doMunicipio = emendasPorIbge.get(e.ibge) ?? new Map();
      const acc = doMunicipio.get(p.slug) ?? { empenhado: 0, pago: 0, quantidade: 0 };
      acc.empenhado += e.empenhado;
      acc.pago += e.pago;
      acc.quantidade++;
      doMunicipio.set(p.slug, acc);
      emendasPorIbge.set(e.ibge, doMunicipio);
    }
  }
  const out: Record<string, MunicipioDados> = {};
  for (const m of municipios) {
    const emendas = emendasPorIbge.get(m.ibge) ?? new Map();
    const info = (slug: string) => {
      const p = porSlug.get(slug)!;
      return { slug, nome: p.nome, partido: p.partido, casa: p.casa };
    };
    const listaEmendas = [...emendas].map(([slug, e]) => ({ ...info(slug), ...e })).sort((a, b) => b.pago - a.pago);
    out[m.ibge] = {
      ...m,
      maisVotados: (maisVotados[m.ibge] ?? []).slice(0, 15).map((v) => ({ ...info(v.slug), votos: v.votos, pct: v.pct })),
      emendas: listaEmendas,
      totalEmendasPago: Math.round(listaEmendas.reduce((s, e) => s + e.pago, 0)),
    };
  }
  return out;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
