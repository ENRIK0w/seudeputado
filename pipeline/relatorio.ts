// Confere os dados gerados pelo pipeline e escreve um relatório em Markdown.
// Uso: npx tsx pipeline/relatorio.ts [arquivo-de-saida.md]
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Composicao, Meta, Parlamentar, ParlamentarResumo, VotacaoResumo } from "../src/lib/types";

const DATA = path.resolve("data");
const PUB = path.resolve("public", "data");
const ler = <T,>(f: string): T => JSON.parse(readFileSync(f, "utf8")) as T;

type Status = "ok" | "aviso" | "erro";
const checagens: { status: Status; item: string; detalhe: string }[] = [];
const checar = (status: Status, item: string, detalhe: string) => checagens.push({ status, item, detalhe });
const faixa = (v: number, min: number, max: number) => v >= min && v <= max;
const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : "—");

if (!existsSync(path.join(DATA, "parlamentares.json"))) {
  const msg = "# Relatório da coleta\n\n❌ O pipeline não gerou `data/parlamentares.json`. Veja o log da etapa de coleta.\n";
  if (process.argv[2]) writeFileSync(process.argv[2], msg);
  console.log(msg);
  process.exit(1);
}

const meta = ler<Meta>(path.join(DATA, "meta.json"));
const lista = ler<ParlamentarResumo[]>(path.join(DATA, "parlamentares.json"));
const votacoes = ler<VotacaoResumo[]>(path.join(DATA, "votacoes.json"));
const composicao = ler<Composicao[]>(path.join(DATA, "composicao.json"));
const perfis = lista.map((p) => ler<Parlamentar>(path.join(DATA, "parlamentares", `${p.slug}.json`)));

if (meta.exemplo) checar("erro", "Origem", "os dados são de EXEMPLO, não da coleta real");

for (const casa of ["camara", "senado"] as const) {
  const nome = casa === "camara" ? "Câmara" : "Senado";
  const vagas = casa === "camara" ? 513 : 81;
  const todos = perfis.filter((p) => p.casa === casa);
  const ativos = todos.filter((p) => p.emExercicio);
  const vts = votacoes.filter((v) => v.casa === casa);
  const comp = composicao.find((c) => c.casa === casa);

  checar(faixa(ativos.length, vagas - 5, vagas + 5) ? "ok" : "erro", `${nome}: em exercício`, `${ativos.length} (esperado ~${vagas}); ${todos.length} na legislatura`);
  checar(comp && comp.partidos.length >= 8 ? "ok" : "aviso", `${nome}: partidos`, comp?.partidos.map((p) => `${p.partido} ${p.cadeiras}`).join(", ") ?? "—");
  checar(vts.length >= 50 ? "ok" : "erro", `${nome}: votações nominais`, `${vts.length} (de ${vts.at(-1)?.data ?? "—"} a ${vts[0]?.data ?? "—"})`);

  const semPlacar = vts.filter((v) => v.placar.sim + v.placar.nao === 0).length;
  checar(semPlacar === 0 ? "ok" : "aviso", `${nome}: votações sem Sim/Não`, `${semPlacar}`);

  const m = (f: (p: Parlamentar) => unknown) => ativos.filter((p) => f(p) != null).length;
  const part = m((p) => p.metricas.participacao);
  const fid = m((p) => p.metricas.fidelidadePartidaria);
  const gov = m((p) => p.metricas.alinhamentoGoverno);
  checar(part / (ativos.length || 1) > 0.9 ? "ok" : "erro", `${nome}: participação calculada`, `${part}/${ativos.length} (${pct(part, ativos.length)})`);
  checar(fid / (ativos.length || 1) > 0.8 ? "ok" : "aviso", `${nome}: fidelidade calculada`, `${fid}/${ativos.length} (${pct(fid, ativos.length)})`);
  checar(gov / (ativos.length || 1) > 0.8 ? "ok" : "aviso", `${nome}: alinhamento c/ governo`, `${gov}/${ativos.length} (${pct(gov, ativos.length)})`);

  const medias = (f: (p: Parlamentar) => number | null) => {
    const vs = ativos.map(f).filter((x): x is number => x != null);
    return vs.length ? `${Math.round((vs.reduce((a, b) => a + b, 0) / vs.length) * 100)}%` : "—";
  };
  checar("ok", `${nome}: médias`, `participação ${medias((p) => p.metricas.participacao)}, fidelidade ${medias((p) => p.metricas.fidelidadePartidaria)}, governo ${medias((p) => p.metricas.alinhamentoGoverno)}`);

  const comProps = ativos.filter((p) => p.proposicoes.length > 0).length;
  checar(comProps / (ativos.length || 1) > 0.6 ? "ok" : "aviso", `${nome}: com proposições`, `${comProps}/${ativos.length}`);
  const comGastos = ativos.filter((p) => p.gastos.total > 0).length;
  checar(comGastos / (ativos.length || 1) > 0.8 ? "ok" : "aviso", `${nome}: com gastos da cota`, `${comGastos}/${ativos.length}`);
  const comHist = ativos.filter((p) => p.historicoPartidos.length > 0).length;
  checar(comHist / (ativos.length || 1) > 0.9 ? "ok" : "aviso", `${nome}: com histórico de partidos`, `${comHist}/${ativos.length}`);
  const comEmendas = ativos.filter((p) => p.emendas.length > 0).length;
  checar(comEmendas > 0 ? "ok" : "aviso", `${nome}: com emendas`, `${comEmendas}/${ativos.length}`);
  const comEleicao = ativos.filter((p) => p.eleicao).length;
  checar(comEleicao / (ativos.length || 1) > 0.8 ? "ok" : "aviso", `${nome}: cruzados com o TSE`, `${comEleicao}/${ativos.length}`);
}

