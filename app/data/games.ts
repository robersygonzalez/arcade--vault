// ===== app/data/games.ts — shared types =====

export type Game = {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
  cover: string; // clase CSS: "cover-bricks", "cover-tetro", ...
  color: "cyan" | "magenta" | "yellow" | "green";
  best: number;
  plays: string;
};

export const CATS: string[] = ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"];
