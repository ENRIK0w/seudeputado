import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ListaComMais } from "@/components/ListaComMais";
import { Pagina } from "@/components/Pagina";
import { Avatar, CabecalhoCard, Card, Partido, Vazio } from "@/components/ui";
import { VotacaoItem } from "@/components/VotacaoItem";
import { indiceParlamentares, indiceVotacoes, obterProjeto } from "@/lib/dados";
import { data } from "@/lib/formato";

// Gerada na primeira visita e guardada em cache por um dia (ou até a próxima atualização de dados).
export const revalidate = 86400;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps<"/projetos/[id]">): Promise<Metadata> {
  const p = obterProjeto((await params).id);
  if (!p) return {};
  return { title: p.sigla, description: p.ementa };
}

const TIPOS: Record<string, string> = {
  PL: "Projeto de lei",
  PLP: "Projeto de lei complementar",
  PEC: "Proposta de emenda à Constituição",
  PDL: "Projeto de decreto legislativo",
  MPV: "Medida provisória",
  PLV: "Projeto de lei de conversão",
  PRC: "Projeto de resolução",
};

export default async function PaginaProjeto({ params }: PageProps<"/projetos/[id]">) {
  const p = obterProjeto((await params).id);
  if (!p) notFound();
  const idxV = indiceVotacoes();
  const idxP = indiceParlamentares();
  const votacoes = p.votacoes.map((id) => idxV.get(id)).filter((v) => v != null);
  const autores = p.autores.map((a) => ({ ...a, parl: idxP.get(a.slug) })).filter((a) => a.parl);
  const tipo = TIPOS[p.sigla.split(" ")[0]];
  const casa = p.casa === "camara" ? "Câmara dos Deputados" : "Senado Federal";

  return (
    <Pagina className="grid gap-x-10 gap-y-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <header className="border-b border-line pb-6 lg:col-span-2">
        <div className="rotulo flex flex-wrap gap-x-2.5">
          {tipo && <span>{tipo}</span>}
          {tipo && <span aria-hidden>·</span>}
          <span>Apresentado na {casa === "Senado Federal" ? "Senado" : "Câmara"} em {data(p.data, { day: "numeric", month: "long", year: "numeric" })}</span>
        </div>
        <h1 className="display mt-3 text-ink">{p.sigla}</h1>
        <p className="texto-longo mt-4 text-[17px] leading-relaxed text-ink-2">{p.ementa}</p>
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          {p.situacao && (
            <span className="text-ink-2">
              <span className="text-muted">Situação:</span> {p.situacao}
            </span>
          )}
          {p.url && p.url !== "#" && (
            <a
              href={p.url}
              target="_blank"
              rel="noreferrer"
              className="pressionavel inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-ink-2 hover:border-[var(--line-forte)] hover:text-ink"
            >
              Íntegra e tramitação em {p.casa === "camara" ? "camara.leg.br" : "senado.leg.br"} <span aria-hidden>↗</span>
            </a>
          )}
        </div>
      </header>

      <Card className="self-start">
        <CabecalhoCard numero="01" titulo="Votações em plenário" aside={votacoes.length ? `${votacoes.length}` : undefined} />
        {votacoes.length ? (
          <div className="divisor -my-3">
            {votacoes.map((v) => (
              <VotacaoItem key={v.id} v={v} />
            ))}
          </div>
        ) : (
          <Vazio>
            Este projeto ainda não teve votação nominal em plenário nesta legislatura. Votações simbólicas e em comissões aparecem na
            tramitação, na fonte oficial.
          </Vazio>
        )}
      </Card>

      <Card className="self-start">
        <CabecalhoCard numero="02" titulo="Quem assina" aside={`${autores.length}`} />
        <ListaComMais
          inicial={8}
          passo={20}
          rotulo="parlamentares"
          className="divisor -mt-2"
          itens={autores.map(({ slug, principal, parl }) => (
            <li key={slug}>
              <Link href={`/p/${slug}/`} className="pressionavel flex items-center gap-3 py-2.5 hover:opacity-90">
                <Avatar nome={parl!.nome} foto={parl!.foto} partido={parl!.partido} tamanho={34} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px] text-ink">{parl!.nome}</span>
                  <Partido sigla={parl!.partido} uf={parl!.uf} className="text-xs" />
                </span>
                <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] ${principal ? "bg-accent/15 text-accent" : "text-muted"}`}>
                  {principal ? "autor" : "coautor"}
                </span>
              </Link>
            </li>
          ))}
        />
        <p className="mt-4 text-xs text-muted">Só aparecem os parlamentares com mandato nesta legislatura.</p>
      </Card>
    </Pagina>
  );
}
