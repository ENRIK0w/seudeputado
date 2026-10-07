"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { urlDados } from "@/lib/caminho";
import type { Agenda, EventoAgenda, ItemPauta } from "@/lib/types";

const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const CASA: Record<EventoAgenda["casa"], { nome: string; cor: string }> = {
  camara: { nome: "Câmara", cor: "var(--accent)" },
  senado: { nome: "Senado", cor: "var(--centro)" },
  congresso: { nome: "Congresso", cor: "var(--ink)" },
};
const DIAS = 14;
const ITENS_VISIVEIS = 2;

/** Hoje (AAAA-MM-DD) no horário de Brasília, onde as sessões acontecem. */
const hojeBrasilia = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
const somarDias = (iso: string, n: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * 86400e3).toISOString().slice(0, 10);
const diaSemana = (iso: string) => new Date(`${iso}T12:00:00Z`).getUTCDay();
const dataLonga = (iso: string) => `${DIAS_SEMANA[diaSemana(iso)]}, ${Number(iso.slice(8))} de ${MESES[Number(iso.slice(5, 7)) - 1]}`;
const hora = (h: string | null) => (h ? h.replace(":", "h") : "—");

/** "Sessão Deliberativa Extraordinária" → "Sessão deliberativa extraordinária" */
const tipoLegivel = (t: string) => t.charAt(0) + t.slice(1).toLowerCase().replace(/congresso nacional/, "Congresso Nacional");

function LinkItem({ it, className, children }: { it: ItemPauta; className: string; children: ReactNode }) {
  if (it.projeto)
    return (
      <Link href={`/projetos/${it.projeto}/`} className={className}>
        {children}
      </Link>
    );
  if (it.url && it.url !== "#")
    return (
      <a href={it.url} target="_blank" rel="noreferrer" className={className}>
        {children}
      </a>
    );
  return <p className={className}>{children}</p>;
}

function Casa({ casa }: { casa: EventoAgenda["casa"] }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="size-1.5 rounded-full" style={{ background: CASA[casa].cor }} aria-hidden />
      {CASA[casa].nome}
    </span>
  );
}

