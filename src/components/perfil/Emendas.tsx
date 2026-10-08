"use client";

import { useCallback, useMemo, useState } from "react";
import { numero, reais, reaisCompacto } from "@/lib/formato";
import type { EmendaResumo } from "@/lib/types";
import { Contador } from "../Contador";
import { FolhaDestino } from "./Detalhes";
import { ListaComMais } from "../ListaComMais";
import { RolagemHorizontal } from "../RolagemHorizontal";
import { Barra, Metrica, Vazio } from "../ui";

type Soma = { pago: number; empenhado: number; n: number };

function agrupar(emendas: EmendaResumo[], chave: (e: EmendaResumo) => string) {
  const m = new Map<string, Soma>();
  for (const e of emendas) {
    const k = chave(e);
    const a = m.get(k) ?? { pago: 0, empenhado: 0, n: 0 };
    a.pago += e.pago;
    a.empenhado += e.empenhado;
    a.n++;
    m.set(k, a);
  }
  return [...m].sort((a, b) => b[1].empenhado - a[1].empenhado);
}

const destino = (e: EmendaResumo) => (e.municipio ? `${e.municipio}${e.uf ? ` · ${e.uf}` : ""}` : (e.uf ?? "Nacional"));

/** Emendas do parlamentar com filtro por área: totais, gráfico por ano e destinos acompanham a área escolhida. */
export function Emendas({ emendas, slug }: { emendas: EmendaResumo[]; slug: string }) {
  const [area, setArea] = useState<string | null>(null);
  const [destinoAberto, setDestinoAberto] = useState<string | null>(null);
  const fechar = useCallback(() => setDestinoAberto(null), []);
  const porFuncao = useMemo(() => agrupar(emendas, (e) => e.funcao || "Outros"), [emendas]);
  const anos = useMemo(() => [...new Set(emendas.map((e) => String(e.ano)))].sort(), [emendas]);
  const filtradas = useMemo(() => (area ? emendas.filter((e) => (e.funcao || "Outros") === area) : emendas), [emendas, area]);

  if (emendas.length === 0) return <Vazio>Nenhuma emenda individual encontrada no Portal da Transparência.</Vazio>;

  const empenhado = filtradas.reduce((s, e) => s + e.empenhado, 0);
  const pago = filtradas.reduce((s, e) => s + e.pago, 0);
  // Todos os anos sempre aparecem (com zero quando a área não teve emenda naquele ano)
  const somaAno = new Map(agrupar(filtradas, (e) => String(e.ano)));
  const porAno = anos.map((a) => [a, somaAno.get(a) ?? { pago: 0, empenhado: 0, n: 0 }] as const);
  const porMunicipio = agrupar(filtradas, destino);
  const maxMun = porMunicipio[0]?.[1].empenhado || 1;
  const maxAno = Math.max(...porAno.map(([, v]) => v.empenhado), 1);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="rotulo mb-2.5">Área</h3>
        <RolagemHorizontal className="-mx-1 gap-2 px-1 pb-1" rotulo="Filtrar por área">
          <button onClick={() => setArea(null)} className="chip pressionavel shrink-0" data-ativo={area === null}>
            Todas
          </button>
          {porFuncao.map(([f, v]) => (
            <button key={f} onClick={() => setArea(area === f ? null : f)} className="chip pressionavel shrink-0" data-ativo={area === f} aria-pressed={area === f}>
              {f} <span className="opacity-70">{reaisCompacto(v.empenhado)}</span>
            </button>
          ))}
        </RolagemHorizontal>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Metrica rotulo="Empenhado" valor={<Contador valor={empenhado} formato="reaisCompacto" />} detalhe={`${numero(filtradas.length)} ${filtradas.length === 1 ? "emenda" : "emendas"}`} />
        <Metrica rotulo="Pago" valor={<Contador valor={pago} formato="reaisCompacto" />} detalhe={`${Math.round((pago / (empenhado || 1)) * 100)}% do empenhado`} />
      </div>

      <div>
        <h3 className="rotulo mb-3">Por ano — empenhado e pago{area ? ` · ${area}` : ""}</h3>
        <ul className="space-y-2.5">
          {porAno.map(([ano, v], i) => (
            <li key={ano} className="grid grid-cols-[40px_1fr_auto] items-center gap-3 text-sm">
              <span className="text-ink-2">{ano}</span>
              <div className="relative h-2 rounded-full bg-card-2" data-animar>
                <div
                  className="anim-barra barra-largura absolute inset-y-0 left-0 rounded-full bg-accent/35"
                  style={{ width: `${(v.empenhado / maxAno) * 100}%`, ["--i" as string]: i * 2 }}
                />
                <div
                  className="anim-barra barra-largura absolute inset-y-0 left-0 rounded-full bg-accent"
                  style={{ width: `${(v.pago / maxAno) * 100}%`, ["--i" as string]: i * 2 + 4 }}
                />
              </div>
              <span className="w-16 text-right text-ink tabular-nums">{reaisCompacto(v.empenhado)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 flex gap-4 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-sm bg-accent" />
            pago
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-sm bg-accent/35" />
            empenhado
          </span>
        </p>
      </div>

      <div>
        <h3 className="rotulo mb-2">Para onde foi</h3>
        {/* key: ao trocar a área a lista volta aos primeiros destinos */}
        <ListaComMais
          key={area ?? "todas"}
          className="space-y-1"
          rotulo="destinos"
          itens={porMunicipio.map(([nome, v], i) => (
            <li key={nome}>
              <button
                onClick={() => setDestinoAberto(nome)}
                aria-haspopup="dialog"
                className="pressionavel group -mx-2 block w-[calc(100%+1rem)] rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-card-2"
              >
                <span className="mb-1 flex justify-between gap-3 text-sm">
                  <span className="truncate text-ink-2 group-hover:text-ink">{nome}</span>
                  <span className="shrink-0 text-ink" title={`Pago: ${reais(v.pago)}`}>
                    {reaisCompacto(v.empenhado)} <span className="text-muted">›</span>
                  </span>
                </span>
                <Barra valor={v.empenhado / maxMun} indice={i} />
              </button>
            </li>
          ))}
        />
      </div>
      {destinoAberto && (
        <FolhaDestino
          slug={slug}
          titulo={area ? `${destinoAberto} · ${area}` : destinoAberto}
          filtro={(e) => destino(e) === destinoAberto && (!area || (e.funcao || "Outros") === area)}
          fechar={fechar}
        />
      )}
    </div>
  );
}
