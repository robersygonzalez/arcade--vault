import type { ComponentType, RefAttributes } from "react";
import AsteroidsGame from "@/components/asteroids-game";
import TetrisGame from "@/components/tetris-game";

export type HudSlot = { label: string; value: string };
export type GameStats = { score: number; slots: HudSlot[] };

export type RealGameHandle = {
  togglePause: () => void;
  forceGameOver: () => void;
  restart: () => void;
};

export type RealGameProps = {
  onStatsChange: (stats: GameStats) => void;
  onGameOver: (finalScore: number) => void;
};

export const REAL_GAMES: Record<
  string,
  ComponentType<RealGameProps & RefAttributes<RealGameHandle>>
> = {
  asteroides: AsteroidsGame,
  tetris: TetrisGame,
};
