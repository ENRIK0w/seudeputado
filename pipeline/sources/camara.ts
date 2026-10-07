// Câmara dos Deputados — https://dadosabertos.camara.leg.br/swagger/api.html
import type {
  Parlamentar,
  PeriodoPartido,
  ProposicaoResumo,
  Votacao,
  VotoParlamentar,
  VotoTipo,
} from "../../src/lib/types";
import { download, emParalelo, getJson } from "../lib/http";
import { acrescentar, anosDaLegislatura, dataISO, lerCsv, lerZip, mapearVoto, normalizarNome, numeroBR, somenteDigitos } from "../lib/util";
import { agregarGastos, type Despesa } from "./gastos";
import { buscarOrientacao, metricasVazias, type ColetaCasa } from "./comum";

const API = "https://dadosabertos.camara.leg.br/api/v2";
const ARQ = "https://dadosabertos.camara.leg.br/arquivos";
const LEGISLATURA = 57;
const INICIO_LEGISLATURA = "2023-02-01";
const TIPOS_PROPOSICAO = new Set(["PL", "PLP", "PEC", "PDL", "PRC", "PLV"]);

interface Paginado<T> {
  dados: T[];
  links: { rel: string; href: string }[];
}

async function paginar<T>(url: string): Promise<T[]> {
  const out: T[] = [];
  let next: string | undefined = url;
  while (next) {
    const page: Paginado<T> = await getJson<Paginado<T>>(next);
    out.push(...page.dados);
    next = page.links.find((l) => l.rel === "next")?.href;
  }
  return out;
}

interface DepLista {
  id: number;
  nome: string;
  siglaPartido: string;
  siglaUf: string;
  urlFoto: string;
  email: string | null;
}

interface DepDetalhe {
  id: number;
  nomeCivil: string;
  cpf: string;
  sexo: string;
  dataNascimento: string | null;
  municipioNascimento: string | null;
  ufNascimento: string | null;
  escolaridade: string | null;
  redeSocial: string[];
  ultimoStatus: {
    nome: string;
    nomeEleitoral: string;
    siglaPartido: string;
    siglaUf: string;
    urlFoto: string;
    email: string | null;
    situacao: string;
    data: string;
  };
}

interface DepHistorico {
  dataHora: string;
  siglaPartido: string;
  situacao: string | null;
  descricaoStatus: string | null;
  idLegislatura: number;
}

/** Arquivos anuais grandes vêm como {"dados": [...]}. */
const jaMostrado = new Set<string>();

async function arquivoAnual<T>(tipo: string, ano: number): Promise<T[]> {
  try {
    const json = await getJson<{ dados: T[] }>(`${ARQ}/${tipo}/json/${tipo}-${ano}.json`);
    const dados = json.dados ?? [];
    // Mostra a estrutura uma vez por tipo de arquivo — ajuda a ajustar se a Câmara mudar os campos.
    if (!jaMostrado.has(tipo) && dados.length) {
      jaMostrado.add(tipo);
      console.log(`  · ${tipo}-${ano}: ${dados.length} registros; exemplo: ${JSON.stringify(dados[0]).slice(0, 400)}`);
    }
    return dados;
  } catch (e) {
    console.warn(`  ! ${tipo}-${ano} indisponível: ${(e as Error).message}`);
    return [];
  }
}

const slugDe = (id: number | string) => `camara-${id}`;

/** Converte o histórico de status em períodos por partido e em períodos de exercício. */
function processarHistorico(h: DepHistorico[]) {
  const ordenado = [...h].sort((a, b) => a.dataHora.localeCompare(b.dataHora));
  const partidos: PeriodoPartido[] = [];
  const exercicio: { inicio: string; fim: string | null }[] = [];
  for (const item of ordenado) {
    const data = dataISO(item.dataHora)!;
    const ultimo = partidos.at(-1);
    if (item.siglaPartido && ultimo?.partido !== item.siglaPartido) {
      if (ultimo) ultimo.fim = data;
      partidos.push({ partido: item.siglaPartido, inicio: data, fim: null });
    }
    const emExercicio = normalizarNome(item.situacao ?? "") === "EXERCICIO";
    const aberto = exercicio.at(-1);
    if (emExercicio && (!aberto || aberto.fim)) exercicio.push({ inicio: data, fim: null });
    if (!emExercicio && aberto && !aberto.fim) aberto.fim = data;
  }
  return { partidos, exercicio };
}

