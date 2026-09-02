"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { HudSlot, RealGameHandle, RealGameProps } from "@/components/games/registry";
import { FROGGER_SKINS, SkinSwitcher, useGameSkin } from "@/components/games/skins";

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

const KEY_DIRS: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

const FROG_START_COL = Math.floor(COLS / 2);

// 5 bocas de 2 columnas cada una, distribuidas con hueco de 1 columna entre ellas y en los bordes.
const GOAL_START_COLS = Array.from({ length: GOALS_COUNT }, (_, i) => 1 + i * 3);

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

function spawnFrog(): Frog {
  return {
    col: FROG_START_COL,
    row: ROW_START,
    animating: false,
    animT: 0,
    fromCol: FROG_START_COL,
    fromRow: ROW_START,
    targetCol: FROG_START_COL,
    targetRow: ROW_START,
  };
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
  const [skin, setSkin] = useGameSkin("frogger");
  const skinRef = useRef(FROGGER_SKINS[skin]);

  useEffect(() => {
    onStatsChangeRef.current = onStatsChange;
  }, [onStatsChange]);

  useEffect(() => {
    onGameOverRef.current = onGameOver;
  }, [onGameOver]);

  useEffect(() => {
    skinRef.current = FROGGER_SKINS[skin];
  }, [skin]);

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
    const ctx = context;

    // ── Estado mutable ───────────────────────────────────────────────────────
    let level = 1;
    let lives = LIVES_INITIAL;
    let score = 0;
    let bestRowReached = ROW_START;
    let lanes: Lane[] = buildLanes(level);
    let goals: boolean[] = new Array(GOALS_COUNT).fill(false);
    let frog: Frog = spawnFrog();
    let pendingDir: Direction | null = null;
    let state: GameState = "playing";
    let paused = false;
    let roundTimeTotalMs = 0;
    let roundTimeMs = 0;

    function startRound() {
      const seconds = Math.max(
        ROUND_TIME_MIN_S,
        ROUND_TIME_INITIAL_S - (level - 1) * ROUND_TIME_STEP_S,
      );
      roundTimeTotalMs = seconds * 1000;
      roundTimeMs = roundTimeTotalMs;
    }

    function resetFrog() {
      frog = spawnFrog();
      bestRowReached = ROW_START;
    }

    // ── Colisiones y soporte ────────────────────────────────────────────────
    function checkRoadCollision(f: Frog, ls: Lane[]): boolean {
      const lane = ls.find((l) => l.row === f.row);
      if (!lane) return false;
      return lane.entities.some((e) => f.col >= e.col && f.col < e.col + e.width);
    }

    function getSupport(f: Frog, ls: Lane[]): Entity | null {
      const lane = ls.find((l) => l.row === f.row);
      if (!lane) return null;
      const entity = lane.entities.find((e) => f.col >= e.col && f.col < e.col + e.width);
      if (!entity) return null;
      if (entity.type === "turtle" && entity.submerged) return null;
      return entity;
    }

    function checkGoal(f: Frog) {
      const index = GOAL_START_COLS.findIndex(
        (startCol) => f.col >= startCol && f.col < startCol + GOAL_WIDTH_COLS,
      );
      if (index === -1 || goals[index]) {
        killFrog();
        return;
      }
      goals[index] = true;
      score += SCORE_PER_GOAL + Math.floor(roundTimeMs / 1000) * SCORE_TIME_BONUS_MULT;
      if (goals.every(Boolean)) {
        score += SCORE_PER_ROUND;
        completeRound();
      } else {
        resetFrog();
      }
    }

    function completeRound() {
      resetFrog();
      goals = new Array(GOALS_COUNT).fill(false);
      level += 1;
      lanes = buildLanes(level);
      startRound();
    }

    function killFrog() {
      lives -= 1;
      if (lives <= 0) {
        lives = 0;
        state = "gameover";
        return;
      }
      resetFrog();
      startRound();
    }

    // ── Movimiento de entidades ─────────────────────────────────────────────
    function moveLanes(dtMs: number) {
      for (const lane of lanes) {
        for (const entity of lane.entities) {
          entity.col += (lane.speed * lane.dir * dtMs) / 16;
          if (lane.dir === 1 && entity.col > COLS) entity.col = -entity.width;
          if (lane.dir === -1 && entity.col + entity.width < 0) entity.col = COLS;
        }
      }
    }

    function updateTurtles(dtMs: number) {
      for (const lane of lanes) {
        for (const entity of lane.entities) {
          if (entity.type !== "turtle") continue;
          entity.submergeT = (entity.submergeT ?? 0) + dtMs;
          if (!entity.submerged && entity.submergeT >= TURTLE_VISIBLE_MS) {
            entity.submerged = true;
            entity.submergeT = 0;
          } else if (entity.submerged && entity.submergeT >= TURTLE_SUBMERGED_MS) {
            entity.submerged = false;
            entity.submergeT = 0;
          }
        }
      }
    }

    // ── Rana ─────────────────────────────────────────────────────────────────
    function tryJump(dir: Direction) {
      let targetCol = frog.col;
      let targetRow = frog.row;
      if (dir === "up") targetRow -= 1;
      else if (dir === "down") targetRow += 1;
      else if (dir === "left") targetCol -= 1;
      else if (dir === "right") targetCol += 1;
      targetCol = Math.max(0, Math.min(COLS - 1, targetCol));
      targetRow = Math.max(ROW_GOALS, Math.min(ROW_START, targetRow));
      if (targetCol === frog.col && targetRow === frog.row) return;
      frog.fromCol = frog.col;
      frog.fromRow = frog.row;
      frog.targetCol = targetCol;
      frog.targetRow = targetRow;
      frog.animating = true;
      frog.animT = 0;
    }

    function applyRiverDrift(dtMs: number) {
      const support = getSupport(frog, lanes);
      if (!support) return;
      const lane = lanes.find((l) => l.row === frog.row);
      if (!lane) return;
      frog.col += (lane.speed * lane.dir * dtMs) / 16;
    }

    function onFrogLanded() {
      if (frog.row < bestRowReached) {
        score += SCORE_PER_ADVANCE;
        bestRowReached = frog.row;
      }
      if (frog.row === ROW_GOALS) {
        checkGoal(frog);
        return;
      }
      if (frog.row >= ROW_ROAD_TOP && frog.row <= ROW_ROAD_BOT) {
        if (checkRoadCollision(frog, lanes)) killFrog();
      }
    }

    // ── Update ───────────────────────────────────────────────────────────────
    function update(dtMs: number) {
      if (state !== "playing") return;

      moveLanes(dtMs);
      updateTurtles(dtMs);

      if (frog.animating) {
        frog.animT += dtMs;
        if (frog.animT >= JUMP_DURATION_MS) {
          frog.animT = JUMP_DURATION_MS;
          frog.col = frog.targetCol;
          frog.row = frog.targetRow;
          frog.animating = false;
          onFrogLanded();
        }
      } else {
        if (pendingDir) {
          tryJump(pendingDir);
          pendingDir = null;
        }
        if (frog.row >= ROW_RIVER_TOP && frog.row <= ROW_RIVER_BOT) {
          applyRiverDrift(dtMs);
        }
        if (frog.row >= ROW_ROAD_TOP && frog.row <= ROW_ROAD_BOT) {
          if (checkRoadCollision(frog, lanes)) killFrog();
        }
      }

      if (state === "playing") {
        roundTimeMs -= dtMs;
        if (roundTimeMs <= 0) {
          roundTimeMs = 0;
          killFrog();
        }
      }
    }

    // ── Draw ─────────────────────────────────────────────────────────────────
    function zoneColor(row: number): string {
      if (row >= ROW_ROAD_TOP && row <= ROW_ROAD_BOT) return skinRef.current.roadBg;
      if (row >= ROW_RIVER_TOP && row <= ROW_RIVER_BOT) return skinRef.current.riverBg;
      return skinRef.current.safeBg; // metas, franja media segura, base de inicio
    }

    function drawZones() {
      for (let row = 0; row < ROWS; row++) {
        ctx.fillStyle = zoneColor(row);
        ctx.fillRect(0, row * CELL, CANVAS_W, CELL);
      }
      ctx.strokeStyle = skinRef.current.laneDivider;
      ctx.lineWidth = 1;
      ctx.setLineDash([10, 8]);
      for (let row = ROW_ROAD_TOP + 1; row <= ROW_ROAD_BOT; row++) {
        ctx.beginPath();
        ctx.moveTo(0, row * CELL);
        ctx.lineTo(CANVAS_W, row * CELL);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    function withGlow(color: string, drawFn: () => void) {
      if (skinRef.current.glowBlur > 0) {
        ctx.shadowBlur = skinRef.current.glowBlur;
        ctx.shadowColor = color;
      }
      drawFn();
      ctx.shadowBlur = 0;
    }

    function drawGoals() {
      GOAL_START_COLS.forEach((startCol, i) => {
        const x = startCol * CELL;
        const y = ROW_GOALS * CELL;
        const w = GOAL_WIDTH_COLS * CELL;
        ctx.fillStyle = skinRef.current.goalFill;
        ctx.fillRect(x + 2, y + 2, w - 4, CELL - 4);
        ctx.strokeStyle = skinRef.current.goalBorder;
        ctx.lineWidth = 2;
        withGlow(skinRef.current.goalBorder, () => {
          ctx.strokeRect(x + 2, y + 2, w - 4, CELL - 4);
        });
        if (goals[i]) {
          ctx.fillStyle = skinRef.current.goalFilledDot;
          withGlow(skinRef.current.goalFilledDot, () => {
            ctx.beginPath();
            ctx.ellipse(x + w / 2, y + CELL / 2, 12, 10, 0, 0, Math.PI * 2);
            ctx.fill();
          });
        }
      });
    }

    function drawEntity(lane: Lane, entity: Entity) {
      const x = entity.col * CELL;
      const y = lane.row * CELL;
      const w = entity.width * CELL;
      const h = CELL;
      if (entity.type === "car") {
        ctx.fillStyle = skinRef.current.carBody;
        withGlow(skinRef.current.carBody, () => {
          ctx.fillRect(x + 3, y + 8, w - 6, h - 16);
        });
        ctx.fillStyle = skinRef.current.carWheel;
        withGlow(skinRef.current.carWheel, () => {
          ctx.beginPath();
          ctx.arc(x + 8, y + h - 6, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(x + w - 8, y + h - 6, 4, 0, Math.PI * 2);
          ctx.fill();
        });
      } else if (entity.type === "truck") {
        ctx.fillStyle = skinRef.current.truckBody;
        withGlow(skinRef.current.truckBody, () => {
          ctx.fillRect(x + 2, y + 6, w - 4, h - 12);
        });
        ctx.fillStyle = skinRef.current.truckCabin;
        withGlow(skinRef.current.truckCabin, () => {
          ctx.fillRect(x + 2, y + 6, Math.min(CELL - 8, w - 4), h - 12);
        });
      } else if (entity.type === "log") {
        ctx.fillStyle = skinRef.current.logBody;
        withGlow(skinRef.current.logBody, () => {
          ctx.fillRect(x, y + 10, w, h - 20);
        });
        ctx.strokeStyle = skinRef.current.logVein;
        ctx.lineWidth = 1;
        for (let lx = x + 6; lx < x + w; lx += 10) {
          ctx.beginPath();
          ctx.moveTo(lx, y + 10);
          ctx.lineTo(lx, y + h - 10);
          ctx.stroke();
        }
      } else {
        for (let i = 0; i < entity.width; i++) {
          const cx = x + i * CELL + CELL / 2;
          const cy = y + CELL / 2;
          ctx.globalAlpha = entity.submerged ? skinRef.current.turtleSubmergedAlpha : 1;
          ctx.fillStyle = skinRef.current.turtleBody;
          withGlow(skinRef.current.turtleBody, () => {
            ctx.beginPath();
            ctx.ellipse(cx, cy, 15, 11, 0, 0, Math.PI * 2);
            ctx.fill();
          });
          ctx.globalAlpha = 1;
        }
      }
    }

    function drawFrog() {
      let visualCol = frog.col;
      let visualRow = frog.row;
      let hop = 0;
      if (frog.animating) {
        const t = Math.min(1, frog.animT / JUMP_DURATION_MS);
        visualCol = frog.fromCol + (frog.targetCol - frog.fromCol) * t;
        visualRow = frog.fromRow + (frog.targetRow - frog.fromRow) * t;
        hop = -Math.sin(t * Math.PI) * 8;
      }
      const cx = visualCol * CELL + CELL / 2;
      const cy = visualRow * CELL + CELL / 2 + hop;
      ctx.fillStyle = skinRef.current.frogBody;
      withGlow(skinRef.current.frogBody, () => {
        ctx.beginPath();
        ctx.ellipse(cx, cy, 14, 12, 0, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = skinRef.current.frogEyeWhite;
      ctx.beginPath();
      ctx.arc(cx - 5, cy - 6, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + 5, cy - 6, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = skinRef.current.frogEyePupil;
      ctx.beginPath();
      ctx.arc(cx - 5, cy - 6, 1.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + 5, cy - 6, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawHud() {
      ctx.fillStyle = skinRef.current.hudText;
      ctx.font = "bold 16px monospace";
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      ctx.fillText(String(score), 8, CELL / 2);
      ctx.textAlign = "center";
      ctx.fillText("NIVEL " + level, CANVAS_W / 2, CELL / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = skinRef.current.hudLives;
      ctx.fillText("●".repeat(Math.max(0, lives)) || "—", CANVAS_W - 8, CELL / 2);

      const frac = roundTimeTotalMs > 0 ? Math.max(0, roundTimeMs / roundTimeTotalMs) : 0;
      ctx.fillStyle =
        frac > 0.5
          ? skinRef.current.hudTimerGood
          : frac > 0.2
            ? skinRef.current.hudTimerWarn
            : skinRef.current.hudTimerBad;
      ctx.fillRect(0, 0, CANVAS_W * frac, 4);
    }

    function draw() {
      drawZones();
      drawGoals();
      for (const lane of lanes) {
        for (const entity of lane.entities) drawEntity(lane, entity);
      }
      drawFrog();
      drawHud();
    }

    // ── Sincronización con React ─────────────────────────────────────────────
    let lastScore = -1;
    let lastLives = -1;
    let lastLevel = -1;
    let gameOverFired = false;

    function buildSlots(): HudSlot[] {
      return [
        { label: "Vidas", value: "🐸".repeat(Math.max(0, lives)) || "—" },
        { label: "Nivel", value: String(level).padStart(2, "0") },
      ];
    }

    function notifyIfChanged() {
      if (score !== lastScore || lives !== lastLives || level !== lastLevel) {
        lastScore = score;
        lastLives = lives;
        lastLevel = level;
        onStatsChangeRef.current({ score, slots: buildSlots() });
      }
      if (state === "gameover" && !gameOverFired) {
        gameOverFired = true;
        onGameOverRef.current(score);
      }
    }

    // ── Acciones expuestas vía ref ───────────────────────────────────────────
    actionsRef.current = {
      togglePause: () => {
        paused = !paused;
      },
      forceGameOver: () => {
        state = "gameover";
      },
      restart: () => {
        level = 1;
        lives = LIVES_INITIAL;
        score = 0;
        lanes = buildLanes(level);
        goals = new Array(GOALS_COUNT).fill(false);
        pendingDir = null;
        state = "playing";
        paused = false;
        resetFrog();
        startRound();
        gameOverFired = false;
        lastScore = -1;
        lastLives = -1;
        lastLevel = -1;
        notifyIfChanged();
      },
    };

    // ── Input ────────────────────────────────────────────────────────────────
    function onKeyDown(e: KeyboardEvent) {
      const dir = KEY_DIRS[e.code];
      if (!dir) return;
      e.preventDefault();
      pendingDir = dir;
    }
    window.addEventListener("keydown", onKeyDown);

    // ── Loop principal ───────────────────────────────────────────────────────
    let lastTime: number | null = null;
    let rafId = 0;

    function loop(ts: number) {
      const dtMs = lastTime === null ? 0 : Math.min(ts - lastTime, MAX_FRAME_DT_MS);
      lastTime = ts;
      if (!paused) update(dtMs);
      draw();
      notifyIfChanged();
      rafId = requestAnimationFrame(loop);
    }

    startRound();
    notifyIfChanged();
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", onKeyDown);
    };
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