const munDir = path.join(PUB, "municipios");
const nMun = existsSync(munDir) ? readdirSync(munDir).length : 0;
checar(nMun > 5000 ? "ok" : "aviso", "Municípios gravados", `${nMun}`);

// Amostras para conferir na mão contra os sites oficiais
const amostra = perfis.filter((p) => p.emExercicio).sort((a, b) => a.slug.localeCompare(b.slug)).filter((_, i) => i % 97 === 0);

const icone = { ok: "✅", aviso: "⚠️", erro: "❌" };
const linhas = [
  "# Relatório da coleta",
  "",
  `Gerado em ${meta.geradoEm}. Fontes: ${meta.fontes.map((f) => f.nome).join("; ") || "—"}.`,
  "",
  `**${checagens.filter((c) => c.status === "erro").length} erros, ${checagens.filter((c) => c.status === "aviso").length} avisos.**`,
  "",
  "| | Item | Resultado |",
  "|---|---|---|",
  ...checagens.map((c) => `| ${icone[c.status]} | ${c.item} | ${c.detalhe.replace(/\|/g, "/")} |`),
  "",
  "## Amostra para conferir nos sites oficiais",
  "",
  "| Parlamentar | Partido/UF | Votações | Participação | Fidelidade | Governo | Proposições | Cota | Emendas pagas | Votos na eleição |",
  "|---|---|---|---|---|---|---|---|---|---|",
  ...amostra.map((p) => {
    const m = p.metricas;
    const f = (x: number | null) => (x == null ? "—" : `${Math.round(x * 100)}%`);
    return `| [${p.nome}](${p.urlOficial}) | ${p.partido}-${p.uf} | ${m.votacoesConsideradas} | ${f(m.participacao)} | ${f(m.fidelidadePartidaria)} | ${f(m.alinhamentoGoverno)} | ${p.proposicoes.length} | R$ ${Math.round(m.gastoCotaTotal).toLocaleString("pt-BR")} | R$ ${Math.round(m.emendasPagasTotal).toLocaleString("pt-BR")} | ${p.eleicao?.votosTotais.toLocaleString("pt-BR") ?? "—"} |`;
  }),
  "",
];
const md = linhas.join("\n");
if (process.argv[2]) writeFileSync(process.argv[2], md);
console.log(md);
process.exit(checagens.some((c) => c.status === "erro") ? 1 : 0);
