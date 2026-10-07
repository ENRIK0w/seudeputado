// Gera um conjunto de dados FICTÍCIO, com o mesmo formato do pipeline real, para
// desenvolver o site sem acesso às APIs. Nomes, votos e valores são inventados.
// Uso: npm run dados:exemplo
import type {
  Casa,
  EleicaoMapa,
  EmendaResumo,
  MunicipioDados,
  Parlamentar,
  ProposicaoResumo,
  Votacao,
  VotoParlamentar,
  VotoTipo,
} from "../src/lib/types";
import { espectroDe } from "../src/lib/partidos";
import { calcularMetricas } from "./metricas";
import { gravarDataset } from "./output";
import { agregarGastos, type Despesa } from "./sources/gastos";

// PRNG determinístico (mulberry32) — o exemplo é sempre igual.
let seed = 20261007;
function rnd() {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)];
const int = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));

const CADEIRAS_UF: Record<string, number> = {
  SP: 70, MG: 53, RJ: 46, BA: 39, RS: 31, PR: 30, PE: 25, CE: 22, MA: 18, GO: 17, PA: 17, SC: 16, PB: 12, ES: 10,
  PI: 10, AL: 9, RN: 8, AM: 8, MT: 8, MS: 8, DF: 8, SE: 8, RO: 8, TO: 8, AC: 8, AP: 8, RR: 8,
};
const PARTIDOS_CAMARA: Record<string, number> = {
  PL: 90, PT: 68, UNIÃO: 59, PP: 50, PSD: 45, REPUBLICANOS: 44, MDB: 44, PDT: 17, PSB: 15, PODE: 15, PSDB: 13,
  PSOL: 13, AVANTE: 7, PCdoB: 7, SOLIDARIEDADE: 5, PV: 5, NOVO: 5, PRD: 5, CIDADANIA: 4, REDE: 2,
};
const PARTIDOS_SENADO: Record<string, number> = {
  PL: 14, PSD: 13, MDB: 11, PT: 9, UNIÃO: 8, PP: 7, REPUBLICANOS: 4, PODE: 4, PSB: 4, PSDB: 3, PDT: 3, NOVO: 1,
};
const CAPITAIS: Record<string, [string, string]> = {
  AC: ["1200401", "Rio Branco"], AL: ["2704302", "Maceió"], AP: ["1600303", "Macapá"], AM: ["1302603", "Manaus"],
  BA: ["2927408", "Salvador"], CE: ["2304400", "Fortaleza"], DF: ["5300108", "Brasília"], ES: ["3205309", "Vitória"],
  GO: ["5208707", "Goiânia"], MA: ["2111300", "São Luís"], MT: ["5103403", "Cuiabá"], MS: ["5002704", "Campo Grande"],
  MG: ["3106200", "Belo Horizonte"], PA: ["1501402", "Belém"], PB: ["2507507", "João Pessoa"], PR: ["4106902", "Curitiba"],
  PE: ["2611606", "Recife"], PI: ["2211001", "Teresina"], RJ: ["3304557", "Rio de Janeiro"], RN: ["2408102", "Natal"],
  RS: ["4314902", "Porto Alegre"], RO: ["1100205", "Porto Velho"], RR: ["1400100", "Boa Vista"], SC: ["4205407", "Florianópolis"],
  SP: ["3550308", "São Paulo"], SE: ["2800308", "Aracaju"], TO: ["1721000", "Palmas"],
};
const NOMES = ["Ana", "Bruno", "Carla", "Daniel", "Eduarda", "Fábio", "Gabriela", "Hugo", "Isabela", "João", "Karina", "Lucas", "Mariana", "Nelson", "Olívia", "Paulo", "Renata", "Sérgio", "Tatiana", "Vítor", "Helena", "Rafael", "Beatriz", "Marcos", "Luíza", "Otávio", "Cecília", "André", "Sílvia", "Rodrigo"];
const SOBRENOMES = ["Exemplo", "Fictício", "Modelo", "Amostra", "Teste", "Protótipo", "Simulado", "Ilustrativo", "Demonstração", "Rascunho", "Esboço", "Maquete"];
const TEMAS = ["educação básica", "saúde pública", "segurança pública", "reforma tributária", "meio ambiente", "agronegócio", "transporte urbano", "previdência", "energia renovável", "inteligência artificial", "proteção de dados", "habitação popular", "saneamento", "cultura", "esporte", "direitos do consumidor"];
const CATEGORIAS = ["DIVULGAÇÃO DA ATIVIDADE PARLAMENTAR.", "PASSAGEM AÉREA - SIGEPA", "COMBUSTÍVEIS E LUBRIFICANTES.", "MANUTENÇÃO DE ESCRITÓRIO DE APOIO À ATIVIDADE PARLAMENTAR", "LOCAÇÃO OU FRETAMENTO DE VEÍCULOS AUTOMOTORES", "TELEFONIA", "CONSULTORIAS, PESQUISAS E TRABALHOS TÉCNICOS.", "HOSPEDAGEM ,EXCETO DO PARLAMENTAR NO DISTRITO FEDERAL."];
const FUNCOES = ["Saúde", "Educação", "Urbanismo", "Agricultura", "Assistência social", "Segurança pública", "Desporto e lazer"];

