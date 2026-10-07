import { corPartido, CORES_ESPECTRO, espectroDe, ordemEspectro, type Espectro } from "@/lib/partidos";
import type { Composicao } from "@/lib/types";
import { numero } from "@/lib/formato";
import { Contador } from "./Contador";

/** Posições das cadeiras num semicírculo, da esquerda para a direita. */
function cadeiras(total: number) {
  const fileiras = total > 300 ? 12 : total > 120 ? 8 : 5;
  const rIn = 0.42;
  const raios = Array.from({ length: fileiras }, (_, i) => rIn + ((1 - rIn) * i) / (fileiras - 1));
  const soma = raios.reduce((a, b) => a + b, 0);
  const porFileira = raios.map((r) => Math.round((total * r) / soma));
  porFileira[fileiras - 1] += total - porFileira.reduce((a, b) => a + b, 0);

  const pontos: { x: number; y: number; ang: number }[] = [];
  raios.forEach((r, i) => {
    const n = porFileira[i];
    for (let j = 0; j < n; j++) {
      const ang = n === 1 ? Math.PI / 2 : (Math.PI * j) / (n - 1);
      pontos.push({ x: -r * Math.cos(ang), y: -r * Math.sin(ang), ang });
    }
  });
  pontos.sort((a, b) => a.ang - b.ang || Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y));
  const raioPonto = Math.min((1 - rIn) / (fileiras - 1), Math.PI / porFileira[fileiras - 1]) * 0.42;
  return { pontos, raioPonto };
}

export function Hemiciclo({ composicao }: { composicao: Composicao }) {
  const partidos = [...composicao.partidos].sort(
    (a, b) => ordemEspectro(a.partido) - ordemEspectro(b.partido) || b.cadeiras - a.cadeiras,
  );
  // Esquerda à esquerda: direita fica no fim da lista; dentro do bloco, maiores nas pontas.
  const sequencia = partidos.flatMap((p) => Array<string>(p.cadeiras).fill(p.partido));
  const { pontos, raioPonto } = cadeiras(sequencia.length);
  const vb = 1 + raioPonto * 2;

  return (
    <svg viewBox={`${-vb} ${-vb} ${vb * 2} ${vb + raioPonto * 2}`} className="w-full" data-animar role="img" aria-label={`Composição: ${partidos.map((p) => `${p.partido} ${p.cadeiras}`).join(", ")}`}>
      {pontos.map((pt, i) => (
        <circle key={i} className="anim-ponto" style={{ ["--i" as string]: i }} cx={pt.x} cy={pt.y} r={raioPonto} fill={corPartido(sequencia[i])}>
          <title>{sequencia[i]}</title>
        </circle>
      ))}
      <text x="0" y={-0.08} textAnchor="middle" className="numero" fontSize="0.24" fill="var(--ink)">
        {composicao.total}
      </text>
      <text x="0" y={0.02} textAnchor="middle" fontSize="0.07" fill="var(--muted)">
        cadeiras ocupadas
      </text>
    </svg>
  );
}

export function BarraEspectro({ composicao }: { composicao: Composicao }) {
  const soma: Record<Espectro, number> = { esquerda: 0, centro: 0, direita: 0 };
  for (const p of composicao.partidos) soma[espectroDe(p.partido)] += p.cadeiras;
  const total = composicao.total || 1;
  const maioria = Math.floor(total / 2) + 1;
  const ordem: Espectro[] = ["esquerda", "centro", "direita"];
  return (
    <div>
      <div className="flex items-end justify-between text-sm">
        <span className="text-ink-2">
          Esquerda <span className="numero text-2xl text-ink"><Contador valor={soma.esquerda} /></span>
        </span>
        <span className="text-ink-2">
          Centro <span className="numero text-2xl text-ink"><Contador valor={soma.centro} /></span>
        </span>
        <span className="text-ink-2">
          <span className="numero text-2xl text-ink"><Contador valor={soma.direita} /></span> Direita
        </span>
      </div>
      <div className="relative mt-2 flex h-1.5 gap-[2px]" data-animar>
        {ordem.map((e, i) => (
          <div
            key={e}
            className="anim-barra h-full first:rounded-l-full last:rounded-r-full"
            style={{ width: `${(soma[e] / total) * 100}%`, background: CORES_ESPECTRO[e], ["--i" as string]: i * 4 }}
          />
        ))}
        <div className="absolute -top-1 h-3.5 w-0.5 rounded bg-ink" style={{ left: `${(maioria / total) * 100}%` }} aria-hidden />
      </div>
      <p className="mt-2 text-center text-xs text-muted">maioria simples: {numero(maioria)} · classificação aproximada, veja a metodologia</p>
    </div>
  );
}

export function LegendaPartidos({ composicao, limite = 8 }: { composicao: Composicao; limite?: number }) {
  const top = composicao.partidos.slice(0, limite);
  const outros = composicao.partidos.slice(limite).reduce((s, p) => s + p.cadeiras, 0);
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
      {top.map((p) => (
        <li key={p.partido} className="inline-flex items-center gap-1.5 text-ink-2">
          <span className="size-2.5 rounded-sm" style={{ background: corPartido(p.partido) }} aria-hidden />
          {p.partido} <span className="font-medium text-ink">{p.cadeiras}</span>
        </li>
      ))}
      {outros > 0 && (
        <li className="text-ink-2">
          Outros <span className="font-medium text-ink">{outros}</span>
        </li>
      )}
    </ul>
  );
}
