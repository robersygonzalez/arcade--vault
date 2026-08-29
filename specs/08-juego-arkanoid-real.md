# SPEC 08 — Juego real de Arkanoid

> **Status:** Implementado
> **Depends on:** SPEC 05, SPEC 06, SPEC 07
> **Date:** 2026-08-29
> **Objective:** Portar el Arkanoid vanilla de `references/started-games/04-arkanoid/` a un nuevo juego real y jugable (`arkanoid`) en Arcade Vault, con su fila en `games`, su leaderboard en `scores`, y su componente de canvas, reusando el registry de juegos reales y el HUD de slots ya introducidos por SPEC 07.

## Scope

**In:**

- Agregar la fila `arkanoid` a la tabla `games` en Supabase (título "ARKANOID", categoría `ARCADE`, cover `cover-bricks` reutilizada, color `cyan`), como entrada **nueva y separada** de la decorativa `bloque-buster` (que sigue existiendo sin cambios) — mismo patrón que `asteroides`/`rocas` y `tetris`/`caída`.
- Crear `components/arkanoid-game.tsx`: portar la lógica de `references/started-games/04-arkanoid/game.js` (+ `levels.js` + `assets/spritesheet.js`, consolidados en un único módulo) a un Client Component de TypeScript con canvas propio (800×600, 4:3 exacto, sin letterbox).
- Mover `assets/spritesheet-breakout.png` a `public/arkanoid/spritesheet-breakout.png`.
- Agregar `arkanoid: ArkanoidGame` a `REAL_GAMES` en `components/games/registry.ts` (el registry y el contrato `RealGameHandle`/`RealGameProps`/`HudSlot`/`GameStats` ya existen desde SPEC 07 — no se tocan).
- Conectar los botones existentes de `game-player.tsx` (PAUSA/REANUDAR, FIN, JUGAR DE NUEVO, SALIR) al Arkanoid real vía el registry — sin modificar `game-player.tsx`, que ya es genérico desde SPEC 07.
- HUD de React sincronizado con el estado real del juego (`Puntuación` + slots `Vidas`/`Nivel`).
- El modal "FIN DEL JUEGO" y el guardado en `scores` (ya genéricos desde SPEC 06) se disparan al quedarse sin vidas, al completar los 5 niveles (estado `'win'` del original, tratado como fin de partida normal), y al presionar FIN.
- Control de la pala con teclado (`ArrowLeft`/`ArrowRight`) y con mouse (`mousemove` sobre el canvas, corregido para respetar la pausa — ver "Decisions").

**Out of scope (para specs futuros):**

- Controles táctiles/móviles — el juego queda solo con teclado y mouse de escritorio.
- Sonido/efectos de audio (`ball-bounce.mp3`, `break-sound.mp3`) — se descartan, igual que en Asteroids y Tetris.
- El selector de nivel dibujado dentro del overlay de pausa del canvas original (botones 1–5) — se recorta por completo.
- La pausa por tecla `P`/`Escape` del original — la pausa queda exclusiva del botón PAUSA/REANUDAR de React, mismo criterio que Tetris.
- Reemplazar o eliminar la entrada decorativa `bloque-buster` — queda tal cual, coexistiendo con `arkanoid`.
- Cambios a los reproductores decorativos de los demás juegos.
- Cualquier rediseño de `.crt-screen`/`.player-hud` — el canvas 800×600 encaja exacto en el contenedor 4:3, no hace falta tocar el layout.

## Data model

### 1. Migración Supabase `add_game_arkanoid`

```sql
insert into public.games (id, title, short, long, cat, cover, color, best, plays) values
  ('arkanoid', 'ARKANOID', 'Rompe muros de bloques con tu pala y la pelota, de verdad.', 'El clásico rompe-bloques, jugable de verdad: mueve la pala con teclado o mouse, rebota la pelota y destruye 5 tableros de bloques con patrones distintos, cada uno más rápido que el anterior. Pierdes una vida cuando la pelota cae — completa los 5 niveles antes de quedarte sin vidas.', 'ARCADE', 'cover-bricks', 'cyan', 2850, '6.7K');
```

