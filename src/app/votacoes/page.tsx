import type { Metadata } from "next";
import { ListaVotacoes } from "@/components/ListaVotacoes";
import { listarVotacoes } from "@/lib/dados";
import { Pagina } from "@/components/Pagina";

export const revalidate = 86400;

export const metadata: Metadata = { title: "Votações" };

export default function Votacoes() {
  return (
    <Pagina>
      <h1 className="titulo mb-4 text-[32px]">Votações em plenário</h1>
      <ListaVotacoes votacoes={listarVotacoes()} />
    </Pagina>
  );
}
