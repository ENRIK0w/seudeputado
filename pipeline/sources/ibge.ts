// IBGE — municípios e malhas para os mapas. https://servicodados.ibge.gov.br/api/docs
import { readFileSync } from "node:fs";
import path from "node:path";
import { getJson } from "../lib/http";
import { normalizarNome } from "../lib/util";

export interface Municipio {
  ibge: string;
  nome: string;
  uf: string;
}

interface MunicipioApi {
  id: number;
  nome: string;
  microrregiao?: { mesorregiao: { UF: { sigla: string } } } | null;
  "regiao-imediata"?: { "regiao-intermediaria": { UF: { sigla: string } } } | null;
}

/** Lista atual do IBGE; se a API falhar, usa a lista de dados-base/ (sem os municípios criados após 2013). */
export async function listarMunicipios(): Promise<Municipio[]> {
  try {
    const lista = await getJson<MunicipioApi[]>("https://servicodados.ibge.gov.br/api/v1/localidades/municipios", {
      maxIdadeHoras: 24 * 30,
    });
    return lista.map((m) => ({
      ibge: String(m.id),
      nome: m.nome,
      uf: m.microrregiao?.mesorregiao.UF.sigla ?? m["regiao-imediata"]?.["regiao-intermediaria"].UF.sigla ?? "",
    }));
  } catch (e) {
    console.warn(`  ! API de municípios do IBGE indisponível (${(e as Error).message}); usando dados-base/`);
    const base = JSON.parse(readFileSync(path.join("dados-base", "municipios.json"), "utf8")) as [string, string, string][];
    return base.map(([ibge, nome, uf]) => ({ ibge, nome, uf }));
  }
}

/** Grafias do TSE que diferem do IBGE (nome normalizado + UF). */
const APELIDOS_TSE: Record<string, string> = {
  "EMBU|SP": "EMBU DAS ARTES",
  "MOJI MIRIM|SP": "MOGI MIRIM",
  "SAO LUIZ DO PARAITINGA|SP": "SAO LUIS DO PARAITINGA",
  "PARATI|RJ": "PARATY",
  "TRAJANO DE MORAIS|RJ": "TRAJANO DE MORAES",
  "SANTA ISABEL DO PARA|PA": "SANTA IZABEL DO PARA",
  "ITAPAGE|CE": "ITAPAJE",
  "BALNEARIO DE PICARRAS|SC": "BALNEARIO PICARRAS",
  "GRAO PARA|SC": "GRAO PARA",
  "SAO VALERIO DA NATIVIDADE|TO": "SAO VALERIO",
  "COUTO DE MAGALHAES|TO": "COUTO MAGALHAES",
  "ELDORADO DOS CARAJAS|PA": "ELDORADO DO CARAJAS",
  "AMPARO DE SAO FRANCISCO|SE": "AMPARO DO SAO FRANCISCO",
  "SANTANA DO LIVRAMENTO|RS": "SANT ANA DO LIVRAMENTO",
};

/** Cria uma função (nome do TSE, UF) → código IBGE. */
export function indiceMunicipios(municipios: Municipio[]) {
  const idx = new Map(municipios.map((m) => [`${normalizarNome(m.nome)}|${m.uf}`, m.ibge]));
  return (nomeTse: string, uf: string): string | undefined => {
    const chave = `${normalizarNome(nomeTse)}|${uf}`;
    const alias = APELIDOS_TSE[chave];
    return idx.get(alias ? `${alias}|${uf}` : chave);
  };
}

/**
 * Malha municipal simplificada de uma UF (GeoJSON com `codarea` e `nome`), versionada
 * em dados-base/ — gerada por scripts/gerar-dados-base.sh a partir da malha do IBGE.
 */
export function malhaDaUf(uf: string): unknown {
  return JSON.parse(readFileSync(path.join("dados-base", "malhas", `${uf}.json`), "utf8"));
}
