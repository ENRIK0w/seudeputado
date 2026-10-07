import type { Metadata } from "next";
import { MinhaCidade } from "@/components/MinhaCidade";
import { Pagina } from "@/components/Pagina";

export const metadata: Metadata = { title: "Minha cidade" };

export default function Cidade() {
  return (
    <Pagina>
      <MinhaCidade />
    </Pagina>
  );
}