function noExercicio(periodos: { inicio: string; fim: string | null }[], data: string) {
  if (periodos.length === 0) return true;
  return periodos.some((p) => data >= p.inicio && (!p.fim || data < p.fim));
}

export async function coletarCamara(): Promise<ColetaCasa> {
  console.log("Câmara: deputados da legislatura");
  const todos = await paginar<DepLista>(`${API}/deputados?idLegislatura=${LEGISLATURA}&itens=100&ordem=ASC&ordenarPor=nome`);
  const unicos = [...new Map(todos.map((d) => [d.id, d])).values()];
  const atuais = new Set((await paginar<DepLista>(`${API}/deputados?itens=100`)).map((d) => d.id));

  console.log(`Câmara: detalhes e histórico de ${unicos.length} deputados`);
  const detalhes = await emParalelo(unicos, 6, async (d) => {
    const [det, hist] = await Promise.all([
      getJson<{ dados: DepDetalhe }>(`${API}/deputados/${d.id}`, { maxIdadeHoras: 24 * 7 }),
      getJson<{ dados: DepHistorico[] }>(`${API}/deputados/${d.id}/historico`),
    ]);
    return { lista: d, det: det.dados, hist: processarHistorico(hist.dados) };
  });

  const anos = anosDaLegislatura();

  // ---- Votações nominais de plenário ----
  console.log("Câmara: votações");
  type VotacaoArq = {
    id: string;
    data: string;
    siglaOrgao: string;
    aprovacao: number | null;
    descricao: string;
    proposicaoObjeto?: string | null;
    ultimaApresentacaoProposicao_descricao?: string | null;
  };
  type VotoArq = {
    idVotacao: string;
    voto: string;
    deputado_id?: number;
    deputado_siglaPartido?: string | null;
    deputado_?: { id?: number; siglaPartido?: string | null };
  };
  // O arquivo já veio com os campos do deputado "achatados" (deputado_id) e aninhados (deputado_.id).
  const idDoVoto = (v: VotoArq) => v.deputado_id ?? v.deputado_?.id;
  type OrientArq = { idVotacao: string; siglaBancada: string; orientacao: string };

  const votacoesArq: VotacaoArq[] = [];
  const votosArq: VotoArq[] = [];
  const orientArq: OrientArq[] = [];
  for (const ano of anos) {
    acrescentar(votacoesArq, await arquivoAnual<VotacaoArq>("votacoes", ano));
    acrescentar(votosArq, await arquivoAnual<VotoArq>("votacoesVotos", ano));
    acrescentar(orientArq, await arquivoAnual<OrientArq>("votacoesOrientacoes", ano));
  }

  // Nomes de bancadas mais frequentes — para conferir a correspondência partido → bloco.
  const freqBancadas = new Map<string, number>();
  for (const o of orientArq) freqBancadas.set(o.siglaBancada, (freqBancadas.get(o.siglaBancada) ?? 0) + 1);
  console.log(`  · bancadas: ${[...freqBancadas].sort((a, b) => b[1] - a[1]).slice(0, 50).map(([b, n]) => `${b} (${n})`).join(", ")}`);

  const votosPorVotacao = Map.groupBy(votosArq, (v) => v.idVotacao);
  const orientPorVotacao = Map.groupBy(orientArq, (o) => o.idVotacao);

  const plenario = votacoesArq
    .filter((v) => v.siglaOrgao === "PLEN" && votosPorVotacao.has(v.id) && v.data >= INICIO_LEGISLATURA)
    .sort((a, b) => a.data.localeCompare(b.data));

  const semId = votosArq.filter((v) => idDoVoto(v) == null).length;
  if (votosArq.length && semId / votosArq.length > 0.5) {
    throw new Error(`Formato inesperado em votacoesVotos: ${semId} de ${votosArq.length} votos sem id do deputado. Exemplo: ${JSON.stringify(votosArq[0])}`);
  }
  // Partido atual de cada deputado — usado quando o voto vem sem sigla.
  const partidoAtual = new Map(detalhes.map((d) => [d.lista.id, d.det.ultimoStatus.siglaPartido || d.lista.siglaPartido]));
  const partidoDoVoto = (v: VotoArq) =>
    v.deputado_siglaPartido ?? v.deputado_?.siglaPartido ?? partidoAtual.get(Number(idDoVoto(v))) ?? "S.PART.";

  const votacoes: Votacao[] = [];
  const votosPorSlug: Record<string, VotoParlamentar[]> = {};
  const exercicioPorSlug = new Map(detalhes.map((d) => [slugDe(d.lista.id), d.hist.exercicio]));

  for (const v of plenario) {
    const votos = votosPorVotacao.get(v.id) ?? [];
    const orientacoes = (orientPorVotacao.get(v.id) ?? [])
      .filter((o) => o.siglaBancada)
      .map((o) => ({ bancada: o.siglaBancada, orientacao: mapearVoto(o.orientacao) }))
      .filter((o): o is { bancada: string; orientacao: VotoTipo | "liberado" } => o.orientacao !== null);

    const votacao: Votacao = {
      id: `camara-${v.id}`,
      casa: "camara",
      data: dataISO(v.data)!,
      descricao: v.descricao,
      proposicao: v.proposicaoObjeto ?? null,
      ementa: v.ultimaApresentacaoProposicao_descricao ?? null,
      aprovada: v.aprovacao == null ? null : v.aprovacao === 1,
      placar: { sim: 0, nao: 0, abstencao: 0, obstrucao: 0, ausente: 0 },
      orientacoes,
      porPartido: [],
      votos: {},
      url: `${API}/votacoes/${v.id}`,
    };

    const placarPartido = new Map<string, { sim: number; nao: number; outros: number }>();
    const govOrient = buscarOrientacao(orientacoes, "GOVERNO");

    for (const voto of votos) {
      const idDep = idDoVoto(voto);
      if (idDep == null) continue;
      const tipo = (mapearVoto(voto.voto) ?? "ausente") as VotoTipo;
      const slug = slugDe(idDep);
      const partido = partidoDoVoto(voto);
      votacao.votos[slug] = tipo;
      if (tipo in votacao.placar) votacao.placar[tipo as keyof Votacao["placar"]]++;
      const pp = placarPartido.get(partido) ?? { sim: 0, nao: 0, outros: 0 };
      if (tipo === "sim") pp.sim++;
      else if (tipo === "nao") pp.nao++;
      else pp.outros++;
      placarPartido.set(partido, pp);

      (votosPorSlug[slug] ??= []).push({
        votacaoId: votacao.id,
        data: votacao.data,
        voto: tipo,
        orientacaoPartido: buscarOrientacao(orientacoes, partido),
        orientacaoGoverno: govOrient,
      });
    }

    // Quem estava em exercício e não votou conta como ausente.
    for (const [slug, periodos] of exercicioPorSlug) {
      if (slug in votacao.votos || !noExercicio(periodos, votacao.data)) continue;
      votacao.placar.ausente++;
      (votosPorSlug[slug] ??= []).push({
        votacaoId: votacao.id,
        data: votacao.data,
        voto: "ausente",
        orientacaoPartido: null,
        orientacaoGoverno: govOrient,
      });
    }

    votacao.porPartido = [...placarPartido]
      .map(([partido, p]) => ({ partido, ...p }))
      .sort((a, b) => b.sim + b.nao + b.outros - (a.sim + a.nao + a.outros));
    votacoes.push(votacao);
  }

  // ---- Proposições ----
  console.log("Câmara: proposições");
  type PropArq = {
    id: number;
    siglaTipo: string;
    numero: number;
    ano: number;
    ementa: string;
    dataApresentacao: string;
    ultimoStatus_descricaoSituacao?: string | null;
  };
  type AutorArq = { idProposicao: number; idDeputadoAutor?: number | null; ordemAssinatura?: number; proponente?: number };
  const props = new Map<number, PropArq>();
  const autores: AutorArq[] = [];
  for (const ano of anos) {
    for (const p of await arquivoAnual<PropArq>("proposicoes", ano)) if (TIPOS_PROPOSICAO.has(p.siglaTipo)) props.set(p.id, p);
    acrescentar(autores, await arquivoAnual<AutorArq>("proposicoesAutores", ano));
  }
  const propsPorSlug: Record<string, ProposicaoResumo[]> = {};
  for (const a of autores) {
    const p = props.get(a.idProposicao);
    if (!p || !a.idDeputadoAutor) continue;
    (propsPorSlug[slugDe(a.idDeputadoAutor)] ??= []).push({
      id: `camara-${p.id}`,
      sigla: `${p.siglaTipo} ${p.numero}/${p.ano}`,
      ementa: p.ementa,
      data: dataISO(p.dataApresentacao)!,
      situacao: p.ultimoStatus_descricaoSituacao ?? null,
      url: `https://www.camara.leg.br/propostas-legislativas/${p.id}`,
      principal: a.ordemAssinatura === 1 || a.proponente === 1,
    });
  }

  // ---- Cota parlamentar (CEAP) ----
  console.log("Câmara: cota parlamentar");
  const despesasPorSlug: Record<string, Despesa[]> = {};
  const slugPorCpf = new Map(detalhes.map((d) => [somenteDigitos(d.det.cpf), slugDe(d.lista.id)]));
  for (const ano of anos) {
    try {
      const zip = await download(`https://www.camara.leg.br/cotas/Ano-${ano}.csv.zip`);
      for (const conteudo of Object.values(lerZip(zip, (n) => n.endsWith(".csv")))) {
        for (const r of lerCsv(conteudo)) {
          const slug = r.ideCadastro ? slugDe(r.ideCadastro) : slugPorCpf.get(somenteDigitos(r.cpf));
          if (!slug) continue; // lideranças e despesas sem deputado
          (despesasPorSlug[slug] ??= []).push({
            categoria: r.txtDescricao,
            fornecedor: r.txtFornecedor,
            documento: r.txtCNPJCPF,
            mes: `${r.numAno}-${String(r.numMes).padStart(2, "0")}`,
            valor: numeroBR(r.vlrLiquido),
          });
        }
      }
    } catch (e) {
      console.warn(`  ! CEAP ${ano}: ${(e as Error).message}`);
    }
  }

  // ---- Monta os perfis ----
  const parlamentares: Parlamentar[] = detalhes.map(({ lista, det, hist }) => {
    const slug = slugDe(lista.id);
    const st = det.ultimoStatus;
    return {
      slug,
      casa: "camara",
      idOrigem: lista.id,
      nome: st.nomeEleitoral || st.nome || lista.nome,
      partido: st.siglaPartido || lista.siglaPartido,
      uf: st.siglaUf || lista.siglaUf,
      foto: st.urlFoto || lista.urlFoto,
      emExercicio: atuais.has(lista.id),
      metricas: metricasVazias(),
      nomeCivil: det.nomeCivil,
      sexo: det.sexo === "F" ? "F" : det.sexo === "M" ? "M" : null,
      nascimento: dataISO(det.dataNascimento),
      naturalidade: det.municipioNascimento ? `${det.municipioNascimento}/${det.ufNascimento}` : null,
      escolaridade: det.escolaridade,
      email: st.email ?? lista.email,
      urlOficial: `https://www.camara.leg.br/deputados/${lista.id}`,
      redesSociais: det.redeSocial ?? [],
      historicoPartidos: hist.partidos,
      votosRecentes: [],
      proposicoes: (propsPorSlug[slug] ?? []).sort((a, b) => b.data.localeCompare(a.data)),
      gastos: agregarGastos(despesasPorSlug[slug] ?? []),
      emendas: [],
      eleicao: null,
    };
  });

  const cpfPorSlug = Object.fromEntries([...slugPorCpf].map(([cpf, slug]) => [slug, cpf]));
  return { parlamentares, votacoes, votosPorSlug, cpfPorSlug };
}
