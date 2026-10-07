import type { Metadata } from "next";
import Link from "next/link";
import { Avatar, CabecalhoCard, Card } from "@/components/ui";
import { indiceParlamentares, listarVotacoes, obterVotacao } from "@/lib/dados";
import { COR_VOTO, data, numero, ROTULO_VOTO } from "@/lib/formato";
import { corPartido } from "@/lib/partidos";
import type { VotoTipo } from "@/lib/types";

export const dynamicParams = false;

export function generateStaticParams() {
  return listarVotacoes().map((v) => ({ id: v.id }));
}

export async function generateMetadata({ params }: PageProps<"/votacoes/[id]">): Promise<Metadata> {
  const v = obterVotacao((await params).id);
  return { title: `${v.proposicao ?? "Votação"} — ${data(v.data)}`, description: v.descricao };
}

const ORDEM: VotoTipo[] = ["sim", "nao", "abstencao", "obstrucao", "art17"];

export default async function PaginaVotacao({ params }: PageProps<"/votacoes/[id]">) {
  const v = obterVotacao((await params).id);
  const parl = indiceParlamentares();
  const validos = v.placar.sim + v.placar.nao || 1;
  const porVoto = new Map<VotoTipo, string[]>();
  for (const [slug, voto] of Object.entries(v.votos)) porVoto.set(voto, [...(porVoto.get(voto) ?? []), slug]);
  const maxPartido = Math.max(...v.porPartido.map((p) => p.sim + p.nao + p.outros), 1);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="lg:col-span-2">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <span className="rounded-full border border-line px-2.5 py-0.5">{v.casa === "camara" ? "Câmara dos Deputados" : "Senado Federal"}</span>
          <span>{data(v.data, { day: "numeric", month: "long", year: "numeric" })}</span>
          {v.aprovada != null && <span className={v.aprovada ? "text-sim" : "text-nao"}>● {v.aprovada ? "Aprovada" : "Rejeitada"}</span>}
        </div>
        {v.proposicao && <p className="mt-3 text-sm font-medium text-ink-2">{v.proposicao}</p>}
        <h1 className="titulo mt-1 text-[28px] leading-tight text-ink">{v.descricao}</h1>
        {v.ementa && <p className="mt-2 text-ink-2">{v.ementa}</p>}

        <div className="mt-6 flex items-end justify-between">
          <div>
            <div className="text-sm text-ink-2">Sim</div>
            <div className="numero text-[44px] leading-none text-ink">{v.placar.sim}</div>
          </div>
          <div className="pb-1 text-center text-sm text-muted">
            {v.placar.abstencao > 0 && <div>{v.placar.abstencao} abstenções</div>}
            {v.placar.obstrucao > 0 && <div>{v.placar.obstrucao} obstruções</div>}
            {v.placar.ausente > 0 && <div>{v.placar.ausente} não votaram</div>}
          </div>
          <div className="text-right">
            <div className="text-sm text-ink-2">Não</div>
            <div className="numero text-[44px] leading-none text-ink">{v.placar.nao}</div>
          </div>
        </div>
        <div className="relative mt-3 flex h-2 gap-[2px]">
          <div className="rounded-l-full bg-sim" style={{ width: `${(v.placar.sim / validos) * 100}%` }} />
          <div className="rounded-r-full bg-nao" style={{ width: `${(v.placar.nao / validos) * 100}%` }} />
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
          {v.porPartido.map((p) => {
            const t = p.sim + p.nao + p.outros;
            return (
              <li key={p.partido} className="grid grid-cols-[96px_1fr_auto] items-center gap-3 text-sm">
                <span className="inline-flex items-center gap-1.5 truncate text-ink-2">
                  <span className="size-2 rounded-full" style={{ background: corPartido(p.partido) }} aria-hidden />
                  {p.partido}
                </span>
                <div className="flex h-2 gap-[2px]" style={{ width: `${(t / maxPartido) * 100}%` }} title={`Sim ${p.sim} · Não ${p.nao} · outros ${p.outros}`}>
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
        <div className="space-y-2">
          {ORDEM.filter((t) => porVoto.has(t)).map((t) => {
            const slugs = porVoto.get(t)!.sort((a, b) => (parl.get(a)?.nome ?? a).localeCompare(parl.get(b)?.nome ?? b, "pt-BR"));
            return (
              <details key={t} className="group rounded-2xl bg-card-2 px-4" open={slugs.length <= 20}>
                <summary className="flex cursor-pointer list-none items-center justify-between py-3">
                  <span className="inline-flex items-center gap-2 font-medium text-ink">
                    <span className="size-2.5 rounded-sm" style={{ background: COR_VOTO[t] }} aria-hidden />
                    {ROTULO_VOTO[t]} <span className="text-ink-2">{slugs.length}</span>
                  </span>
                  <span className="text-sm text-muted group-open:rotate-180">↓</span>
                </summary>
                <ul className="grid gap-x-4 pb-3 sm:grid-cols-2 lg:grid-cols-3">
                  {slugs.map((s) => {
                    const p = parl.get(s);
                    if (!p) return null;
                    return (
                      <li key={s}>
                        <Link href={`/p/${s}/`} className="flex items-center gap-2 py-1.5 text-sm hover:underline hover:underline-offset-4">
                          <Avatar nome={p.nome} foto={p.foto} partido={p.partido} tamanho={24} />
                          <span className="truncate text-ink">{p.nome}</span>
                          <span className="shrink-0 text-xs text-muted">
                            {p.partido}-{p.uf}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </details>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
