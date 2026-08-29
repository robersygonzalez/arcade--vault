"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { RealGameHandle, RealGameProps } from "@/components/games/registry";

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;
const NEXT_BLOCK = 24;

const COLORS: (string | null)[] = [
  null,
  "#4dd0e1", // I - cyan
  "#ffd54f", // O - yellow
  "#ba68c8", // T - purple
  "#81c784", // S - green
  "#e57373", // Z - red
  "#90caf9", // J - pale blue
  "#ffb74d", // L - orange
  "#9e9e9e", // N - tuerca (gris metálico)
];

const PIECES: (number[][] | null)[] = [
  null,
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // I
  [
    [2, 2],
    [2, 2],
  ], // O
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ], // T
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ], // S
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ], // Z
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ], // J
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ], // L
  [
    [8, 8, 8],
    [8, 0, 8],
    [8, 8, 8],
  ], // N (tuerca)
];

const LINE_SCORES = [0, 100, 300, 500, 800];

type Piece = { type: number; shape: number[][]; x: number; y: number };

const TetrisGame = forwardRef<RealGameHandle, RealGameProps>(function TetrisGame(
  { onStatsChange, onGameOver },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nextCanvasRef = useRef<HTMLCanvasElement>(null);
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
    const nextCanvasEl = nextCanvasRef.current;
    if (!canvasEl || !nextCanvasEl) return;
    const context = canvasEl.getContext("2d");
    const nextContext = nextCanvasEl.getContext("2d");
    if (!context || !nextContext) return;
    const canvas = canvasEl;
    const nextCanvas = nextCanvasEl;
    const ctx = context;
    const nextCtx = nextContext;

    // ── Estado mutable ───────────────────────────────────────────────────────
    let board: number[][] = [];
    let current: Piece;
    let next: Piece;
    let score = 0;
    let lines = 0;
    let level = 1;
    let paused = false;
    let gameOver = false;
    let dropAccum = 0;
    let dropInterval = 1000;
    let lastTime: number | null = null;

    // ── Lógica portada de game.js ────────────────────────────────────────────
    function createBoard(): number[][] {
      return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
    }

    function randomPiece(): Piece {
      const type = Math.floor(Math.random() * 8) + 1;
      const shape = (PIECES[type] as number[][]).map((row) => [...row]);
      return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
    }

    function collide(shape: number[][], ox: number, oy: number): boolean {
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (!shape[r][c]) continue;
          const nx = ox + c;
          const ny = oy + r;
          if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
          if (ny >= 0 && board[ny][nx]) return true;
        }
      }
      return false;
    }

    function rotateCW(shape: number[][]): number[][] {
      const rows = shape.length;
      const cols = shape[0].length;
      const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
      return result;
    }

    function tryRotate() {
      const rotated = rotateCW(current.shape);
      const kicks = [0, -1, 1, -2, 2];
      for (const kick of kicks) {
        if (!collide(rotated, current.x + kick, current.y)) {
          current.shape = rotated;
          current.x += kick;
          return;
        }
      }
    }

    function merge() {
      for (let r = 0; r < current.shape.length; r++)
        for (let c = 0; c < current.shape[r].length; c++)
          if (current.shape[r][c]) board[current.y + r][current.x + c] = current.shape[r][c];
    }

    function clearLines() {
      let cleared = 0;
      for (let r = ROWS - 1; r >= 0; r--) {
        if (board[r].every((v) => v !== 0)) {
          board.splice(r, 1);
          board.unshift(new Array(COLS).fill(0));
          cleared++;
          r++;
        }
      }
      if (cleared) {
        lines += cleared;
        score += (LINE_SCORES[cleared] || 0) * level;
        level = Math.floor(lines / 10) + 1;
        dropInterval = Math.max(100, 1000 - (level - 1) * 90);
      }
    }

    function ghostY(): number {
      let gy = current.y;
      while (!collide(current.shape, current.x, gy + 1)) gy++;
      return gy;
    }

    function hardDrop() {
      const gy = ghostY();
      score += (gy - current.y) * 2;
      current.y = gy;
      lockPiece();
    }

    function softDrop() {
      if (!collide(current.shape, current.x, current.y + 1)) {
        current.y++;
        score += 1;
      } else {
        lockPiece();
      }
    }

    function lockPiece() {
      merge();
      clearLines();
      spawn();
    }

    function spawn() {
      current = next;
      next = randomPiece();
      if (collide(current.shape, current.x, current.y)) {
        gameOver = true;
      }
      drawNext();
    }

    // ── Draw ─────────────────────────────────────────────────────────────────
    function drawBlock(
      context: CanvasRenderingContext2D,
      x: number,
      y: number,
      colorIndex: number,
      size: number,
      alpha?: number,
    ) {
      if (!colorIndex) return;
      context.globalAlpha = alpha ?? 1;
      context.fillStyle = COLORS[colorIndex] as string;
      context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
      context.fillStyle = "rgba(255,255,255,0.12)";
      context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
      context.globalAlpha = 1;
    }

    function drawGrid() {
      ctx.strokeStyle = "#22222e";
      ctx.lineWidth = 0.5;
      for (let c = 1; c < COLS; c++) {
        ctx.beginPath();
        ctx.moveTo(c * BLOCK, 0);
        ctx.lineTo(c * BLOCK, ROWS * BLOCK);
        ctx.stroke();
      }
      for (let r = 1; r < ROWS; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * BLOCK);
        ctx.lineTo(COLS * BLOCK, r * BLOCK);
        ctx.stroke();
      }
    }

    function draw() {
      ctx.fillStyle = "#1a1a25";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      drawGrid();

      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++) drawBlock(ctx, c, r, board[r][c], BLOCK);

      const gy = ghostY();
      for (let r = 0; r < current.shape.length; r++)
        for (let c = 0; c < current.shape[r].length; c++)
          if (current.shape[r][c])
            drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

      for (let r = 0; r < current.shape.length; r++)
        for (let c = 0; c < current.shape[r].length; c++)
          drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
    }

    function drawNext() {
      nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
      const shape = next.shape;
      const offX = Math.floor((4 - shape[0].length) / 2);
      const offY = Math.floor((4 - shape.length) / 2);
      for (let r = 0; r < shape.length; r++)
        for (let c = 0; c < shape[r].length; c++)
          drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NEXT_BLOCK);
    }

    // ── Sincronización con React ─────────────────────────────────────────────
    let lastScore = -1;
    let lastLines = -1;
    let lastLevel = -1;
    let gameOverFired = false;

    function notifyIfChanged() {
      if (score !== lastScore || lines !== lastLines || level !== lastLevel) {
        lastScore = score;
        lastLines = lines;
        lastLevel = level;
        onStatsChangeRef.current({
          score,
          slots: [
            { label: "Líneas", value: String(lines) },
            { label: "Nivel", value: String(level) },
          ],
        });
      }
      if (gameOver && !gameOverFired) {
        gameOverFired = true;
        onGameOverRef.current(score);
      }
    }

    function initGame() {
      board = createBoard();
      score = 0;
      lines = 0;
      level = 1;
      paused = false;
      gameOver = false;
      dropInterval = 1000;
      dropAccum = 0;
      lastTime = null;
      next = randomPiece();
      spawn();
    }

    // ── Acciones expuestas vía ref ───────────────────────────────────────────
    actionsRef.current = {
      togglePause: () => {
        paused = !paused;
      },
      forceGameOver: () => {
        gameOver = true;
      },
      restart: () => {
        initGame();
        gameOverFired = false;
        lastScore = -1;
        lastLines = -1;
        lastLevel = -1;
        notifyIfChanged();
      },
    };

    // ── Input ────────────────────────────────────────────────────────────────
    const CONTROL_CODES = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"];

    function onKeyDown(e: KeyboardEvent) {
      if (CONTROL_CODES.includes(e.code)) e.preventDefault();
      if (paused || gameOver) return;
      switch (e.code) {
        case "ArrowLeft":
          if (!collide(current.shape, current.x - 1, current.y)) current.x--;
          break;
        case "ArrowRight":
          if (!collide(current.shape, current.x + 1, current.y)) current.x++;
          break;
        case "ArrowDown":
          softDrop();
          break;
        case "ArrowUp":
        case "KeyX":
          tryRotate();
          break;
        case "Space":
          hardDrop();
          break;
      }
    }
    window.addEventListener("keydown", onKeyDown);

    // ── Loop principal ───────────────────────────────────────────────────────
    let rafId = 0;

    function loop(ts: number) {
      const dt = lastTime === null ? 0 : ts - lastTime;
      lastTime = ts;
      if (!paused) {
        dropAccum += dt;
        if (dropAccum >= dropInterval) {
          dropAccum = 0;
          if (!collide(current.shape, current.x, current.y + 1)) {
            current.y++;
          } else {
            lockPiece();
          }
        }
      }
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

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
      }}
    >
      <canvas
        ref={canvasRef}
        width={COLS * BLOCK}
        height={ROWS * BLOCK}
        style={{ height: "100%", width: "auto" }}
      />
      <canvas
        ref={nextCanvasRef}
        width={NEXT_BLOCK * 4}
        height={NEXT_BLOCK * 4}
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          background: "#1a1a25",
          border: "1px solid rgba(255,255,255,0.15)",
        }}
      />
    </div>
  );
});

export default TetrisGame;
