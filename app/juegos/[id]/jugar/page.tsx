import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Game } from "@/app/data/games";
import { createClient } from "@/utils/supabase/server";
import GamePlayer from "@/components/game-player";

export async function generateMetadata({
  params,
}: PageProps<"/juegos/[id]/jugar">): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: game } = await supabase.from("games").select("*").eq("id", id).single();
  return { title: game ? `${game.title} · Jugando · Arcade Vault` : "Arcade Vault" };
}

export default async function JugarPage({ params }: PageProps<"/juegos/[id]/jugar">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: game } = await supabase.from("games").select("*").eq("id", id).single<Game>();
  if (!game) notFound();

  return <GamePlayer game={game} />;
}
