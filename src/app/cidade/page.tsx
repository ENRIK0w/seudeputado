import type { Metadata } from "next";
import { MinhaCidade } from "@/components/MinhaCidade";

export const metadata: Metadata = { title: "Minha cidade" };

export default function Cidade() {
  return <MinhaCidade />;
}
