"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { urlDados } from "@/lib/caminho";
import { numero, pct, reais, reaisCompacto } from "@/lib/formato";
import { buscarCidades, type MunicipioIndice } from "@/lib/buscaCidade";
import type { ItemBusca, MunicipioDados } from "@/lib/types";
import { Avatar, Barra, CabecalhoCard, Card, Partido, Vazio } from "./ui";

export function MinhaCidade() {
  const [entrada, setEntrada] = useState("");
  const [indice, setIndice] = useState<MunicipioIndice[] | null>(null);
  const [destaque, setDestaque] = useState(0);
  const [busca, setBusca] = useState<ItemBusca[]>([]);
  const [mun, setMun] = useState<MunicipioDados | null>(null);
  const [status, setStatus] = useState<"" | "carregando" | "erro" | "sem-dados">("");

  useEffect(() => {
    fetch(urlDados("municipios-indice.json")).then((r) => r.json()).then(setIndice).catch(() => setIndice([]));
    fetch(urlDados("busca.json")).then((r) => r.json()).then(setBusca).catch(() => {});
    const ibge = new URLSearchParams(window.location.search).get("ibge");
    if (ibge) abrir(ibge);
  }, []);

  async function abrir(ibge: string) {
    setStatus("carregando");
    try {
      const r = await fetch(urlDados(`municipios/${ibge}.json`));
      if (!r.ok) {
        setMun(null);
        setStatus("sem-dados");
        return;
      }
      setMun(await r.json());
      setStatus("");
      window.history.replaceState(null, "", `?ibge=${ibge}`);
    } catch {
      setStatus("erro");
    }
  }

  const sugestoes = useMemo(() => (indice ? buscarCidades(indice, entrada) : []), [indice, entrada]);

  function escolher(c: MunicipioIndice | undefined) {
    if (!c) return;
    setEntrada("");
    setDestaque(0);
    abrir(c[0]);
  }

  const representantes = mun ? busca.filter((b) => b.uf === mun.uf && b.emExercicio) : [];
  const maxEmenda = mun?.emendas[0]?.pago || 1;

  return (
    <div className="grid gap-4">
      <Card>
        <h1 className="titulo text-[32px] leading-tight">O que chegou na sua cidade</h1>
        <p className="mt-2 text-ink-2">Digite o nome do município. Pode incluir o estado: &quot;Campinas SP&quot;.</p>
        <form
          className="relative mt-4"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            escolher(sugestoes[destaque]);
          }}
        >
          <input
            value={entrada}
            onChange={(e) => {
              setEntrada(e.target.value);
              setDestaque(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setDestaque((d) => Math.min(d + 1, sugestoes.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setDestaque((d) => Math.max(d - 1, 0));
              } else if (e.key === "Escape") setEntrada("");
            }}
            placeholder="Nome da cidade"
            autoComplete="off"
            role="combobox"
            aria-expanded={sugestoes.length > 0}
            aria-controls="sugestoes-cidade"
            aria-label="Nome da cidade"
            className="w-full rounded-full border border-line bg-card-2 px-4 py-3 text-[16px] text-ink outline-none placeholder:text-muted focus:border-accent"
          />
          {sugestoes.length > 0 && (
            <ul id="sugestoes-cidade" role="listbox" className="popover card divisor absolute inset-x-0 top-full z-30 mt-2 overflow-hidden !rounded-2xl shadow-2xl">
              {sugestoes.map((c, i) => (
                <li key={c[0]} role="option" aria-selected={i === destaque}>
                  <button
                    type="button"
                    onMouseMove={() => setDestaque(i)}
                    onClick={() => escolher(c)}
                    className={`w-full px-4 py-3 text-left text-ink ${i === destaque ? "bg-card-2" : ""}`}
                  >
                    {c[1]} <span className="text-muted">· {c[2]}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {indice && entrada.trim().length >= 2 && sugestoes.length === 0 && (
            <p className="mt-3 text-sm text-muted">Nenhum município encontrado com esse nome.</p>
          )}
        </form>
        {status === "carregando" && <p className="mt-3 text-sm text-muted">Carregando…</p>}
        {status === "erro" && <p className="mt-3 text-sm text-nao">Não foi possível carregar os dados. Tente de novo.</p>}
        {status === "sem-dados" && <p className="mt-3 text-sm text-muted">Ainda não temos dados para esse município.</p>}
      </Card>

      {mun && (
        <>
          <div className="px-1">
            <p className="text-sm text-muted">{mun.uf}</p>
            <h2 className="titulo text-[36px] leading-tight">{mun.nome}</h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CabecalhoCard titulo="Emendas recebidas" aside="desde 2023" />
              <div className="numero text-[40px] leading-none">{reaisCompacto(mun.totalEmendasPago)}</div>
              <p className="mt-1 text-sm text-muted">pagos por {mun.emendas.length} parlamentares</p>
              {mun.emendas.length === 0 ? (
                <div className="mt-4">
                  <Vazio>Nenhuma emenda individual identificada para este município.</Vazio>
                </div>
              ) : (
                <ul className="mt-5 space-y-3">
                  {mun.emendas.slice(0, 12).map((e) => (
                    <li key={e.slug}>
                      <Link href={`/p/${e.slug}/`} className="block hover:opacity-90">
                        <div className="mb-1 flex justify-between gap-3 text-sm">
                          <span className="truncate text-ink">
                            {e.nome} <span className="text-muted">· {e.partido}</span>
                          </span>
                          <span className="shrink-0 text-ink-2" title={`Empenhado: ${reais(e.empenhado)}`}>
                            {reaisCompacto(e.pago)}
                          </span>
                        </div>
                        <Barra valor={e.pago / maxEmenda} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <CabecalhoCard titulo="Mais votados aqui" aside="última eleição" />
              {mun.maisVotados.length === 0 ? (
                <Vazio>Sem resultado eleitoral cruzado para este município.</Vazio>
              ) : (
                <ol className="divisor">
                  {mun.maisVotados.slice(0, 10).map((m, i) => (
                    <li key={m.slug}>
                      <Link href={`/p/${m.slug}/`} className="flex items-center gap-3 py-2.5 hover:opacity-90">
                        <span className="w-4 text-sm text-muted">{i + 1}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-ink">{m.nome}</span>
                          <span className="text-xs text-muted">
                            {m.casa === "camara" ? "Deputado(a)" : "Senador(a)"} · {m.partido}
                          </span>
                        </span>
                        <span className="text-right text-sm">
                          <span className="block text-ink">{pct(m.pct)}</span>
                          <span className="text-xs text-muted">{numero(m.votos)} votos</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </div>

          <Card>
            <CabecalhoCard titulo={`Quem representa ${mun.uf} em Brasília`} aside={`${representantes.length} parlamentares`} />
            <ul className="grid gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
              {representantes
                .sort((a, b) => (a.casa === b.casa ? a.nome.localeCompare(b.nome, "pt-BR") : a.casa === "senado" ? -1 : 1))
                .map((r) => (
                  <li key={r.slug}>
                    <Link href={`/p/${r.slug}/`} className="flex items-center gap-3 py-2 hover:opacity-90">
                      <Avatar nome={r.nome} foto={r.foto} partido={r.partido} tamanho={32} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm text-ink">{r.nome}</span>
                        <span className="flex items-center gap-2">
                          <Partido sigla={r.partido} />
                          <span className="text-xs text-muted">{r.casa === "senado" ? "Senado" : "Câmara"}</span>
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
