import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Emendas } from "@/components/perfil/Emendas";
import { Gastos } from "@/components/perfil/Gastos";
import { HistoricoVotos } from "@/components/perfil/HistoricoVotos";
import { MapaEleitoral } from "@/components/perfil/MapaEleitoral";
import { HistoricoPartidos } from "@/components/perfil/Partidos";
import { Proposicoes } from "@/components/perfil/Proposicoes";
import { Avatar, Barra, CabecalhoCard, Card, Metrica, Partido } from "@/components/ui";
import { indiceVotacoes, obterParlamentar } from "@/lib/dados";
import { cargo, idade, numero, pct, reaisCompacto, tituloVotacao } from "@/lib/formato";
import { Contador } from "@/components/Contador";
import { Pagina } from "@/components/Pagina";

// Gerada na primeira visita e guardada em cache por um dia (ou até a próxima atualização de dados).
export const revalidate = 86400;

/** "ELEITO POR QP" → "Eleito por QP" */
function situacaoEleitoral(s: string) {
  const t = s.toLowerCase().replace(/\bqp\b/, "QP");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps<"/p/[slug]">): Promise<Metadata> {
  const p = obterParlamentar((await params).slug);
  if (!p) return {};
  return {
    title: `${p.nome} (${p.partido}-${p.uf})`,
    description: `Como ${p.nome} votou, projetos, gastos da cota, emendas e histórico de partidos.`,
  };
}

function MetricaBarra({ rotulo, valor, explicacao }: { rotulo: string; valor: number | null; explicacao: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="rotulo">{rotulo}</span>
        <span className="numero text-[26px] leading-none text-ink">
          <Contador valor={valor} formato="pct0" />
        </span>
      </div>
      <div className="mt-2">
        <Barra valor={valor ?? 0} />
      </div>
      <p className="mt-1.5 text-xs text-muted">{explicacao}</p>
    </div>
  );
}

