"use client";

import { useEffect, useState } from "react";
import { urlDados } from "@/lib/caminho";
import { data, nomeCategoria, reais, reaisExato } from "@/lib/formato";
import type { DetalhesParlamentar, EmendaDetalhe } from "@/lib/types";
import { Ficha, Folha, SubFolha } from "../Folha";
import { Barra } from "../ui";

// ---------------------------------------------------------------------------
// Carregamento: o arquivo de detalhes só é baixado quando a primeira folha abre
// ---------------------------------------------------------------------------
const pedidos = new Map<string, Promise<DetalhesParlamentar | null>>();

export function useDetalhes(slug: string, ativo: boolean) {
  const [d, setD] = useState<DetalhesParlamentar | null | undefined>(undefined);
  useEffect(() => {
    if (!ativo) return;
    if (!pedidos.has(slug))
      pedidos.set(
        slug,
        fetch(urlDados(`detalhes/${slug}.json`))
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      );
    let vivo = true;
    pedidos.get(slug)!.then((x) => vivo && setD(x));
    return () => {
      vivo = false;
    };
  }, [slug, ativo]);
  return d; // undefined = carregando, null = indisponível
}

function Carregando({ d }: { d: unknown }) {
  if (d === undefined)
    return (
      <div aria-hidden className="space-y-2 py-2">
        <div className="h-4 w-2/3 animate-pulse rounded bg-card-2" />
        <div className="h-24 animate-pulse rounded-lg bg-card-2" />
      </div>
    );
  return <p className="py-4 text-sm text-muted">Detalhes indisponíveis no momento.</p>;
}

const pct = (a: number, b: number) => `${Math.round((a / (b || 1)) * 100)}%`;
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export const mesLongo = (m: string) => `${MESES[Number(m.slice(5, 7)) - 1]}/${m.slice(0, 4)}`;

// ---------------------------------------------------------------------------
// Fornecedores: CNPJ/CPF formatado e link para o Portal da Transparência
// ---------------------------------------------------------------------------
export function documentoFormatado(doc: string) {
  const d = doc.replace(/\D/g, "");
  if (d.length === 14) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  // CPF: a fonte já publica parcialmente mascarado; mostramos como veio
  return doc;
}
const urlEmpresa = (doc: string) => {
  const d = doc.replace(/\D/g, "");
  return d.length === 14 ? `https://portaldatransparencia.gov.br/pessoa-juridica/${d}` : null;
};

// ---------------------------------------------------------------------------
// O que cada categoria da cota cobre (Ato da Mesa 43/2009 na Câmara; Senado, Ato 3/2003)
// ---------------------------------------------------------------------------
const CATEGORIAS: [RegExp, string][] = [
  // A primeira que casar vale: as mais específicas vêm antes
  [/locomo/i, "Locomoção, hospedagem, alimentação, combustíveis e lubrificantes (categoria do Senado que reúne essas despesas)."],
  [/escrit[oó]rio|alug|im[oó]ve/i, "Despesas do escritório de apoio do parlamentar no estado: aluguel, condomínio, IPTU, água, luz, internet e material de consumo."],
  [/divulga/i, "Divulgação do mandato: impressos, rádio, TV, sites e redes sociais. Proibida nos 120 dias antes de eleição em que o parlamentar seja candidato."],
  [/passage|a[ée]re/i, "Passagens aéreas (e, no Senado, também aquáticas e terrestres) do parlamentar e de assessores a serviço do mandato."],
  [/combust/i, "Combustível e lubrificantes para veículos usados no exercício do mandato, com limite mensal."],
  [/ve[ií]culo/i, "Aluguel ou fretamento de carros e outros veículos para o trabalho parlamentar."],
  [/aeronave/i, "Fretamento de aviões e helicópteros para deslocamentos do mandato."],
  [/embarca/i, "Fretamento de barcos e outras embarcações."],
  [/telefon/i, "Linhas de telefone fixo e celular e pacotes de dados usados no mandato."],
  [/postais|correio/i, "Envio de correspondência e encomendas pelos Correios."],
  [/consultor|pesquisa|t[ée]cnic/i, "Contratação de consultorias, assessorias, pesquisas e trabalhos técnicos para apoiar a atividade parlamentar."],
  [/hosped/i, "Hotel e hospedagem fora de Brasília (a hospedagem do parlamentar no DF não é coberta)."],
  [/aliment/i, "Refeições do próprio parlamentar (não cobre bebida alcoólica nem despesa de terceiros)."],
  [/seguran/i, "Serviço de segurança prestado por empresa especializada."],
  [/t[aá]xi|ped[aá]gio|estacion/i, "Táxi, aplicativos de transporte, pedágio e estacionamento."],
  [/curso|palestra|evento/i, "Inscrição em cursos, palestras, seminários e eventos ligados ao mandato."],
  [/assinatura|publica[cç]/i, "Assinatura de jornais, revistas e publicações."],
  [/material/i, "Material de consumo para o escritório político."],
];
const descricaoCategoria = (c: string) => CATEGORIAS.find(([re]) => re.test(c))?.[1] ?? null;

