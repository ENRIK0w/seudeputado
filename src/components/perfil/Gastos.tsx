"use client";

import { useCallback, useState } from "react";
import { nomeCategoria, reais, reaisCompacto } from "@/lib/formato";
import type { Gastos as TGastos } from "@/lib/types";
import { Contador } from "../Contador";
import { ListaComMais } from "../ListaComMais";
import { FolhaCategoria, FolhaFornecedor, FolhaMes } from "./Detalhes";
import { GraficoMensal } from "./GraficoMensal";
import { Barra, Metrica, Vazio } from "../ui";

type Aberta = { tipo: "categoria"; nome: string } | { tipo: "fornecedor"; chave: string; nome: string } | { tipo: "mes"; mes: string } | null;

/** Linha clicável que abre uma folha de detalhes. */
const linha = "pressionavel group -mx-2 block w-[calc(100%+1rem)] rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-card-2";

export function Gastos({ gastos, slug }: { gastos: TGastos; slug: string }) {
  const [aberta, setAberta] = useState<Aberta>(null);
  const fechar = useCallback(() => setAberta(null), []);
  if (gastos.total === 0) return <Vazio>Nenhuma despesa da cota parlamentar encontrada.</Vazio>;
  const maxCat = gastos.porCategoria[0]?.total || 1;
  const media = gastos.total / Math.max(gastos.porMes.length, 1);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Metrica rotulo="Total na legislatura" valor={<Contador valor={gastos.total} formato="reaisCompacto" />} detalhe={reais(gastos.total)} />
        <Metrica rotulo="Média por mês" valor={<Contador valor={media} formato="reaisCompacto" />} detalhe={`${gastos.porMes.length} meses com despesas`} />
      </div>
      {gastos.porMes.length > 1 && <GraficoMensal meses={gastos.porMes} aoEscolher={(mes) => setAberta({ tipo: "mes", mes })} />}
      <div>
        <h3 className="rotulo mb-2">Com o que gastou</h3>
        <ListaComMais
          className="space-y-1"
          rotulo="categorias"
          itens={gastos.porCategoria.map((c, i) => (
            <li key={c.categoria}>
              <button className={linha} onClick={() => setAberta({ tipo: "categoria", nome: c.categoria })} aria-haspopup="dialog">
                <span className="mb-1 flex justify-between gap-3 text-sm">
                  <span className="truncate text-ink-2 group-hover:text-ink">{nomeCategoria(c.categoria)}</span>
                  <span className="shrink-0 text-ink">
                    {reaisCompacto(c.total)} <span className="text-muted">›</span>
                  </span>
                </span>
                <Barra valor={c.total / maxCat} indice={i} />
              </button>
            </li>
          ))}
        />
      </div>
      <div>
        <h3 className="rotulo mb-2">Maiores fornecedores</h3>
        <ListaComMais
          className="text-sm"
          rotulo="fornecedores"
          itens={gastos.topFornecedores.map((f, i) => (
            <li key={f.documento + i}>
              <button
                className={`${linha} flex items-center justify-between gap-3`}
                onClick={() => setAberta({ tipo: "fornecedor", chave: f.documento || f.fornecedor, nome: f.fornecedor })}
                aria-haspopup="dialog"
              >
                <span className="min-w-0 truncate text-ink">{f.fornecedor}</span>
                <span className="shrink-0 text-ink-2">
                  {reaisCompacto(f.total)} <span className="text-muted">›</span>
                </span>
              </button>
            </li>
          ))}
        />
      </div>
      {aberta?.tipo === "categoria" && <FolhaCategoria slug={slug} nome={aberta.nome} totalGeral={gastos.total} fechar={fechar} />}
      {aberta?.tipo === "fornecedor" && <FolhaFornecedor slug={slug} chave={aberta.chave} nome={aberta.nome} fechar={fechar} />}
      {aberta?.tipo === "mes" && <FolhaMes slug={slug} mes={aberta.mes} fechar={fechar} />}
    </div>
  );
}
