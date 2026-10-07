import type { Metadata } from "next";
import { Emendas } from "@/components/perfil/Emendas";
import { Gastos } from "@/components/perfil/Gastos";
import { HistoricoVotos } from "@/components/perfil/HistoricoVotos";
import { MapaEleitoral } from "@/components/perfil/MapaEleitoral";
import { HistoricoPartidos } from "@/components/perfil/Partidos";
import { Proposicoes } from "@/components/perfil/Proposicoes";
import { Avatar, Barra, CabecalhoCard, Card, Metrica, Partido } from "@/components/ui";
import { indiceVotacoes, listarParlamentares, obterParlamentar } from "@/lib/dados";
import { cargo, idade, numero, pct, reaisCompacto, tituloVotacao } from "@/lib/formato";

export const dynamicParams = false;

/** "ELEITO POR QP" → "Eleito por QP" */
function situacaoEleitoral(s: string) {
  const t = s.toLowerCase().replace(/\bqp\b/, "QP");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function generateStaticParams() {
  return listarParlamentares().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/p/[slug]">): Promise<Metadata> {
  const p = obterParlamentar((await params).slug);
  return {
    title: `${p.nome} (${p.partido}-${p.uf})`,
    description: `Como ${p.nome} votou, projetos, gastos da cota, emendas e histórico de partidos.`,
  };
}

function MetricaBarra({ rotulo, valor, explicacao }: { rotulo: string; valor: number | null; explicacao: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm text-muted">{rotulo}</span>
        <span className="numero text-2xl text-ink">{pct(valor, 0)}</span>
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

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="lg:col-span-2">
        <div className="flex items-start gap-4">
          <Avatar nome={p.nome} foto={p.foto} partido={p.partido} tamanho={72} />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted">
              {cargo(p.casa, p.sexo)} · {p.uf}
              {!p.emExercicio && <span className="ml-2 rounded-full bg-card-2 px-2 py-0.5 text-xs text-ink-2">fora do exercício</span>}
            </p>
            <h1 className="titulo mt-0.5 text-[34px] leading-tight text-ink">{p.nome}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <Partido sigla={p.partido} />
              {anos && <span className="text-sm text-muted">{anos} anos</span>}
              {p.naturalidade && <span className="text-sm text-muted">nasceu em {p.naturalidade}</span>}
              {p.escolaridade && <span className="text-sm text-muted">{p.escolaridade}</span>}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          <MetricaBarra rotulo="Participação" valor={m.participacao} explicacao={`votou em ${pct(m.participacao, 0)} das ${numero(m.votacoesConsideradas)} votações nominais no exercício do mandato`} />
          <MetricaBarra rotulo="Fidelidade partidária" valor={m.fidelidadePartidaria} explicacao={`votos iguais à ${ref}`} />
          <MetricaBarra
            rotulo="Alinhamento com o governo"
            valor={m.alinhamentoGoverno}
            explicacao={p.casa === "senado" ? "votos iguais ao do líder do governo" : "votos iguais à orientação do governo"}
          />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-line pt-5 sm:grid-cols-4">
          <Metrica rotulo="Projetos (autor)" valor={numero(m.proposicoesApresentadas)} />
          <Metrica rotulo="Cota parlamentar" valor={reaisCompacto(m.gastoCotaTotal)} />
          <Metrica rotulo="Emendas pagas" valor={reaisCompacto(m.emendasPagasTotal)} />
          <Metrica rotulo={p.eleicao ? `Votos em ${p.eleicao.ano}` : "Votos"} valor={p.eleicao ? numero(p.eleicao.votosTotais) : "—"} />
        </div>

        <p className="mt-5 text-xs text-muted">
          Fonte oficial:{" "}
          <a href={p.urlOficial} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-ink">
            {p.casa === "camara" ? "camara.leg.br" : "senado.leg.br"}
          </a>
          {p.email && <> · {p.email}</>}
        </p>
      </Card>

      <Card className="lg:col-span-2">
        <CabecalhoCard titulo="Como votou" aside={`${numero(m.votacoesConsideradas)} votações`} />
        <HistoricoVotos slug={p.slug} recentes={p.votosRecentes} descricoes={descricoes} />
      </Card>

      <Card>
        <CabecalhoCard titulo="Onde foi votado" aside={p.eleicao ? `${p.eleicao.cargo} · ${p.eleicao.ano}` : undefined} />
        {p.eleicao ? (
          <>
            <MapaEleitoral slug={p.slug} uf={p.uf} />
            <h3 className="mt-5 mb-2 text-sm text-muted">Municípios com mais votos</h3>
            <ol className="divisor text-sm">
              {p.eleicao.topMunicipios.slice(0, 5).map((t, i) => (
                <li key={t.ibge} className="flex justify-between gap-3 py-2">
                  <span className="text-ink">
                    <span className="mr-2 text-muted">{i + 1}</span>
                    {t.nome}
                  </span>
                  <span className="text-ink-2">
                    {numero(t.votos)} <span className="text-muted">· {pct(t.pct)}</span>
                  </span>
                </li>
              ))}
            </ol>
            <div className="mt-4 grid grid-cols-2 gap-4 border-t border-line pt-4">
              <Metrica rotulo="Patrimônio declarado" valor={p.eleicao.patrimonio != null ? reaisCompacto(p.eleicao.patrimonio) : "—"} detalhe={`ao TSE em ${p.eleicao.ano}`} />
              <Metrica rotulo="Situação na eleição" valor={<span className="text-lg">{situacaoEleitoral(p.eleicao.situacao)}</span>} />
            </div>
          </>
        ) : (
          <p className="text-sm text-muted">Resultado eleitoral ainda não cruzado com o TSE.</p>
        )}
      </Card>

      <Card>
        <CabecalhoCard titulo="Histórico de partidos" aside={`${p.historicoPartidos.length} ${p.historicoPartidos.length === 1 ? "partido" : "partidos"}`} />
        <HistoricoPartidos periodos={p.historicoPartidos} />
      </Card>

      <Card>
        <CabecalhoCard titulo="Emendas parlamentares" aside="desde 2023" />
        <Emendas emendas={p.emendas} />
      </Card>

      <Card>
        <CabecalhoCard titulo="Cota parlamentar" aside="desde fev/2023" />
        <Gastos gastos={p.gastos} />
      </Card>

      <Card className="lg:col-span-2">
        <CabecalhoCard titulo="Projetos apresentados" aside="nesta legislatura" />
        <Proposicoes proposicoes={p.proposicoes} />
      </Card>
    </div>
  );
}
