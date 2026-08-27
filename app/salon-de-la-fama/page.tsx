import type { Metadata } from "next";
import HallOfFame from "@/components/hall-of-fame";
import { createClient } from "@/utils/supabase/server";
import type { Game } from "@/app/data/games";

export const metadata: Metadata = {
  title: "Arcade Vault · Salón de la Fama",
};

export default async function Page() {
  const supabase = await createClient();
  const [{ data: scores }, { data: games }] = await Promise.all([
    supabase.from("scores").select("*").order("score", { ascending: false }),
    supabase.from("games").select("*"),
  ]);

  return <HallOfFame scores={scores ?? []} games={(games ?? []) as Game[]} />;
}
