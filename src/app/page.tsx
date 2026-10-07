import Link from "next/link";
import { Abas } from "@/components/Abas";
import { BuscaRapida } from "@/components/BuscaRapida";
import { BarraEspectro, Hemiciclo, LegendaPartidos } from "@/components/Hemiciclo";
import { Card, CabecalhoCard, LinkSeta } from "@/components/ui";
import { VotacaoItem } from "@/components/VotacaoItem";
import { listarParlamentares, listarVotacoes, obterComposicao } from "@/lib/dados";

export const revalidate = 86400;

export default function Inicio() {
  const composicao = obterComposicao();
  const votacoes = listarVotacoes().slice(0, 8);
  const total = listarParlamentares().filter((p) => p.emExercicio).length;

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
      <Card className="lg:col-span-2">
        <h1 className="titulo text-[32px] leading-[1.1] sm:text-[40px]">
          Quem te representa em Brasília, <span className="text-accent">voto a voto</span>.
        </h1>
        <p className="mt-3 max-w-2xl text-ink-2">
          {total} deputados e senadores em exercício. Como votaram, o que propuseram, quanto gastaram da cota, para onde
          mandaram emendas e onde foram votados.
        </p>
        <div className="mt-5 max-w-xl">
          <BuscaRapida />
        </div>
      </Card>

      <Card>
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
          <CabecalhoCard titulo="Últimas votações" aside={<LinkSeta href="/votacoes/">ver todas</LinkSeta>} />
          <div className="divisor -my-4">
            {votacoes.map((v) => (
              <VotacaoItem key={v.id} v={v} />
            ))}
          </div>
        </Card>
        <Card>
          <CabecalhoCard titulo="O que chegou na sua cidade?" />
          <p className="text-ink-2">
            Digite seu CEP e veja quais parlamentares mandaram emendas para o seu município e quem foi mais votado lá.
          </p>
          <Link
            href="/cidade/"
            className="mt-4 inline-flex rounded-full bg-ink px-5 py-2.5 text-[15px] font-medium text-bg hover:opacity-90"
          >
            Buscar pelo CEP
          </Link>
        </Card>
      </div>
    </div>
  );
}
