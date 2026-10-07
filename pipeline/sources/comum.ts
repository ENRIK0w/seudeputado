import type { Metricas, OrientacaoBancada, Parlamentar, Votacao, VotoParlamentar, VotoTipo } from "../../src/lib/types";
import { normalizarNome } from "../lib/util";

export interface ColetaCasa {
  parlamentares: Parlamentar[];
  votacoes: Votacao[];
  /** Histórico completo de votos (inclui "ausente") por parlamentar. */
  votosPorSlug: Record<string, VotoParlamentar[]>;
  /** CPF por slug, quando a fonte informa (usado para cruzar com o TSE). */
  cpfPorSlug: Record<string, string>;
}

export function metricasVazias(): Metricas {
  return {
    fidelidadePartidaria: null,
    alinhamentoGoverno: null,
    participacao: null,
    votacoesConsideradas: 0,
    proposicoesApresentadas: 0,
    gastoCotaTotal: 0,
    emendasPagasTotal: 0,
  };
}

const ALIAS_GOVERNO = new Set(["GOVERNO", "GOV", "LIDERANCA DO GOVERNO", "LID GOV"]);

/**
 * Encontra a orientação de um partido (ou do governo) numa votação.
 * Na Câmara a orientação às vezes vem por bloco ("Bl UniãoPP..."): nesse caso
 * procuramos a sigla do partido entre as siglas que compõem o nome do bloco.
 */
export function buscarOrientacao(orientacoes: OrientacaoBancada[], partido: string): VotoTipo | null {
  const alvo = normalizarNome(partido);
  const valor = (o: OrientacaoBancada) => (o.orientacao === "liberado" ? null : o.orientacao);

  if (alvo === "GOVERNO") {
    const gov = orientacoes.find((o) => ALIAS_GOVERNO.has(normalizarNome(o.bancada)));
    return gov ? valor(gov) : null;
  }
  const exata = orientacoes.find((o) => normalizarNome(o.bancada) === alvo);
  if (exata) return valor(exata);

  const compacto = alvo.replace(/ /g, "");
  for (const o of orientacoes) {
    const b = o.bancada.normalize("NFD").replace(/[̀-ͯ]/g, "");
    if (!/^(bl|bloco|fdr|federa)/i.test(b)) continue;
    // "Bl UniãoPpPdt" → ["Bl","Uniao","Pp","Pdt"]; "Fdr PT-PCdoB-PV" → ["Fdr","PT","PCdoB","PV"]
    const partes = b.split(/[^A-Za-z]+|(?<=[a-z])(?=[A-Z][a-z])/).map((p) => p.toUpperCase());
    if (partes.includes(compacto)) return valor(o);
  }
  return null;
}

/** Placar e campos de uma votação a partir de uma lista de votos individuais. */
export function contarPlacar(votos: Record<string, VotoTipo>) {
  const placar = { sim: 0, nao: 0, abstencao: 0, obstrucao: 0, ausente: 0 };
  for (const v of Object.values(votos)) if (v in placar) placar[v as keyof typeof placar]++;
  return placar;
}
