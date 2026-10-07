import type { Metadata } from "next";
import { ListaParlamentares } from "@/components/ListaParlamentares";
import { listarParlamentares } from "@/lib/dados";
import { Pagina } from "@/components/Pagina";

export const revalidate = 86400;

export const metadata: Metadata = { title: "Parlamentares" };

export default function Parlamentares() {
  return (
    <Pagina>
      <h1 className="titulo mb-4 text-[32px]">Deputados e senadores</h1>
      <ListaParlamentares todos={listarParlamentares()} />
    </Pagina>
  );
}
