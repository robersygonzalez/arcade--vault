import type { Metadata } from "next";
import Library from "@/components/library";

export const metadata: Metadata = {
  title: "Arcade Vault · Biblioteca",
};

export default function Page() {
  return <Library />;
}