Se aplica con `mcp__supabase__apply_migration`. No se toca RLS (ya cubre `games`/`scores` desde SPEC 06). No hace falta CSS nuevo: `cover-bricks` ya existe en `app/globals.css` (bloques de colores en franjas horizontales) y hoy solo la usa la entrada decorativa `bloque-buster`.

No se agregan estructuras de persistencia nuevas: `scores` recibe filas con `game_id: "arkanoid"`, mismo esquema que el resto (`id`, `game_id`, `name`, `score`, `created_at`).

### 2. Contrato de `components/arkanoid-game.tsx`

El registry (`components/games/registry.ts`) ya existe desde SPEC 07 y no se modifica. El componente nuevo importa sus tipos directamente:

```tsx
"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { RealGameHandle, RealGameProps } from "@/components/games/registry";

const ArkanoidGame = forwardRef<RealGameHandle, RealGameProps>(function ArkanoidGame(
  { onStatsChange, onGameOver },
  ref,
) {
  // ver "Implementation plan" paso 3
});

export default ArkanoidGame;
```

Slots del HUD: `Vidas` (corazones, igual que Asteroids: `"♥ ".repeat(lives).trim() || "—"`) y `Nivel` (`String(currentLevel).padStart(2, "0")`).

## Implementation plan

