"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { urlDados } from "@/lib/caminho";
import type { Agenda, EventoAgenda } from "@/lib/types";

const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const CASA: Record<EventoAgenda["casa"], { nome: string; cor: string }> = {
  camara: { nome: "Câmara", cor: "var(--accent)" },
  senado: { nome: "Senado", cor: "var(--centro)" },
  congresso: { nome: "Congresso", cor: "var(--ink)" },
};
const ITENS_VISIVEIS = 3;

/** Hoje (AAAA-MM-DD) no horário de Brasília, onde as sessões acontecem. */
const hojeBrasilia = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
const somarDias = (iso: string, n: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * 86400e3).toISOString().slice(0, 10);
const diaSemana = (iso: string) => new Date(`${iso}T12:00:00Z`).getUTCDay();

/** "Sessão Deliberativa Extraordinária" → "Sessão deliberativa extraordinária" */
const tipoLegivel = (t: string) => t.charAt(0) + t.slice(1).toLowerCase().replace(/congresso nacional/, "Congresso Nacional");

function Sessao({ e }: { e: EventoAgenda }) {
  const [aberta, setAberta] = useState(false);
  const itens = aberta ? e.itens : e.itens.slice(0, ITENS_VISIVEIS);
  const resto = e.itens.length - ITENS_VISIVEIS;
  return (
    <li className="grid grid-cols-[52px_minmax(0,1fr)] gap-3 py-3.5">
      <div className="numero pt-0.5 text-[19px] leading-none text-ink">{e.hora ? e.hora.replace(":", "h") : "—"}</div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5 font-medium text-ink-2">
            <span className="size-1.5 rounded-full" style={{ background: CASA[e.casa].cor }} aria-hidden />
            {CASA[e.casa].nome}
          </span>
          <span>{tipoLegivel(e.tipo)}</span>
        </div>
        {e.itens.length ? (
          <ul className="mt-2 space-y-2">
            {itens.map((it) => {
              const conteudo = (
                <>
                  <span className="mr-1.5 font-medium text-ink">{it.sigla}</span>
                  <span className="text-ink-2">{it.ementa}</span>
                </>
              );
              const cls = "line-clamp-2 text-[13.5px] leading-snug hover:[&>span:first-child]:underline";
              return (
                <li key={it.sigla}>
                  {it.projeto ? (
                    <Link href={`/projetos/${it.projeto}/`} className={cls}>
                      {conteudo}
                    </Link>
                  ) : it.url && it.url !== "#" ? (
                    <a href={it.url} target="_blank" rel="noreferrer" className={cls}>
                      {conteudo}
                    </a>
                  ) : (
                    <p className={cls}>{conteudo}</p>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-1.5 text-[13.5px] text-muted">
            Pauta ainda não divulgada.{" "}
            {e.url !== "#" && (
              <a href={e.url} target="_blank" rel="noreferrer" className="underline decoration-line underline-offset-4 hover:text-ink">
                Agenda oficial ↗
              </a>
            )}
          </p>
        )}
        {resto > 0 && (
          <button onClick={() => setAberta(!aberta)} className="mt-2 text-[13px] text-ink-2 underline decoration-line underline-offset-4 hover:text-ink">
            {aberta ? "Mostrar menos" : `+ ${resto} ${resto === 1 ? "projeto" : "projetos"} na pauta`}
          </button>
        )}
      </div>
    </li>
  );
}

/**
 * Agenda do plenário: a semana numa faixa de dias (com marcas das sessões de cada
 * Casa) e, abaixo, as sessões do dia escolhido com os projetos em pauta.
 */
export function AgendaSemana() {
  const [eventos, setEventos] = useState<EventoAgenda[] | null>(null);
  const [hoje, setHoje] = useState("");
  const [semana, setSemana] = useState(0);
  const [escolhido, setEscolhido] = useState<string | null>(null);

  useEffect(() => {
    const h = hojeBrasilia();
    fetch(urlDados("agenda.json"))
      .then((r) => (r.ok ? r.json() : { eventos: [] }))
      .then((a: Agenda) => {
        const futuros = a.eventos.filter((e) => e.data >= h);
        setHoje(h);
        setEventos(futuros);
        // Abre no primeiro dia com sessão (na semana dele)
        const primeiro = futuros[0]?.data ?? h;
        const offset = Math.round((Date.parse(primeiro) - Date.parse(h)) / 86400e3);
        setSemana(offset >= 7 ? 1 : 0);
        setEscolhido(primeiro);
      })
      .catch(() => {
        setHoje(h);
        setEventos([]);
      });
  }, []);

  const porDia = useMemo(() => {
    const m = new Map<string, EventoAgenda[]>();
    for (const e of eventos ?? []) m.set(e.data, [...(m.get(e.data) ?? []), e]);
    return m;
  }, [eventos]);

  const dias = hoje ? Array.from({ length: 7 }, (_, i) => somarDias(hoje, semana * 7 + i)) : [];
  const doDia = escolhido ? (porDia.get(escolhido) ?? []) : [];

  return (
    <section className="card p-5" aria-labelledby="agenda-titulo">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <div className="rotulo">Agenda do plenário</div>
          <h2 id="agenda-titulo" className="titulo mt-1.5 text-[21px] text-ink">
            Próximas votações
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-0.5" aria-label="Semana">
          {[0, 1].map((s) => (
            <button
              key={s}
              onClick={() => {
                setSemana(s);
                // Seleciona o primeiro dia com sessão da semana escolhida (ou o primeiro dia)
                const daSemana = Array.from({ length: 7 }, (_, i) => somarDias(hoje, s * 7 + i));
                setEscolhido(daSemana.find((d) => porDia.has(d)) ?? daSemana[0]);
              }}
              aria-pressed={semana === s}
              className={`rounded-md px-2 py-1 text-xs whitespace-nowrap transition-colors ${semana === s ? "bg-card-2 text-ink" : "text-muted hover:text-ink"}`}
            >
              {s === 0 ? "Esta semana" : "Próxima"}
            </button>
          ))}
        </div>
      </div>

      {eventos == null ? (
        <div aria-hidden className="mt-4 space-y-3">
          <div className="h-[58px] animate-pulse rounded-lg bg-card-2" />
          <div className="h-24 animate-pulse rounded-lg bg-card-2" />
        </div>
      ) : (
        <>
          <ol className="mt-4 grid grid-cols-7 gap-1" role="tablist">
            {dias.map((d) => {
              const sessoes = porDia.get(d) ?? [];
              const ativo = d === escolhido;
              const fimDeSemana = [0, 6].includes(diaSemana(d));
              return (
                <li key={d}>
                  <button
                    role="tab"
                    aria-selected={ativo}
                    aria-label={`${DIAS_SEMANA[diaSemana(d)]}, ${Number(d.slice(8))} de ${MESES[Number(d.slice(5, 7)) - 1]}: ${sessoes.length ? `${sessoes.length} ${sessoes.length === 1 ? "sessão" : "sessões"}` : "sem sessão"}`}
                    onClick={() => setEscolhido(d)}
                    className={`pressionavel flex w-full flex-col items-center rounded-lg py-2 transition-colors ${
                      ativo ? "bg-ink text-bg" : sessoes.length ? "text-ink hover:bg-card-2" : fimDeSemana ? "text-muted/60 hover:bg-card-2" : "text-muted hover:bg-card-2"
                    }`}
                  >
                    <span className="text-[10.5px] font-medium tracking-wide uppercase opacity-80">{d === hoje ? "hoje" : DIAS_SEMANA[diaSemana(d)]}</span>
                    <span className="numero mt-0.5 text-[20px] leading-none">{Number(d.slice(8))}</span>
                    <span className="mt-1.5 flex h-1.5 gap-[3px]" aria-hidden>
                      {sessoes.slice(0, 3).map((e) => (
                        <span key={e.id} className="size-1.5 rounded-full" style={{ background: ativo ? "var(--bg)" : CASA[e.casa].cor }} />
                      ))}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="mt-2 min-h-24" role="tabpanel">
            {eventos.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">Nenhuma sessão deliberativa marcada nos próximos 14 dias.</p>
            ) : doDia.length ? (
              <ul className="divisor">
                {doDia.map((e) => (
                  <Sessao key={e.id} e={e} />
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-muted">Sem sessão de votação marcada para este dia.</p>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-3 text-xs text-muted">
            {(["camara", "senado", "congresso"] as const).map((c) => (
              <span key={c} className="inline-flex items-center gap-1.5">
                <span className="size-1.5 rounded-full" style={{ background: CASA[c].cor }} aria-hidden />
                {CASA[c].nome}
              </span>
            ))}
            <span className="ml-auto">Pautas podem mudar no dia</span>
          </div>
        </>
      )}
    </section>
  );
}
