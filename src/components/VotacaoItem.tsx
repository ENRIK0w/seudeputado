import Link from "next/link";
import { data, limparDescricao } from "@/lib/formato";
import type { VotacaoResumo } from "@/lib/types";

export function VotacaoItem({ v }: { v: VotacaoResumo }) {
  const validos = v.placar.sim + v.placar.nao || 1;
  return (
    <Link href={`/votacoes/${v.id}/`} className="pressionavel grid grid-cols-[56px_1fr] gap-3 py-4 hover:opacity-90">
      <div className="pt-0.5 text-sm text-muted">
        {data(v.data, { day: "2-digit", month: "short" })}
        <div className="text-xs">{v.data.slice(0, 4)}</div>
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <span className="rounded-full border border-line px-2 py-0.5">{v.casa === "camara" ? "Câmara" : "Senado"}</span>
          {v.proposicao && <span className="font-medium text-ink-2">{v.proposicao}</span>}
          {v.aprovada != null && (
            <span className={v.aprovada ? "text-sim" : "text-nao"}>{v.aprovada ? "● Aprovada" : "● Rejeitada"}</span>
          )}
        </div>
        <p className="mt-1 line-clamp-2 text-[15px] leading-snug text-ink">{limparDescricao(v.descricao)}</p>
        {v.ementa && <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-muted">{v.ementa}</p>}
        <div className="mt-2 flex items-center gap-3 text-xs text-ink-2">
          <span>
            Sim <strong className="text-ink">{v.placar.sim}</strong>
          </span>
          <div className="flex h-1 flex-1 gap-[2px]" data-animar>
            <div className="anim-barra rounded-l-full bg-sim" style={{ width: `${(v.placar.sim / validos) * 100}%` }} />
            <div className="anim-barra rounded-r-full bg-nao" style={{ width: `${(v.placar.nao / validos) * 100}%`, ["--i" as string]: 6 }} />
          </div>
          <span>
            <strong className="text-ink">{v.placar.nao}</strong> Não
          </span>
        </div>
      </div>
    </Link>
  );
}
