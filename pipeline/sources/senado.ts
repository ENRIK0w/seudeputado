// Senado Federal — https://legis.senado.leg.br/dadosabertos/docs/
// A API do Senado converte XML em JSON: objetos aninhados em PascalCase e
// listas que viram objeto quando têm um item só (por isso `arr` e `campo`).
import type { Parlamentar, PeriodoPartido, ProposicaoResumo, Votacao, VotoParlamentar, VotoTipo } from "../../src/lib/types";
import { download, emParalelo, getJson, HttpError } from "../lib/http";
import { acrescentar, anosDaLegislatura, arr, campo, dataISO, lerCsv, normalizarNome, numeroBR } from "../lib/util";
import { metricasVazias, type ColetaCasa } from "./comum";
import { agregarGastos, type Despesa } from "./gastos";

const API = "https://legis.senado.leg.br/dadosabertos";
const INICIO_LEGISLATURA = "2023-02-01";
const TIPOS_PROPOSICAO = new Set(["PL", "PLP", "PEC", "PDL", "PRS"]);
/** Referência para "alinhamento com o governo" no Senado (não há orientação publicada). */
const LIDER_GOVERNO = process.env.LIDER_GOVERNO_SENADO ?? "Jaques Wagner";

const slugDe = (cod: number | string) => `senado-${cod}`;

/** Siglas de voto do Senado. `null` = ausência justificada (licença, missão) — fora do cálculo. */
function mapearVotoSenado(sigla: string | undefined): VotoTipo | null {
  const s = normalizarNome(sigla ?? "");
  if (s === "SIM") return "sim";
  if (s === "NAO") return "nao";
  if (s.startsWith("ABST")) return "abstencao";
  if (s === "P OD" || s.startsWith("OBSTR")) return "obstrucao";
  if (s.startsWith("PRESIDENTE")) return "art17";
  if (s === "NCOM" || s === "P NRV" || s === "") return "ausente";
  return null; // LS, LP, LAP, MIS, AP, REP...
}

interface Ident {
  CodigoParlamentar: string;
  NomeParlamentar: string;
  NomeCompletoParlamentar: string;
  SexoParlamentar: string;
  UrlFotoParlamentar: string;
  UrlPaginaParlamentar: string;
  EmailParlamentar?: string;
  SiglaPartidoParlamentar: string;
  UfParlamentar: string;
}

interface VotoBruto {
  codigoSessao: string;
  data: string;
  descricao: string;
  materia: string | null;
  ementa: string | null;
  resultado: string | null;
  codParlamentar: string;
  sigla: string;
}

/** Endpoint novo: todas as votações do ano com os votos de cada senador. */
async function votacoesDoAno(ano: number): Promise<VotoBruto[]> {
  const dados = await getJson<unknown>(`${API}/votacao?ano=${ano}`);
  const lista = Array.isArray(dados) ? dados : arr(campo(campo(dados, "ListaVotacoes"), "Votacoes"));
  const out: VotoBruto[] = [];
  for (const v of lista) {
    if (normalizarNome(String(campo(v, "votacaoSecreta", "VotacaoSecreta") ?? "")) === "S") continue;
    const base = {
      codigoSessao: String(campo(v, "codigoSessaoVotacao", "CodigoSessaoVotacao")),
      data: dataISO(String(campo(v, "dataSessao", "DataSessao")))!,
      descricao: String(campo(v, "descricaoVotacao", "DescricaoVotacao") ?? ""),
      materia: (campo<string>(v, "identificacao", "sigla") as string) ?? null,
      ementa: (campo<string>(v, "ementa", "Ementa") as string) ?? null,
      resultado: (campo<string>(v, "resultadoVotacao", "DescricaoResultado") as string) ?? null,
    };
    for (const voto of arr(campo<unknown[]>(v, "votos", "Votos"))) {
      out.push({
        ...base,
        codParlamentar: String(campo(voto, "codigoParlamentar", "CodigoParlamentar")),
        sigla: String(campo(voto, "siglaVotoParlamentar", "SiglaVoto") ?? ""),
      });
    }
  }
  return out;
}

/** Endpoint antigo, por senador — usado se o novo falhar. */
async function votacoesDoSenador(cod: string, ano: number): Promise<VotoBruto[]> {
  const json = await getJson<unknown>(`${API}/senador/${cod}/votacoes.json?ano=${ano}`);
  const lista = arr(campo(campo(campo(campo(json, "VotacaoParlamentar"), "Parlamentar"), "Votacoes"), "Votacao"));
  return lista
    .filter((v) => campo(v, "IndicadorVotacaoSecreta") !== "Sim")
    .map((v) => {
      const materia = campo(v, "Materia");
      return {
        codigoSessao: String(campo(v, "CodigoSessaoVotacao")),
        data: dataISO(String(campo(campo(v, "SessaoPlenaria"), "DataSessao")))!,
        descricao: String(campo(v, "DescricaoVotacao") ?? ""),
        materia: (campo<string>(materia, "DescricaoIdentificacao") as string) ?? null,
        ementa: (campo<string>(materia, "Ementa") as string) ?? null,
        resultado: (campo<string>(v, "DescricaoResultado") as string) ?? null,
        codParlamentar: cod,
        sigla: String(campo(v, "SiglaDescricaoVoto") ?? ""),
      };
    });
}