/** Lista de nomes com valor e barrinha proporcional. */
function ListaValores({ itens, total }: { itens: { nome: string; valor: number; detalhe?: string }[]; total: number }) {
  const max = itens[0]?.valor || 1;
  return (
    <ul className="space-y-2.5">
      {itens.map((it) => (
        <li key={it.nome}>
          <div className="mb-1 flex justify-between gap-3 text-sm">
            <span className="min-w-0 text-ink-2">
              {it.nome}
              {it.detalhe && <span className="ml-1.5 text-xs text-muted">{it.detalhe}</span>}
            </span>
            <span className="shrink-0 text-ink tabular-nums">
              {reais(it.valor)} <span className="text-xs text-muted">{pct(it.valor, total)}</span>
            </span>
          </div>
          <Barra valor={it.valor / max} altura={3} />
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Folhas da cota parlamentar
// ---------------------------------------------------------------------------
export function FolhaCategoria({ slug, nome, totalGeral, fechar }: { slug: string; nome: string; totalGeral: number; fechar: () => void }) {
  const d = useDetalhes(slug, true);
  const c = d?.categorias[nome];
  const descricao = descricaoCategoria(nome);
  return (
    <Folha fechar={fechar} rotulo="Cota parlamentar · categoria" titulo={nomeCategoria(nome)}>
      {descricao && <p className="mb-5 text-[14.5px] leading-relaxed text-ink-2">{descricao}</p>}
      {!c ? (
        <Carregando d={d} />
      ) : (
        <>
          <Ficha
            itens={[
              ["Total gasto", reaisExato(c.total)],
              ["Parte da cota total", pct(c.total, totalGeral)],
              ["Notas e recibos", c.notas.toLocaleString("pt-BR")],
              ["Valor médio por nota", reaisExato(c.total / (c.notas || 1))],
            ]}
          />
          {c.especificacoes.length > 0 && (
            <>
              <SubFolha>Detalhamento</SubFolha>
              <ListaValores itens={c.especificacoes.map((e) => ({ nome: e.nome, valor: e.total }))} total={c.total} />
            </>
          )}
          <SubFolha>Por ano</SubFolha>
          <ListaValores itens={c.porAno.map((a) => ({ nome: a.ano, valor: a.total }))} total={c.total} />
          <SubFolha>Quem recebeu</SubFolha>
          <ListaValores
            itens={c.fornecedores.map((f) => ({
              nome: f.nome,
              valor: f.total,
              detalhe: `${f.notas} ${f.notas === 1 ? "nota" : "notas"}${f.documento && f.documento !== f.nome ? ` · ${documentoFormatado(f.documento)}` : ""}`,
            }))}
            total={c.total}
          />
        </>
      )}
    </Folha>
  );
}

export function FolhaFornecedor({ slug, chave, nome, fechar }: { slug: string; chave: string; nome: string; fechar: () => void }) {
  const d = useDetalhes(slug, true);
  const f = d?.fornecedores[chave];
  const link = f ? urlEmpresa(f.documento) : null;
  return (
    <Folha fechar={fechar} rotulo="Cota parlamentar · fornecedor" titulo={f?.nome ?? nome}>
      {!f ? (
        <Carregando d={d} />
      ) : (
        <>
          <Ficha
            itens={[
              [f.documento.replace(/\D/g, "").length === 14 ? "CNPJ" : "CPF/documento", documentoFormatado(f.documento) || "—"],
              ["Total recebido", reaisExato(f.total)],
              ["Notas e recibos", f.notas.toLocaleString("pt-BR")],
              ["Período", f.primeiro === f.ultimo ? mesLongo(f.primeiro) : `${mesLongo(f.primeiro)} a ${mesLongo(f.ultimo)}`],
            ]}
          />
          <SubFolha>Por categoria</SubFolha>
          <ListaValores itens={f.categorias.map((c) => ({ nome: nomeCategoria(c.categoria), valor: c.total }))} total={f.total} />
          <SubFolha>Maiores notas</SubFolha>
          <ol className="divisor">
            {f.maiores.map((n, i) => (
              <li key={i} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="block text-ink">{n.data ? data(n.data) : "sem data"}</span>
                  <span className="block text-xs text-muted">
                    {nomeCategoria(n.categoria)}
                    {n.descricao && ` · ${n.descricao}`}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end">
                  <span className="text-ink tabular-nums">{reaisExato(n.valor)}</span>
                  {n.url && n.url !== "#" && (
                    <a href={n.url} target="_blank" rel="noreferrer" className="text-xs text-ink-2 underline decoration-line underline-offset-4 hover:text-ink">
                      comprovante ↗
                    </a>
                  )}
                </span>
              </li>
            ))}
          </ol>
          {link && (
            <a href={link} target="_blank" rel="noreferrer" className="mt-4 inline-block text-sm text-ink-2 underline decoration-line underline-offset-4 hover:text-ink">
              Ver a empresa no Portal da Transparência ↗
            </a>
          )}
        </>
      )}
    </Folha>
  );
}

export function FolhaMes({ slug, mes, fechar }: { slug: string; mes: string; fechar: () => void }) {
  const d = useDetalhes(slug, true);
  const m = d?.meses[mes];
  return (
    <Folha fechar={fechar} rotulo="Cota parlamentar · mês" titulo={mesLongo(mes)}>
      {!m ? (
        <Carregando d={d} />
      ) : (
        <>
          <Ficha
            itens={[
              ["Total do mês", reaisExato(m.total)],
              ["Notas e recibos", m.notas.toLocaleString("pt-BR")],
            ]}
          />
          <SubFolha>Com o que gastou</SubFolha>
          <ListaValores itens={m.categorias.map((c) => ({ nome: nomeCategoria(c.categoria), valor: c.total }))} total={m.total} />
          <SubFolha>Maiores fornecedores do mês</SubFolha>
          <ListaValores itens={m.fornecedores.map((f) => ({ nome: f.nome, valor: f.total }))} total={m.total} />
        </>
      )}
    </Folha>
  );
}

// ---------------------------------------------------------------------------
// Folha das emendas de um destino
// ---------------------------------------------------------------------------
const urlEmenda = (e: EmendaDetalhe) =>
  e.codigo ? `https://portaldatransparencia.gov.br/emendas/detalhe?codigoEmenda=${encodeURIComponent(e.codigo)}` : null;

export function FolhaDestino({
  slug,
  titulo,
  filtro,
  fechar,
}: {
  slug: string;
  titulo: string;
  filtro: (e: EmendaDetalhe) => boolean;
  fechar: () => void;
}) {
  const d = useDetalhes(slug, true);
  const lista = d?.emendas.filter(filtro);
  const empenhado = lista?.reduce((s, e) => s + e.empenhado, 0) ?? 0;
  const pago = lista?.reduce((s, e) => s + e.pago, 0) ?? 0;
  return (
    <Folha fechar={fechar} rotulo="Emendas · destino" titulo={titulo}>
      {!lista ? (
        <Carregando d={d} />
      ) : (
        <>
          <Ficha
            itens={[
              ["Emendas", lista.length],
              ["Empenhado", reaisExato(empenhado)],
              ["Pago", `${reaisExato(pago)} (${pct(pago, empenhado)})`],
            ]}
          />
          <ol className="divisor">
            {lista.map((e, i) => {
              const url = urlEmenda(e);
              return (
                <li key={`${e.codigo}-${i}`} className="py-3 text-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-medium text-ink">
                      Emenda {e.numero} · {e.ano}
                    </span>
                    <span className="shrink-0 text-ink tabular-nums">{reais(e.empenhado)}</span>
                  </div>
                  <div className="mt-0.5 text-xs leading-relaxed text-muted">
                    {[e.funcao, e.subfuncao].filter(Boolean).join(" › ")}
                    {e.acao && <span className="block text-ink-2">{e.acao}</span>}
                    {e.programa && <span className="block">Programa: {e.programa}</span>}
                    <span className="block">{e.tipo}</span>
                    <span className="block">
                      Liquidado {reais(e.liquidado)} · pago {reais(e.pago)}
                    </span>
                  </div>
                  {url && (
                    <a href={url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-ink-2 underline decoration-line underline-offset-4 hover:text-ink">
                      Ver no Portal da Transparência ↗
                    </a>
                  )}
                </li>
              );
            })}
          </ol>
          <p className="mt-4 text-xs leading-relaxed text-muted">
            <strong className="text-ink-2">Empenhado</strong>: valor reservado no orçamento. <strong className="text-ink-2">Liquidado</strong>: serviço ou
            obra entregue e conferido. <strong className="text-ink-2">Pago</strong>: dinheiro efetivamente transferido (inclui restos a pagar de anos anteriores).
          </p>
        </>
      )}
    </Folha>
  );
}
