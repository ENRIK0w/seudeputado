// TSE — resultados por município, candidaturas e bens declarados.
// https://dadosabertos.tse.jus.br  (arquivos em cdn.tse.jus.br/estatistica/sead/odsele)
import type { EleicaoMapa, EleicaoResumo, Parlamentar } from "../../src/lib/types";
import { download } from "../lib/http";
import { entradasZip, linhasCsvZip } from "../lib/stream";
import { normalizarNome, numeroBR, somenteDigitos } from "../lib/util";

const CDN = "https://cdn.tse.jus.br/estatistica/sead/odsele";
const CARGO = { senado: "5", camara: "6" } as const;
const CACHE_TSE = { maxIdadeHoras: 24 * 365 }; // resultados de eleições passadas não mudam

interface Candidatura {
  slug: string;
  ano: number;
  sq: string;
  cargo: string;
  uf: string;
  situacao: string;
}

export interface ResultadoTse {
  resumos: Record<string, EleicaoResumo>;
  mapas: Record<string, EleicaoMapa>;
  /** ibge → [{slug, votos}] — os parlamentares mais votados em cada município. */
  maisVotadosPorMunicipio: Record<string, { slug: string; votos: number; pct: number }[]>;
}

/** Arquivos por UF quando existirem; se não, o nacional. Evita contar duas vezes. */
function csvsPorUf(zip: string, ufs?: Set<string>) {
  const csvs = entradasZip(zip).filter((n) => /\.csv$/i.test(n));
  const porUf = csvs.filter((n) => /_[A-Z]{2}\.csv$/i.test(n) && !/_BR(ASIL)?\.csv$/i.test(n));
  if (porUf.length === 0) return csvs;
  return porUf.filter((n) => !ufs || ufs.has(n.match(/_([A-Z]{2})\.csv$/i)![1].toUpperCase()));
}

async function candidaturas(ano: number, parlamentares: Parlamentar[], cpfPorSlug: Record<string, string>) {
  const zip = await download(`${CDN}/consulta_cand/consulta_cand_${ano}.zip`, CACHE_TSE);
  const porCpf = new Map(Object.entries(cpfPorSlug).map(([slug, cpf]) => [cpf, slug]));
  const porNome = new Map<string, string>();
  for (const p of parlamentares) {
    for (const n of [p.nome, p.nomeCivil]) porNome.set(`${normalizarNome(n)}|${p.uf}|${CARGO[p.casa]}`, p.slug);
  }

  const achados: Candidatura[] = [];
  for (const entrada of csvsPorUf(zip)) {
    for await (const r of linhasCsvZip(zip, entrada)) {
      if (r.CD_CARGO !== CARGO.camara && r.CD_CARGO !== CARGO.senado) continue;
      const slug =
        (r.CD_CARGO === CARGO.camara && porCpf.get(somenteDigitos(r.NR_CPF_CANDIDATO))) ||
        porNome.get(`${normalizarNome(r.NM_URNA_CANDIDATO)}|${r.SG_UF}|${r.CD_CARGO}`) ||
        porNome.get(`${normalizarNome(r.NM_CANDIDATO)}|${r.SG_UF}|${r.CD_CARGO}`);
      if (!slug) continue;
      achados.push({ slug, ano, sq: r.SQ_CANDIDATO, cargo: r.CD_CARGO, uf: r.SG_UF, situacao: r.DS_SIT_TOT_TURNO });
    }
  }
  return achados;
}

async function patrimonio(ano: number, sqs: Set<string>) {
  const total = new Map<string, number>();
  try {
    const zip = await download(`${CDN}/bem_candidato/bem_candidato_${ano}.zip`, CACHE_TSE);
    for (const entrada of csvsPorUf(zip)) {
      for await (const r of linhasCsvZip(zip, entrada)) {
        if (sqs.has(r.SQ_CANDIDATO)) total.set(r.SQ_CANDIDATO, (total.get(r.SQ_CANDIDATO) ?? 0) + numeroBR(r.VR_BEM_CANDIDATO));
      }
    }
  } catch (e) {
    console.warn(`  ! bens ${ano}: ${(e as Error).message}`);
  }
  return total;
}