/** Cada UF ganha uma malha fictícia de hexágonos; a primeira célula é a capital (código IBGE real). */
function malhaFicticia(uf: string, n: number) {
  const features = [];
  const municipios: { ibge: string; nome: string }[] = [];
  const cols = Math.ceil(Math.sqrt(n * 1.4));
  for (let i = 0; i < n; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = col * 1.5 * 0.6;
    const cy = -(row * Math.sqrt(3) * 0.6 + (col % 2 ? (Math.sqrt(3) / 2) * 0.6 : 0));
    const ring = Array.from({ length: 7 }, (_, k) => {
      const a = (Math.PI / 3) * (k % 6);
      return [cx + 0.58 * Math.cos(a), cy + 0.58 * Math.sin(a)];
    });
    const ibge = i === 0 ? CAPITAIS[uf][0] : `${CAPITAIS[uf][0].slice(0, 2)}9${String(i).padStart(4, "0")}`;
    const nome = i === 0 ? CAPITAIS[uf][1] : `Município Exemplo ${i}`;
    municipios.push({ ibge, nome });
    features.push({ type: "Feature", properties: { codarea: ibge, nome }, geometry: { type: "Polygon", coordinates: [ring] } });
  }
  return { geo: { type: "FeatureCollection", features }, municipios };
}

