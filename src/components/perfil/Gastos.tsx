import { reais, reaisCompacto } from "@/lib/formato";
import type { Gastos as TGastos } from "@/lib/types";
import { Contador } from "../Contador";
import { Barra, Metrica, Vazio } from "../ui";

function titulo(s: string) {
  return s.replace(/\.$/, "").replace(/\s+,/g, ",");
}

/** Gasto mensal: colunas finas, uma por mês, com tooltip nativo. */
function Mensal({ meses }: { meses: TGastos["porMes"] }) {
  const max = Math.max(...meses.map((m) => m.total), 1);
  const w = 100 / meses.length;
  return (
    <figure>
      <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="h-24 w-full" data-animar role="img" aria-label="Gasto mensal da cota">
        {meses.map((m, i) => {
          const h = (m.total / max) * 30;
          return (
            <rect key={m.mes} className="anim-coluna" style={{ ["--i" as string]: i }} x={i * w + w * 0.15} y={32 - h} width={w * 0.7} height={h} rx={0.6} fill="var(--accent)" opacity={0.85}>
              <title>{`${m.mes.split("-").reverse().join("/")}: ${reais(m.total)}`}</title>
            </rect>
          );
        })}
      </svg>
      <figcaption className="mt-1 flex justify-between text-xs text-muted">
        <span>{meses[0]?.mes.split("-").reverse().join("/")}</span>
        <span>maior mês: {reaisCompacto(max)}</span>
        <span>{meses.at(-1)?.mes.split("-").reverse().join("/")}</span>
      </figcaption>
    </figure>
  );
}

export function Gastos({ gastos }: { gastos: TGastos }) {
  if (gastos.total === 0) return <Vazio>Nenhuma despesa da cota parlamentar encontrada.</Vazio>;
  const maxCat = gastos.porCategoria[0]?.total || 1;
  const media = gastos.total / Math.max(gastos.porMes.length, 1);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Metrica rotulo="Total na legislatura" valor={<Contador valor={gastos.total} formato="reaisCompacto" />} detalhe={reais(gastos.total)} />
        <Metrica rotulo="Média por mês" valor={<Contador valor={media} formato="reaisCompacto" />} detalhe={`${gastos.porMes.length} meses com despesas`} />
      </div>
      {gastos.porMes.length > 1 && <Mensal meses={gastos.porMes} />}
      <div>
        <h3 className="mb-3 text-sm text-muted">Com o que gastou</h3>
        <ul className="space-y-3">
          {gastos.porCategoria.slice(0, 8).map((c, i) => (
            <li key={c.categoria}>
              <div className="mb-1 flex justify-between gap-3 text-sm">
                <span className="truncate text-ink-2">{titulo(c.categoria)}</span>
                <span className="shrink-0 text-ink">{reaisCompacto(c.total)}</span>
              </div>
              <Barra valor={c.total / maxCat} indice={i} />
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="mb-2 text-sm text-muted">Maiores fornecedores</h3>
        <ol className="divisor text-sm">
          {gastos.topFornecedores.slice(0, 6).map((f, i) => (
            <li key={f.documento + i} className="flex justify-between gap-3 py-2">
              <span className="min-w-0">
                <span className="block truncate text-ink">{f.fornecedor}</span>
                {f.documento && f.documento !== f.fornecedor && <span className="text-xs text-muted">{f.documento}</span>}
              </span>
              <span className="shrink-0 text-ink-2">{reais(f.total)}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