1. Escribir y aplicar la migración `add_game_arkanoid` con el `INSERT` de la sección "Data model" punto 1.
2. Confirmar que no hace falta CSS nuevo — `cover-bricks` ya existe en `app/globals.css` y queda asignada a `arkanoid` en la fila insertada en el paso 1.
3. Mover `references/started-games/04-arkanoid/assets/spritesheet-breakout.png` a `public/arkanoid/spritesheet-breakout.png`. Los sonidos (`ball-bounce.mp3`, `break-sound.mp3`) **no** se mueven — el audio queda fuera de alcance.
4. Crear `components/arkanoid-game.tsx`, con la estructura de 16 puntos usada en Asteroids/Tetris, aplicada a Arkanoid:
   - **Refs**: `canvasRef`; `onStatsChangeRef`/`onGameOverRef`; `actionsRef` inicializado con tres no-ops.
   - **Constantes** (portadas 1:1 de `game.js`/`levels.js`): `PADDLE_SPEED=400`, `BLOCK_COLS=10`, `BLOCK_ROWS=6`, `BLOCK_W=64`, `BLOCK_H=24`, `BLOCK_COLORS=['red','yellow','cyan','magenta','hotpink','green']`, `BLOCKS_ORIGIN_X=(800-BLOCK_COLS*BLOCK_W)/2`, `BLOCKS_ORIGIN_Y=80`, `BASE_BALL_VX=200`, `BASE_BALL_VY=-300`; canvas lógico `W=800`, `H=600` (4:3 exacto, sin letterbox — `style={{ width: "100%", height: "100%" }}` directo en el `<canvas>`).
   - **Sprites y niveles consolidados en el mismo archivo** (reemplazan los tres `<script>` globales del original — `SPRITES`, `EXPLOSION_FRAMES`, `EXPLOSION_DURATION`, `LEVELS`, `loadSpritesheet`, `drawSprite`, `drawFrame` — declarados como constantes/funciones locales del módulo, sin depender de orden de carga de scripts): las coordenadas de sprite de `assets/spritesheet.js` (`paddle`, `ball`, `blocks.*`, `EXPLOSION_FRAMES` por color, `EXPLOSION_DURATION=150`) tal cual; los 5 niveles de `levels.js` (`LEVELS`, con sus patrones `l1`..`l5` y multiplicadores de velocidad `1.00`/`1.10`/`1.21`/`1.33`/`1.46`) tal cual, generados con la misma IIFE. `loadSpritesheet` carga la imagen desde `"/arkanoid/spritesheet-breakout.png"` (ruta movida en el paso 3, no la relativa `assets/spritesheet-breakout.png` del original).
   - **Entidades como objetos literales** (no se fuerza OOP, igual que el original): `paddle={x,y,w:81,h:14}`, `ball={x,y,w:16,h:16,vx,vy}`, `blocks:{x,y,w,h,color,alive}[]`, `explosions:{x,y,w,h,color,elapsed}[]`.
   - **Estado mutable** (`let` dentro del único `useEffect`, no `useState`): `paddle`, `ball`, `blocks`, `explosions`, `lives=3`, `score=0`, `gameState: 'playing'|'gameover'|'win'`, `currentLevel=1`, `paused=false` (controlado por `actionsRef`, no por tecla).
   - **Funciones portadas tal cual** (`initPaddle`, `initBall`, `loadLevel(n)`, `collideAABB`): misma lógica que el original.
   - **Input**: `keydown`/`keyup` en `window` para `ArrowLeft`/`ArrowRight`, con `e.preventDefault()` en ambos códigos (el original no lo hacía — se agrega para no scrollear la página). `mousemove` en el propio `canvasRef.current` con `getBoundingClientRect()` + `scaleX = canvas.width / rect.width` (igual que el original, ya corrige el canvas estirado por CSS), **con el fix**: `if (paused) return;` como primera línea del handler — el original movía la pala con el mouse incluso en pausa porque el chequeo de `isPaused` solo vivía dentro de `update()`, que el `mousemove` no atraviesa. Sin listener de `click` (el selector de nivel del overlay de pausa se recorta). Sin `keydown` de `P`/`Escape` (pausa solo desde React).
   - **`update(dt)`**: igual que el original — movimiento de pala por teclado, movimiento de pelota, rebotes en paredes, rebote en pala, colisión con bloques (`score += 10`, push a `explosions`, `ball.vy = -ball.vy`), progreso de nivel (`blocks.every(b => !b.alive)` → `loadLevel(currentLevel + 1)` si `currentLevel < 5`, si no `gameState = 'win'`), pelota perdida (`lives--`, `gameState = 'gameover'` si `lives <= 0`, si no `initBall()`) — **sin** las llamadas a `bounceSound.cloneNode().play()` / `breakSound.cloneNode().play()` ni los objetos `Audio` (audio descartado por completo).
   - **`draw()`**: dibuja bloques vivos (`drawSprite`), explosiones activas (`drawFrame` con el frame según `elapsed`), pala y pelota (`drawSprite`) — **sin** el bloque de HUD dibujado en canvas (`Score`/`Nivel`/corazones de vida vía `ctx.fillText`, ya los da React) y **sin** `drawOverlay('GAME OVER' | '¡Completaste el juego!')` ni `drawPauseOverlay()` (con sus constantes `PAUSE_BTN_*`) — el modal de fin y el overlay de pausa ya los provee `game-player.tsx`.
   - **Sincronización con React** (`notifyIfChanged()`): compara `score`/`lives`/`currentLevel` contra el frame anterior y llama `onStatsChangeRef.current({ score, slots: [{ label: "Vidas", value: "♥ ".repeat(lives).trim() || "—" }, { label: "Nivel", value: String(currentLevel).padStart(2, "0") }] })` solo si algo cambió; cuando `gameState` pasa a `'gameover'` **o** a `'win'` por primera vez, llama `onGameOverRef.current(score)` una sola vez (`gameOverFired`) — `'win'` se trata como fin de partida normal, sin mensaje especial de victoria.
   - **`actionsRef.current`**: `togglePause` alterna `paused` (bloquea solo la llamada a `update(dt)` en el loop; `draw()` sigue corriendo → pantalla congelada, no en negro); `forceGameOver` fuerza `gameState = 'gameover'`; `restart` reinicializa (`initPaddle()`, `loadLevel(1)`, `lives = 3`, `score = 0`, `gameState = 'playing'`) y limpia `paused`/`gameOverFired`/los "last*" de `notifyIfChanged`.
   - **Loop**: `requestAnimationFrame` propio con `dt` clamp (`Math.min((ts - lastTime) / 1000, 0.05)`); `if (!paused) update(dt)`; `draw()`; `notifyIfChanged()`.
   - **Cleanup del efecto**: `cancelAnimationFrame(rafId)` + remover los listeners de `keydown`/`keyup` (en `window`) y `mousemove` (en el canvas).
   - **Render**: `<canvas ref={canvasRef} width={800} height={600} style={{ width: "100%", height: "100%" }} />` — sin contenedor de letterbox, el aspect ratio ya es 4:3 exacto.
   - Se descarta por completo: `bounceSound`/`breakSound` (objetos `Audio` + `.cloneNode().play()`), `drawOverlay`, `drawPauseOverlay` + `PAUSE_BTN_W`/`PAUSE_BTN_H`/`PAUSE_BTN_GAP`/`PAUSE_BTN_Y`/`PAUSE_BTN_ROW_X`, el listener de `click` del selector de nivel, el `keydown` de `P`/`Escape`.
