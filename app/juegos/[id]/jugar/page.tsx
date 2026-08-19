import { notFound } from "next/navigation";
import { GAMES } from "@/app/data/games";
import GamePlayer from "@/components/game-player";

export default async function JugarPage({ params }: PageProps<"/juegos/[id]/jugar">) {
  const { id } = await params;
  const game = GAMES.find((g) => g.id === id);
  if (!game) notFound();

  return <GamePlayer game={game} />;
}