export async function coletarSenado(): Promise<ColetaCasa> {
  console.log("Senado: senadores em exercício");
  const lista = await getJson<unknown>(`${API}/senador/lista/atual.json`);
  const parl = arr(campo(campo(campo(lista, "ListaParlamentarEmExercicio"), "Parlamentares"), "Parlamentar"));
  const idents = parl.map((p) => campo<Ident>(p, "IdentificacaoParlamentar")!);

  console.log(`Senado: detalhes de ${idents.length} senadores`);
  const detalhes = await emParalelo(idents, 4, async (id) => {
    const cod = id.CodigoParlamentar;
    const [det, fil, aut] = await Promise.all([
      getJson<unknown>(`${API}/senador/${cod}.json`, { maxIdadeHoras: 24 * 7 }).catch(() => null),
      getJson<unknown>(`${API}/senador/${cod}/filiacoes.json`).catch(() => null),
      getJson<unknown>(`${API}/senador/${cod}/autorias.json`).catch(() => null),
    ]);
    const basicos = campo(campo(campo(det, "DetalheParlamentar"), "Parlamentar"), "DadosBasicosParlamentar");

    const filiacoes = arr(campo(campo(campo(campo(fil, "FiliacaoParlamentar"), "Parlamentar"), "Filiacoes"), "Filiacao"));
    const historicoPartidos: PeriodoPartido[] = filiacoes
      .map((f) => ({
        partido: String(campo(campo(f, "Partido"), "SiglaPartido")),
        inicio: dataISO(campo<string>(f, "DataFiliacao"))!,
        fim: dataISO(campo<string>(f, "DataDesfiliacao")),
      }))
      .filter((p) => p.inicio)
      .sort((a, b) => a.inicio.localeCompare(b.inicio));

    const autorias = arr(campo(campo(campo(campo(aut, "MateriasAutoriaParlamentar"), "Parlamentar"), "Autorias"), "Autoria"));
    const proposicoes: ProposicaoResumo[] = autorias.flatMap((a) => {
      const m = campo(a, "Materia");
      const sigla = String(campo(m, "Sigla", "SiglaSubtipoMateria") ?? "");
      const data = dataISO(campo<string>(m, "Data", "DataApresentacao"));
      if (!TIPOS_PROPOSICAO.has(sigla) || !data || data < INICIO_LEGISLATURA) return [];
      const codigo = campo(m, "Codigo", "CodigoMateria");
      return [
        {
          id: `senado-${codigo}`,
          sigla: `${sigla} ${Number(campo(m, "Numero", "NumeroMateria"))}/${campo(m, "Ano", "AnoMateria")}`,
          ementa: String(campo(m, "Ementa", "EmentaMateria") ?? ""),
          data,
          situacao: null,
          url: `https://www25.senado.leg.br/web/atividade/materias/-/materia/${codigo}`,
          principal: campo(a, "IndicadorAutorPrincipal") === "Sim",
        },
      ];
    });

    return { id, basicos, historicoPartidos, proposicoes };
  });

  // ---- Votações ----
  console.log("Senado: votações");
  const anos = anosDaLegislatura();
  let brutos: VotoBruto[] = [];
  try {
    for (const ano of anos) acrescentar(brutos, await votacoesDoAno(ano));
    if (brutos.length === 0) throw new Error("vazio");
  } catch (e) {
    console.warn(`  ! endpoint /votacao falhou (${(e as Error).message}); usando /senador/{cod}/votacoes`);
    brutos = [];
    for (const ano of anos) {
      const porSenador = await emParalelo(idents, 4, (id) =>
        votacoesDoSenador(id.CodigoParlamentar, ano).catch((err) => {
          if (!(err instanceof HttpError && err.status === 404)) console.warn(`  ! ${id.NomeParlamentar}: ${err.message}`);
          return [];
        }),
      );
      acrescentar(brutos, porSenador.flat());
    }
  }
  brutos = brutos.filter((b) => b.data >= INICIO_LEGISLATURA);

  const partidoAtual = new Map(idents.map((i) => [slugDe(i.CodigoParlamentar), i.SiglaPartidoParlamentar]));
  const liderSlug = [...idents].find((i) => normalizarNome(i.NomeParlamentar) === normalizarNome(LIDER_GOVERNO));
  const lider = liderSlug ? slugDe(liderSlug.CodigoParlamentar) : null;

  const votacoes: Votacao[] = [];
  const votosPorSlug: Record<string, VotoParlamentar[]> = {};
  const porSessao = Map.groupBy(brutos, (b) => b.codigoSessao);

  for (const [cod, votosBrutos] of [...porSessao].sort((a, b) => a[1][0].data.localeCompare(b[1][0].data))) {
    const b0 = votosBrutos[0];
    const votos: Record<string, VotoTipo> = {};
    for (const b of votosBrutos) {
      const t = mapearVotoSenado(b.sigla);
      if (t) votos[slugDe(b.codParlamentar)] = t;
    }

    // Maioria de cada partido (sim × não) — referência de fidelidade no Senado.
    const contagem = new Map<string, { sim: number; nao: number; outros: number }>();
    for (const [slug, v] of Object.entries(votos)) {
      const p = partidoAtual.get(slug) ?? "?";
      const c = contagem.get(p) ?? { sim: 0, nao: 0, outros: 0 };
      if (v === "sim") c.sim++;
      else if (v === "nao") c.nao++;
      else if (v !== "ausente") c.outros++;
      contagem.set(p, c);
    }

    const votacao: Votacao = {
      id: `senado-${cod}`,
      casa: "senado",
      data: b0.data,
      descricao: b0.descricao,
      proposicao: b0.materia,
      ementa: b0.ementa,
      aprovada: b0.resultado ? /aprovad/i.test(b0.resultado) : null,
      placar: { sim: 0, nao: 0, abstencao: 0, obstrucao: 0, ausente: 0 },
      orientacoes: [],
      porPartido: [...contagem].map(([partido, c]) => ({ partido, ...c })).sort((a, b) => b.sim + b.nao - (a.sim + a.nao)),
      votos,
      url: `https://www25.senado.leg.br/web/atividade/votacoes-nominais`,
    };
    for (const v of Object.values(votos)) if (v in votacao.placar) votacao.placar[v as keyof Votacao["placar"]]++;

    const votoLider = lider ? votos[lider] : undefined;
    for (const [slug, voto] of Object.entries(votos)) {
      const c = contagem.get(partidoAtual.get(slug) ?? "?");
      // Exclui o próprio voto da maioria para não inflar a fidelidade de bancadas pequenas.
      const sim = (c?.sim ?? 0) - (voto === "sim" ? 1 : 0);
      const nao = (c?.nao ?? 0) - (voto === "nao" ? 1 : 0);
      const maioria: VotoTipo | null = sim > nao ? "sim" : nao > sim ? "nao" : null;
      (votosPorSlug[slug] ??= []).push({
        votacaoId: votacao.id,
        data: votacao.data,
        voto,
        orientacaoPartido: maioria,
        orientacaoGoverno: slug === lider || !votoLider || votoLider === "ausente" ? null : votoLider,
      });
    }
    votacoes.push(votacao);
  }

  // ---- Cota parlamentar (CEAPS) ----
  console.log("Senado: cota parlamentar");
  const slugPorNome = new Map(idents.map((i) => [normalizarNome(i.NomeParlamentar), slugDe(i.CodigoParlamentar)]));
  const despesasPorSlug: Record<string, Despesa[]> = {};
  for (const ano of anos) {
    try {
      const file = await download(`https://www.senado.leg.br/transparencia/LAI/verba/despesa_ceaps_${ano}.csv`);
      const { readFileSync } = await import("node:fs");
      for (const r of lerCsv(readFileSync(file), { encoding: "latin1", pularLinhas: 1 })) {
        const slug = slugPorNome.get(normalizarNome(r.SENADOR ?? ""));
        if (!slug) continue;
        (despesasPorSlug[slug] ??= []).push({
          categoria: r.TIPO_DESPESA,
          fornecedor: r.FORNECEDOR,
          documento: r.CNPJ_CPF,
          mes: `${r.ANO}-${String(r.MES).padStart(2, "0")}`,
          valor: numeroBR(r.VALOR_REEMBOLSADO),
        });
      }
    } catch (e) {
      console.warn(`  ! CEAPS ${ano}: ${(e as Error).message}`);
    }
  }

  const parlamentares: Parlamentar[] = detalhes.map(({ id, basicos, historicoPartidos, proposicoes }) => {
    const slug = slugDe(id.CodigoParlamentar);
    const naturalidade = campo<string>(basicos, "Naturalidade");
    return {
      slug,
      casa: "senado",
      idOrigem: Number(id.CodigoParlamentar),
      nome: id.NomeParlamentar,
      partido: id.SiglaPartidoParlamentar,
      uf: id.UfParlamentar,
      foto: id.UrlFotoParlamentar,
      emExercicio: true,
      metricas: metricasVazias(),
      nomeCivil: id.NomeCompletoParlamentar,
      sexo: id.SexoParlamentar === "Feminino" ? "F" : id.SexoParlamentar === "Masculino" ? "M" : null,
      nascimento: dataISO(campo<string>(basicos, "DataNascimento")),
      naturalidade: naturalidade ? `${naturalidade}/${campo<string>(basicos, "UfNaturalidade") ?? ""}` : null,
      escolaridade: null,
      email: id.EmailParlamentar ?? null,
      urlOficial: id.UrlPaginaParlamentar,
      redesSociais: [],
      historicoPartidos,
      votosRecentes: [],
      proposicoes: proposicoes.sort((a, b) => b.data.localeCompare(a.data)),
      gastos: agregarGastos(despesasPorSlug[slug] ?? []),
      emendas: [],
      eleicao: null,
    };
  });

  return { parlamentares, votacoes, votosPorSlug, cpfPorSlug: {} };
}
