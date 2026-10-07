import { UFS } from "./formato";

export type MunicipioIndice = [ibge: string, nome: string, uf: string];

/** "São José d'Oeste-SP" → "sao jose d oeste sp" */
export const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Capitais e cidades com mais de ~300 mil habitantes, da maior para a menor: desempatam a busca. */
const GRANDES = new Map(
  [
    "São Paulo|SP", "Rio de Janeiro|RJ", "Brasília|DF", "Fortaleza|CE", "Salvador|BA", "Belo Horizonte|MG", "Manaus|AM",
    "Curitiba|PR", "Recife|PE", "Goiânia|GO", "Porto Alegre|RS", "Belém|PA", "Guarulhos|SP", "Campinas|SP", "São Luís|MA",
    "Maceió|AL", "Campo Grande|MS", "São Gonçalo|RJ", "Teresina|PI", "João Pessoa|PB", "São Bernardo do Campo|SP",
    "Duque de Caxias|RJ", "Nova Iguaçu|RJ", "Natal|RN", "Santo André|SP", "Osasco|SP", "Sorocaba|SP", "Uberlândia|MG",
    "Ribeirão Preto|SP", "São José dos Campos|SP", "Cuiabá|MT", "Jaboatão dos Guararapes|PE", "Contagem|MG",
    "Joinville|SC", "Feira de Santana|BA", "Aracaju|SE", "Londrina|PR", "Juiz de Fora|MG", "Florianópolis|SC",
    "Aparecida de Goiânia|GO", "Serra|ES", "Campos dos Goytacazes|RJ", "Belford Roxo|RJ", "Niterói|RJ",
    "São José do Rio Preto|SP", "Ananindeua|PA", "Vila Velha|ES", "Caxias do Sul|RS", "Porto Velho|RO", "Mogi das Cruzes|SP",
    "Macapá|AP", "Santos|SP", "Maringá|PR", "Diadema|SP", "Jundiaí|SP", "Piracicaba|SP", "Campina Grande|PB",
    "Montes Claros|MG", "Boa Vista|RR", "Rio Branco|AC", "Vitória|ES", "Palmas|TO", "Betim|MG", "Carapicuíba|SP",
    "Olinda|PE", "Caruaru|PE", "Bauru|SP", "Itaquaquecetuba|SP", "São Vicente|SP", "Franca|SP", "Pelotas|RS",
    "Canoas|RS", "Ponta Grossa|PR", "Blumenau|SC", "Petrolina|PE", "Cascavel|PR", "Vitória da Conquista|BA",
    "Paulista|PE", "Uberaba|MG", "Ribeirão das Neves|MG", "Petrópolis|RJ", "Guarujá|SP", "Taubaté|SP",
  ].map((s, i) => [normalizar(s.replace("|", " ")), i]),
);
export const porte = (c: MunicipioIndice) => GRANDES.get(normalizar(`${c[1]} ${c[2]}`)) ?? Infinity;

/** Apelidos populares → nome oficial. */
const APELIDOS: Record<string, string> = {
  floripa: "florianopolis sc",
  bh: "belo horizonte mg",
  sampa: "sao paulo sp",
  poa: "porto alegre rs",
  sjc: "sao jose dos campos sp",
  rj: "rio de janeiro rj",
};

function levenshtein(a: string, b: string, limite: number) {
  if (Math.abs(a.length - b.length) > limite) return limite + 1;
  let ant = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const atual = [i];
    let menor = i;
    for (let j = 1; j <= b.length; j++) {
      atual[j] = Math.min(ant[j] + 1, atual[j - 1] + 1, ant[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      menor = Math.min(menor, atual[j]);
    }
    if (menor > limite) return limite + 1;
    ant = atual;
  }
  return ant[b.length];
}

/**
 * Busca municípios pelo nome, ignorando acentos, maiúsculas e pontuação.
 * Aceita a UF no fim ("campinas sp", "Campinas/SP"). Ordem: nome exato, começa com,
 * alguma palavra começa com, contém; sem resultado, tolera até 2 erros de digitação.
 */
export function buscarCidades(indice: MunicipioIndice[], consulta: string, limite = 8): MunicipioIndice[] {
  let q = normalizar(consulta);
  q = APELIDOS[q] ?? q;
  let uf: string | null = null;
  const m = q.match(/^(.+) ([a-z]{2})$/);
  if (m && UFS.includes(m[2].toUpperCase())) {
    q = m[1];
    uf = m[2].toUpperCase();
  }
  // Só a sigla do estado ("sp"): mostra as maiores cidades da UF.
  if (!uf && UFS.includes(q.toUpperCase())) {
    return indice
      .filter((c) => c[2] === q.toUpperCase())
      .sort((a, b) => (porte(a) === porte(b) ? a[1].localeCompare(b[1], "pt-BR") : porte(a) < porte(b) ? -1 : 1))
      .slice(0, limite);
  }
  if (q.length < 2) return [];

  const candidatos = uf ? indice.filter((c) => c[2] === uf) : indice;
  const pontuados: { c: MunicipioIndice; p: number }[] = [];
  for (const c of candidatos) {
    const n = normalizar(c[1]);
    const p = n === q ? 0 : n.startsWith(q) ? 1 : n.includes(` ${q}`) ? 2 : n.includes(q) ? 3 : -1;
    if (p >= 0) pontuados.push({ c, p });
  }

  if (pontuados.length === 0 && q.length >= 4) {
    const tolerancia = q.length >= 7 ? 2 : 1;
    for (const c of candidatos) {
      const n = normalizar(c[1]);
      // compara com o nome inteiro e com o começo do nome do mesmo tamanho da busca
      const d = Math.min(levenshtein(q, n, tolerancia), levenshtein(q, n.slice(0, q.length), tolerancia));
      if (d <= tolerancia) pontuados.push({ c, p: 4 + d });
    }
  }

  return pontuados
    .sort(
      (a, b) =>
        a.p - b.p ||
        (porte(a.c) === porte(b.c) ? 0 : porte(a.c) < porte(b.c) ? -1 : 1) ||
        a.c[1].length - b.c[1].length ||
        a.c[1].localeCompare(b.c[1], "pt-BR"),
    )
    .slice(0, limite)
    .map((x) => x.c);
}
