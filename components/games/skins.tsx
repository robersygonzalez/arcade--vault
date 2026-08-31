"use client";

import { useEffect, useState } from "react";

export type SkinId = "clasico" | "neon" | "retro";

export const SKIN_ORDER: SkinId[] = ["clasico", "neon", "retro"];

export const SKIN_LABELS: Record<SkinId, string> = {
  clasico: "Clásico",
  neon: "Neón",
  retro: "Retro",
};

export function useGameSkin(gameId: string): [SkinId, (skin: SkinId) => void] {
  const storageKey = `av_skin_${gameId}`;
  const [skin, setSkinState] = useState<SkinId>("clasico");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored === "clasico" || stored === "neon" || stored === "retro") {
        setSkinState(stored);
      }
    } catch {
      // localStorage no disponible (modo privado, etc.) — se queda en "clasico"
    }
  }, [storageKey]);

  const setSkin = (next: SkinId) => {
    setSkinState(next);
    try {
      localStorage.setItem(storageKey, next);
    } catch {
      // no persiste, pero el cambio en memoria sigue funcionando
    }
  };

  return [skin, setSkin];
}

export function SkinSwitcher({
  gameId,
  skin,
  onChange,
}: {
  gameId: string;
  skin: SkinId;
  onChange: (next: SkinId) => void;
}) {
  return (
    <div
      onMouseMove={(e) => e.stopPropagation()}
      style={{ position: "absolute", bottom: 8, right: 8, display: "flex", gap: 4, zIndex: 10 }}
    >
      {SKIN_ORDER.map((id) => (
        <button
          key={id}
          aria-pressed={id === skin}
          aria-label={`Cambiar skin de ${gameId} a ${SKIN_LABELS[id]}`}
          onClick={() => onChange(id)}
        >
          {SKIN_LABELS[id]}
        </button>
      ))}
    </div>
  );
}

export type AsteroidsPalette = {
  background: string;
  ship: string;
  shipThrustRgb: string;
  bullet: string;
  asteroid: string;
  powerUp: string;
  particleRgb: string;
  hudAccent: string;
  glowBlur: number;
};

export const ASTEROIDS_SKINS: Record<SkinId, AsteroidsPalette> = {
  clasico: {
    background: "#000000",
    ship: "#ffffff",
    shipThrustRgb: "255,130,0",
    bullet: "#ffffff",
    asteroid: "#ffffff",
    powerUp: "#00ffff",
    particleRgb: "255,255,255",
    hudAccent: "#00ffff",
    glowBlur: 0,
  },
  neon: {
    background: "#05050b",
    ship: "#00f5ff",
    shipThrustRgb: "245,255,0",
    bullet: "#f5ff00",
    asteroid: "#ff006e",
    powerUp: "#00ff88",
    particleRgb: "0,245,255",
    hudAccent: "#00ff88",
    glowBlur: 10,
  },
  retro: {
    background: "#140d00",
    ship: "#ffb000",
    shipThrustRgb: "204,136,0",
    bullet: "#ffb000",
    asteroid: "#cc8800",
    powerUp: "#ffb000",
    particleRgb: "153,102,0",
    hudAccent: "#ffb000",
    glowBlur: 0,
  },
};

export type SnakePalette = {
  background: string;
  snakeHead: string;
  snakeBody: string;
  headOutline: string;
  glowBlur: number;
};

export const SNAKE_SKINS: Record<SkinId, SnakePalette> = {
  clasico: {
    background: "#000000",
    snakeHead: "#baffe0",
    snakeBody: "#00ff88",
    headOutline: "#ffffff",
    glowBlur: 0,
  },
  neon: {
    background: "#05050b",
    snakeHead: "#00f5ff",
    snakeBody: "#00ff88",
    headOutline: "#f5ff00",
    glowBlur: 10,
  },
  retro: {
    background: "#140d00",
    snakeHead: "#ffb000",
    snakeBody: "#cc8800",
    headOutline: "#996600",
    glowBlur: 0,
  },
};

export type ArkanoidBlockColorName =
  "gray" | "red" | "yellow" | "cyan" | "magenta" | "hotpink" | "green";

export type ArkanoidTint = {
  paddle: string;
  ball: string;
  blockColors: Record<ArkanoidBlockColorName, string>;
};

export type ArkanoidPalette = {
  background: string;
  glowBlur: number;
  tint: ArkanoidTint | null;
};

export const ARKANOID_SKINS: Record<SkinId, ArkanoidPalette> = {
  clasico: {
    background: "#000000",
    glowBlur: 0,
    tint: null,
  },
  neon: {
    background: "#05050b",
    glowBlur: 10,
    tint: {
      paddle: "#00f5ff",
      ball: "#00f5ff",
      blockColors: {
        gray: "#ff006e",
        red: "#ff006e",
        yellow: "#f5ff00",
        cyan: "#00f5ff",
        magenta: "#ff006e",
        hotpink: "#ff006e",
        green: "#00ff88",
      },
    },
  },
  retro: {
    background: "#140d00",
    glowBlur: 0,
    tint: {
      paddle: "#ffb000",
      ball: "#ffb000",
      blockColors: {
        gray: "#ffb000",
        red: "#ffb000",
        yellow: "#cc8800",
        cyan: "#996600",
        magenta: "#ffb000",
        hotpink: "#cc8800",
        green: "#996600",
      },
    },
  },
};

export const GAME_SKINS = {
  asteroides: ASTEROIDS_SKINS,
  snake: SNAKE_SKINS,
  arkanoid: ARKANOID_SKINS,
} as const;
