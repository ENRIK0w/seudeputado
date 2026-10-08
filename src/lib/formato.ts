import type { VotoTipo } from "./types";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const inteiro = new Intl.NumberFormat("pt-BR");

export const reais = (n: number) => brl.format(n);
/** Com centavos: "R$ 23.456,78" */
export const reaisExato = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
/**
 * "R$ 725,2 mil", "R$ 5 mi". Feito à mão: o Intl com notation "compact" dá resultados
 * diferentes no Node e no navegador ("5,0 mi" × "5 mi"), o que quebra a hidratação.
 */
export function reaisCompacto(n: number) {
  const unidades: [number, string][] = [[1e3, " mil"], [1e6, " mi"], [1e9, " bi"]];
  if (Math.abs(n) < 1e3) return brl.format(n);
  let i = Math.min(Math.floor(Math.log10(Math.abs(n)) / 3) - 1, 2);
  let v = Math.round((Math.abs(n) / unidades[i][0]) * 10) / 10;
  // 999.960 arredonda para "1.000 mil": sobe para "1 mi"
  if (v >= 1000 && i < 2) v = Math.round((Math.abs(n) / unidades[++i][0]) * 10) / 10;
  return `${n < 0 ? "-" : ""}R$ ${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}${unidades[i][1]}`;
}
export const numero = (n: number) => inteiro.format(n);

export function pct(n: number | null | undefined, casas = 1) {
  if (n == null) return "—";
  return `${(n * 100).toFixed(casas).replace(".", ",")}%`;
}

export function data(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" }) {
  if (!iso) return "—";
  return new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR", opts).replace(/ de /g, " ").replace(".", "");
}

export function duracao(inicio: string, fim: string | null) {
  const a = new Date(inicio);
  const b = fim ? new Date(fim) : new Date();
  const meses = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  const anos = Math.floor(meses / 12);
  const resto = meses % 12;
  if (anos === 0) return `${Math.max(resto, 1)} ${resto === 1 ? "mês" : "meses"}`;
  if (resto === 0) return `${anos} ${anos === 1 ? "ano" : "anos"}`;
  return `${anos} ${anos === 1 ? "ano" : "anos"} e ${resto} ${resto === 1 ? "mês" : "meses"}`;
}

export function idade(nascimento: string | null) {
  if (!nascimento) return null;
  const n = new Date(nascimento);
  const h = new Date();
  let i = h.getFullYear() - n.getFullYear();
  if (h < new Date(h.getFullYear(), n.getMonth(), n.getDate())) i--;
  return i;
}

/**
 * A descrição oficial da Câmara termina com o placar ("… Sim: 120; não: 261;
 * abstenção: 1; total: 382."), que o site já mostra na barra — removemos.
 */
export function limparDescricao(s: string) {
  return s
    .replace(/\s*\bSim:\s*\d+\s*;?[\s\S]*$/i, "")
    .replace(/[\s.;,]+$/, "")
    .concat(".")
    .replace(/^\.$/, "");
}

/** "PL 1234/2024 · Votação do texto-base…" */
export function tituloVotacao(v: { proposicao: string | null; descricao: string }) {
  const limpa = limparDescricao(v.descricao);
  const desc = limpa.length > 110 ? `${limpa.slice(0, 108)}…` : limpa;
  return v.proposicao ? `${v.proposicao} · ${desc}` : desc;
}

export const ROTULO_VOTO: Record<VotoTipo, string> = {
  sim: "Sim",
  nao: "Não",
  abstencao: "Abstenção",
  obstrucao: "Obstrução",
  art17: "Presidindo",
  ausente: "Ausente",
};

export const COR_VOTO: Record<VotoTipo, string> = {
  sim: "var(--sim)",
  nao: "var(--nao)",
  abstencao: "var(--muted)",
  obstrucao: "var(--obstrucao)",
  art17: "var(--muted)",
  ausente: "var(--ausente)",
};

export const NOME_CASA = { camara: "Câmara", senado: "Senado" } as const;
export const CARGO = { camara: ["Deputado federal", "Deputada federal"], senado: ["Senador", "Senadora"] } as const;
export const cargo = (casa: "camara" | "senado", sexo: "M" | "F" | null) => CARGO[casa][sexo === "F" ? 1 : 0];

/** "PL nº 1.234/2024" e "PL 1234/2024" → "PL 1234/2024": compara projetos citados de formas diferentes. */
export function chaveProposicao(sigla: string | null | undefined): string | null {
  const m = sigla?.toUpperCase().match(/\b([A-Z]{2,5})\s*(?:N[ºO°.]*\s*)?([\d.]+)\s*\/\s*(\d{4})/);
  return m ? `${m[1]} ${Number(m[2].replace(/\./g, ""))}/${m[3]}` : null;
}

/** "Hospedagem ,exceto do parlamentar no distrito federal." → "Hospedagem, exceto do parlamentar no Distrito Federal" */
export const nomeCategoria = (s: string) =>
  s
    .replace(/\.$/, "")
    .replace(/\s+,\s*/g, ", ")
    .replace(/\s+-\s+/g, " – ")
    .replace(/distrito federal/i, "Distrito Federal")
    .replace(/\bsigepa\b/i, "SIGEPA");

export const UFS = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];
