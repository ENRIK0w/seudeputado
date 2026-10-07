import type { Referencia } from "./referencias";

// Modelo de dados gerado pelo pipeline (pipeline/) e lido pelo site.
// Tudo é serializado em JSON — datas são strings ISO (AAAA-MM-DD ou com hora).

export type Casa = "camara" | "senado";

export type VotoTipo =
  | "sim"
  | "nao"
  | "abstencao"
  | "obstrucao"
  | "art17" // presidente da sessão (não vota)
  | "ausente";

/** Item da lista resumida (data/parlamentares.json). */
export interface ParlamentarResumo {
  /** Identificador estável no site: "camara-204554", "senado-5012". */
  slug: string;
  casa: Casa;
  idOrigem: number;
  nome: string;
  partido: string;
  uf: string;
  foto: string;
  emExercicio: boolean;
  metricas: Metricas;
}

export interface Metricas {
  /** 0–1 ou null quando não há votações suficientes. */
  fidelidadePartidaria: number | null;
  alinhamentoGoverno: number | null;
  participacao: number | null;
  votacoesConsideradas: number;
  proposicoesApresentadas: number;
  gastoCotaTotal: number;
  emendasPagasTotal: number;
}

export interface PeriodoPartido {
  partido: string;
  inicio: string;
  /** null = atual. */
  fim: string | null;
}

export interface VotoParlamentar {
  votacaoId: string;
  data: string;
  voto: VotoTipo;
  /** Orientação do partido do parlamentar naquela votação, se houver. */
  orientacaoPartido: VotoTipo | null;
  orientacaoGoverno: VotoTipo | null;
}

export interface GastoCategoria {
  categoria: string;
  total: number;
}

export interface GastoFornecedor {
  fornecedor: string;
  documento: string;
  total: number;
}

export interface GastoMensal {
  /** "2024-03" */
  mes: string;
  total: number;
}

export interface Gastos {
  total: number;
  porCategoria: GastoCategoria[];
  topFornecedores: GastoFornecedor[];
  porMes: GastoMensal[];
}

export interface ProposicaoResumo {
  id: string;
  sigla: string; // "PL 1234/2024"
  ementa: string;
  data: string;
  situacao: string | null;
  url: string;
  /** true quando é o primeiro autor (proponente). */
  principal: boolean;
}

export interface EmendaResumo {
  ano: number;
  numero: string;
  tipo: string;
  municipio: string | null;
  uf: string | null;
  ibge: string | null;
  funcao: string;
  empenhado: number;
  pago: number;
}

/** Perfil completo (data/parlamentares/{slug}.json). */
export interface Parlamentar extends ParlamentarResumo {
  nomeCivil: string;
  sexo: "M" | "F" | null;
  nascimento: string | null;
  naturalidade: string | null;
  escolaridade: string | null;
  email: string | null;
  urlOficial: string;
  redesSociais: string[];
  historicoPartidos: PeriodoPartido[];
  /** Últimos votos (o histórico completo fica em public/data/votos/{slug}.json). */
  votosRecentes: VotoParlamentar[];
  proposicoes: ProposicaoResumo[];
  gastos: Gastos;
  emendas: EmendaResumo[];
  eleicao: EleicaoResumo | null;
}

export interface EleicaoResumo {
  ano: number;
  cargo: string;
  votosTotais: number;
  situacao: string;
  /** Top municípios por votos — o mapa completo fica em public/data/eleicao/{slug}.json. */
  topMunicipios: { ibge: string; nome: string; votos: number; pct: number }[];
  patrimonio: number | null;
  receitaCampanha: number | null;
}

/** Mapa completo: votos e % dos votos válidos por município (public/data/eleicao/{slug}.json). */
export interface EleicaoMapa {
  uf: string;
  ano: number;
  municipios: Record<string, { votos: number; pct: number }>;
}

export interface OrientacaoBancada {
  bancada: string;
  orientacao: VotoTipo | "liberado";
}

export interface PlacarPartido {
  partido: string;
  sim: number;
  nao: number;
  outros: number;
}

export interface Votacao {
  id: string;
  casa: Casa;
  data: string;
  descricao: string;
  proposicao: string | null;
  ementa: string | null;
  /** Página oficial da proposição votada, quando conhecida. */
  proposicaoUrl?: string | null;
  /** Projetos e leis citados na descrição/ementa, com link para a fonte. */
  referencias?: Referencia[];
  aprovada: boolean | null;
  placar: { sim: number; nao: number; abstencao: number; obstrucao: number; ausente: number };
  orientacoes: OrientacaoBancada[];
  porPartido: PlacarPartido[];
  /** slug → voto (só quem votou). */
  votos: Record<string, VotoTipo>;
  url: string;
}

export type VotacaoResumo = Omit<Votacao, "orientacoes" | "porPartido" | "votos" | "referencias">;

export interface ComposicaoPartido {
  partido: string;
  cadeiras: number;
}

export interface Composicao {
  casa: Casa;
  total: number;
  partidos: ComposicaoPartido[];
}

export interface Meta {
  geradoEm: string;
  exemplo: boolean;
  fontes: { nome: string; url: string; atualizadoEm: string }[];
}

/** public/data/municipios/{ibge}.json — usado na busca por cidade. */
export interface MunicipioDados {
  ibge: string;
  nome: string;
  uf: string;
  maisVotados: { slug: string; nome: string; partido: string; casa: Casa; votos: number; pct: number }[];
  emendas: { slug: string; nome: string; partido: string; casa: Casa; empenhado: number; pago: number; quantidade: number }[];
  totalEmendasPago: number;
}

/** public/data/busca.json */
export type ItemBusca = Pick<ParlamentarResumo, "slug" | "nome" | "partido" | "uf" | "casa" | "foto" | "emExercicio">;
