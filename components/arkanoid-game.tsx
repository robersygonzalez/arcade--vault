"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { RealGameHandle, RealGameProps } from "@/components/games/registry";
import { ARKANOID_SKINS, SkinSwitcher, useGameSkin } from "@/components/games/skins";
import type { ArkanoidBlockColorName, ArkanoidTint, SkinId } from "@/components/games/skins";

const W = 800;
const H = 600;

const PADDLE_SPEED = 400;
const BLOCK_COLS = 10;
const BLOCK_ROWS = 6;
const BLOCK_W = 64;
const BLOCK_H = 24;
const BLOCK_COLORS = ["red", "yellow", "cyan", "magenta", "hotpink", "green"];
const BLOCKS_ORIGIN_X = (W - BLOCK_COLS * BLOCK_W) / 2;
const BLOCKS_ORIGIN_Y = 80;
const BASE_BALL_VX = 200;
const BASE_BALL_VY = -300;

type SpriteFrame = { sx: number; sy: number; sw: number; sh: number };
type Paddle = { x: number; y: number; w: number; h: number };
type Ball = { x: number; y: number; w: number; h: number; vx: number; vy: number };
type Block = { x: number; y: number; w: number; h: number; color: string; alive: boolean };
type Explosion = { x: number; y: number; w: number; h: number; color: string; elapsed: number };
type LevelBlock = { col: number; row: number; color: string };
type Level = { speed: number; blocks: LevelBlock[] };
type GameState = "playing" | "gameover" | "win";

// ── Sprites y niveles consolidados (spritesheet.js + levels.js) ────────────
const EXPLOSION_FRAMES: Record<string, SpriteFrame[]> = {
  red: [
    { sx: 256, sy: 176, sw: 32, sh: 16 },
    { sx: 288, sy: 176, sw: 32, sh: 16 },
    { sx: 320, sy: 176, sw: 32, sh: 16 },
    { sx: 352, sy: 176, sw: 32, sh: 16 },
  ],
  cyan: [
    { sx: 256, sy: 192, sw: 32, sh: 16 },
    { sx: 288, sy: 192, sw: 32, sh: 16 },
    { sx: 320, sy: 192, sw: 32, sh: 16 },
    { sx: 352, sy: 192, sw: 32, sh: 16 },
  ],
  green: [
    { sx: 256, sy: 208, sw: 32, sh: 16 },
    { sx: 288, sy: 208, sw: 32, sh: 16 },
    { sx: 320, sy: 208, sw: 32, sh: 16 },
    { sx: 352, sy: 208, sw: 32, sh: 16 },
  ],
  magenta: [
    { sx: 256, sy: 224, sw: 32, sh: 16 },
    { sx: 288, sy: 224, sw: 32, sh: 16 },
    { sx: 320, sy: 224, sw: 32, sh: 16 },
    { sx: 352, sy: 224, sw: 32, sh: 16 },
  ],
  yellow: [
    { sx: 256, sy: 240, sw: 32, sh: 16 },
    { sx: 288, sy: 240, sw: 32, sh: 16 },
    { sx: 320, sy: 240, sw: 32, sh: 16 },
    { sx: 352, sy: 240, sw: 32, sh: 16 },
  ],
  hotpink: [
    { sx: 256, sy: 256, sw: 32, sh: 16 },
    { sx: 288, sy: 256, sw: 32, sh: 16 },
    { sx: 320, sy: 256, sw: 32, sh: 16 },
    { sx: 352, sy: 256, sw: 32, sh: 16 },
  ],
  gray: [
    { sx: 256, sy: 176, sw: 32, sh: 16 },
    { sx: 288, sy: 176, sw: 32, sh: 16 },
    { sx: 320, sy: 176, sw: 32, sh: 16 },
    { sx: 352, sy: 176, sw: 32, sh: 16 },
  ],
};

const EXPLOSION_DURATION = 150;

const SPRITES: { paddle: SpriteFrame; ball: SpriteFrame; blocks: Record<string, SpriteFrame> } = {
  paddle: { sx: 32, sy: 112, sw: 162, sh: 14 },
  ball: { sx: 32, sy: 32, sw: 16, sh: 16 },
  blocks: {
    gray: { sx: 32, sy: 288, sw: 32, sh: 16 },
    red: { sx: 32, sy: 176, sw: 32, sh: 16 },
    yellow: { sx: 32, sy: 240, sw: 32, sh: 16 },
    cyan: { sx: 32, sy: 192, sw: 32, sh: 16 },
    magenta: { sx: 32, sy: 224, sw: 32, sh: 16 },
    hotpink: { sx: 32, sy: 256, sw: 32, sh: 16 },
    green: { sx: 32, sy: 208, sw: 32, sh: 16 },
  },
};

