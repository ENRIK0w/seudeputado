import type { Metricas, Parlamentar, VotoParlamentar, VotoTipo } from "../src/lib/types";

const MINIMO_VOTACOES = 10;
const VOTOS_VALIDOS = new Set<VotoTipo>(["sim", "nao", "abstencao", "obstrucao"]);

function concordancia(votos: VotoParlamentar[], ref: (v: VotoParlamentar) => VotoTipo | null): number | null {
  const comparaveis = votos.filter((v) => VOTOS_VALIDOS.has(v.voto) && ref(v) !== null);
  if (comparaveis.length < MINIMO_VOTACOES) return null;
  return comparaveis.filter((v) => v.voto === ref(v)).length / comparaveis.length;
}

/** Definições documentadas em PLANO.md e na página /metodologia. */
export function calcularMetricas(p: Parlamentar, votos: VotoParlamentar[]): Metricas {
  const registrados = votos.filter((v) => v.voto !== "ausente").length;
  return {
    fidelidadePartidaria: concordancia(votos, (v) => v.orientacaoPartido),
    alinhamentoGoverno: concordancia(votos, (v) => v.orientacaoGoverno),
    participacao: votos.length >= MINIMO_VOTACOES ? registrados / votos.length : null,
    votacoesConsideradas: votos.length,
    proposicoesApresentadas: p.proposicoes.filter((x) => x.principal).length,
    gastoCotaTotal: p.gastos.total,
    emendasPagasTotal: Math.round(p.emendas.reduce((s, e) => s + e.pago, 0) * 100) / 100,
  };
}