export async function coletarTse(
  parlamentares: Parlamentar[],
  cpfPorSlug: Record<string, string>,
  ibgeDe: (nomeTse: string, uf: string) => string | undefined,
): Promise<ResultadoTse> {
  const resultado: ResultadoTse = { resumos: {}, mapas: {}, maisVotadosPorMunicipio: {} };
  const nomesMunicipio = new Map<string, string>();

  // Deputados: eleição de 2022. Senadores: 2022 ou 2018 (mandato de 8 anos).
  const jaAchados = new Set<string>();
  for (const ano of [2022, 2018]) {
    console.log(`TSE ${ano}: candidaturas`);
    const cands = (await candidaturas(ano, parlamentares, cpfPorSlug)).filter(
      (c) => !jaAchados.has(c.slug) && (ano === 2022 || c.cargo === CARGO.senado),
    );
    if (cands.length === 0) continue;
    cands.forEach((c) => jaAchados.add(c.slug));
    const porSq = new Map(cands.map((c) => [c.sq, c]));
    const ufs = new Set(cands.map((c) => c.uf));

    console.log(`TSE ${ano}: votos por município (${ufs.size} UFs)`);
    const zip = await download(`${CDN}/votacao_candidato_munzona/votacao_candidato_munzona_${ano}.zip`, CACHE_TSE);
    const votosCand = new Map<string, Map<string, number>>(); // sq → ibge → votos
    const totalCargo = new Map<string, number>(); // cargo|ibge → votos nominais
    let semIbge = 0;

    for (const entrada of csvsPorUf(zip, ufs)) {
      for await (const r of linhasCsvZip(zip, entrada)) {
        if ((r.CD_CARGO !== CARGO.camara && r.CD_CARGO !== CARGO.senado) || r.NR_TURNO !== "1") continue;
        const ibge = ibgeDe(r.NM_MUNICIPIO, r.SG_UF);
        if (!ibge) {
          semIbge++;
          continue;
        }
        nomesMunicipio.set(ibge, r.NM_MUNICIPIO);
        const votos = Number(r.QT_VOTOS_NOMINAIS_VALIDOS ?? r.QT_VOTOS_NOMINAIS) || 0;
        const chave = `${r.CD_CARGO}|${ibge}`;
        totalCargo.set(chave, (totalCargo.get(chave) ?? 0) + votos);
        if (!porSq.has(r.SQ_CANDIDATO)) continue;
        const m = votosCand.get(r.SQ_CANDIDATO) ?? new Map<string, number>();
        m.set(ibge, (m.get(ibge) ?? 0) + votos);
        votosCand.set(r.SQ_CANDIDATO, m);
      }
    }
    if (semIbge) console.warn(`  ! ${semIbge} linhas sem município IBGE correspondente`);

    const bens = await patrimonio(ano, new Set(porSq.keys()));

    for (const c of cands) {
      const m = votosCand.get(c.sq) ?? new Map();
      const municipios: EleicaoMapa["municipios"] = {};
      let votosTotais = 0;
      for (const [ibge, votos] of m) {
        const pct = votos / (totalCargo.get(`${c.cargo}|${ibge}`) || 1);
        municipios[ibge] = { votos, pct: Math.round(pct * 10000) / 10000 };
        votosTotais += votos;
        (resultado.maisVotadosPorMunicipio[ibge] ??= []).push({ slug: c.slug, votos, pct: municipios[ibge].pct });
      }
      resultado.mapas[c.slug] = { uf: c.uf, ano, municipios };
      resultado.resumos[c.slug] = {
        ano,
        cargo: c.cargo === CARGO.senado ? "Senador" : "Deputado Federal",
        votosTotais,
        situacao: c.situacao,
        topMunicipios: Object.entries(municipios)
          .sort((a, b) => b[1].votos - a[1].votos)
          .slice(0, 10)
          .map(([ibge, v]) => ({ ibge, nome: nomesMunicipio.get(ibge) ?? ibge, ...v })),
        patrimonio: bens.has(c.sq) ? Math.round(bens.get(c.sq)!) : null,
        receitaCampanha: null,
      };
    }
  }

  for (const lista of Object.values(resultado.maisVotadosPorMunicipio)) lista.sort((a, b) => b.votos - a.votos);
  return resultado;
}
