import type { ComponentType, RefAttributes } from "react";
import AsteroidsGame from "@/components/asteroids-game";
import TetrisGame from "@/components/tetris-game";
import ArkanoidGame from "@/components/arkanoid-game";
import SnakeGame from "@/components/snake-game";

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
  arkanoid: ArkanoidGame,
  snake: SnakeGame,
};

export type TouchButton = { code: string; label: string };

export type TouchControlConfig = {
  up?: string; // key code, ej. "ArrowUp"
  down?: string;
  left?: string;
  right?: string;
  buttonA?: TouchButton;
  buttonB?: TouchButton;
};

export const TOUCH_CONTROLS: Record<string, TouchControlConfig> = {
  asteroides: {
    left: "ArrowLeft",
    right: "ArrowRight",
    up: "ArrowUp",
    buttonA: { code: "Space", label: "DISPARAR" },
  },
  tetris: {
    left: "ArrowLeft",
    right: "ArrowRight",
    down: "ArrowDown",
    up: "ArrowUp", // rota, igual que el teclado (case "ArrowUp"/"KeyX" en tetris-game.tsx L371-373)
    buttonA: { code: "Space", label: "CAÍDA" },
  },
  arkanoid: {
    left: "ArrowLeft",
    right: "ArrowRight",
  },
  snake: {
    up: "ArrowUp",
    down: "ArrowDown",
    left: "ArrowLeft",
    right: "ArrowRight",
  },
};
