import type { Metadata } from "next";
import { ListaVotacoes } from "@/components/ListaVotacoes";
import { listarVotacoes } from "@/lib/dados";
import { Pagina } from "@/components/Pagina";
import { CabecalhoPagina } from "@/components/ui";

export const revalidate = 86400;

export const metadata: Metadata = { title: "Votações" };

export default function Votacoes() {
  return (
    <Pagina>
      <CabecalhoPagina rotulo="Plenário" titulo={<>Votações <em>nominais</em></>}>
        Cada votação em que os votos foram registrados um a um, na Câmara e no Senado, da mais recente à mais antiga.
      </CabecalhoPagina>
      <ListaVotacoes votacoes={listarVotacoes()} />
    </Pagina>
  );
}
