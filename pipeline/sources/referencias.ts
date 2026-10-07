// Transforma as citações de projetos e leis nos textos das votações em links
// para a fonte: projetos → página da proposição na Câmara; leis → LexML.
import type { Votacao } from "../../src/lib/types";
import { encontrarCitacoes, urlLexml, type Referencia } from "../../src/lib/referencias";
import { emParalelo, getJson } from "../lib/http";

const API = "https://dadosabertos.camara.leg.br/api/v2";
const urlCamara = (id: number) => `https://www.camara.leg.br/propostas-legislativas/${id}`;

export async function resolverReferencias(votacoes: Votacao[], idPorSigla: Map<string, number>) {
  const chave = (sigla: string, numero: number, ano: number | null) => `${sigla} ${numero}/${ano}`;

  // Projetos citados que não estão no cadastro local: pergunta à API da Câmara (uma vez cada)
  const faltando = new Set<string>();
  for (const v of votacoes) {
    for (const c of encontrarCitacoes(`${v.descricao} ${v.ementa ?? ""} ${v.proposicao ?? ""}`)) {
      if (c.tipo === "projeto" && c.ano && !idPorSigla.has(chave(c.sigla, c.numero, c.ano))) faltando.add(chave(c.sigla, c.numero, c.ano));
    }
  }
  let achadosApi = 0;
  await emParalelo([...faltando], 6, async (k) => {
    const [sigla, resto] = k.split(" ");
    const [numero, ano] = resto.split("/");
    try {
      const r = await getJson<{ dados: { id: number }[] }>(`${API}/proposicoes?siglaTipo=${sigla}&numero=${numero}&ano=${ano}&itens=1`, {
        maxIdadeHoras: 24 * 30,
      });
      if (r.dados[0]) {
        idPorSigla.set(k, r.dados[0].id);
        achadosApi++;
      }
    } catch {
      /* fica com o link de busca do LexML */
    }
  });

  let total = 0;
  let paraCamara = 0;
  for (const v of votacoes) {
    const refs = new Map<string, Referencia>();
    for (const c of encontrarCitacoes(`${v.descricao}\n${v.ementa ?? ""}\n${v.proposicao ?? ""}`)) {
      const id = c.tipo === "projeto" && c.ano ? idPorSigla.get(chave(c.sigla, c.numero, c.ano)) : undefined;
      if (id) paraCamara++;
      refs.set(c.trecho, { trecho: c.trecho, tipo: c.tipo, url: id ? urlCamara(id) : urlLexml(c) });
    }
    v.referencias = [...refs.values()];
    total += refs.size;
    // Link do rótulo da proposição ("PL 1234/2024"), se ainda não veio da coleta
    if (!v.proposicaoUrl && v.proposicao) v.proposicaoUrl = refs.get(v.proposicao)?.url ?? null;
  }
  console.log(`  · referências em votações: ${total} (${paraCamara} para a Câmara; ${achadosApi} resolvidas pela API de ${faltando.size} consultas)`);
}
