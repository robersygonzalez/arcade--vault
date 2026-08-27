import type { Metadata } from "next";
import Home from "@/components/home";
import { createClient } from "@/utils/supabase/server";
import type { Game } from "@/app/data/games";

export const metadata: Metadata = {
  title: "Arcade Vault · Inicio",
};

export default async function Page() {
  const supabase = await createClient();
  const { data: games } = await supabase.from("games").select("*").limit(6);

  return <Home games={(games ?? []) as Game[]} />;
}