5. Agregar `arkanoid: ArkanoidGame` a `REAL_GAMES` en `components/games/registry.ts` (con su import `import ArkanoidGame from "@/components/arkanoid-game";`).
6. Correr `npm run build` para confirmar que todo compila y tipa. No hace falta `npx next typegen` — ningún paso agrega ni modifica rutas.

## Acceptance criteria

- [ ] `npm run build` termina sin errores.
- [ ] `/games` muestra la card "ARKANOID" con el cover `cover-bricks`, categoría ARCADE, junto a la card "BLOQUE BUSTER" decorativa sin cambios.
- [ ] `/juegos/arkanoid` muestra el detalle correcto y no revienta con `notFound()`.
- [ ] `/juegos/arkanoid/jugar` carga el canvas real (800×600, ocupa el 100% de `.crt-screen` sin deformarse) con el HUD de React sincronizado (Puntuación + Vidas + Nivel).
- [ ] `ArrowLeft`/`ArrowRight` mueven la pala y el mouse también la mueve al pasar sobre el canvas; ninguna tecla de control scrollea la página.
- [ ] La pelota rebota en paredes, pala y bloques; cada bloque destruido suma 10 puntos y dispara su animación de explosión.
- [ ] Completar los bloques de un nivel carga el siguiente (hasta el nivel 5), con la pelota más rápida en cada nivel.
- [ ] PAUSA congela el juego por completo — incluido el movimiento de la pala por mouse (no solo por teclado); REANUDAR lo continúa exactamente donde quedó.
- [ ] FIN fuerza el fin de partida y abre el modal "FIN DEL JUEGO" con la puntuación real.
- [ ] Quedarse sin vidas (pelota cae con `lives = 0`) también abre el mismo modal automáticamente.
- [ ] Completar el nivel 5 (estado `'win'` del original) también abre el mismo modal automáticamente, sin mensaje especial de victoria.
- [ ] Guardar la puntuación desde el modal inserta una fila en `scores` con `game_id: "arkanoid"` (verificable con una query a la tabla).
- [ ] El aside "MEJORES PUNTUACIONES" de `/juegos/arkanoid` y las tabs de `/salon-de-la-fama` muestran esa puntuación tras guardarla.
- [ ] "JUGAR DE NUEVO" reinicia el juego real desde cero (score 0, 3 vidas, nivel 1) dentro de la misma pantalla.
- [ ] "SALIR" navega a `/juegos/arkanoid` sin dejar el loop corriendo ni listeners de teclado/mouse activos (sin warnings de React en consola por actualizar estado tras desmontar).
- [ ] Asteroids y Tetris siguen funcionando exactamente igual tras agregar Arkanoid al registry.
- [ ] El resto de los juegos decorativos (incluida `bloque-buster`) siguen mostrando el reproductor decorativo sin cambios.

## Decisions