/** Folha de vidro que sobe de baixo com a pauta completa da sessão. */
function FolhaSessao({ e, fechar }: { e: EventoAgenda; fechar: () => void }) {
  const botao = useRef<HTMLButtonElement>(null);
  const inicioToque = useRef<number | null>(null);
  const [arraste, setArraste] = useState(0);

  useEffect(() => {
    botao.current?.focus();
    const esc = (ev: KeyboardEvent) => ev.key === "Escape" && fechar();
    window.addEventListener("keydown", esc);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", esc);
      document.body.style.overflow = overflow;
    };
  }, [fechar]);

  return createPortal(
    <>
      <div className="folha-fundo" onClick={fechar} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="folha-titulo"
        className="folha vidro"
        style={arraste ? { transform: `translateY(${arraste}px)`, transition: "none" } : undefined}
      >
        {/* Alça: arrastar para baixo fecha */}
        <div
          className="flex shrink-0 cursor-grab justify-center pt-2.5 pb-1"
          onTouchStart={(ev) => (inicioToque.current = ev.touches[0].clientY)}
          onTouchMove={(ev) => inicioToque.current != null && setArraste(Math.max(0, ev.touches[0].clientY - inicioToque.current))}
          onTouchEnd={() => {
            if (arraste > 90) fechar();
            setArraste(0);
            inicioToque.current = null;
          }}
        >
          <span className="h-[5px] w-10 rounded-full bg-[color-mix(in_srgb,var(--ink)_22%,transparent)]" />
        </div>
        <div className="flex shrink-0 items-start justify-between gap-3 px-5 pt-1 pb-3">
          <div className="min-w-0">
            <div className="rotulo flex flex-wrap gap-x-2">
              <Casa casa={e.casa} />
              <span>·</span>
              <span>
                {dataLonga(e.data)} · {hora(e.hora)}
              </span>
            </div>
            <h3 id="folha-titulo" className="titulo mt-1.5 text-[22px] text-ink">
              {tipoLegivel(e.tipo)}
            </h3>
          </div>
          <button
            ref={botao}
            onClick={fechar}
            aria-label="Fechar"
            className="pressionavel -mr-1 inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--ink)_8%,transparent)] text-ink-2 hover:text-ink"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto overscroll-contain px-5 pb-5">
          {e.itens.length ? (
            <>
              <p className="rotulo mb-1">
                {e.itens.length} {e.itens.length === 1 ? "projeto" : "projetos"} na pauta
              </p>
              <ol className="divisor">
                {e.itens.map((it) => (
                  <li key={it.sigla}>
                    <LinkItem it={it} className="group flex items-start gap-3 py-3">
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-medium text-ink group-hover:underline">{it.sigla}</span>
                        <span className="mt-0.5 block text-[14px] leading-snug text-ink-2">{it.ementa}</span>
                      </span>
                      <span className="pt-0.5 text-muted" aria-hidden>
                        {it.projeto ? "›" : "↗"}
                      </span>
                    </LinkItem>
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <p className="py-4 text-sm text-muted">A pauta desta sessão ainda não foi divulgada.</p>
          )}
          {e.url !== "#" && (
            <a href={e.url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm text-ink-2 underline decoration-line underline-offset-4 hover:text-ink">
              Agenda oficial ↗
            </a>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}

function Sessao({ e, abrir }: { e: EventoAgenda; abrir: () => void }) {
  return (
    <li className="py-3">
      <button onClick={abrir} className="pressionavel group block w-full text-left" aria-haspopup="dialog">
        <span className="flex items-baseline gap-2 text-[13px] text-muted">
          <span className="numero text-[18px] leading-none text-ink">{hora(e.hora)}</span>
          <span className="font-medium text-ink-2">
            <Casa casa={e.casa} />
          </span>
        </span>
        {e.itens.length ? (
          <span className="mt-2 block space-y-1">
            {e.itens.slice(0, ITENS_VISIVEIS).map((it) => (
              <span key={it.sigla} className="flex gap-2 text-[13.5px] leading-snug">
                <span className="shrink-0 font-medium text-ink">{it.sigla}</span>
                <span className="truncate text-ink-2">{it.ementa}</span>
              </span>
            ))}
          </span>
        ) : (
          <span className="mt-1.5 block text-[13.5px] text-muted">Pauta ainda não divulgada</span>
        )}
        <span className="mt-2 inline-flex items-center gap-1 text-[13px] text-ink-2 group-hover:text-ink">
          {e.itens.length > ITENS_VISIVEIS ? `Ver pauta completa (${e.itens.length})` : "Ver detalhes"}
          <span aria-hidden>›</span>
        </span>
      </button>
    </li>
  );
}

/**
 * Agenda do plenário: faixa de 14 dias que desliza para o lado (com marcas das
 * sessões de cada Casa) e as sessões do dia escolhido; a pauta completa abre numa
 * folha de vidro.
 */
export function AgendaSemana() {
  const [eventos, setEventos] = useState<EventoAgenda[] | null>(null);
  const [hoje, setHoje] = useState("");
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const [aberta, setAberta] = useState<EventoAgenda | null>(null);
  const faixa = useRef<HTMLOListElement>(null);
  const fechar = useCallback(() => setAberta(null), []);

  useEffect(() => {
    const h = hojeBrasilia();
    fetch(urlDados("agenda.json"))
      .then((r) => (r.ok ? r.json() : { eventos: [] }))
      .then((a: Agenda) => {
        const futuros = a.eventos.filter((e) => e.data >= h);
        setHoje(h);
        setEventos(futuros);
        setEscolhido(futuros[0]?.data ?? h); // abre no primeiro dia com sessão
      })
      .catch(() => {
        setHoje(h);
        setEventos([]);
      });
  }, []);

  // Mantém o dia escolhido visível na faixa
  useEffect(() => {
    faixa.current?.querySelector<HTMLElement>("[aria-selected='true']")?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [escolhido]);

  const porDia = useMemo(() => {
    const m = new Map<string, EventoAgenda[]>();
    for (const e of eventos ?? []) m.set(e.data, [...(m.get(e.data) ?? []), e]);
    return m;
  }, [eventos]);

  const dias = hoje ? Array.from({ length: DIAS }, (_, i) => somarDias(hoje, i)) : [];
  const doDia = escolhido ? (porDia.get(escolhido) ?? []) : [];

  return (
    <section className="card p-5" aria-labelledby="agenda-titulo">
      <div className="rotulo">Agenda do plenário</div>
      <h2 id="agenda-titulo" className="titulo mt-1.5 text-[21px] text-ink">
        Próximas votações
      </h2>

      {eventos == null ? (
        <div aria-hidden className="mt-4 space-y-3">
          <div className="h-[62px] animate-pulse rounded-xl bg-card-2" />
          <div className="h-20 animate-pulse rounded-xl bg-card-2" />
        </div>
      ) : (
        <>
          <ol ref={faixa} className="faixa-dias -mx-1 mt-4 px-1" role="tablist" aria-label="Próximos 14 dias">
            {dias.map((d) => {
              const sessoes = porDia.get(d) ?? [];
              const ativo = d === escolhido;
              const fimDeSemana = [0, 6].includes(diaSemana(d));
              return (
                <li key={d}>
                  <button
                    role="tab"
                    aria-selected={ativo}
                    aria-label={`${dataLonga(d)}: ${sessoes.length ? `${sessoes.length} ${sessoes.length === 1 ? "sessão" : "sessões"}` : "sem sessão"}`}
                    onClick={() => setEscolhido(d)}
                    className={`pressionavel flex w-[50px] flex-col items-center rounded-xl py-2 transition-colors ${
                      ativo ? "bg-ink text-bg" : sessoes.length ? "text-ink hover:bg-card-2" : fimDeSemana ? "text-muted/50 hover:bg-card-2" : "text-muted hover:bg-card-2"
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

          <div className="mt-1 min-h-20" role="tabpanel" aria-label={escolhido ? dataLonga(escolhido) : undefined}>
            {eventos.length === 0 ? (
              <p className="py-5 text-center text-sm text-muted">Nenhuma sessão de votação marcada nos próximos 14 dias.</p>
            ) : doDia.length ? (
              <ul className="divisor">
                {doDia.map((e) => (
                  <Sessao key={e.id} e={e} abrir={() => setAberta(e)} />
                ))}
              </ul>
            ) : (
              <p className="py-5 text-center text-sm text-muted">Sem sessão de votação neste dia.</p>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-3 text-xs text-muted">
            {(["camara", "senado", "congresso"] as const).map((c) => (
              <Casa key={c} casa={c} />
            ))}
            <span className="ml-auto">Pautas podem mudar no dia</span>
          </div>
        </>
      )}
      {aberta && <FolhaSessao e={aberta} fechar={fechar} />}
    </section>
  );
}
