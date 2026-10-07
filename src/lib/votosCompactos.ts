// Formato compacto do histórico de votos (public/data/votos/{slug}.json).
// Cada voto vira "IDVOTACAO VPG": V = voto, P = orientação do partido, G = do governo.
// Ex.: "2345501-28 ssn" — votou Sim, partido orientou Sim, governo orientou Não.
// Reduz o arquivo de ~150 para ~16 bytes por voto (66 MB → ~8 MB no total).
import type { Casa, VotoParlamentar, VotoTipo } from "./types";

const PARA: Record<VotoTipo, string> = { sim: "s", nao: "n", abstencao: "a", obstrucao: "o", art17: "p", ausente: "x" };
const DE: Record<string, VotoTipo> = Object.fromEntries(Object.entries(PARA).map(([k, v]) => [v, k as VotoTipo]));

export interface VotosCompactos {
  casa: Casa;
  /** Do mais recente para o mais antigo. */
  votos: string[];
}

export function compactarVotos(casa: Casa, votos: VotoParlamentar[]): VotosCompactos {
  const prefixo = `${casa}-`;
  return {
    casa,
    votos: votos.map(
      (v) =>
        `${v.votacaoId.startsWith(prefixo) ? v.votacaoId.slice(prefixo.length) : v.votacaoId} ${PARA[v.voto]}${v.orientacaoPartido ? PARA[v.orientacaoPartido] : "-"}${v.orientacaoGoverno ? PARA[v.orientacaoGoverno] : "-"}`,
    ),
  };
}

/** `datas` vem do índice de votações (id → data); sem ele a data fica vazia. */
export function expandirVotos(c: VotosCompactos, datas: (id: string) => string | undefined): VotoParlamentar[] {
  return c.votos.map((linha) => {
    const i = linha.lastIndexOf(" ");
    const id = `${c.casa}-${linha.slice(0, i)}`;
    const [v, p, g] = linha.slice(i + 1);
    return {
      votacaoId: id,
      data: datas(id) ?? "",
      voto: DE[v] ?? "ausente",
      orientacaoPartido: DE[p] ?? null,
      orientacaoGoverno: DE[g] ?? null,
    };
  });
}
