import type { Metadata } from "next";
import Library from "@/components/library";
import { createClient } from "@/utils/supabase/server";
import type { Game } from "@/app/data/games";

export const metadata: Metadata = {
  title: "Arcade Vault · Biblioteca",
};

export default async function Page() {
  const supabase = await createClient();
  const { data: games } = await supabase.from("games").select("*");

  return <Library games={(games ?? []) as Game[]} />;
}
