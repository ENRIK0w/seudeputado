import { data, duracao } from "@/lib/formato";
import { corPartido } from "@/lib/partidos";
import type { PeriodoPartido } from "@/lib/types";
import { ListaComMais } from "../ListaComMais";

/** Linha do tempo das filiações: barra proporcional ao tempo + lista com datas. */
export function HistoricoPartidos({ periodos }: { periodos: PeriodoPartido[] }) {
  if (periodos.length === 0) return <p className="text-sm text-muted">Sem histórico de filiação nas fontes oficiais.</p>;
  const hoje = new Date().toISOString().slice(0, 10);
  const ini = new Date(periodos[0].inicio).getTime();
  const fim = new Date(hoje).getTime();
  const span = fim - ini || 1;
  const recentes = [...periodos].reverse();
  return (
    <div>
      <div className="flex h-2 gap-[2px]" data-animar role="img" aria-label={periodos.map((p) => `${p.partido}: ${duracao(p.inicio, p.fim)}`).join("; ")}>
        {periodos.map((p, i) => {
          const w = ((new Date(p.fim ?? hoje).getTime() - new Date(p.inicio).getTime()) / span) * 100;
          return (
            <div
              key={i}
              className="anim-barra h-full first:rounded-l-full last:rounded-r-full"
              style={{ width: `${Math.max(w, 1.5)}%`, background: corPartido(p.partido), ["--i" as string]: i * 3 }}
              title={`${p.partido} · ${duracao(p.inicio, p.fim)}`}
            />
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted">
        <span>{periodos[0].inicio.slice(0, 4)}</span>
        <span>hoje</span>
      </div>
      <div className="mt-2">
      <ListaComMais
        inicial={4}
        rotulo="filiações"
        itens={recentes.map((p, i) => (
          <li key={i} className="flex items-center justify-between gap-3 py-2">
            <span className="inline-flex items-center gap-2">
              <span className="size-2.5 rounded-full" style={{ background: corPartido(p.partido) }} aria-hidden />
              <span className="font-medium text-ink">{p.partido}</span>
              {!p.fim && <span className="rounded-full bg-card-2 px-2 py-0.5 text-xs text-ink-2">atual</span>}
            </span>
            <span className="text-right text-sm text-ink-2">
              {duracao(p.inicio, p.fim)}
              <span className="block text-xs text-muted">
                {data(p.inicio, { month: "short", year: "numeric" })} – {p.fim ? data(p.fim, { month: "short", year: "numeric" }) : "hoje"}
              </span>
            </span>
          </li>
        ))}
      />
      </div>
    </div>
  );
}
