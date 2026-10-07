"use client";

import { geoArea, geoMercator, geoPath } from "d3-geo";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { useEffect, useMemo, useState } from "react";
import { urlDados } from "@/lib/caminho";
import { numero, pct } from "@/lib/formato";
import type { EleicaoMapa } from "@/lib/types";

type Props = { codarea: string; nome?: string };

/**
 * O d3-geo espera anéis externos no sentido horário; GeoJSON padrão (RFC 7946, IBGE,
 * mapshaper) usa anti-horário — aí o polígono vira "o globo inteiro menos o município".
 * Se a área passa de meio globo, invertemos os anéis.
 */
function orientarParaD3(f: Feature<Geometry, Props>): Feature<Geometry, Props> {
  if (geoArea(f) <= 2 * Math.PI) return f;
  const g = f.geometry;
  if (g.type === "Polygon") return { ...f, geometry: { ...g, coordinates: g.coordinates.map((r) => [...r].reverse()) } };
  if (g.type === "MultiPolygon")
    return { ...f, geometry: { ...g, coordinates: g.coordinates.map((p) => p.map((r) => [...r].reverse())) } };
  return f;
}
// Área máxima do desenho; a altura final segue o formato do estado.
const L = 360;
const A_MAX = 400;

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
        const bruto = (await g.json()) as FeatureCollection<Geometry, Props>;
        setGeo({ ...bruto, features: bruto.features.map(orientarParaD3) });
        setMapa(await m.json());
      })
      .catch(() => setErro(true));
  }, [slug, uf]);

  const { caminhos, escala, max, altura } = useMemo(() => {
    if (!geo || !mapa) return { caminhos: [], escala: null, max: 0, altura: 0 };
    const proj = geoMercator().fitSize([L, A_MAX], geo);
    const path = geoPath(proj);
    const [[, y0], [, y1]] = path.bounds(geo);
    proj.translate([proj.translate()[0], proj.translate()[1] - y0]);
    const max = Math.max(...Object.values(mapa.municipios).map((m) => m.pct), 0.0001);
    // Escala em raiz quadrada entre as duas cores do tema (CSS), para funcionar no claro e no escuro.
    const escala = (v: number) => `color-mix(in oklab, var(--mapa-1) ${Math.round(Math.sqrt(Math.min(v / max, 1)) * 100)}%, var(--mapa-0))`;
    // Atraso de cada município proporcional à distância do reduto: a cor "se espalha" a partir dele.
    const reduto = geo.features.reduce((a, b) => ((mapa.municipios[b.properties.codarea]?.pct ?? 0) > (mapa.municipios[a.properties.codarea]?.pct ?? 0) ? b : a));
    const [rx, ry] = path.centroid(reduto);
    const caminhos = geo.features.map((f) => {
      const [cx, cy] = path.centroid(f);
      return { f, d: path(f) ?? "", atraso: Math.round(Math.hypot(cx - rx, cy - ry) * 2.2) };
    });
    return { caminhos, escala, max, altura: Math.ceil(y1 - y0) };
  }, [geo, mapa]);

  if (erro) return <p className="rounded-xl bg-card-2 px-4 py-6 text-center text-sm text-muted">Mapa eleitoral indisponível para este parlamentar.</p>;
  if (!escala || !mapa) return <div className="aspect-square animate-pulse rounded-xl bg-card-2" />;


  const dadosFoco = foco ? mapa.municipios[foco.f.properties.codarea] : null;

  return (
    <figure className="relative">
      <svg viewBox={`0 0 ${L} ${altura}`} className="w-full" data-animar role="img" aria-label={`Votos por município em ${uf}, eleição de ${mapa.ano}`} onMouseLeave={() => setFoco(null)}>
        {caminhos.map(({ f, d, atraso }) => {
          const m = mapa.municipios[f.properties.codarea];
          const ativo = foco?.f === f;
          return (
            <path
              key={f.properties.codarea}
              className="anim-area"
              style={{ ["--i" as string]: atraso, fill: m ? escala(m.pct) : "var(--card-2)" }}
              d={d}
              stroke={ativo ? "var(--ink)" : "var(--card)"}
              strokeWidth={ativo ? 1.5 : 0.25}
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
          <span>{pct(max)}</span>
        </div>
        <p className="mt-1 text-center text-xs text-muted">% dos votos válidos para o cargo em cada município · eleição {mapa.ano}</p>
      </figcaption>
    </figure>
  );
}