let rawImg: HTMLCanvasElement | null = null;
let ssLoaded = false;
const ssCallbacks: (() => void)[] = [];
const tintedCache = new Map<SkinId, HTMLCanvasElement>();

function buildTintedCopy(raw: HTMLCanvasElement, tint: ArkanoidTint): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = raw.width;
  canvas.height = raw.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.drawImage(raw, 0, 0);

  function tintRegion(frame: SpriteFrame, color: string) {
    if (!ctx) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(frame.sx, frame.sy, frame.sw, frame.sh);
    ctx.clip();
    ctx.globalCompositeOperation = "source-atop";
    ctx.fillStyle = color;
    ctx.fillRect(frame.sx, frame.sy, frame.sw, frame.sh);
    ctx.restore();
  }

  tintRegion(SPRITES.paddle, tint.paddle);
  tintRegion(SPRITES.ball, tint.ball);

  for (const [name, frame] of Object.entries(SPRITES.blocks)) {
    tintRegion(frame, tint.blockColors[name as ArkanoidBlockColorName]);
  }

  for (const [name, frames] of Object.entries(EXPLOSION_FRAMES)) {
    for (const frame of frames) {
      tintRegion(frame, tint.blockColors[name as ArkanoidBlockColorName]);
    }
  }

  return canvas;
}

function loadSpritesheet(cb: () => void) {
  if (ssLoaded) {
    cb();
    return;
  }
  ssCallbacks.push(cb);
  if (rawImg) return;

  const img = new Image();
  img.onload = () => {
    const oc = document.createElement("canvas");
    oc.width = img.width;
    oc.height = img.height;
    const octx = oc.getContext("2d");
    if (!octx) return;
    octx.drawImage(img, 0, 0);
    rawImg = oc;
    tintedCache.set("clasico", rawImg);
    tintedCache.set("neon", buildTintedCopy(rawImg, ARKANOID_SKINS.neon.tint!));
    tintedCache.set("retro", buildTintedCopy(rawImg, ARKANOID_SKINS.retro.tint!));
    ssLoaded = true;
    ssCallbacks.forEach((f) => f());
  };
  img.onerror = () => console.error("Failed to load spritesheet");
  img.src = "/arkanoid/spritesheet-breakout.png";
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  img: HTMLCanvasElement | null,
  frame: SpriteFrame,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  if (!ssLoaded || !img) return;
  ctx.drawImage(img, frame.sx, frame.sy, frame.sw, frame.sh, x, y, w, h);
}

function drawSprite(
  ctx: CanvasRenderingContext2D,
  img: HTMLCanvasElement | null,
  name: string,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  if (!ssLoaded || !img) return;
  let sp: SpriteFrame | undefined;
  if (name.startsWith("block_")) {
    sp = SPRITES.blocks[name.slice(6)];
  } else if (name === "paddle" || name === "ball") {
    sp = SPRITES[name];
  }
  if (!sp) return;
  ctx.drawImage(img, sp.sx, sp.sy, sp.sw, sp.sh, x, y, w, h);
}

const LEVELS: Level[] = (() => {
  const rowColors1 = ["red", "yellow", "cyan", "magenta", "hotpink", "green"];
  const rowColors2 = ["gray", "cyan", "hotpink", "yellow", "magenta", "green"];
  const rowColors4 = ["cyan", "magenta", "green", "yellow", "hotpink", "red"];

  const l1: LevelBlock[] = [];
  for (let row = 0; row < BLOCK_ROWS; row++)
    for (let col = 0; col < BLOCK_COLS; col++) l1.push({ col, row, color: rowColors1[row] });

  const l2: LevelBlock[] = [];
  const pyStart = [4, 3, 2, 1, 0, 0];
  const pyEnd = [5, 6, 7, 8, 9, 9];
  for (let row = 0; row < BLOCK_ROWS; row++)
    for (let col = pyStart[row]; col <= pyEnd[row]; col++)
      l2.push({ col, row, color: rowColors2[row] });

  const l3: LevelBlock[] = [];
  for (let row = 0; row < BLOCK_ROWS; row++)
    for (let col = 0; col < BLOCK_COLS; col++)
      if ((col + row) % 2 === 0) l3.push({ col, row, color: row < 3 ? "yellow" : "magenta" });

  const gaps4 = [
    [2, 5, 8],
    [0, 4, 7, 9],
    [1, 3, 6],
    [2, 5, 8, 9],
    [0, 4, 7],
    [1, 3, 6, 9],
  ];
  const l4: LevelBlock[] = [];
  for (let row = 0; row < BLOCK_ROWS; row++)
    for (let col = 0; col < BLOCK_COLS; col++)
      if (!gaps4[row].includes(col)) l4.push({ col, row, color: rowColors4[row] });

  const l5: LevelBlock[] = [];
  for (let row = 0; row < BLOCK_ROWS; row++)
    for (let col = 0; col < BLOCK_COLS; col++) {
      const isFrame = col === 0 || col === 9 || row === 0 || row === 5;
      const isCross = col === 4 || row === 2;
      if (isFrame || isCross)
        l5.push({ col, row, color: isCross && !isFrame ? "hotpink" : "cyan" });
    }

  return [
    { speed: 1.0, blocks: l1 },
    { speed: 1.1, blocks: l2 },
    { speed: 1.21, blocks: l3 },
    { speed: 1.33, blocks: l4 },
    { speed: 1.46, blocks: l5 },
  ];
})();

