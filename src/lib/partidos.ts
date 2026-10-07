// Cores e posição no espectro dos partidos.
// A classificação Esquerda / Centro / Direita é aproximada e editorial — está
// explicada na página /metodologia. Partidos fora da tabela caem em "centro".

export type Espectro = "esquerda" | "centro" | "direita";

interface InfoPartido {
  cor: string;
  espectro: Espectro;
  nome: string;
}

const PARTIDOS: Record<string, InfoPartido> = {
  PT: { cor: "#e5374b", espectro: "esquerda", nome: "Partido dos Trabalhadores" },
  PSOL: { cor: "#b45ad8", espectro: "esquerda", nome: "Partido Socialismo e Liberdade" },
  PCDOB: { cor: "#c62828", espectro: "esquerda", nome: "Partido Comunista do Brasil" },
  PV: { cor: "#3cb371", espectro: "esquerda", nome: "Partido Verde" },
  REDE: { cor: "#2bb3a3", espectro: "esquerda", nome: "Rede Sustentabilidade" },
  PSB: { cor: "#f2843a", espectro: "esquerda", nome: "Partido Socialista Brasileiro" },
  PDT: { cor: "#e8667a", espectro: "esquerda", nome: "Partido Democrático Trabalhista" },
  MDB: { cor: "#f2c94c", espectro: "centro", nome: "Movimento Democrático Brasileiro" },
  PSD: { cor: "#6cc46a", espectro: "centro", nome: "Partido Social Democrático" },
  PP: { cor: "#8fd8f0", espectro: "centro", nome: "Progressistas" },
  UNIAO: { cor: "#2fb5e9", espectro: "centro", nome: "União Brasil" },
  REPUBLICANOS: { cor: "#4aa3a0", espectro: "centro", nome: "Republicanos" },
  PSDB: { cor: "#6f9be8", espectro: "centro", nome: "Partido da Social Democracia Brasileira" },
  CIDADANIA: { cor: "#ef8fb3", espectro: "centro", nome: "Cidadania" },
  PODE: { cor: "#23c4b0", espectro: "centro", nome: "Podemos" },
  AVANTE: { cor: "#f0a04b", espectro: "centro", nome: "Avante" },
  SOLIDARIEDADE: { cor: "#ff9f43", espectro: "centro", nome: "Solidariedade" },
  PRD: { cor: "#9aa7d6", espectro: "centro", nome: "Partido Renovação Democrática" },
  AGIR: { cor: "#c9b37e", espectro: "centro", nome: "Agir" },
  MOBILIZA: { cor: "#b5c27a", espectro: "centro", nome: "Mobiliza" },
  PL: { cor: "#4565e8", espectro: "direita", nome: "Partido Liberal" },
  NOVO: { cor: "#ff7a1a", espectro: "direita", nome: "Partido Novo" },
};

const chave = (sigla: string) =>
  sigla
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");

export function infoPartido(sigla: string): InfoPartido {
  return PARTIDOS[chave(sigla)] ?? { cor: "#8a8a93", espectro: "centro", nome: sigla };
}

export const corPartido = (sigla: string) => infoPartido(sigla).cor;
export const espectroDe = (sigla: string) => infoPartido(sigla).espectro;

export const CORES_ESPECTRO: Record<Espectro, string> = {
  esquerda: "#e5374b",
  centro: "#c8b99a",
  direita: "#4565e8",
};

/** Ordem no hemiciclo: esquerda → direita. */
export function ordemEspectro(sigla: string): number {
  return { esquerda: 0, centro: 1, direita: 2 }[espectroDe(sigla)];
}
