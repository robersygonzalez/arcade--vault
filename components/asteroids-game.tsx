"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

export type AsteroidsGameHandle = {
  togglePause: () => void;
  forceGameOver: () => void;
  restart: () => void;
};

type AsteroidsGameProps = {
  onStatsChange: (stats: { score: number; lives: number; level: number }) => void;
  onGameOver: (finalScore: number) => void;
};

const AsteroidsGame = forwardRef<AsteroidsGameHandle, AsteroidsGameProps>(function AsteroidsGame(
  { onStatsChange, onGameOver },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onStatsChangeRef = useRef(onStatsChange);
  const onGameOverRef = useRef(onGameOver);
  const actionsRef = useRef<AsteroidsGameHandle>({
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
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const c = context;

    const W = 800;
    const H = 600;

    // ── Input ──────────────────────────────────────────────────────────────
    const keys: Record<string, boolean> = {};
    const justPressed: Record<string, boolean> = {};
    const CONTROL_CODES = ["ArrowLeft", "ArrowRight", "ArrowUp", "Space"];

    function onKeyDown(e: KeyboardEvent) {
      if (CONTROL_CODES.includes(e.code)) e.preventDefault();
      if (!keys[e.code]) justPressed[e.code] = true;
      keys[e.code] = true;
    }
    function onKeyUp(e: KeyboardEvent) {
      keys[e.code] = false;
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    function pressed(code: string) {
      const val = justPressed[code];
      justPressed[code] = false;
      return val;
    }

    // ── Utils ──────────────────────────────────────────────────────────────
    const wrap = (v: number, max: number) => ((v % max) + max) % max;
    const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      Math.hypot(a.x - b.x, a.y - b.y);
    const rand = (min: number, max: number) => min + Math.random() * (max - min);
    const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));

    // ── Constants ────────────────────────────────────────────────────────────
    const POWERUP_DROP_CHANCE = 0.15;
    const POWERUP_DURATION = 5;
    const POWERUP_TTL = 12;
    const TRIPLE_SPREAD = 0.18;

    // ── Bullet ───────────────────────────────────────────────────────────────
    class Bullet {
      x: number;
      y: number;
      vx: number;
      vy: number;
      ttl: number;
      radius: number;
      dead: boolean;

      constructor(x: number, y: number, angle: number) {
        this.x = x;
        this.y = y;
        const SPEED = 520;
        this.vx = Math.cos(angle) * SPEED;
        this.vy = Math.sin(angle) * SPEED;
        this.ttl = 1.1;
        this.radius = 2;
        this.dead = false;
      }

      update(dt: number) {
        this.x = wrap(this.x + this.vx * dt, W);
        this.y = wrap(this.y + this.vy * dt, H);
        this.ttl -= dt;
        if (this.ttl <= 0) this.dead = true;
      }

      draw() {
        c.fillStyle = "#fff";
        c.beginPath();
        c.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        c.fill();
      }
    }

    // ── Asteroid ─────────────────────────────────────────────────────────────
    const RADII = [0, 16, 30, 50]; // por tamaño 1, 2, 3
    const SPEEDS = [0, 85, 55, 32]; // velocidad base por tamaño
    const POINTS = [0, 100, 50, 20]; // puntos por tamaño

    class Asteroid {
      x: number;
      y: number;
      size: number;
      radius: number;
      dead: boolean;
      vx: number;
      vy: number;
      rotSpeed: number;
      rot: number;
      verts: [number, number][];

      constructor(x: number, y: number, size = 3) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.radius = RADII[size];
        this.dead = false;

        const angle = rand(0, Math.PI * 2);
        const speed = SPEEDS[size] + rand(-15, 15);
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.rotSpeed = rand(-1.2, 1.2);
        this.rot = rand(0, Math.PI * 2);

        const n = randInt(8, 13);
        this.verts = [];
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          const r = this.radius * rand(0.6, 1.0);
          this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
        }
      }

      update(dt: number) {
        this.x = wrap(this.x + this.vx * dt, W);
        this.y = wrap(this.y + this.vy * dt, H);
        this.rot += this.rotSpeed * dt;
      }

      split(): Asteroid[] {
        if (this.size <= 1) return [];
        return [
          new Asteroid(this.x, this.y, this.size - 1),
          new Asteroid(this.x, this.y, this.size - 1),
        ];
      }

      draw() {
        c.save();
        c.translate(this.x, this.y);
        c.rotate(this.rot);
        c.strokeStyle = "#fff";
        c.lineWidth = 1.5;
        c.lineJoin = "round";
        c.beginPath();
        c.moveTo(this.verts[0][0], this.verts[0][1]);
        for (let i = 1; i < this.verts.length; i++) c.lineTo(this.verts[i][0], this.verts[i][1]);
        c.closePath();
        c.stroke();
        c.restore();
      }
    }

    // ── PowerUp ──────────────────────────────────────────────────────────────
    class PowerUp {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      ttl: number;
      dead: boolean;

      constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        const angle = rand(0, Math.PI * 2);
        const speed = rand(20, 40);
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.radius = 12;
        this.ttl = POWERUP_TTL;
        this.dead = false;
      }

      update(dt: number) {
        this.x = wrap(this.x + this.vx * dt, W);
        this.y = wrap(this.y + this.vy * dt, H);
        this.ttl -= dt;
        if (this.ttl <= 0) this.dead = true;
      }

      draw() {
        if (this.ttl < 2 && Math.floor(this.ttl * 8) % 2 === 0) return;
        const pulse = 0.85 + Math.sin(performance.now() / 150) * 0.15;
        c.save();
        c.translate(this.x, this.y);
        c.rotate(Math.PI / 4);
        c.strokeStyle = "#0ff";
        c.lineWidth = 2;
        const r = this.radius * pulse;
        c.strokeRect(-r, -r, r * 2, r * 2);
        c.restore();
        c.fillStyle = "#0ff";
        c.font = "bold 12px monospace";
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillText("3x", this.x, this.y);
      }
    }

    // ── Ship ─────────────────────────────────────────────────────────────────
    class Ship {
      x = 0;
      y = 0;
      angle = 0;
      vx = 0;
      vy = 0;
      radius = 12;
      thrusting = false;
      invincible = 0;
      shootCooldown = 0;
      dead = false;
      tripleShot: number;

      constructor() {
        this.tripleShot = 0;
        this.reset();
      }

      reset() {
        this.x = W / 2;
        this.y = H / 2;
        this.angle = -Math.PI / 2;
        this.vx = 0;
        this.vy = 0;
        this.radius = 12;
        this.thrusting = false;
        this.invincible = 3;
        this.shootCooldown = 0;
        this.dead = false;
      }

      update(dt: number) {
        if (this.dead) return;
        if (this.invincible > 0) this.invincible -= dt;
        if (this.shootCooldown > 0) this.shootCooldown -= dt;
        if (this.tripleShot > 0) this.tripleShot -= dt;

        const ROT = 3.5; // rad/s
        const THRUST = 260; // px/s²
        const DRAG = 0.987;

        if (keys["ArrowLeft"]) this.angle -= ROT * dt;
        if (keys["ArrowRight"]) this.angle += ROT * dt;

        this.thrusting = !!keys["ArrowUp"];
        if (this.thrusting) {
          this.vx += Math.cos(this.angle) * THRUST * dt;
          this.vy += Math.sin(this.angle) * THRUST * dt;
        }

        this.vx *= DRAG;
        this.vy *= DRAG;
        this.x = wrap(this.x + this.vx * dt, W);
        this.y = wrap(this.y + this.vy * dt, H);
      }

      tryShoot(): Bullet[] {
        if (this.shootCooldown > 0 || this.dead) return [];
        this.shootCooldown = 0.2;
        const NOSE = 21;
        const ox = this.x + Math.cos(this.angle) * NOSE;
        const oy = this.y + Math.sin(this.angle) * NOSE;
        if (this.tripleShot > 0) {
          return [
            new Bullet(ox, oy, this.angle - TRIPLE_SPREAD),
            new Bullet(ox, oy, this.angle),
            new Bullet(ox, oy, this.angle + TRIPLE_SPREAD),
          ];
        }
        return [new Bullet(ox, oy, this.angle)];
      }

      draw() {
        if (this.dead) return;
        if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

        c.save();
        c.translate(this.x, this.y);
        c.rotate(this.angle);
        c.strokeStyle = "#fff";
        c.lineWidth = 1.5;
        c.lineJoin = "round";

        c.beginPath();
        c.moveTo(20, 0);
        c.lineTo(-12, -9);
        c.lineTo(-7, 0);
        c.lineTo(-12, 9);
        c.closePath();
        c.stroke();

        if (this.thrusting && Math.random() > 0.35) {
          c.beginPath();
          c.moveTo(-8, -4);
          c.lineTo(-8 - rand(6, 14), 0);
          c.lineTo(-8, 4);
          c.strokeStyle = "rgba(255, 130, 0, 0.85)";
          c.stroke();
        }

        c.restore();
      }
    }

    // ── Partículas (explosión) ─────────────────────────────────────────────
    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      ttl: number;
      dead: boolean;

      constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        const angle = rand(0, Math.PI * 2);
        const speed = rand(30, 130);
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.life = rand(0.4, 1.1);
        this.ttl = this.life;
        this.dead = false;
      }

      update(dt: number) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.ttl -= dt;
        if (this.ttl <= 0) this.dead = true;
      }

      draw() {
        const alpha = this.ttl / this.life;
        c.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(this.x, this.y);
        c.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
        c.stroke();
      }
    }

    // ── Estado del juego ─────────────────────────────────────────────────────
    let ship: Ship;
    let bullets: Bullet[] = [];
    let asteroids: Asteroid[] = [];
    let particles: Particle[] = [];
    let powerUps: PowerUp[] = [];
    let score = 0;
    let lives = 3;
    let level = 1;
    let state: "playing" | "dead" | "gameover" = "playing";
    let deadTimer = 0;
    let powerUpSpawned = false;
    let killsSinceSpawn = 0;
    let paused = false;

    function spawnAsteroids(count: number) {
      const SAFE_DIST = 130;
      for (let i = 0; i < count; i++) {
        let x: number, y: number;
        do {
          x = rand(0, W);
          y = rand(0, H);
        } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
        asteroids.push(new Asteroid(x, y, 3));
      }
    }

    function initGame() {
      ship = new Ship();
      bullets = [];
      asteroids = [];
      particles = [];
      powerUps = [];
      powerUpSpawned = false;
      killsSinceSpawn = 0;
      score = 0;
      lives = 3;
      level = 1;
      state = "playing";
      spawnAsteroids(4);
    }

    function nextLevel() {
      level++;
      bullets = [];
      particles = [];
      powerUps = [];
      powerUpSpawned = false;
      killsSinceSpawn = 0;
      ship.reset();
      spawnAsteroids(3 + level);
    }

    function explode(x: number, y: number, count = 8) {
      for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
    }

    function killShip() {
      explode(ship.x, ship.y, 14);
      ship.dead = true;
      lives--;
      if (lives <= 0) {
        state = "gameover";
      } else {
        state = "dead";
        deadTimer = 2;
      }
    }

    // ── Update ───────────────────────────────────────────────────────────────
    function update(dt: number) {
      if (state === "gameover") {
        particles.forEach((p) => p.update(dt));
        particles = particles.filter((p) => !p.dead);
        return;
      }

      if (state === "dead") {
        deadTimer -= dt;
        particles.forEach((p) => p.update(dt));
        particles = particles.filter((p) => !p.dead);
        asteroids.forEach((a) => a.update(dt));
        if (deadTimer <= 0) {
          state = "playing";
          ship.reset();
        }
        return;
      }

      if (pressed("Space")) {
        bullets.push(...ship.tryShoot());
      }

      ship.update(dt);
      bullets.forEach((b) => b.update(dt));
      asteroids.forEach((a) => a.update(dt));
      particles.forEach((p) => p.update(dt));
      powerUps.forEach((p) => p.update(dt));

      bullets = bullets.filter((b) => !b.dead);
      particles = particles.filter((p) => !p.dead);
      powerUps = powerUps.filter((p) => !p.dead);

      for (const p of powerUps) {
        if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
          p.dead = true;
          ship.tripleShot = POWERUP_DURATION;
        }
      }

      const newAsteroids: Asteroid[] = [];
      for (const b of bullets) {
        for (const a of asteroids) {
          if (!a.dead && !b.dead && dist(b, a) < a.radius) {
            b.dead = true;
            a.dead = true;
            score += POINTS[a.size];
            explode(a.x, a.y, a.size * 5);
            newAsteroids.push(...a.split());
            if (!powerUpSpawned) {
              killsSinceSpawn++;
              const guaranteed = killsSinceSpawn >= 5;
              if (guaranteed || Math.random() < POWERUP_DROP_CHANCE) {
                powerUps.push(new PowerUp(a.x, a.y));
                powerUpSpawned = true;
              }
            }
          }
        }
      }
      asteroids = asteroids.filter((a) => !a.dead).concat(newAsteroids);
      bullets = bullets.filter((b) => !b.dead);

      if (ship.invincible <= 0) {
        for (const a of asteroids) {
          if (dist(ship, a) < ship.radius + a.radius * 0.82) {
            killShip();
            break;
          }
        }
      }

      if (asteroids.length === 0) nextLevel();
    }

    // ── Draw ─────────────────────────────────────────────────────────────────
    function drawHUD() {
      if (ship.tripleShot > 0) {
        c.textAlign = "left";
        c.fillStyle = "#0ff";
        c.font = "15px monospace";
        c.fillText(`3x  ${ship.tripleShot.toFixed(1)}s`, 14, 46);
      }
    }

    function draw() {
      c.fillStyle = "#000";
      c.fillRect(0, 0, W, H);

      particles.forEach((p) => p.draw());
      asteroids.forEach((a) => a.draw());
      powerUps.forEach((p) => p.draw());
      bullets.forEach((b) => b.draw());
      ship.draw();

      drawHUD();
    }

    // ── Sincronización con React ─────────────────────────────────────────────
    let lastScore = -1;
    let lastLives = -1;
    let lastLevel = -1;
    let gameOverFired = false;

    function notifyIfChanged() {
      if (score !== lastScore || lives !== lastLives || level !== lastLevel) {
        lastScore = score;
        lastLives = lives;
        lastLevel = level;
        onStatsChangeRef.current({ score, lives, level });
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
        lastLives = -1;
        lastLevel = -1;
        notifyIfChanged();
      },
    };

    // ── Loop principal ───────────────────────────────────────────────────────
    let lastTime: number | null = null;
    let rafId = 0;

    function loop(ts: number) {
      const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
      lastTime = ts;
      if (!paused) update(dt);
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
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  return (
    <canvas ref={canvasRef} width={800} height={600} style={{ width: "100%", height: "100%" }} />
  );
});

export default AsteroidsGame;