const ArkanoidGame = forwardRef<RealGameHandle, RealGameProps>(function ArkanoidGame(
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
  const [skin, setSkin] = useGameSkin("arkanoid");
  const skinRef = useRef({ id: skin, palette: ARKANOID_SKINS[skin] });

  useEffect(() => {
    onStatsChangeRef.current = onStatsChange;
  }, [onStatsChange]);

  useEffect(() => {
    onGameOverRef.current = onGameOver;
  }, [onGameOver]);

  useEffect(() => {
    skinRef.current = { id: skin, palette: ARKANOID_SKINS[skin] };
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
    const canvas = canvasEl;
    const ctx = context;

    // ── Estado mutable ───────────────────────────────────────────────────────
    let paddle: Paddle = { x: 0, y: 560, w: 81, h: 14 };
    let ball: Ball = { x: 0, y: 0, w: 16, h: 16, vx: BASE_BALL_VX, vy: BASE_BALL_VY };
    let blocks: Block[] = [];
    let explosions: Explosion[] = [];
    let lives = 3;
    let score = 0;
    let gameState: GameState = "playing";
    let currentLevel = 1;
    let paused = false;

    // ── Lógica portada de game.js ────────────────────────────────────────────
    function initPaddle() {
      paddle.x = (W - paddle.w) / 2;
    }

    function initBall() {
      const speed = LEVELS[currentLevel - 1].speed;
      ball.x = paddle.x + (paddle.w - ball.w) / 2;
      ball.y = paddle.y - ball.h;
      ball.vx = BASE_BALL_VX * speed;
      ball.vy = BASE_BALL_VY * speed;
    }

    function loadLevel(n: number) {
      currentLevel = n;
      const level = LEVELS[n - 1];
      blocks = level.blocks.map((b) => ({
        x: BLOCKS_ORIGIN_X + b.col * BLOCK_W,
        y: BLOCKS_ORIGIN_Y + b.row * BLOCK_H,
        w: BLOCK_W,
        h: BLOCK_H,
        color: b.color,
        alive: true,
      }));
      explosions = [];
      ball.x = paddle.x + (paddle.w - ball.w) / 2;
      ball.y = paddle.y - ball.h;
      ball.vx = BASE_BALL_VX * level.speed;
      ball.vy = BASE_BALL_VY * level.speed;
    }

    function collideAABB(block: Block): boolean {
      return (
        ball.x < block.x + block.w &&
        ball.x + ball.w > block.x &&
        ball.y < block.y + block.h &&
        ball.y + ball.h > block.y
      );
    }

    // ── Input ────────────────────────────────────────────────────────────────
    const keys: Record<string, boolean> = {};
    const CONTROL_CODES = ["ArrowLeft", "ArrowRight"];

    function onKeyDown(e: KeyboardEvent) {
      if (CONTROL_CODES.includes(e.code)) e.preventDefault();
      keys[e.code] = true;
    }
    function onKeyUp(e: KeyboardEvent) {
      keys[e.code] = false;
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    function onMouseMove(e: MouseEvent) {
      if (paused) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const mouseX = (e.clientX - rect.left) * scaleX;
      paddle.x = Math.max(0, Math.min(W - paddle.w, mouseX - paddle.w / 2));
    }
    canvas.addEventListener("mousemove", onMouseMove);

    // ── Update ───────────────────────────────────────────────────────────────
    function update(dt: number) {
      if (gameState !== "playing") return;

      if (keys["ArrowLeft"]) paddle.x = Math.max(0, paddle.x - PADDLE_SPEED * dt);
      if (keys["ArrowRight"]) paddle.x = Math.min(W - paddle.w, paddle.x + PADDLE_SPEED * dt);

      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      if (ball.x <= 0) {
        ball.x = 0;
        ball.vx = Math.abs(ball.vx);
      }
      if (ball.x + ball.w >= W) {
        ball.x = W - ball.w;
        ball.vx = -Math.abs(ball.vx);
      }
      if (ball.y <= 0) {
        ball.y = 0;
        ball.vy = Math.abs(ball.vy);
      }

      if (
        ball.vy > 0 &&
        ball.x + ball.w > paddle.x &&
        ball.x < paddle.x + paddle.w &&
        ball.y + ball.h >= paddle.y &&
        ball.y + ball.h <= paddle.y + paddle.h + 8
      ) {
        ball.y = paddle.y - ball.h;
        ball.vy = -Math.abs(ball.vy);
      }

      for (const block of blocks) {
        if (!block.alive) continue;
        if (collideAABB(block)) {
          block.alive = false;
          explosions.push({
            x: block.x,
            y: block.y,
            w: block.w,
            h: block.h,
            color: block.color,
            elapsed: 0,
          });
          score += 10;
          ball.vy = -ball.vy;
          if (blocks.every((b) => !b.alive)) {
            if (currentLevel < 5) loadLevel(currentLevel + 1);
            else gameState = "win";
          }
          break; // one block per frame
        }
      }

      for (const exp of explosions) exp.elapsed += dt * 1000;
      explosions = explosions.filter((exp) => exp.elapsed < EXPLOSION_DURATION);

      if (ball.y > H) {
        lives--;
        if (lives <= 0) {
          lives = 0;
          gameState = "gameover";
        } else {
          initBall();
        }
      }
    }

    // ── Draw ─────────────────────────────────────────────────────────────────
    function draw() {
      const img = tintedCache.get(skinRef.current.id) ?? rawImg;
      const palette = skinRef.current.palette;

      ctx.fillStyle = palette.background;
      ctx.fillRect(0, 0, W, H);

      for (const block of blocks) {
        if (block.alive)
          drawSprite(ctx, img, "block_" + block.color, block.x, block.y, block.w, block.h);
      }

      for (const exp of explosions) {
        const frameIndex = Math.min(Math.floor((exp.elapsed / EXPLOSION_DURATION) * 4), 3);
        drawFrame(ctx, img, EXPLOSION_FRAMES[exp.color][frameIndex], exp.x, exp.y, exp.w, exp.h);
      }

      if (palette.glowBlur > 0) {
        ctx.shadowBlur = palette.glowBlur;
        ctx.shadowColor = palette.tint!.paddle;
      }
      drawSprite(ctx, img, "paddle", paddle.x, paddle.y, paddle.w, paddle.h);
      ctx.shadowBlur = 0;

      if (palette.glowBlur > 0) {
        ctx.shadowBlur = palette.glowBlur;
        ctx.shadowColor = palette.tint!.ball;
      }
      drawSprite(ctx, img, "ball", ball.x, ball.y, ball.w, ball.h);
      ctx.shadowBlur = 0;
    }

    // ── Sincronización con React ─────────────────────────────────────────────
    let lastScore = -1;
    let lastLives = -1;
    let lastLevel = -1;
    let gameOverFired = false;

    function notifyIfChanged() {
      if (score !== lastScore || lives !== lastLives || currentLevel !== lastLevel) {
        lastScore = score;
        lastLives = lives;
        lastLevel = currentLevel;
        onStatsChangeRef.current({
          score,
          slots: [
            { label: "Vidas", value: "♥ ".repeat(lives).trim() || "—" },
            { label: "Nivel", value: String(currentLevel).padStart(2, "0") },
          ],
        });
      }
      if ((gameState === "gameover" || gameState === "win") && !gameOverFired) {
        gameOverFired = true;
        onGameOverRef.current(score);
      }
    }

    function initGame() {
      initPaddle();
      loadLevel(1);
      lives = 3;
      score = 0;
      gameState = "playing";
    }

    // ── Acciones expuestas vía ref ───────────────────────────────────────────
    actionsRef.current = {
      togglePause: () => {
        paused = !paused;
      },
      forceGameOver: () => {
        gameState = "gameover";
      },
      restart: () => {
        initGame();
        paused = false;
        gameOverFired = false;
        lastScore = -1;
        lastLives = -1;
        lastLevel = -1;
        notifyIfChanged();
      },
    };

    // ── Loop principal ───────────────────────────────────────────────────────
    let lastTime: number | null = null;
    let rafId = 0;
    let cancelled = false;

    function loop(ts: number) {
      const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
      lastTime = ts;
      if (!paused) update(dt);
      draw();
      notifyIfChanged();
      rafId = requestAnimationFrame(loop);
    }

    loadSpritesheet(() => {
      if (cancelled) return;
      initGame();
      notifyIfChanged();
      rafId = requestAnimationFrame(loop);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <canvas ref={canvasRef} width={800} height={600} style={{ width: "100%", height: "100%" }} />
      <SkinSwitcher gameId="arkanoid" skin={skin} onChange={setSkin} />
    </div>
  );
});

export default ArkanoidGame;