function distribuir(cotas: Record<string, number>): string[] {
  const out = Object.entries(cotas).flatMap(([k, n]) => Array<string>(n).fill(k));
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function dataAleatoria(inicio = "2023-02-01", fim = "2026-09-30") {
  const a = new Date(inicio).getTime();
  const b = new Date(fim).getTime();
  return new Date(a + rnd() * (b - a)).toISOString().slice(0, 10);
}

function main() {
  const malhas: Record<string, unknown> = {};
  const municipiosUf: Record<string, { ibge: string; nome: string }[]> = {};
  for (const uf of Object.keys(CAPITAIS)) {
    const m = malhaFicticia(uf, int(18, 60));
    malhas[uf] = m.geo;
    municipiosUf[uf] = m.municipios;
  }

  const parlamentares: Parlamentar[] = [];
  const eleicaoMapas: Record<string, EleicaoMapa> = {};
  const usados = new Set<string>();

  function criar(casa: Casa, uf: string, partido: string, i: number): Parlamentar {
    let nome: string;
    // 30 nomes × 12 sobrenomes × 26 iniciais — sobra combinação para os 594 parlamentares.
    do nome = `${pick(NOMES)} ${String.fromCharCode(65 + int(0, 25))}. ${pick(SOBRENOMES)}`;
    while (usados.has(nome));
    usados.add(nome);
    const slug = `${casa}-${casa === "camara" ? 900000 + i : 9000 + i}`;
    const fem = /a$|e$|Isabela|Beatriz|Cecília|Helena/.test(nome.split(" ")[0]) && !/André|Otávio/.test(nome);

    const trocou = rnd() < 0.3;
    const anterior = pick(Object.keys(PARTIDOS_CAMARA).filter((p) => p !== partido));
    const historicoPartidos = trocou
      ? [
          { partido: anterior, inicio: `${int(2005, 2016)}-0${int(1, 9)}-15`, fim: "2022-03-30" },
          { partido, inicio: "2022-03-30", fim: null },
        ]
      : [{ partido, inicio: `${int(2003, 2021)}-0${int(1, 9)}-10`, fim: null }];

    const proposicoes: ProposicaoResumo[] = Array.from({ length: int(0, casa === "camara" ? 40 : 25) }, (_, k) => {
      const data = dataAleatoria();
      const tipo = pick(["PL", "PL", "PL", "PLP", "PEC", "PDL"]);
      return {
        id: `${slug}-p${k}`,
        sigla: `${tipo} ${int(100, 5000)}/${data.slice(0, 4)}`,
        ementa: `Dispõe sobre ${pick(TEMAS)} e dá outras providências. (texto de exemplo)`,
        data,
        situacao: pick(["Aguardando parecer", "Em tramitação na comissão", "Pronta para pauta", "Arquivada", "Aprovada na Câmara"]),
        url: "#",
        principal: rnd() < 0.7,
      };
    });

    const despesas: Despesa[] = [];
    for (let m = 0; m < 44; m++) {
      const mes = new Date(Date.UTC(2023, 1 + m, 1)).toISOString().slice(0, 7);
      for (let k = 0; k < int(2, 8); k++) {
        const fornecedor = `Fornecedor Exemplo ${int(1, 40)} Ltda`;
        despesas.push({ categoria: pick(CATEGORIAS), fornecedor, documento: fornecedor, mes, valor: int(200, 9000) });
      }
    }

    const municipios = municipiosUf[uf];
    const emendas: EmendaResumo[] = Array.from({ length: int(4, 30) }, (_, k) => {
      const mun = pick(municipios);
      const empenhado = int(100, 3000) * 1000;
      return {
        ano: int(2023, 2026),
        numero: `${int(1000, 9999)}${String(k).padStart(4, "0")}`,
        tipo: "Emenda Individual - Transferências Especiais",
        municipio: mun.nome,
        uf,
        ibge: mun.ibge,
        funcao: pick(FUNCOES),
        empenhado,
        pago: Math.round(empenhado * rnd()),
      };
    });

    // Eleição: votos concentrados num "reduto" e espalhados pelo resto.
    const reduto = int(0, municipios.length - 1);
    const mapa: EleicaoMapa = { uf, ano: casa === "senado" && rnd() < 0.5 ? 2018 : 2022, municipios: {} };
    let total = 0;
    municipios.forEach((m, k) => {
      const dist = Math.abs(k - reduto);
      const pct = Math.max(0.002, (casa === "senado" ? 0.35 : 0.12) * Math.exp(-dist / 6) * (0.6 + rnd() * 0.8));
      const votos = Math.round(pct * int(8000, k === 0 ? 900000 : 60000));
      mapa.municipios[m.ibge] = { votos, pct: Math.round(pct * 10000) / 10000 };
      total += votos;
    });
    eleicaoMapas[slug] = mapa;

    return {
      slug,
      casa,
      idOrigem: Number(slug.split("-")[1]),
      nome,
      partido,
      uf,
      foto: "",
      emExercicio: true,
      metricas: {} as Parlamentar["metricas"],
      nomeCivil: `${nome} da Silva`,
      sexo: fem ? "F" : "M",
      nascimento: `${int(1955, 1992)}-0${int(1, 9)}-${int(10, 28)}`,
      naturalidade: `${CAPITAIS[uf][1]}/${uf}`,
      escolaridade: pick(["Superior", "Superior", "Pós-graduação", "Ensino Médio"]),
      email: null,
      urlOficial: "#",
      redesSociais: [],
      historicoPartidos,
      votosRecentes: [],
      proposicoes: proposicoes.sort((a, b) => b.data.localeCompare(a.data)),
      gastos: agregarGastos(despesas),
      emendas: emendas.sort((a, b) => b.pago - a.pago),
      eleicao: {
        ano: mapa.ano,
        cargo: casa === "senado" ? "Senador" : "Deputado Federal",
        votosTotais: total,
        situacao: casa === "senado" ? "ELEITO" : pick(["ELEITO POR QP", "ELEITO POR MÉDIA", "SUPLENTE"]),
        topMunicipios: Object.entries(mapa.municipios)
          .sort((a, b) => b[1].votos - a[1].votos)
          .slice(0, 10)
          .map(([ibge, v]) => ({ ibge, nome: municipios.find((m) => m.ibge === ibge)!.nome, ...v })),
        patrimonio: int(50, 20000) * 1000,
        receitaCampanha: int(100, 4000) * 1000,
      },
    };
  }

  const ufsCamara = distribuir(CADEIRAS_UF);
  distribuir(PARTIDOS_CAMARA).forEach((partido, i) => parlamentares.push(criar("camara", ufsCamara[i], partido, i)));
  const ufsSenado = Object.keys(CADEIRAS_UF).flatMap((uf) => [uf, uf, uf]);
  distribuir(PARTIDOS_SENADO).forEach((partido, i) => parlamentares.push(criar("senado", ufsSenado[i], partido, i)));
  // Alguns deputados saíram (licença/suplência) para a lista ter "fora do exercício".
  for (let i = 0; i < 12; i++) parlamentares[int(0, 512)].emExercicio = false;

  // ---- Votações ----
  const votacoes: Votacao[] = [];
  const votosPorSlug: Record<string, VotoParlamentar[]> = {};
  for (const casa of ["camara", "senado"] as const) {
    const membros = parlamentares.filter((p) => p.casa === casa);
    const partidos = [...new Set(membros.map((p) => p.partido))];
    const partidoDe = new Map(membros.map((p) => [p.slug, p.partido]));
    for (let k = 0; k < (casa === "camara" ? 160 : 90); k++) {
      const data = dataAleatoria();
      const tema = pick(TEMAS);
      const ano = data.slice(0, 4);
      const tipo = pick(["PL", "PLP", "PEC", "MPV"]);
      // Cada votação tem um "lado": esquerda apoia (consenso), ou divide os blocos.
      const consenso = rnd() < 0.35;
      const esquerdaSim = rnd() < 0.5;
      const orientPartido = new Map<string, VotoTipo | "liberado">();
      for (const p of partidos) {
        const esp = espectroDe(p);
        let o: VotoTipo | "liberado" = consenso ? "sim" : esp === "esquerda" ? (esquerdaSim ? "sim" : "nao") : esp === "direita" ? (esquerdaSim ? "nao" : "sim") : rnd() < 0.6 ? (esquerdaSim ? "nao" : "sim") : "liberado";
        if (rnd() < 0.05) o = "liberado";
        orientPartido.set(p, o);
      }
      const gov = orientPartido.get("PT") ?? "sim";
      const id = `${casa}-ex${k}`;
      const votos: Record<string, VotoTipo> = {};
      for (const m of membros) {
        if (!m.emExercicio && rnd() < 0.8) continue;
        const o = orientPartido.get(m.partido)!;
        let v: VotoTipo;
        const r = rnd();
        if (r < 0.09) v = "ausente";
        else if (r < 0.11) v = "abstencao";
        else if (o === "liberado") v = rnd() < 0.5 ? "sim" : "nao";
        else v = rnd() < 0.9 ? o : o === "sim" ? "nao" : "sim";
        votos[m.slug] = v;
        (votosPorSlug[m.slug] ??= []).push({
          votacaoId: id,
          data,
          voto: v,
          orientacaoPartido: o === "liberado" ? null : o,
          orientacaoGoverno: casa === "camara" ? (gov === "liberado" ? null : gov) : null,
        });
      }
      const placar = { sim: 0, nao: 0, abstencao: 0, obstrucao: 0, ausente: 0 };
      const porPartido = new Map<string, { sim: number; nao: number; outros: number }>();
      for (const [slug, v] of Object.entries(votos)) {
        if (v in placar) placar[v as keyof typeof placar]++;
        const p = partidoDe.get(slug)!;
        const c = porPartido.get(p) ?? { sim: 0, nao: 0, outros: 0 };
        if (v === "sim") c.sim++;
        else if (v === "nao") c.nao++;
        else c.outros++;
        porPartido.set(p, c);
      }
      for (const s of Object.keys(votos)) if (votos[s] === "ausente") delete votos[s];
      votacoes.push({
        id,
        casa,
        data,
        descricao: `Votação ${pick(["do texto-base", "em primeiro turno", "da emenda aglutinativa", "do requerimento de urgência", "em segundo turno"])} do projeto sobre ${tema} (exemplo)`,
        proposicao: `${tipo} ${int(100, 4999)}/${ano}`,
        ementa: `Altera regras sobre ${tema}. (texto de exemplo)`,
        aprovada: placar.sim > placar.nao,
        placar,
        orientacoes: casa === "camara" ? [...orientPartido].map(([bancada, orientacao]) => ({ bancada, orientacao })).concat([{ bancada: "Governo", orientacao: gov }]) : [],
        porPartido: [...porPartido].map(([partido, c]) => ({ partido, ...c })).sort((a, b) => b.sim + b.nao + b.outros - (a.sim + a.nao + a.outros)),
        votos,
        url: "#",
      });
    }
  }

  for (const p of parlamentares) p.metricas = calcularMetricas(p, votosPorSlug[p.slug] ?? []);

  // ---- Municípios ----
  const municipios: Record<string, MunicipioDados> = {};
  for (const [uf, lista] of Object.entries(municipiosUf)) {
    for (const m of lista) {
      const daUf = parlamentares.filter((p) => p.uf === uf);
      const maisVotados = daUf
        .map((p) => ({ slug: p.slug, nome: p.nome, partido: p.partido, casa: p.casa, ...eleicaoMapas[p.slug].municipios[m.ibge] }))
        .sort((a, b) => b.votos - a.votos)
        .slice(0, 15);
      const emendas = daUf
        .map((p) => {
          const es = p.emendas.filter((e) => e.ibge === m.ibge);
          return { slug: p.slug, nome: p.nome, partido: p.partido, casa: p.casa, empenhado: es.reduce((s, e) => s + e.empenhado, 0), pago: es.reduce((s, e) => s + e.pago, 0), quantidade: es.length };
        })
        .filter((e) => e.quantidade > 0)
        .sort((a, b) => b.pago - a.pago);
      municipios[m.ibge] = { ibge: m.ibge, nome: m.nome, uf, maisVotados, emendas, totalEmendasPago: emendas.reduce((s, e) => s + e.pago, 0) };
    }
  }

  return gravarDataset({
    parlamentares,
    votacoes,
    votosPorSlug,
    eleicaoMapas,
    malhas,
    municipios,
    meta: { geradoEm: new Date().toISOString(), exemplo: true, fontes: [] },
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
