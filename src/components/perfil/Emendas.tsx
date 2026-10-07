import { numero, reais, reaisCompacto } from "@/lib/formato";
import type { EmendaResumo } from "@/lib/types";
import { Contador } from "../Contador";
import { ListaComMais } from "../ListaComMais";
import { Barra, Metrica, Vazio } from "../ui";

export function Emendas({ emendas }: { emendas: EmendaResumo[] }) {
  if (emendas.length === 0) return <Vazio>Nenhuma emenda individual encontrada no Portal da Transparência.</Vazio>;
  const empenhado = emendas.reduce((s, e) => s + e.empenhado, 0);
  const pago = emendas.reduce((s, e) => s + e.pago, 0);

  const agrupar = (chave: (e: EmendaResumo) => string) => {
    const m = new Map<string, { pago: number; empenhado: number; n: number }>();
    for (const e of emendas) {
      const k = chave(e);
      const a = m.get(k) ?? { pago: 0, empenhado: 0, n: 0 };
      a.pago += e.pago;
      a.empenhado += e.empenhado;
      a.n++;
      m.set(k, a);
    }
    return [...m].sort((a, b) => b[1].empenhado - a[1].empenhado);
  };
  const porMunicipio = agrupar((e) => (e.municipio ? `${e.municipio}${e.uf ? ` · ${e.uf}` : ""}` : e.uf ?? "Nacional"));
  const porFuncao = agrupar((e) => e.funcao || "Outros");
  const porAno = agrupar((e) => String(e.ano)).sort((a, b) => a[0].localeCompare(b[0]));
  const maxMun = porMunicipio[0]?.[1].empenhado || 1;
  const maxAno = Math.max(...porAno.map(([, v]) => v.empenhado), 1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Metrica rotulo="Empenhado" valor={<Contador valor={empenhado} formato="reaisCompacto" />} detalhe={`${numero(emendas.length)} emendas`} />
        <Metrica rotulo="Pago" valor={<Contador valor={pago} formato="reaisCompacto" />} detalhe={`${Math.round((pago / (empenhado || 1)) * 100)}% do empenhado`} />
      </div>

      <div>
        <h3 className="mb-3 text-sm text-muted">Por ano — empenhado e pago</h3>
        <ul className="space-y-2.5">
          {porAno.map(([ano, v], i) => (
            <li key={ano} className="grid grid-cols-[40px_1fr_auto] items-center gap-3 text-sm">
              <span className="text-ink-2">{ano}</span>
              <div className="relative h-2 rounded-full bg-card-2" data-animar>
                <div className="anim-barra absolute inset-y-0 left-0 rounded-full bg-accent/35" style={{ width: `${(v.empenhado / maxAno) * 100}%`, ["--i" as string]: i * 2 }} />
                <div className="anim-barra absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: `${(v.pago / maxAno) * 100}%`, ["--i" as string]: i * 2 + 4 }} />
              </div>
              <span className="text-ink">{reaisCompacto(v.empenhado)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 flex gap-4 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-sm bg-accent" />pago</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-sm bg-accent/35" />empenhado</span>
        </p>
      </div>

      <div>
        <h3 className="mb-3 text-sm text-muted">Para onde foi</h3>
        <ListaComMais
          className="space-y-2.5"
          rotulo="destinos"
          itens={porMunicipio.map(([nome, v], i) => (
            <li key={nome}>
              <div className="mb-1 flex justify-between gap-3 text-sm">
                <span className="truncate text-ink-2">{nome}</span>
                <span className="shrink-0 text-ink" title={`Pago: ${reais(v.pago)}`}>{reaisCompacto(v.empenhado)}</span>
              </div>
              <Barra valor={v.empenhado / maxMun} indice={i} />
            </li>
          ))}
        />
      </div>

      <div>
        <h3 className="mb-2 text-sm text-muted">Por área</h3>
        <div className="flex flex-wrap gap-2">
          {porFuncao.map(([f, v]) => (
            <span key={f} className="rounded-full border border-line px-3 py-1 text-sm text-ink-2">
              {f} <span className="text-ink">{reaisCompacto(v.empenhado)}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
