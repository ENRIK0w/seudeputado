// Encontra citações de projetos e leis em textos de votação
// ("PL 2338/2023", "Projeto de Lei nº 2.338, de 2023", "Lei nº 8.213, de 1991").

export interface Referencia {
  /** Trecho exato do texto que vira link. */
  trecho: string;
  url: string;
  tipo: "projeto" | "lei";
}

export interface Citacao {
  trecho: string;
  tipo: "projeto" | "lei";
  /** Projetos: sigla da Câmara (PL, PEC, MPV…). Leis: "Lei", "Lei Complementar"… */
  sigla: string;
  numero: number;
  ano: number | null;
}

const LONGO: Record<string, string> = {
  "projeto de lei complementar": "PLP",
  "projeto de lei de conversao": "PLV",
  "projeto de lei": "PL",
  "proposta de emenda a constituicao": "PEC",
  "projeto de decreto legislativo": "PDL",
  "projeto de resolucao": "PRC",
  "medida provisoria": "MPV",
};

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const num = (s: string) => Number(s.replace(/\./g, ""));
const ano4 = (s: string | undefined) => {
  if (!s) return null;
  const n = Number(s);
  return s.length === 2 ? (n > 40 ? 1900 + n : 2000 + n) : n;
};

const RE_CURTO = /\b(PLP|PLV|PLN|PEC|PDL|PDC|PRC|MPV|MP|PL)\s*(?:n[º°o]\.?\s*)?(\d{1,2}\.\d{3}|\d{1,5})\s*\/\s*(\d{4})\b/g;
const RE_LONGO =
  /\b(Projeto de Lei Complementar|Projeto de Lei de Convers[ãa]o|Projeto de Lei|Proposta de Emenda [àa] Constitui[çc][ãa]o|Projeto de Decreto Legislativo|Projeto de Resolu[çc][ãa]o|Medida Provis[óo]ria)\s+n[º°o]\.?\s*(\d{1,2}\.\d{3}|\d{1,5})(?:\s*\/\s*(\d{4})|,?\s+de\s+(?:\d{1,2}º?\s+de\s+[a-zç]+\s+de\s+)?(\d{4}))?/gi;
const RE_LEI =
  /\b(Lei Complementar|Decreto-Lei|Lei|Decreto|Emenda Constitucional)\s+(?:n[º°o]\.?\s*)?(\d{1,2}\.\d{3}|\d{1,5})(?:\s*\/\s*(\d{2,4})|,?\s+de\s+(?:\d{1,2}º?\s+de\s+[a-zç]+\s+de\s+)?(\d{4}))?/gi;

export function encontrarCitacoes(texto: string): Citacao[] {
  const achadas: (Citacao & { inicio: number; fim: number })[] = [];
  const sobrepoe = (i: number, f: number) => achadas.some((a) => i < a.fim && f > a.inicio);

  for (const m of texto.matchAll(RE_CURTO)) {
    const sigla = m[1].toUpperCase() === "MP" ? "MPV" : m[1].toUpperCase();
    achadas.push({ trecho: m[0], tipo: "projeto", sigla, numero: num(m[2]), ano: ano4(m[3]), inicio: m.index!, fim: m.index! + m[0].length });
  }
  for (const m of texto.matchAll(RE_LONGO)) {
    const i = m.index!;
    const f = i + m[0].length;
    if (sobrepoe(i, f)) continue;
    const chave = Object.keys(LONGO).find((k) => semAcento(m[1]) === k)!;
    achadas.push({ trecho: m[0], tipo: "projeto", sigla: LONGO[chave], numero: num(m[2]), ano: ano4(m[3] ?? m[4]), inicio: i, fim: f });
  }
  for (const m of texto.matchAll(RE_LEI)) {
    const i = m.index!;
    const f = i + m[0].length;
    // "Projeto de Lei nº 1" já foi pego acima; "Lei" solta sem número também não conta
    if (sobrepoe(i, f) || /de\s+$/i.test(texto.slice(Math.max(0, i - 3), i))) continue;
    achadas.push({ trecho: m[0], tipo: "lei", sigla: m[1], numero: num(m[2]), ano: ano4(m[3] ?? m[4]), inicio: i, fim: f });
  }
  return achadas
    .sort((a, b) => a.inicio - b.inicio)
    .map((a) => ({ trecho: a.trecho, tipo: a.tipo, sigla: a.sigla, numero: a.numero, ano: a.ano }));
}

/** Link de busca no LexML (portal oficial de normas) — usado para leis e projetos sem página resolvida. */
export function urlLexml(c: Pick<Citacao, "sigla" | "numero" | "ano">) {
  const termo = `${c.sigla} ${c.numero}${c.ano ? ` ${c.ano}` : ""}`;
  return `https://www.lexml.gov.br/busca/search?keyword=${encodeURIComponent(termo)}`;
}

/** Quebra o texto em pedaços, marcando os que são referência (para virar link). */
export function dividirPorReferencias(texto: string, refs: Referencia[]): (string | Referencia)[] {
  if (!refs.length) return [texto];
  const partes: (string | Referencia)[] = [];
  let resto = texto;
  // maiores primeiro, para "Lei Complementar nº 101" ganhar de "Lei"
  const ordenadas = [...refs].sort((a, b) => b.trecho.length - a.trecho.length);
  while (resto) {
    let melhor: { i: number; r: Referencia } | null = null;
    for (const r of ordenadas) {
      const i = resto.indexOf(r.trecho);
      if (i >= 0 && (!melhor || i < melhor.i)) melhor = { i, r };
    }
    if (!melhor) {
      partes.push(resto);
      break;
    }
    if (melhor.i > 0) partes.push(resto.slice(0, melhor.i));
    partes.push(melhor.r);
    resto = resto.slice(melhor.i + melhor.r.trecho.length);
  }
  return partes;
}
