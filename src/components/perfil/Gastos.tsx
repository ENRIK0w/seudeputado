import { reais, reaisCompacto } from "@/lib/formato";
import type { Gastos as TGastos } from "@/lib/types";
import { Contador } from "../Contador";
import { ListaComMais } from "../ListaComMais";
import { GraficoMensal } from "./GraficoMensal";
import { Barra, Metrica, Vazio } from "../ui";

function titulo(s: string) {
  return s.replace(/\.$/, "").replace(/\s+,/g, ",");
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
      {gastos.porMes.length > 1 && <GraficoMensal meses={gastos.porMes} />}
      <div>
        <h3 className="mb-3 text-sm text-muted">Com o que gastou</h3>
        <ListaComMais
          className="space-y-2.5"
          rotulo="categorias"
          itens={gastos.porCategoria.map((c, i) => (
            <li key={c.categoria}>
              <div className="mb-1 flex justify-between gap-3 text-sm">
                <span className="truncate text-ink-2">{titulo(c.categoria)}</span>
                <span className="shrink-0 text-ink">{reaisCompacto(c.total)}</span>
              </div>
              <Barra valor={c.total / maxCat} indice={i} />
            </li>
          ))}
        />
      </div>
      <div>
        <h3 className="mb-2 text-sm text-muted">Maiores fornecedores</h3>
        <ListaComMais
          className="divisor text-sm"
          rotulo="fornecedores"
          itens={gastos.topFornecedores.map((f, i) => (
            <li key={f.documento + i} className="flex items-center justify-between gap-3 py-2">
              <span className="min-w-0 truncate text-ink">
                {f.fornecedor}
                {f.documento && f.documento !== f.fornecedor && <span className="ml-1.5 text-xs text-muted">{f.documento}</span>}
              </span>
              <span className="shrink-0 text-ink-2">{reaisCompacto(f.total)}</span>
            </li>
          ))}
        />
      </div>
    </div>
  );
}
