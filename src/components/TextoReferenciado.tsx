import { dividirPorReferencias, type Referencia } from "@/lib/referencias";

/** Texto com as citações de projetos e leis viradas em links para a fonte oficial (nova aba). */
export function TextoReferenciado({ texto, referencias = [] }: { texto: string; referencias?: Referencia[] }) {
  return (
    <>
      {dividirPorReferencias(texto, referencias).map((parte, i) =>
        typeof parte === "string" ? (
          parte
        ) : (
          <a
            key={i}
            href={parte.url}
            target="_blank"
            rel="noreferrer"
            className="ref-link"
            title={parte.tipo === "lei" ? `Abrir ${parte.trecho} no LexML (legislação oficial)` : `Abrir ${parte.trecho} na Câmara dos Deputados`}
          >
            {parte.trecho}
          </a>
        ),
      )}
    </>
  );
}
