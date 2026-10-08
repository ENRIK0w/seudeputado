// Portal da Transparência — emendas parlamentares (download único, atualizado diariamente).
// https://portaldatransparencia.gov.br/download-de-dados/emendas-parlamentares
import type { EmendaDetalhe, Parlamentar } from "../../src/lib/types";
import { download } from "../lib/http";
import { entradasZip, linhasCsvZip } from "../lib/stream";
import { normalizarNome, numeroBR } from "../lib/util";

const URL_EMENDAS = "https://portaldatransparencia.gov.br/download-de-dados/emendas-parlamentares/UNICO";
const ANO_INICIAL = 2023;

export async function coletarEmendas(parlamentares: Parlamentar[]): Promise<Record<string, EmendaDetalhe[]>> {
  console.log("Transparência: emendas parlamentares");
  // O nome do autor vem em maiúsculas, sem casa — só aceitamos nomes que identificam um único parlamentar.
  const contagem = new Map<string, string[]>();
  for (const p of parlamentares) {
    const n = normalizarNome(p.nome);
    contagem.set(n, [...(contagem.get(n) ?? []), p.slug]);
  }
  const slugPorNome = new Map([...contagem].filter(([, s]) => s.length === 1).map(([n, s]) => [n, s[0]]));

  const zip = await download(URL_EMENDAS);
  const csv = entradasZip(zip).find((n) => /emendas/i.test(n) && n.endsWith(".csv"));
  if (!csv) throw new Error("CSV de emendas não encontrado no ZIP");

  const porSlug: Record<string, EmendaDetalhe[]> = {};
  for await (const r of linhasCsvZip(zip, csv)) {
    const ano = Number(r["Ano da Emenda"]);
    if (ano < ANO_INICIAL) continue;
    const slug = slugPorNome.get(normalizarNome(r["Nome do Autor da Emenda"] ?? ""));
    if (!slug) continue;
    const ibge = (r["Código Município IBGE"] ?? "").replace(/\D/g, "");
    (porSlug[slug] ??= []).push({
      ano,
      numero: r["Número da emenda"] ?? r["Código da Emenda"],
      tipo: r["Tipo de Emenda"] ?? "",
      municipio: r["Município"] || null,
      uf: r["UF"] || null,
      ibge: ibge.length === 7 ? ibge : null,
      funcao: r["Nome Função"] ?? "",
      empenhado: numeroBR(r["Valor Empenhado"]),
      pago: numeroBR(r["Valor Pago"]) + numeroBR(r["Valor Restos A Pagar Pagos"]),
      codigo: r["Código da Emenda"] ?? "",
      localidade: r["Localidade de aplicação do recurso"] || null,
      subfuncao: r["Nome Subfunção"] ?? "",
      programa: r["Nome Programa"] ?? "",
      acao: r["Nome Ação"] ?? "",
      liquidado: numeroBR(r["Valor Liquidado"]),
    });
  }
  return porSlug;
}
