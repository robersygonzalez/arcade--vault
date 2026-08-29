"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { RealGameHandle, RealGameProps } from "@/components/games/registry";

const W = 800;
const H = 600;
const COLS = 20;
const ROWS = 15;
const CELL = 40;

const TICK_MS_INITIAL = 150;
const TICK_MS_FLOOR = 70;
const TICK_MS_STEP = 5;
const FRUITS_PER_SPEEDUP = 5;
const SCORE_PER_FRUIT = 10;
const MAX_FRAME_DT_MS = 50;

type Cell = { col: number; row: number };
type Direction = { dx: number; dy: number };
type Fruit = Cell & { spriteIndex: number };
type GameState = "playing" | "gameover";

const DIR_UP: Direction = { dx: 0, dy: -1 };
const DIR_DOWN: Direction = { dx: 0, dy: 1 };
const DIR_LEFT: Direction = { dx: -1, dy: 0 };
const DIR_RIGHT: Direction = { dx: 1, dy: 0 };

const KEY_DIRS: Record<string, Direction> = {
  ArrowUp: DIR_UP,
  ArrowDown: DIR_DOWN,
  ArrowLeft: DIR_LEFT,
  ArrowRight: DIR_RIGHT,
  KeyW: DIR_UP,
  KeyS: DIR_DOWN,
  KeyA: DIR_LEFT,
  KeyD: DIR_RIGHT,
};

function isOpposite(a: Direction, b: Direction) {
  return a.dx === -b.dx && a.dy === -b.dy;
}

// ── Atlas de sprites de frutas (portado de references/source-assets/snake-assets/sprites.js) ──
const FRUIT_SPRITES = [
  { name: "banana", x: 34, y: 136, w: 110, h: 160 },
  { name: "orange", x: 186, y: 136, w: 150, h: 160 },
  { name: "grape", x: 378, y: 136, w: 110, h: 160 },
  { name: "garlic", x: 540, y: 136, w: 130, h: 160 },
  { name: "eggplant", x: 712, y: 136, w: 130, h: 160 },
  { name: "strawberry", x: 894, y: 136, w: 110, h: 160 },
  { name: "cherry", x: 1066, y: 136, w: 110, h: 160 },
  { name: "carrot", x: 1228, y: 136, w: 130, h: 160 },
  { name: "mushroom", x: 1400, y: 136, w: 130, h: 160 },
  { name: "broccoli", x: 1582, y: 136, w: 110, h: 160 },
  { name: "watermelon", x: 1734, y: 136, w: 150, h: 160 },
  { name: "pepper", x: 1906, y: 136, w: 150, h: 160 },
  { name: "kiwi", x: 2068, y: 136, w: 170, h: 160 },
  { name: "lemon", x: 2250, y: 136, w: 140, h: 160 },
  { name: "peach", x: 2432, y: 136, w: 130, h: 160 },
  { name: "peanut", x: 2604, y: 136, w: 130, h: 160 },
  { name: "apple", x: 2786, y: 136, w: 110, h: 160 },
  { name: "tomato", x: 2948, y: 136, w: 130, h: 160 },
  { name: "berries", x: 3110, y: 136, w: 150, h: 160 },
  { name: "grapes2", x: 3302, y: 136, w: 110, h: 160 },
  { name: "pineapple", x: 3454, y: 136, w: 150, h: 160 },
  { name: "melon", x: 3637, y: 136, w: 130, h: 160 },
] as const;

