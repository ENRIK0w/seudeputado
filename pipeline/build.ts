// Coleta todas as fontes e grava data/ e public/data/.
// Uso: npm run dados [-- --sem-tse --sem-emendas]
import type { Meta, MunicipioDados, Parlamentar } from "../src/lib/types";
import { calcularMetricas } from "./metricas";
import { gravarDataset, type Dataset } from "./output";
import { coletarCamara } from "./sources/camara";
import { indiceMunicipios, listarMunicipios, malhaDaUf } from "./sources/ibge";
import { coletarSenado } from "./sources/senado";
import { coletarEmendas } from "./sources/transparencia";
import { coletarTse } from "./sources/tse";

const args = new Set(process.argv.slice(2));
const hoje = new Date().toISOString();

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
  if (municipios && !args.has("--sem-tse")) {
    const tse = await opcional("TSE", () => coletarTse(parlamentares, cpfPorSlug, indiceMunicipios(municipios)));
    if (tse) {
      ds.eleicaoMapas = tse.mapas;
      for (const p of parlamentares) p.eleicao = tse.resumos[p.slug] ?? null;
      fontes.push({ nome: "TSE — Dados Abertos", url: "https://dadosabertos.tse.jus.br", atualizadoEm: hoje });
      ds.municipios = montarMunicipios(municipios, parlamentares, tse.maisVotadosPorMunicipio);
    }
    const ufs = [...new Set(parlamentares.map((p) => p.uf))].filter((uf) => uf && uf !== "DF");
    for (const uf of [...ufs, "DF"]) {
      const geo = await opcional(`Malha ${uf}`, async () => malhaDaUf(uf));
      if (geo) ds.malhas[uf] = geo;
    }
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
