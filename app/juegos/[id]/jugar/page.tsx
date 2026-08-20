import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GAMES } from "@/app/data/games";
import GamePlayer from "@/components/game-player";

export async function generateMetadata({ params }: PageProps<"/juegos/[id]/jugar">): Promise<Metadata> {
  const { id } = await params;
  const game = GAMES.find((g) => g.id === id);
  return { title: game ? `${game.title} · Jugando · Arcade Vault` : "Arcade Vault" };
}

export default async function JugarPage({ params }: PageProps<"/juegos/[id]/jugar">) {
  const { id } = await params;
  const game = GAMES.find((g) => g.id === id);
  if (!game) notFound();

  return <GamePlayer game={game} />;
}
