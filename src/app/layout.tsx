import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Navegacao } from "@/components/Navegacao";
import { obterMeta } from "@/lib/dados";
import { data } from "@/lib/formato";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Seu Deputado — dossiê aberto do Congresso", template: "%s · Seu Deputado" },
  description:
    "Como votou, o que propôs, quanto gastou e para onde mandou emendas cada deputado federal e senador. Dados públicos, sem opinião.",
};

export const viewport: Viewport = { themeColor: "#0b0b0d", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  const meta = obterMeta();
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh">
        {meta.exemplo && (
          <div className="bg-[#2a2110] px-4 py-2 text-center text-[13px] text-[#f3d28b]">
            Dados de <strong>exemplo</strong>: nomes, votos e valores são fictícios. Rode <code>npm run dados</code> para usar os dados oficiais.
          </div>
        )}
        <div className="mx-auto w-full max-w-5xl px-4">
          <header className="flex items-center justify-between gap-4 pt-5 pb-4">
            <Link href="/" className="leading-none">
              <span className="titulo block text-[26px] text-ink">Seu Deputado</span>
              <span className="mt-1 block text-[13px] text-muted">dossiê aberto do Congresso</span>
            </Link>
            <Link
              href="/parlamentares/"
              aria-label="Buscar parlamentar"
              className="inline-flex size-11 items-center justify-center rounded-full border border-line bg-card text-ink-2 hover:text-ink"
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </Link>
          </header>
          <div className="sticky top-0 z-20 -mx-4 bg-bg/90 px-4 py-2 backdrop-blur">
            <Navegacao />
          </div>
          <main className="py-4">{children}</main>
          <footer className="mt-10 border-t border-line py-8 text-sm text-muted">
            <p>
              Dados públicos da Câmara, do Senado, do TSE e do Portal da Transparência. Atualizado em {data(meta.geradoEm)}.{" "}
              <Link href="/metodologia/" className="underline underline-offset-4 hover:text-ink">
                Metodologia e fontes
              </Link>
            </p>
            <p className="mt-2">Projeto independente e apartidário. Não somos ligados a nenhum parlamentar ou partido.</p>
          </footer>
        </div>
      </body>
    </html>
  );
}
