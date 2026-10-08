// Diagnóstico: testa uma amostra dos links de comprovante da cota da Câmara
// (urlDocumento) e agrupa os que falham por tipo de documento, ano e formato.
// Uso: npx tsx pipeline/diagnostico/comprovantes.ts
import { download } from "../lib/http";
import { lerCsv, lerZip } from "../lib/util";

const ANOS = [2023, 2024, 2025, 2026];
const POR_GRUPO = 12; // links testados por (ano, tipo de documento)

type Linha = Record<string, string>;

async function status(url: string) {
  for (const metodo of ["HEAD", "GET"] as const) {
    try {
      const r = await fetch(url, { method: metodo, redirect: "follow", headers: { "User-Agent": "SeuDeputado/0.1 (diagnostico)" } });
      if (metodo === "HEAD" && (r.status === 405 || r.status === 403)) continue;
      return { codigo: r.status, final: r.url, tipo: r.headers.get("content-type") ?? "" };
    } catch (e) {
      if (metodo === "GET") return { codigo: 0, final: url, tipo: (e as Error).message };
    }
  }
  return { codigo: 0, final: url, tipo: "?" };
}

const formato = (u: string) => u.replace(/\d+/g, "N").replace(/\?.*/, (q) => q.replace(/=[^&]*/g, "=…"));

async function main() {
  const linhas: Linha[] = [];
  for (const ano of ANOS) {
    const zip = await download(`https://www.camara.leg.br/cotas/Ano-${ano}.csv.zip`);
    for (const conteudo of Object.values(lerZip(zip, (n) => n.endsWith(".csv")))) for (const r of lerCsv(conteudo)) linhas.push(r);
  }
  console.log(`${linhas.length} despesas; colunas: ${Object.keys(linhas[0]).join(", ")}`);

  // Quanto de cada tipo tem link, e em que formato
  const semUrl = new Map<string, number>();
  const formatos = new Map<string, number>();
  for (const r of linhas) {
    const k = `tipo ${r.indTipoDocumento}`;
    if (!r.urlDocumento) semUrl.set(k, (semUrl.get(k) ?? 0) + 1);
    else formatos.set(`${k} · ${formato(r.urlDocumento)}`, (formatos.get(`${k} · ${formato(r.urlDocumento)}`) ?? 0) + 1);
  }
  console.log("\nSem link, por tipo:", Object.fromEntries(semUrl));
  console.log("\nFormatos de link (tipo · formato → quantidade):");
  for (const [f, n] of [...formatos].sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log(`  ${n}\t${f}`);

  // Amostra estratificada por ano e tipo de documento, testando cada link
  const grupos = new Map<string, Linha[]>();
  for (const r of linhas) {
    if (!r.urlDocumento) continue;
    const k = `${r.numAno} · tipo ${r.indTipoDocumento}`;
    const g = grupos.get(k) ?? [];
    if (g.length < 400) g.push(r);
    grupos.set(k, g);
  }
  console.log("\nTeste dos links (ano · tipo → ok/falhas):");
  const falhas: string[] = [];
  for (const [k, g] of [...grupos].sort()) {
    const amostra = Array.from({ length: Math.min(POR_GRUPO, g.length) }, (_, i) => g[Math.floor((i * g.length) / POR_GRUPO)]);
    const res = await Promise.all(amostra.map(async (r) => ({ r, s: await status(r.urlDocumento) })));
    const ok = res.filter((x) => x.s.codigo >= 200 && x.s.codigo < 400).length;
    const codigos = res.map((x) => x.s.codigo).join(",");
    console.log(`  ${k}: ${ok}/${res.length} ok  [${codigos}]`);
    for (const { r, s } of res)
      if (!(s.codigo >= 200 && s.codigo < 400))
        falhas.push(
          `${s.codigo} ${r.urlDocumento} → ${s.final} (${s.tipo}) | emissão ${r.datEmissao} | mês ${r.numMes}/${r.numAno} | lote ${r.numLote} | ressarc ${r.numRessarcimento} | tipo ${r.indTipoDocumento} | ${r.txtDescricao}`,
        );
  }
  console.log(`\nExemplos de falha (${falhas.length}):`);
  for (const f of falhas.slice(0, 40)) console.log("  " + f);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
