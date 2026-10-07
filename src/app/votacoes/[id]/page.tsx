import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CabecalhoCard, Card } from "@/components/ui";
import { VotoAVoto, type Votante } from "@/components/VotoAVoto";
import { indiceParlamentares, obterVotacao } from "@/lib/dados";
import { COR_VOTO, data, limparDescricao, numero, ROTULO_VOTO } from "@/lib/formato";
import { corPartido } from "@/lib/partidos";
import type { VotoTipo } from "@/lib/types";
import { Contador } from "@/components/Contador";
import { TextoReferenciado } from "@/components/TextoReferenciado";
import { Pagina } from "@/components/Pagina";

// Gerada na primeira visita e guardada em cache por um dia (ou até a próxima atualização de dados).
export const revalidate = 86400;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps<"/votacoes/[id]">): Promise<Metadata> {
  const v = obterVotacao((await params).id);
  if (!v) return {};
  return { title: `${v.proposicao ?? "Votação"} — ${data(v.data)}`, description: v.ementa ?? limparDescricao(v.descricao) };
}

const ORDEM: VotoTipo[] = ["sim", "nao", "abstencao", "obstrucao", "art17"];

export default async function PaginaVotacao({ params }: PageProps<"/votacoes/[id]">) {
  const v = obterVotacao((await params).id);
  if (!v) notFound();
  const parl = indiceParlamentares();
  const validos = v.placar.sim + v.placar.nao || 1;
  const porVoto = new Map<VotoTipo, string[]>();
  for (const [slug, voto] of Object.entries(v.votos)) porVoto.set(voto, [...(porVoto.get(voto) ?? []), slug]);
  const maxPartido = Math.max(...v.porPartido.map((p) => p.sim + p.nao + p.outros), 1);

  return (
    <Pagina className="grid gap-4 lg:grid-cols-2">
      <Card className="lg:col-span-2">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <span className="rounded-full border border-line px-2.5 py-0.5">{v.casa === "camara" ? "Câmara dos Deputados" : "Senado Federal"}</span>
          <span>{data(v.data, { day: "numeric", month: "long", year: "numeric" })}</span>
          {v.aprovada != null && <span className={v.aprovada ? "text-sim" : "text-nao"}>● {v.aprovada ? "Aprovada" : "Rejeitada"}</span>}
        </div>
        {v.proposicao && (
          <p className="mt-3 text-sm font-medium text-ink-2">
            {v.proposicaoUrl ? (
              <a href={v.proposicaoUrl} target="_blank" rel="noreferrer" className="ref-link ref-pilula" title={`Abrir ${v.proposicao} na fonte oficial`}>
                {v.proposicao}
              </a>
            ) : (
              v.proposicao
            )}
          </p>
        )}
        <h1 className="titulo mt-1 text-[28px] leading-tight text-ink">
          <TextoReferenciado texto={limparDescricao(v.descricao)} referencias={v.referencias} />
        </h1>
        {v.ementa && (
          <div className="mt-4 rounded-2xl bg-card-2 px-4 py-3">
            <p className="text-xs font-medium tracking-wide text-muted uppercase">Do que se trata{v.proposicao ? ` · ${v.proposicao}` : ""}</p>
            <p className="mt-1 text-[15px] leading-relaxed text-ink">
              <TextoReferenciado texto={v.ementa} referencias={v.referencias} />
            </p>
          </div>
        )}

        <div className="mt-6 flex items-end justify-between">
          <div>
            <div className="text-sm text-ink-2">Sim</div>
            <div className="numero text-[44px] leading-none text-ink">
              <Contador valor={v.placar.sim} />
            </div>
          </div>
          <div className="pb-1 text-center text-sm text-muted">
            {v.placar.abstencao > 0 && <div>{v.placar.abstencao} abstenções</div>}
            {v.placar.obstrucao > 0 && <div>{v.placar.obstrucao} obstruções</div>}
            {v.placar.ausente > 0 && <div>{v.placar.ausente} não votaram</div>}
          </div>
          <div className="text-right">
            <div className="text-sm text-ink-2">Não</div>
            <div className="numero text-[44px] leading-none text-ink">
              <Contador valor={v.placar.nao} />
            </div>
          </div>
        </div>
        <div className="relative mt-3 flex h-2 gap-[2px]" data-animar>
          <div className="anim-barra rounded-l-full bg-sim" style={{ width: `${(v.placar.sim / validos) * 100}%` }} />
          <div className="anim-barra rounded-r-full bg-nao" style={{ width: `${(v.placar.nao / validos) * 100}%`, ["--i" as string]: 8 }} />
          <div className="absolute -top-1 left-1/2 h-4 w-0.5 rounded bg-ink" aria-hidden />
        </div>
        {v.url !== "#" && (
          <p className="mt-4 text-xs text-muted">
            <a href={v.url} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-ink">
              Dados oficiais da votação
            </a>
          </p>
        )}
      </Card>

      <Card>
        <CabecalhoCard titulo="Como cada partido votou" />
        <ul className="space-y-3">
          {v.porPartido.map((p, i) => {
            const t = p.sim + p.nao + p.outros;
            return (
              <li key={p.partido} className="grid grid-cols-[96px_1fr_auto] items-center gap-3 text-sm">
                <span className="inline-flex items-center gap-1.5 truncate text-ink-2">
                  <span className="size-2 rounded-full" style={{ background: corPartido(p.partido) }} aria-hidden />
                  {p.partido}
                </span>
                <div
                  className="anim-barra flex h-2 gap-[2px]"
                  data-animar
                  style={{ width: `${(t / maxPartido) * 100}%`, ["--i" as string]: i }}
                  title={`Sim ${p.sim} · Não ${p.nao} · outros ${p.outros}`}
                >
                  {p.sim > 0 && <div className="rounded-l-full bg-sim first:rounded-l-full last:rounded-r-full" style={{ flex: p.sim }} />}
                  {p.nao > 0 && <div className="bg-nao first:rounded-l-full last:rounded-r-full" style={{ flex: p.nao }} />}
                  {p.outros > 0 && <div className="bg-[var(--muted)] first:rounded-l-full last:rounded-r-full" style={{ flex: p.outros }} />}
                </div>
                <span className="w-16 text-right text-xs text-ink-2">
                  {p.sim}–{p.nao}
                  {p.outros > 0 && <span className="text-muted">–{p.outros}</span>}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 flex gap-4 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-sm bg-sim" />Sim</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-sm bg-nao" />Não</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-sm bg-[var(--muted)]" />Outros</span>
        </p>
      </Card>

      {v.orientacoes.length > 0 ? (
        <Card>
          <CabecalhoCard titulo="Orientação das bancadas" />
          <ul className="grid grid-cols-2 gap-x-4 text-sm">
            {v.orientacoes.map((o) => (
              <li key={o.bancada} className="flex justify-between gap-2 border-b border-line py-2">
                <span className="truncate text-ink-2">{o.bancada}</span>
                <span className="inline-flex items-center gap-1.5 text-ink">
                  {o.orientacao !== "liberado" && <span className="size-2 rounded-sm" style={{ background: COR_VOTO[o.orientacao] }} aria-hidden />}
                  {o.orientacao === "liberado" ? "Liberado" : ROTULO_VOTO[o.orientacao]}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <Card>
          <CabecalhoCard titulo="Orientação das bancadas" />
          <p className="text-sm text-muted">O Senado não publica as orientações de bancada nos dados abertos.</p>
        </Card>
      )}

      <Card className="lg:col-span-2">
        <CabecalhoCard titulo="Voto a voto" aside={`${numero(Object.keys(v.votos).length)} votos registrados`} />
        <VotoAVoto
          grupos={ORDEM.filter((t) => porVoto.has(t)).map((t) => ({
            voto: t,
            votantes: porVoto
              .get(t)!
              .flatMap((s): Votante[] => {
                const p = parl.get(s);
                return p ? [[s, p.nome, p.partido, p.uf]] : [];
              })
              .sort((a, b) => a[1].localeCompare(b[1], "pt-BR")),
          }))}
        />
      </Card>
    </Pagina>
  );
}
