"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { RealGameHandle, RealGameProps } from "@/components/games/registry";

const COLS = 16;
const ROWS = 14;
const CELL = 40; // px
const CANVAS_W = COLS * CELL; // 640
const CANVAS_H = ROWS * CELL; // 560

// Zonas (índice de fila, 0 = arriba)
const ROW_GOALS = 0;
const ROW_RIVER_TOP = 1;
const ROW_RIVER_BOT = 6;
const ROW_SAFE_MID = 7;
const ROW_ROAD_TOP = 8;
const ROW_ROAD_BOT = 12;
const ROW_START = 13;

const LIVES_INITIAL = 3;
const GOALS_COUNT = 5;
const GOAL_WIDTH_COLS = 2;

const JUMP_DURATION_MS = 120;
const ROUND_TIME_INITIAL_S = 15;
const ROUND_TIME_MIN_S = 6;
const ROUND_TIME_STEP_S = 1; // reducción por nivel

const SCORE_PER_ADVANCE = 10;
const SCORE_PER_GOAL = 50;
const SCORE_PER_ROUND = 200;
const SCORE_TIME_BONUS_MULT = 10;

const LEVEL_SPEED_MULT = 1.15; // +15% de velocidad por nivel

const TURTLE_VISIBLE_MS = 3000;
const TURTLE_SUBMERGED_MS = 1500;

const MAX_FRAME_DT_MS = 50;

type Direction = "up" | "down" | "left" | "right";

interface Entity {
  col: number;
  width: number;
  type: "car" | "truck" | "log" | "turtle";
  submerged?: boolean;
  submergeT?: number;
}

interface Lane {
  row: number;
  speed: number; // px/frame @ 16ms, escalado por nivel
  dir: 1 | -1;
  entities: Entity[];
}

interface Frog {
  col: number;
  row: number;
  animating: boolean;
  animT: number;
  fromCol: number;
  fromRow: number;
  targetCol: number;
  targetRow: number;
}

type GameState = "playing" | "gameover";

function randInt(min: number, max: number) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function placeLaneEntities(count: number, makeEntity: () => Omit<Entity, "col">): Entity[] {
  const spacing = COLS / count;
  const entities: Entity[] = [];
  for (let i = 0; i < count; i++) {
    const base = makeEntity();
    const gap = Math.max(0, Math.floor(spacing - base.width - 1));
    entities.push({ ...base, col: i * spacing + randInt(0, gap) });
  }
  return entities;
}

function buildRoadLane(row: number, dir: 1 | -1, level: number): Lane {
  const baseSpeed = 1.5 + Math.random() * 2.5; // 1.5–4 px/frame
  const speed = baseSpeed * Math.pow(LEVEL_SPEED_MULT, level - 1);
  const count = randInt(3, 4);
  const entities = placeLaneEntities(count, () => {
    const isTruck = Math.random() < 0.3; // 30% camión (2–3 celdas), resto auto (1 celda)
    return { width: isTruck ? randInt(2, 3) : 1, type: isTruck ? "truck" : "car" };
  });
  return { row, speed, dir, entities };
}

function buildRiverLane(row: number, dir: 1 | -1, level: number, kind: "log" | "turtle"): Lane {
  const baseSpeed = 1 + Math.random() * 2; // 1–3 px/frame
  const speed = baseSpeed * Math.pow(LEVEL_SPEED_MULT, level - 1);
  const count = randInt(2, 3);
  const entities = placeLaneEntities(count, () => {
    const width = kind === "log" ? randInt(2, 4) : randInt(2, 3);
    if (kind === "turtle") {
      return { width, type: kind, submerged: false, submergeT: Math.random() * TURTLE_VISIBLE_MS };
    }
    return { width, type: kind };
  });
  return { row, speed, dir, entities };
}

// Mapa de carriles: carretera (filas ROW_ROAD_TOP..ROW_ROAD_BOT) + río
// (filas ROW_RIVER_TOP..ROW_RIVER_BOT). Cada carril tiene al menos 2
// entidades separadas por huecos atravesables; la velocidad escala +15%
// por nivel (LEVEL_SPEED_MULT). Verificación manual: console.log(buildLanes(1))
// y confirmar >=2 entidades y huecos visibles por carril.
function buildLanes(level: number): Lane[] {
  const lanes: Lane[] = [];

  for (let row = ROW_ROAD_TOP; row <= ROW_ROAD_BOT; row++) {
    const dir: 1 | -1 = (row - ROW_ROAD_TOP) % 2 === 0 ? 1 : -1;
    lanes.push(buildRoadLane(row, dir, level));
  }

  for (let row = ROW_RIVER_TOP; row <= ROW_RIVER_BOT; row++) {
    const dir: 1 | -1 = (row - ROW_RIVER_TOP) % 2 === 0 ? -1 : 1;
    const kind: "log" | "turtle" = (row - ROW_RIVER_TOP) % 3 === 2 ? "turtle" : "log";
    lanes.push(buildRiverLane(row, dir, level, kind));
  }

  return lanes;
}

const FroggerGame = forwardRef<RealGameHandle, RealGameProps>(function FroggerGame(
  { onStatsChange, onGameOver },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onStatsChangeRef = useRef(onStatsChange);
  const onGameOverRef = useRef(onGameOver);
  const actionsRef = useRef<RealGameHandle>({
    togglePause: () => {},
    forceGameOver: () => {},
    restart: () => {},
  });

  useEffect(() => {
    onStatsChangeRef.current = onStatsChange;
  }, [onStatsChange]);

  useEffect(() => {
    onGameOverRef.current = onGameOver;
  }, [onGameOver]);

  useImperativeHandle(
    ref,
    () => ({
      togglePause: () => actionsRef.current.togglePause(),
      forceGameOver: () => actionsRef.current.forceGameOver(),
      restart: () => actionsRef.current.restart(),
    }),
    [],
  );

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const context = canvasEl.getContext("2d");
    if (!context) return;
    const canvas = canvasEl;
    const ctx = context;

    // El resto del game loop (buildLanes, update, draw, colisiones,
    // completeRound, killFrog) se añade en los pasos siguientes del plan.
    void canvas;
    void ctx;

    return () => {};
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
});

export default FroggerGame;
