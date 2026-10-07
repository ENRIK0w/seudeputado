"use client";

import { geoIdentity, geoPath } from "d3-geo";
import { scaleSequentialSqrt } from "d3-scale";
import { interpolateRgb } from "d3-interpolate";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { useEffect, useMemo, useState } from "react";
import { urlDados } from "@/lib/caminho";
import { numero, pct } from "@/lib/formato";
import type { EleicaoMapa } from "@/lib/types";

type Props = { codarea: string; nome?: string };
const L = 360;
const A = 300;

/**
 * Mapa de calor eleitoral: % dos votos válidos para o cargo que o parlamentar
 * teve em cada município. Escala sequencial de um só tom (mais votos = mais claro
 * no tema escuro), raiz quadrada para não esconder municípios médios.
 */
export function MapaEleitoral({ slug, uf }: { slug: string; uf: string }) {
  const [geo, setGeo] = useState<FeatureCollection<Geometry, Props> | null>(null);
  const [mapa, setMapa] = useState<EleicaoMapa | null>(null);
  const [erro, setErro] = useState(false);
  const [foco, setFoco] = useState<{ f: Feature<Geometry, Props>; x: number; y: number; w: number } | null>(null);

  useEffect(() => {
    Promise.all([fetch(urlDados(`malhas/${uf}.json`)), fetch(urlDados(`eleicao/${slug}.json`))])
      .then(async ([g, m]) => {
        if (!g.ok || !m.ok) throw new Error();
        setGeo(await g.json());
        setMapa(await m.json());
      })
      .catch(() => setErro(true));
  }, [slug, uf]);

  const { caminhos, escala, max } = useMemo(() => {
    if (!geo || !mapa) return { caminhos: [], escala: null, max: 0 };
    const proj = geoIdentity().reflectY(true).fitSize([L, A], geo);
    const path = geoPath(proj);
    const max = Math.max(...Object.values(mapa.municipios).map((m) => m.pct), 0.0001);
    const escala = scaleSequentialSqrt(interpolateRgb("#1d2238", "#9db4ff")).domain([0, max]);
    return { caminhos: geo.features.map((f) => ({ f, d: path(f) ?? "" })), escala, max };
  }, [geo, mapa]);

  if (erro) return <p className="rounded-xl bg-card-2 px-4 py-6 text-center text-sm text-muted">Mapa eleitoral indisponível para este parlamentar.</p>;
  if (!escala || !mapa) return <div className="aspect-[6/5] animate-pulse rounded-xl bg-card-2" />;

  const dadosFoco = foco ? mapa.municipios[foco.f.properties.codarea] : null;

  return (
    <figure className="relative">
      <svg viewBox={`0 0 ${L} ${A}`} className="w-full" role="img" aria-label={`Votos por município em ${uf}, eleição de ${mapa.ano}`} onMouseLeave={() => setFoco(null)}>
        {caminhos.map(({ f, d }) => {
          const m = mapa.municipios[f.properties.codarea];
          const ativo = foco?.f === f;
          return (
            <path
              key={f.properties.codarea}
              d={d}
              fill={m ? escala(m.pct) : "var(--card-2)"}
              stroke={ativo ? "var(--ink)" : "var(--card)"}
              strokeWidth={ativo ? 1.5 : 0.4}
              onMouseMove={(e) => {
                const r = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                setFoco({ f, x: e.clientX - r.left, y: e.clientY - r.top, w: r.width });
              }}
              onClick={(e) => {
                const r = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                setFoco({ f, x: e.clientX - r.left, y: e.clientY - r.top, w: r.width });
              }}
            />
          );
        })}
      </svg>
      {foco && (
        <div
          className="pointer-events-none absolute z-10 min-w-40 -translate-x-1/2 -translate-y-full rounded-xl border border-line bg-card px-3 py-2 text-sm shadow-xl"
          style={{ left: Math.min(Math.max(foco.x, 90), foco.w - 90), top: foco.y - 10 }}
        >
          <div className="font-medium text-ink">{foco.f.properties.nome || foco.f.properties.codarea}</div>
          {dadosFoco ? (
            <div className="text-ink-2">
              <span className="text-ink">{pct(dadosFoco.pct)}</span> dos votos · {numero(dadosFoco.votos)}
            </div>
          ) : (
            <div className="text-muted">sem votos registrados</div>
          )}
        </div>
      )}
      <figcaption className="mt-3">
        <div className="h-1.5 rounded-full" style={{ background: `linear-gradient(90deg, ${escala(0)}, ${escala(max / 4)}, ${escala(max)})` }} />
        <div className="mt-1 flex justify-between text-xs text-muted">
          <span>0%</span>
          <span>% dos votos válidos para o cargo · eleição {mapa.ano}</span>
          <span>{pct(max)}</span>
        </div>
      </figcaption>
    </figure>
  );
}