const SnakeGame = forwardRef<RealGameHandle, RealGameProps>(function SnakeGame(
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

    // ── Sprite de frutas (carga perezosa, se tolera el primer frame sin ella) ──
    let fruitImg: HTMLImageElement | null = null;
    let fruitImgLoaded = false;
    {
      const img = new Image();
      img.onload = () => {
        fruitImgLoaded = true;
      };
      img.onerror = () => console.error("Failed to load fruits sprite sheet");
      img.src = "/snake/fruits.png";
      fruitImg = img;
    }

    // ── Estado mutable ───────────────────────────────────────────────────────
    let snake: Cell[] = [];
    let direction: Direction = DIR_RIGHT;
    let nextDirection: Direction = DIR_RIGHT;
    let fruit: Fruit = { col: 0, row: 0, spriteIndex: 0 };
    let score = 0;
    let fruitsEaten = 0;
    let tickMs = TICK_MS_INITIAL;
    let acc = 0;
    let state: GameState = "playing";
    let paused = false;

    // ── Lógica del juego ─────────────────────────────────────────────────────
    function randomFreeCell(occupied: Cell[]): Cell {
      let cell: Cell;
      do {
        cell = {
          col: Math.floor(Math.random() * COLS),
          row: Math.floor(Math.random() * ROWS),
        };
      } while (occupied.some((c) => c.col === cell.col && c.row === cell.row));
      return cell;
    }

    function spawnFruit() {
      const cell = randomFreeCell(snake);
      fruit = {
        col: cell.col,
        row: cell.row,
        spriteIndex: Math.floor(Math.random() * FRUIT_SPRITES.length),
      };
    }

    function initGame() {
      snake = [
        { col: 10, row: 7 },
        { col: 10, row: 8 },
        { col: 10, row: 9 },
      ];
      direction = DIR_RIGHT;
      nextDirection = DIR_RIGHT;
      score = 0;
      fruitsEaten = 0;
      tickMs = TICK_MS_INITIAL;
      acc = 0;
      state = "playing";
      spawnFruit();
    }

    function step() {
      direction = nextDirection;
      const head = snake[0];
      const newHead: Cell = { col: head.col + direction.dx, row: head.row + direction.dy };

      if (newHead.col < 0 || newHead.col >= COLS || newHead.row < 0 || newHead.row >= ROWS) {
        state = "gameover";
        return;
      }

      const willEat = newHead.col === fruit.col && newHead.row === fruit.row;
      const bodyToCheck = willEat ? snake : snake.slice(0, -1);
      const hitsSelf = bodyToCheck.some(
        (seg) => seg.col === newHead.col && seg.row === newHead.row,
      );
      if (hitsSelf) {
        state = "gameover";
        return;
      }

      snake.unshift(newHead);
      if (willEat) {
        score += SCORE_PER_FRUIT;
        fruitsEaten += 1;
        tickMs = Math.max(
          TICK_MS_FLOOR,
          TICK_MS_INITIAL - TICK_MS_STEP * Math.floor(fruitsEaten / FRUITS_PER_SPEEDUP),
        );
        spawnFruit();
      } else {
        snake.pop();
      }
    }

    // ── Input ────────────────────────────────────────────────────────────────
    function onKeyDown(e: KeyboardEvent) {
      const dir = KEY_DIRS[e.code];
      if (!dir) return;
      e.preventDefault();
      if (isOpposite(dir, direction)) return;
      nextDirection = dir;
    }
    window.addEventListener("keydown", onKeyDown);

    // ── Update ───────────────────────────────────────────────────────────────
    function update(dtMs: number) {
      if (state !== "playing") return;
      acc += dtMs;
      if (acc >= tickMs) {
        step();
        acc = 0;
      }
    }

    // ── Draw ─────────────────────────────────────────────────────────────────
    function draw() {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);

      for (let i = snake.length - 1; i >= 0; i--) {
        const seg = snake[i];
        const isHead = i === 0;
        ctx.fillStyle = isHead ? "#baffe0" : "#00ff88";
        ctx.fillRect(seg.col * CELL, seg.row * CELL, CELL, CELL);
        if (isHead) {
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2;
          ctx.strokeRect(seg.col * CELL + 1, seg.row * CELL + 1, CELL - 2, CELL - 2);
        }
      }

      if (fruitImgLoaded && fruitImg) {
        const sprite = FRUIT_SPRITES[fruit.spriteIndex];
        const scale = Math.min(CELL / sprite.w, CELL / sprite.h);
        const drawW = sprite.w * scale;
        const drawH = sprite.h * scale;
        const dx = fruit.col * CELL + (CELL - drawW) / 2;
        const dy = fruit.row * CELL + (CELL - drawH) / 2;
        ctx.drawImage(fruitImg, sprite.x, sprite.y, sprite.w, sprite.h, dx, dy, drawW, drawH);
      }
    }

    // ── Sincronización con React ─────────────────────────────────────────────
    let lastScore = -1;
    let lastLength = -1;
    let lastSpeedLevel = -1;
    let gameOverFired = false;

    function notifyIfChanged() {
      const length = snake.length;
      const speedLevel = Math.floor(fruitsEaten / FRUITS_PER_SPEEDUP) + 1;
      if (score !== lastScore || length !== lastLength || speedLevel !== lastSpeedLevel) {
        lastScore = score;
        lastLength = length;
        lastSpeedLevel = speedLevel;
        onStatsChangeRef.current({
          score,
          slots: [
            { label: "Longitud", value: String(length) },
            { label: "Velocidad", value: String(speedLevel) },
          ],
        });
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
        initGame();
        paused = false;
        gameOverFired = false;
        lastScore = -1;
        lastLength = -1;
        lastSpeedLevel = -1;
        notifyIfChanged();
      },
    };

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

    initGame();
    notifyIfChanged();
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return <canvas ref={canvasRef} width={W} height={H} style={{ width: "100%", height: "100%" }} />;
});

export default SnakeGame;