- **Sí:** `id: "arkanoid"` nuevo, separado de la entrada decorativa `bloque-buster` (que no se toca) — decisión explícita del usuario, mismo patrón que `asteroides`/`rocas` y `tetris`/`caída`: el juego real nunca reemplaza la fila decorativa preexistente.
- **Sí:** `cat: "ARCADE"`, `color: "cyan"`, cover reusando `cover-bricks` (ya existe, sin CSS nuevo) — decisiones explícitas del usuario. `color: "cyan"` no tiene variante de botón (`.btn.cyan` no existe en `app/globals.css`), así que el botón JUGAR de la card cae al estilo base — aceptado como decorativo, no se agrega CSS nuevo para esto (mismo caso ya aceptado en `tetris`).
- **Sí:** controles de pala con teclado **y** mouse, igual que el original — decisión explícita del usuario. Se corrige el bug del original donde el `mousemove` movía la pala incluso en pausa, agregando `if (paused) return;` al handler, para cumplir el criterio de "PAUSA congela todo".
- **No:** conservar el audio (`ball-bounce.mp3`, `break-sound.mp3`) — decisión explícita del usuario, mismo criterio que Asteroids y Tetris (evita manejar autoplay policies del navegador).
- **Sí:** tratar el estado `'win'` (completar los 5 niveles) como fin de partida normal, disparando `onGameOver` con la puntuación real y el mismo modal "FIN DEL JUEGO" — decisión explícita del usuario, sin agregar un mensaje de victoria distinto (quedaría fuera de alcance).
- **No:** conservar el selector de nivel dibujado en el overlay de pausa del canvas original (botones 1–5) — decisión explícita del usuario; la pausa queda 100% controlada por el overlay de React de `game-player.tsx`.
- **No:** conservar la pausa por tecla `P`/`Escape` — decisión explícita del usuario, mismo criterio ya aplicado a Tetris: un solo mecanismo de pausa (el botón de React) para no duplicarlo.
- **Sí:** slots del HUD = `Vidas` + `Nivel`, mismo formato de texto que ya usa Asteroids (corazones repetidos con guion largo de respaldo, nivel con cero a la izquierda) — decisión explícita del usuario.
- **No:** portar controles táctiles/móviles — fuera de alcance, decisión explícita del usuario.

## Risks

| Risk                                                                                                                                                                                                                                                       | Mitigation                                                                                                                                                                                                                        |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El `mousemove` del original mueve la pala incluso durante la pausa (el chequeo de `isPaused` solo vivía dentro de `update()`), lo que rompería el criterio "PAUSA congela todo" si se porta tal cual.                                                      | Se agrega `if (paused) return;` como primera línea del handler de `mousemove` en el componente portado (ver "Implementation plan" paso 4).                                                                                        |
| El original reparte `SPRITES`/`EXPLOSION_FRAMES`/`LEVELS`/`drawSprite`/`loadSpritesheet` como globals implícitos entre tres `<script>` separados (`spritesheet.js`, `levels.js`, `game.js`), sin exports — portarlo ingenuamente rompería en un módulo TS. | Todo se consolida como constantes/funciones locales dentro del mismo archivo `components/arkanoid-game.tsx`, sin depender de orden de carga de scripts (ver "Implementation plan" paso 4, ítem "Sprites y niveles consolidados"). |
| La imagen del spritesheet se carga de forma asíncrona (`loadSpritesheet(cb)`); si el primer frame del loop corre antes de que termine de cargar, `drawSprite`/`drawFrame` podrían intentar dibujar sobre una imagen inexistente.                           | Se conserva el mismo patrón del original: `drawSprite`/`drawFrame` son no-op mientras `!ssLoaded`, así que los primeros frames simplemente no dibujan sprites hasta que la imagen carga, sin excepciones.                         |

## What is **not** in this spec

- Controles táctiles/móviles.
- Sonido/efectos de audio.
- El selector de nivel dibujado en el overlay de pausa del canvas original.
- La pausa por tecla `P`/`Escape`.
- Reemplazar o eliminar la entrada decorativa `bloque-buster`.
- Cambios a los reproductores decorativos de los demás juegos.

Cada uno de estos, si se necesita, va en su propio spec.
