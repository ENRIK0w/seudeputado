import type { Metadata } from "next";
import { ListaParlamentares } from "@/components/ListaParlamentares";
import { listarParlamentares } from "@/lib/dados";
import { Pagina } from "@/components/Pagina";
import { CabecalhoPagina } from "@/components/ui";

export const revalidate = 86400;

export const metadata: Metadata = { title: "Parlamentares" };

export default function Parlamentares() {
  return (
    <Pagina>
      <CabecalhoPagina rotulo="Congresso Nacional" titulo={<>Deputados <em>e</em> senadores</>}>
        Busque pelo nome, filtre por estado ou partido e abra o dossiê de cada parlamentar.
      </CabecalhoPagina>
      <ListaParlamentares todos={listarParlamentares()} />
    </Pagina>
  );
}