export default async function PaginaParlamentar({ params }: PageProps<"/p/[slug]">) {
  const p = obterParlamentar((await params).slug);
  if (!p) notFound();
  const idx = indiceVotacoes();
  const descricoes = Object.fromEntries(
    p.votosRecentes.map((v) => {
      const vt = idx.get(v.votacaoId);
      return [v.votacaoId, { d: v.data, t: vt ? tituloVotacao(vt) : "" }];
    }),
  );
  const anos = idade(p.nascimento);
  const m = p.metricas;
  const ref = p.casa === "senado" ? "maioria do partido" : "orientação do partido";

  const ficha: [string, ReactNode][] = [
    ["Partido", <Partido key="p" sigla={p.partido} />],
    ["Estado", p.uf],
    ...(anos ? [["Idade", `${anos} anos`] as [string, string]] : []),
    ...(p.naturalidade ? [["Natural de", p.naturalidade] as [string, string]] : []),
    ...(p.escolaridade ? [["Escolaridade", p.escolaridade] as [string, string]] : []),
  ];

  return (
    <Pagina className="grid gap-x-10 gap-y-6 lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
        <div className="flex items-center gap-4 lg:block">
          <Avatar nome={p.nome} foto={p.foto} partido={p.partido} tamanho={84} />
          <div className="min-w-0 lg:mt-5">
            <p className="rotulo">
              {cargo(p.casa, p.sexo)} · {p.uf}
            </p>
            <h1 className="titulo mt-2 text-[34px] leading-[1.05] tracking-[-0.02em] text-ink lg:text-[40px]">{p.nome}</h1>
            {!p.emExercicio && <span className="mt-2 inline-block rounded-md bg-card-2 px-2 py-0.5 text-xs text-ink-2">fora do exercício</span>}
          </div>
        </div>

        <dl className="divisor mt-6 border-y border-line text-sm">
          {ficha.map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-4 py-2.5">
              <dt className="text-muted">{k}</dt>
              <dd className="min-w-0 text-right text-ink">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 space-y-5">
          <MetricaBarra rotulo="Participação" valor={m.participacao} explicacao={`votou em ${pct(m.participacao, 0)} das ${numero(m.votacoesConsideradas)} votações nominais no exercício do mandato`} />
          <MetricaBarra rotulo="Fidelidade partidária" valor={m.fidelidadePartidaria} explicacao={`votos iguais à ${ref}`} />
          <MetricaBarra
            rotulo="Alinhamento com o governo"
            valor={m.alinhamentoGoverno}
            explicacao={p.casa === "senado" ? "votos iguais ao do líder do governo" : "votos iguais à orientação do governo"}
          />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-5 border-t border-line pt-5">
          <Metrica rotulo="Projetos" valor={<Contador valor={m.proposicoesApresentadas} />} detalhe="como autor" />
          <Metrica rotulo="Cota" valor={<Contador valor={m.gastoCotaTotal} formato="reaisCompacto" />} detalhe="na legislatura" />
          <Metrica rotulo="Emendas" valor={<Contador valor={m.emendasPagasTotal} formato="reaisCompacto" />} detalhe="pagas" />
          <Metrica rotulo="Votos" valor={<Contador valor={p.eleicao?.votosTotais ?? null} />} detalhe={p.eleicao ? `eleição de ${p.eleicao.ano}` : undefined} />
        </div>

        <p className="mt-6 text-xs text-muted">
          Fonte oficial:{" "}
          <a href={p.urlOficial} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-ink">
            {p.casa === "camara" ? "camara.leg.br" : "senado.leg.br"}
          </a>
          {p.email && <span className="block truncate">{p.email}</span>}
        </p>
      </aside>

      <div className="grid min-w-0 content-start gap-4">
        <Card>
          <CabecalhoCard numero="01" titulo="Como votou" aside={`${numero(m.votacoesConsideradas)} votações`} />
          <HistoricoVotos slug={p.slug} recentes={p.votosRecentes} descricoes={descricoes} />
        </Card>

        <div className="grid min-w-0 items-start gap-4 xl:grid-cols-2">
          <Card>
            <CabecalhoCard numero="02" titulo="Onde foi votado" aside={p.eleicao ? `${p.eleicao.cargo} · ${p.eleicao.ano}` : undefined} />
            {p.eleicao ? (
              <>
                <MapaEleitoral slug={p.slug} uf={p.uf} />
                <h3 className="rotulo mt-6 mb-2">Municípios com mais votos</h3>
                <ol className="divisor text-sm">
                  {p.eleicao.topMunicipios.slice(0, 5).map((t, i) => (
                    <li key={t.ibge} className="flex justify-between gap-3 py-2">
                      <span className="text-ink">
                        <span className="secao-num mr-2.5">{i + 1}</span>
                        {t.nome}
                      </span>
                      <span className="text-ink-2">
                        {numero(t.votos)} <span className="text-muted">· {pct(t.pct)}</span>
                      </span>
                    </li>
                  ))}
                </ol>
                <div className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-5">
                  <Metrica rotulo="Patrimônio" valor={p.eleicao.patrimonio != null ? reaisCompacto(p.eleicao.patrimonio) : "—"} detalhe={`declarado ao TSE em ${p.eleicao.ano}`} />
                  <Metrica rotulo="Situação" valor={<span className="text-lg">{situacaoEleitoral(p.eleicao.situacao)}</span>} />
                </div>
              </>
            ) : (
              <p className="text-sm text-muted">Resultado eleitoral ainda não cruzado com o TSE.</p>
            )}
          </Card>

          <Card>
            <CabecalhoCard numero="03" titulo="Partidos" aside={`${p.historicoPartidos.length} ${p.historicoPartidos.length === 1 ? "partido" : "partidos"}`} />
            <HistoricoPartidos periodos={p.historicoPartidos} />
          </Card>
        </div>

        <div className="grid min-w-0 items-start gap-4 xl:grid-cols-2">
          <Card>
            <CabecalhoCard numero="04" titulo="Emendas" aside="desde 2023" />
            <Emendas emendas={p.emendas} />
          </Card>

          <Card>
            <CabecalhoCard numero="05" titulo="Cota parlamentar" aside="desde fev/2023" />
            <Gastos gastos={p.gastos} />
          </Card>
        </div>

        <Card>
          <CabecalhoCard numero="06" titulo="Projetos apresentados" aside="nesta legislatura" />
          <Proposicoes proposicoes={p.proposicoes} />
        </Card>
      </div>
    </Pagina>
  );
}
