import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { BarraAbas } from "@/components/BarraAbas";
import { Marca } from "@/components/Marca";
import { Navegacao } from "@/components/Navegacao";
import { Revelador } from "@/components/Revelador";
import { TemaToggle } from "@/components/TemaToggle";
import { TransicaoPagina } from "@/components/TransicaoPagina";
import { obterMeta } from "@/lib/dados";
import { data } from "@/lib/formato";
import { SCRIPT_ANIMACAO, SCRIPT_TEMA } from "@/lib/scriptsIniciais";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Seu Deputado — dossiê aberto do Congresso", template: "%s · Seu Deputado" },
  description:
    "Como votou, o que propôs, quanto gastou e para onde mandou emendas cada deputado federal e senador. Dados públicos, sem opinião.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0c0c0d" },
    { media: "(prefers-color-scheme: light)", color: "#f6f4ef" },
  ],
  width: "device-width",
  initialScale: 1,
  // Conteúdo vai até as bordas (a barra de abas respeita a área segura do iPhone)
  viewportFit: "cover",
};

const FONTES = [
  ["Câmara dos Deputados", "https://dadosabertos.camara.leg.br"],
  ["Senado Federal", "https://legis.senado.leg.br/dadosabertos"],
  ["Tribunal Superior Eleitoral", "https://dadosabertos.tse.jus.br"],
  ["Portal da Transparência", "https://portaldatransparencia.gov.br/emendas"],
  ["IBGE", "https://www.ibge.gov.br"],
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  const meta = obterMeta();
  return (
    // suppressHydrationWarning: os scripts abaixo acrescentam data-anim/data-theme no <html> antes do React.
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA + ";" + SCRIPT_ANIMACAO }} />
      </head>
      <body className="min-h-dvh">
        <Revelador />
        {meta.exemplo && (
          <div className="aviso-exemplo px-4 py-2 text-center text-[13px]">
            Dados de <strong>exemplo</strong>: nomes, votos e valores são fictícios. Rode <code>npm run dados</code> para usar os dados oficiais.
          </div>
        )}
        <header className="cabecalho sticky top-0 z-30">
          <div className="mx-auto flex w-full max-w-6xl items-center gap-6 px-4 md:px-6">
            <Link href="/" className="flex shrink-0 items-center gap-2.5 py-3 leading-none" aria-label="Seu Deputado — início">
              <Marca className="h-[17px] w-6 text-ink" />
              <span className="titulo text-[21px] text-ink">Seu Deputado</span>
            </Link>
            <div className="hidden min-w-0 flex-1 md:block">
              <Navegacao />
            </div>
            <div className="ml-auto flex items-center gap-1 md:ml-0">
              <Link
                href="/parlamentares/"
                aria-label="Buscar parlamentar"
                className="pressionavel inline-flex size-9 items-center justify-center rounded-full text-ink-2 hover:bg-card-2 hover:text-ink"
              >
                <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                  <circle cx="11" cy="11" r="6.5" />
                  <path d="m20 20-4-4" />
                </svg>
              </Link>
              <TemaToggle />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 pt-6 pb-10 md:px-6 md:pt-10">
          <TransicaoPagina>{children}</TransicaoPagina>
        </main>
        <footer className="border-t border-line">
          <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 pt-10 pb-32 text-sm text-muted md:grid-cols-[1.3fr_1fr_1fr] md:px-6 md:pb-10">
            <div>
              <div className="flex items-center gap-2.5 text-ink">
                <Marca className="h-[14px] w-5" />
                <span className="titulo text-[18px]">Seu Deputado</span>
              </div>
              <p className="texto-longo mt-3">
                Projeto independente e apartidário, sem fins lucrativos. Não somos ligados a nenhum parlamentar ou partido — mostramos os dados
                públicos, sem opinião.
              </p>
            </div>
            <div>
              <div className="rotulo mb-3">Fontes</div>
              <ul className="space-y-1.5">
                {FONTES.map(([nome, url]) => (
                  <li key={url}>
                    <a href={url} target="_blank" rel="noreferrer" className="hover:text-ink">
                      {nome}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="rotulo mb-3">Sobre os dados</div>
              <p>Atualizado em {data(meta.geradoEm)}.</p>
              <Link href="/metodologia/" className="mt-1.5 inline-block text-ink-2 underline decoration-line underline-offset-4 hover:text-ink">
                Metodologia e fontes
              </Link>
            </div>
          </div>
        </footer>
        <BarraAbas />
      </body>
    </html>
  );
}
