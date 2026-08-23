import type { Metadata } from "next";
import About from "@/components/about";

export const metadata: Metadata = {
  title: "Arcade Vault · Acerca de",
};

export default function Page() {
  return <About />;
}
