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
    <div className="skin-switcher" onMouseMove={(e) => e.stopPropagation()}>
      {SKIN_ORDER.map((id) => (
        <button
          key={id}
          className="skin-switcher-btn"
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

export type FroggerPalette = {
  roadBg: string;
  riverBg: string;
  safeBg: string;
  laneDivider: string; // strokeStyle listo para usar (puede incluir rgba con alpha ya resuelto)
  carBody: string;
  carWheel: string;
  truckBody: string;
  truckCabin: string;
  logBody: string;
  logVein: string;
  turtleBody: string;
  turtleSubmergedAlpha: number; // reemplaza el 0.35 hardcodeado (ctx.globalAlpha)
  frogBody: string;
  frogEyeWhite: string;
  frogEyePupil: string;
  goalFill: string;
  goalBorder: string;
  goalFilledDot: string;
  hudText: string;
  hudLives: string;
  hudTimerGood: string;
  hudTimerWarn: string;
  hudTimerBad: string;
  glowBlur: number;
};

export const FROGGER_SKINS: Record<SkinId, FroggerPalette> = {
  clasico: {
    roadBg: "#111318",
    riverBg: "#00202c",
    safeBg: "#0a2f1a",
    laneDivider: "rgba(245, 255, 0, 0.35)",
    carBody: "#ff006e",
    carWheel: "#000000",
    truckBody: "#8a8a92",
    truckCabin: "#00f5ff",
    logBody: "#5a3616",
    logVein: "#3a2210",
    turtleBody: "#00ff88",
    turtleSubmergedAlpha: 0.35,
    frogBody: "#00ff88",
    frogEyeWhite: "#ffffff",
    frogEyePupil: "#000000",
    goalFill: "#0d3d20",
    goalBorder: "#f5ff00",
    goalFilledDot: "#00ff88",
    hudText: "#ffffff",
    hudLives: "#00ff88",
    hudTimerGood: "#00ff88",
    hudTimerWarn: "#f5ff00",
    hudTimerBad: "#ff006e",
    glowBlur: 0,
  },
  neon: {
    roadBg: "#05050b",
    riverBg: "#020814",
    safeBg: "#020f0a",
    laneDivider: "rgba(245, 255, 0, 0.40)",
    carBody: "#ff006e",
    carWheel: "#000000",
    truckBody: "#00f5ff",
    truckCabin: "#f5ff00",
    logBody: "#f5ff00",
    logVein: "rgba(0, 0, 0, 0.35)",
    turtleBody: "#00ff88",
    turtleSubmergedAlpha: 0.42,
    frogBody: "#00ff88",
    frogEyeWhite: "#ffffff",
    frogEyePupil: "#000000",
    goalFill: "#04241a",
    goalBorder: "#f5ff00",
    goalFilledDot: "#00ff88",
    hudText: "#ffffff",
    hudLives: "#00ff88",
    hudTimerGood: "#00ff88",
    hudTimerWarn: "#f5ff00",
    hudTimerBad: "#ff006e",
    glowBlur: 10,
  },
  retro: {
    roadBg: "#140d00",
    riverBg: "#1a1100",
    safeBg: "#0f0900",
    laneDivider: "#cc8800",
    carBody: "#ffb000",
    carWheel: "#996600",
    truckBody: "#cc8800",
    truckCabin: "#ffb000",
    logBody: "#996600",
    logVein: "#140d00",
    turtleBody: "#ffb000",
    turtleSubmergedAlpha: 0.48,
    frogBody: "#ffb000",
    frogEyeWhite: "#cc8800",
    frogEyePupil: "#996600",
    goalFill: "#1c1400",
    goalBorder: "#ffb000",
    goalFilledDot: "#cc8800",
    hudText: "#ffb000",
    hudLives: "#ffb000",
    hudTimerGood: "#996600",
    hudTimerWarn: "#cc8800",
    hudTimerBad: "#ffb000",
    glowBlur: 0,
  },
};

export const GAME_SKINS = {
  asteroides: ASTEROIDS_SKINS,
  snake: SNAKE_SKINS,
  arkanoid: ARKANOID_SKINS,
  frogger: FROGGER_SKINS,
} as const;
