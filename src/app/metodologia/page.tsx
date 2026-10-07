import type { Metadata } from "next";
import { Card } from "@/components/ui";
import { obterMeta } from "@/lib/dados";
import { data } from "@/lib/formato";

export const revalidate = 86400;

export const metadata: Metadata = { title: "Metodologia e fontes" };

export default function Metodologia() {
  const meta = obterMeta();
  return (
    <Card className="mx-auto max-w-3xl">
      <h1 className="titulo text-[32px]">Metodologia e fontes</h1>
      <div className="mt-4 space-y-4 leading-relaxed text-ink-2 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-medium [&_h2]:text-ink [&_strong]:text-ink">
        <p>
          O Seu Deputado reúne dados públicos e oficiais. Não damos notas nem classificamos parlamentares como bons ou ruins:
          mostramos o que eles fizeram e de onde vem cada número. Os dados são atualizados uma vez por dia.
        </p>

        <h2>Participação</h2>
        <p>
          Percentual das votações nominais de plenário, ocorridas enquanto o parlamentar estava no exercício do mandato, em
          que ele registrou voto (sim, não, abstenção ou obstrução). <strong>Não é a presença oficial</strong>: faltas
          justificadas também contam como ausência aqui. No Senado, licenças e missões oficiais ficam fora da conta.
        </p>

        <h2>Fidelidade partidária</h2>
        <p>
          Na Câmara, percentual de votos iguais à orientação do partido (ou do bloco/federação que o inclui) nas votações em
          que houve orientação. &quot;Liberado&quot; não entra na conta. No Senado, que não publica orientações, comparamos
          com o voto da <strong>maioria da bancada do partido</strong> (sem contar o próprio voto).
        </p>

        <h2>Alinhamento com o governo</h2>
        <p>
          Na Câmara, percentual de votos iguais à orientação da liderança do Governo. No Senado, usamos como referência o
          voto do líder do Governo. Só calculamos com pelo menos 10 votações comparáveis.
        </p>

        <h2>Esquerda, centro e direita</h2>
        <p>
          A divisão do plenário em esquerda, centro e direita é uma <strong>aproximação</strong> baseada na posição que os
          partidos costumam ocupar no debate público e na imprensa. Ela serve só para leitura geral da composição; nenhuma
          métrica do site depende dela.
        </p>

        <h2>Onde foi votado</h2>
        <p>
          Percentual dos votos válidos para o cargo (deputado federal ou senador) que o parlamentar recebeu em cada
          município, no 1º turno da eleição em que foi eleito. Fonte: TSE. Deputados são ligados ao TSE pelo CPF; senadores
          pelo nome e estado.
        </p>

        <h2>Emendas</h2>
        <p>
          Emendas individuais registradas no Portal da Transparência a partir de 2023. &quot;Empenhado&quot; é o valor
          reservado no orçamento; &quot;pago&quot; inclui restos a pagar quitados. Emendas de bancada, de comissão e de
          relator não têm autor individual e não aparecem no perfil.
        </p>

        <h2>Fontes</h2>
        <ul className="list-disc pl-5">
          <li>Câmara dos Deputados — dadosabertos.camara.leg.br</li>
          <li>Senado Federal — legis.senado.leg.br/dadosabertos</li>
          <li>Tribunal Superior Eleitoral — dadosabertos.tse.jus.br</li>
          <li>Portal da Transparência (CGU) — portaldatransparencia.gov.br</li>
          <li>IBGE — malhas e códigos de municípios</li>
        </ul>
        <p className="text-sm text-muted">Última atualização: {data(meta.geradoEm)}.</p>
      </div>
    </Card>
  );
}
