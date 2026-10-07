import Link from "next/link";
import { Abas } from "@/components/Abas";
import { BuscaRapida } from "@/components/BuscaRapida";
import { BarraEspectro, Hemiciclo, LegendaPartidos } from "@/components/Hemiciclo";
import { Card, CabecalhoCard, LinkSeta } from "@/components/ui";
import { VotacaoItem } from "@/components/VotacaoItem";
import { listarParlamentares, listarVotacoes, obterComposicao } from "@/lib/dados";
import { Contador } from "@/components/Contador";
import { Pagina } from "@/components/Pagina";

export const revalidate = 86400;

export default function Inicio() {
  const composicao = obterComposicao();
  const votacoes = listarVotacoes().slice(0, 5);
  const total = listarParlamentares().filter((p) => p.emExercicio).length;

  return (
    <Pagina className="grid gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <section className="lg:col-span-2 lg:pb-4">
        <div className="rotulo">Câmara dos Deputados · Senado Federal</div>
        <h1 className="display mt-4 max-w-[17ch] text-ink">
          Quem te representa em Brasília, <em>voto a voto.</em>
        </h1>
        <p className="texto-longo mt-5 text-[16.5px] text-ink-2">
          <Contador valor={total} /> deputados e senadores em exercício. Como votaram, o que propuseram, quanto gastaram da cota, para onde
          mandaram emendas e onde foram votados.
        </p>
        <div className="mt-7 max-w-xl">
          <BuscaRapida />
        </div>
      </section>

      <Card className="self-start">
        <CabecalhoCard numero="01" titulo="Composição" />
        <Abas
          abas={composicao.map((c) => ({
            rotulo: c.casa === "camara" ? "Câmara dos Deputados" : "Senado Federal",
            conteudo: (
              <div className="space-y-5">
                <BarraEspectro composicao={c} />
                <Hemiciclo composicao={c} />
                <LegendaPartidos composicao={c} />
              </div>
            ),
          }))}
        />
      </Card>

      <div className="grid content-start gap-4">
        <Card>
          <CabecalhoCard numero="02" titulo="Últimas votações" aside={<LinkSeta href="/votacoes/">ver todas</LinkSeta>} />
          <div className="divisor -my-3">
            {votacoes.map((v) => (
              <VotacaoItem key={v.id} v={v} />
            ))}
          </div>
        </Card>
        <Card>
          <CabecalhoCard numero="03" titulo="O que chegou na sua cidade?" />
          <p className="text-ink-2">Busque o seu município e veja quais parlamentares mandaram emendas para lá e quem foi mais votado.</p>
          <Link
            href="/cidade/"
            className="pressionavel mt-4 inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-[14.5px] font-medium text-bg hover:opacity-90"
          >
            Buscar minha cidade <span aria-hidden>→</span>
          </Link>
        </Card>
      </div>
    </Pagina>
  );
}
