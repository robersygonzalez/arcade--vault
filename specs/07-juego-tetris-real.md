# SPEC 07 — Juego real de Tetris

> **Status:** Draft
> **Depends on:** SPEC 05, SPEC 06
> **Date:** 2026-08-28
> **Objective:** Portar el Tetris vanilla de `references/started-games/03-tetris/` a un nuevo juego real y jugable (`tetris`) en Arcade Vault, con su fila en `games`, su leaderboard en `scores`, y — al ser el segundo juego real de la plataforma — introducir el registry de juegos reales y el HUD flexible por slots que reemplazan el `isAsteroids` hardcodeado de `components/game-player.tsx`.

## Scope

**In:**

- Crear `components/games/registry.ts`: tipos `HudSlot`, `GameStats`, `RealGameHandle`, `RealGameProps`, y el mapa `REAL_GAMES` que asocia `game.id` con su componente de canvas.
- Migrar `components/game-player.tsx` de `const isAsteroids = game.id === "asteroides"` a `const RealGame = REAL_GAMES[game.id]` en sus 6 puntos de integración (los dos `useEffect` decorativos, `togglePause`, `endGame`, `restart`, el render dentro de `.crt-screen`).
- Migrar el HUD de React de stats fijas (Puntuación/Vidas/Nivel) a slots dinámicos (`stats.slots`), y adaptar `components/asteroids-game.tsx` para que emita sus slots (`Vidas`, `Nivel`) bajo el nuevo contrato.
- Agregar la fila `tetris` a la tabla `games` en Supabase (categoría `PUZZLE`, reusando la clase `cover-tetro` ya existente en `app/globals.css`).
- Crear `components/tetris-game.tsx`: portar 1:1 la lógica de `references/started-games/03-tetris/game.js` (tablero, 8 tetrominós, rotación con wall-kicks, línea de puntuación, nivel/velocidad, pieza fantasma) a un Client Component de TypeScript con canvas propio, más un segundo `<canvas>` para el preview de la pieza siguiente.
- Conectar los botones existentes de `game-player.tsx` (PAUSA/REANUDAR, FIN, JUGAR DE NUEVO, SALIR) al Tetris real vía el registry.
- HUD de React sincronizado con el estado real del juego (`Puntuación` + slots `Líneas`/`Nivel`).
- El modal "FIN DEL JUEGO" y el guardado en `scores` (ya existentes, genéricos desde spec 06) se disparan tanto al hacer "top-out" (una pieza nueva no cabe) como al presionar FIN.

**Out of scope (para specs futuros):**

- Controles táctiles/móviles — el juego queda solo con teclado, igual que el original.
- Sonido/efectos de audio — el original no trae ninguno.
- El toggle de tema claro/oscuro del HTML original (`#theme-toggle`, `localStorage['tetris-theme']`) — Arcade Vault es siempre oscuro; se descarta por completo, no se porta.
- La tecla `P` de pausa por teclado del original — la pausa queda controlada exclusivamente por el botón PAUSA/REANUDAR de React, para no duplicar el mecanismo de pausa del juego real (que hoy ya se resuelve deteniendo `update`, ver `components/asteroids-game.tsx`).
- Portar Arkanoid (`references/started-games/04-arkanoid/`) — va en su propio spec.
- Cambios a los reproductores decorativos de los demás juegos.
- Cualquier rediseño de `.crt-screen`/`.player-hud` más allá de lo estrictamente necesario para el letterbox y el preview de Tetris.

## Data model

### 1. Migración Supabase `add_game_tetris`

```sql
insert into public.games (id, title, short, long, cat, cover, color, best, plays) values
  ('tetris', 'TETRIS', 'Encaja las piezas y despeja líneas antes de que se acumulen.', 'El clásico rompecabezas de caída de piezas: mueve, rota y encaja los 8 tetrominós (incluida la rara pieza "tuerca") para completar líneas. La velocidad aumenta con cada nivel.', 'PUZZLE', 'cover-tetro', 'cyan', 999999, '8.0K');
```

Se aplica con `mcp__supabase__apply_migration`. No se toca RLS (ya cubre `games`/`scores` desde spec 06). No hace falta CSS nuevo: `cover-tetro` ya existe en `app/globals.css` (piezas de colores sobre fondo morado) y no la usa ningún otro juego todavía.

### 2. `components/games/registry.ts` (archivo nuevo)

```ts
import type { ComponentType, RefAttributes } from "react";
import AsteroidsGame from "@/components/asteroids-game";
import TetrisGame from "@/components/tetris-game";

export type HudSlot = { label: string; value: string };
export type GameStats = { score: number; slots: HudSlot[] };

export type RealGameHandle = {
  togglePause: () => void;
  forceGameOver: () => void;
  restart: () => void;
};

export type RealGameProps = {
  onStatsChange: (stats: GameStats) => void;
  onGameOver: (finalScore: number) => void;
};

export const REAL_GAMES: Record<
  string,
  ComponentType<RealGameProps & RefAttributes<RealGameHandle>>
> = {
  asteroides: AsteroidsGame,
  tetris: TetrisGame,
};
```

### 3. `components/game-player.tsx` — migración de `isAsteroids` al registry

Reemplazos exactos, uno a uno:

```tsx
// antes
const isAsteroids = game.id === "asteroides";
const gameRef = useRef<AsteroidsGameHandle>(null);

// después
const RealGame = REAL_GAMES[game.id];
const gameRef = useRef<RealGameHandle>(null);
```

```tsx
// antes
useEffect(() => {
  if (isAsteroids || over || paused) return;
  ...
}, [isAsteroids, over, paused]);

// después
useEffect(() => {
  if (RealGame || over || paused) return;
  ...
}, [RealGame, over, paused]);
```

```tsx
// antes
useEffect(() => {
  if (isAsteroids) return;
  ...
}, [isAsteroids, score]);

// después
useEffect(() => {
  if (RealGame) return;
  ...
}, [RealGame, score]);
```

```tsx
// antes
const togglePause = () => {
  if (isAsteroids) gameRef.current?.togglePause();
  setPaused((p) => !p);
};
const endGame = () => {
  if (isAsteroids) {
    gameRef.current?.forceGameOver();
    return;
  }
  setOver(true);
};
const restart = () => {
  if (isAsteroids) {
    gameRef.current?.restart();
    setPaused(false);
    setOver(false);
    setSaved(false);
    return;
  }
  ...
};

// después
const togglePause = () => {
  if (RealGame) gameRef.current?.togglePause();
  setPaused((p) => !p);
};
const endGame = () => {
  if (RealGame) {
    gameRef.current?.forceGameOver();
    return;
  }
  setOver(true);
};
const restart = () => {
  if (RealGame) {
    gameRef.current?.restart();
    setPaused(false);
    setOver(false);
    setSaved(false);
    return;
  }
  ...
};
```

```tsx
// antes (render dentro de .crt-screen)
{
  isAsteroids ? (
    <AsteroidsGame
      ref={gameRef}
      onStatsChange={(stats) => {
        setScore(stats.score);
        setLives(stats.lives);
        setLevel(stats.level);
      }}
      onGameOver={() => setOver(true)}
    />
  ) : (
    <div className="game-arena">...</div>
  );
}

// después
{
  RealGame ? (
    <RealGame
      ref={gameRef}
      onStatsChange={(stats) => {
        setScore(stats.score);
        setSlots(stats.slots);
      }}
      onGameOver={() => setOver(true)}
    />
  ) : (
    <div className="game-arena">...</div>
  );
}
```

Import: `import { REAL_GAMES, type RealGameHandle } from "@/components/games/registry";` reemplaza `import AsteroidsGame, { type AsteroidsGameHandle } from "@/components/asteroids-game";`.

### 4. HUD flexible por slots

Estado nuevo en `game-player.tsx`: `const [slots, setSlots] = useState<HudSlot[]>([]);` (importar `type HudSlot` del registry) en vez de `lives`/`level`.

HUD (dentro de `.player-hud`) — reemplaza los bloques fijos de Vidas/Nivel:

```tsx
// antes
<div className="hud-stat lives">
  <div className="l">Vidas</div>
  <div className="v">{"♥ ".repeat(lives).trim() || "—"}</div>
</div>
<div className="hud-stat level">
  <div className="l">Nivel</div>
  <div className="v">{String(level).padStart(2, "0")}</div>
</div>

// después
{slots.map((slot) => (
  <div className="hud-stat" key={slot.label}>
    <div className="l">{slot.label}</div>
    <div className="v">{slot.value}</div>
  </div>
))}
```

Para el juego decorativo (rama `else`, cuando `RealGame` es `undefined`), inicializar `slots` a un array fijo equivalente al HUD actual apenas empieza el juego decorativo (mismo texto que hoy: Vidas con corazones, Nivel con padStart), para no alterar su apariencia.

`components/asteroids-game.tsx` — su `onStatsChange` pasa de emitir `{ score, lives, level }` a:

```ts
onStatsChangeRef.current({
  score,
  slots: [
    { label: "Vidas", value: "♥ ".repeat(lives).trim() || "—" },
    { label: "Nivel", value: String(level).padStart(2, "0") },
  ],
});
```

Y su tipo de props pasa a importar `RealGameProps`/`RealGameHandle` desde `@/components/games/registry` en vez de declarar `AsteroidsGameHandle`/`AsteroidsGameProps` propios (el registry ya los define; `asteroids-game.tsx` puede seguir re-exportando `AsteroidsGameHandle` como alias de `RealGameHandle` si algún import externo lo necesita, pero hoy nada fuera de `game-player.tsx` lo usa).

### 5. Contrato de `components/tetris-game.tsx`

```tsx
"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { RealGameHandle, RealGameProps } from "@/components/games/registry";

const TetrisGame = forwardRef<RealGameHandle, RealGameProps>(function TetrisGame(
  { onStatsChange, onGameOver },
  ref,
) {
  // ver "Implementation plan" paso 6
});

export default TetrisGame;
```

No se agregan estructuras de persistencia nuevas: `scores` recibe filas con `game_id: "tetris"`, mismo esquema que el resto.

## Implementation plan

1. Crear `components/games/registry.ts` con el contenido exacto de la sección "Data model" punto 2.
2. Migrar `components/game-player.tsx`: aplicar los reemplazos exactos de la sección "Data model" punto 3 (import, declaración de `RealGame`/`gameRef`, los dos `useEffect`, `togglePause`, `endGame`, `restart`, el render).
3. Aplicar el HUD flexible de la sección "Data model" punto 4: estado `slots` en `game-player.tsx`, el `.map` en el HUD, y el `onStatsChange` de `components/asteroids-game.tsx` emitiendo `slots` en vez de `lives`/`level`.
4. Escribir y aplicar la migración `add_game_tetris` con el `INSERT` de la sección "Data model" punto 1.
5. Confirmar que no hace falta CSS nuevo — `cover-tetro` ya existe en `app/globals.css` y queda asignada a `tetris` en la fila insertada en el paso 4.
6. Crear `components/tetris-game.tsx`, con la estructura de `references/porting-guide.md` (16 puntos) aplicada a Tetris:
   - **Refs**: `canvasRef` (tablero), `nextCanvasRef` (preview), `onStatsChangeRef`/`onGameOverRef`, `actionsRef`.
   - **Constantes**: `COLS=10`, `ROWS=20`, `BLOCK=30` (canvas principal 300×600), `NEXT_BLOCK=24` (canvas preview 96×96); `COLORS` (9 entradas, índices 1–8, mismos hex que el original: `#4dd0e1` I, `#ffd54f` O, `#ba68c8` T, `#81c784` S, `#e57373` Z, `#90caf9` J, `#ffb74d` L, `#9e9e9e` N); `PIECES` (las 8 matrices del original, incluida la pieza `N` "tuerca" 3×3); `LINE_SCORES = [0,100,300,500,800]`.
   - **Layout letterboxed**: el canvas principal vive dentro de un `div` con `display:flex; alignItems:center; justifyContent:center; width:100%; height:100%` y `style={{ height: "100%", width: "auto" }}` en el propio `<canvas>` (mantiene su proporción real 1:2 dentro de `.crt-screen`, que es 4:3 — quedan barras vacías a los lados en vez de deformar los bloques). El `nextCanvasRef` se posiciona `position:absolute; top:8px; right:8px` sobre ese mismo contenedor, con fondo `#1a1a25` y borde `1px solid rgba(255,255,255,0.15)` para distinguirse del tablero.
   - **Estado mutable** (`let` dentro del único `useEffect`): `board`, `current`, `next`, `score`, `lines`, `level`, `paused` (controlado por `actionsRef`, no por tecla `P`), `gameOver`, `dropAccum`, `dropInterval`, `lastTime`.
   - **Funciones portadas tal cual la lógica del original** (`createBoard`, `randomPiece`, `collide`, `rotateCW`, `tryRotate` con wall-kicks `[0,-1,1,-2,2]`, `merge`, `clearLines`, `ghostY`, `hardDrop`, `softDrop`, `lockPiece`, `spawn`): mismas fórmulas de puntuación (`LINE_SCORES[cleared] * level`, hard drop `+2` por celda, soft drop `+1` por fila) y de velocidad (`dropInterval = max(100, 1000 - (level-1)*90)`, `level = floor(lines/10)+1`).
   - **`draw()`**: dibuja grid con un color fijo `#22222e` (ya no lee `getComputedStyle`/tema — el toggle de tema no se portea), fondo del tablero `#1a1a25`, piezas colocadas, pieza fantasma (`globalAlpha 0.2`) y pieza actual — igual que el original, sin overlay de pausa/game over dibujado en canvas (eso ya lo cubre `game-player.tsx`).
   - **`drawNext()`**: dibuja la pieza `next` centrada en el canvas de preview, igual que el original pero con `NEXT_BLOCK=24`.
   - **Input**: listeners en `window`, `preventDefault()` en `ArrowLeft`/`ArrowRight`/`ArrowUp`/`ArrowDown`/`Space` (el original solo lo hacía en `Space`; hace falta agregarlo a las demás para no scrollear la página). `ArrowLeft`/`ArrowRight` mueven, `ArrowUp` o `KeyX` rota (`tryRotate`), `ArrowDown` hace soft drop, `Space` hace hard drop. Sin `KeyP` (pausa solo desde React).
   - **`spawn()`**: si la pieza nueva colisiona de inmediato, en vez de llamar a un `endGame()` propio que tocaba el DOM, marca `gameOver = true` (lo recoge `notifyIfChanged`).
   - **Sincronización con React**: `notifyIfChanged()` compara `score`/`lines`/`level` contra el frame anterior y llama `onStatsChangeRef.current({ score, slots: [{ label: "Líneas", value: String(lines) }, { label: "Nivel", value: String(level) }] })`; cuando `gameOver` pasa a `true` por primera vez, llama `onGameOverRef.current(score)` una sola vez (`gameOverFired`).
   - **`actionsRef.current`**: `togglePause` alterna `paused` (bloquea el avance de `dropAccum`/`update`, `draw()` sigue corriendo); `forceGameOver` fuerza `gameOver = true`; `restart` reinicializa todo el estado (equivalente a `init()` del original, sin togglear el overlay DOM) y limpia `paused`/`gameOverFired`/los "last\*".
   - **Loop**: `requestAnimationFrame` propio, acumulando `dt` en `dropAccum` contra `dropInterval` igual que el original; `if (!paused) { ...avance de dropAccum... }`; `draw()` y `notifyIfChanged()` siempre corren.
   - **Cleanup**: `cancelAnimationFrame` + remover el listener de teclado.
   - Se descarta por completo: `updateHUD()` (DOM), `#overlay`/`#overlay-title`/`#overlay-score`/`#restart-btn`, el toggle de tema y su persistencia en `localStorage['tetris-theme']`.
7. Agregar `tetris: TetrisGame` a `REAL_GAMES` en `components/games/registry.ts` (con su import, ya incluido en el snippet del paso 1).
8. Correr `npm run build` para confirmar que todo compila y tipa. No hace falta `npx next typegen` — ningún paso agrega ni modifica rutas.

## Acceptance criteria

- [ ] `npm run build` termina sin errores.
- [ ] `/games` muestra la card "TETRIS" con el cover `cover-tetro`, categoría PUZZLE.
- [ ] `/juegos/tetris` muestra el detalle correcto y no revienta con `notFound()`.
- [ ] `/juegos/tetris/jugar` carga el canvas real del tablero (300×600, letterboxed dentro de `.crt-screen` sin deformarse) y el preview de la pieza siguiente superpuesto en la esquina.
- [ ] El HUD de React muestra Puntuación, Líneas y Nivel sincronizados con el juego real; no muestra un slot de "Vidas" para Tetris.
- [ ] `ArrowLeft`/`ArrowRight` mueven la pieza, `ArrowUp` (o `X`) rota con wall-kicks, `ArrowDown` hace caída suave, `Space` hace caída instantánea; ninguna de esas teclas scrollea la página.
- [ ] Completar una línea la elimina, suma puntos según `LINE_SCORES[cantidad] * nivel`, y sube `lines`/`level` en el HUD cuando corresponde.
- [ ] La pieza fantasma se ve semitransparente en la posición donde caería la pieza actual.
- [ ] La velocidad de caída aumenta al subir de nivel.
- [ ] PAUSA congela el tablero (nada se mueve, incluida la caída automática); REANUDAR continúa exactamente donde quedó.
- [ ] FIN fuerza el fin de partida y abre el modal "FIN DEL JUEGO" con la puntuación real.
- [ ] Que una pieza nueva no quepa (top-out) también abre el mismo modal automáticamente, sin pulsar FIN.
- [ ] Guardar la puntuación desde el modal inserta una fila en `scores` con `game_id: "tetris"` (verificable con una query a la tabla).
- [ ] El aside "MEJORES PUNTUACIONES" de `/juegos/tetris` y las tabs de `/salon-de-la-fama` muestran esa puntuación tras guardarla.
- [ ] "JUGAR DE NUEVO" reinicia el tablero real desde cero (score 0, líneas 0, nivel 1) dentro de la misma pantalla.
- [ ] "SALIR" navega a `/juegos/tetris` sin dejar el loop corriendo ni listeners de teclado activos (sin warnings de React en consola por actualizar estado tras desmontar).
- [ ] Asteroids (`/juegos/asteroides/jugar`) sigue funcionando exactamente igual tras la migración al registry y al HUD de slots — mismo HUD visual (Puntuación/Vidas/Nivel), mismo comportamiento de pausa/fin/reinicio.
- [ ] El resto de los juegos decorativos siguen mostrando el reproductor decorativo sin cambios, con el mismo HUD fijo de Vidas/Nivel que tenían antes.

## Decisions

- **Sí:** crear el registry de juegos reales (`components/games/registry.ts`) y el HUD de slots dentro de este mismo spec, no en uno separado — es el segundo juego real de la plataforma y el momento natural de introducir ambos; mantiene un solo `/spec-impl` con pasos revisables uno por uno.
- **Sí:** letterbox centrado (mantener 300×600 real, barras vacías a los lados dentro de `.crt-screen`) en vez de deformar el tablero o agrandarlo — decisión explícita del usuario, prioriza fidelidad visual de los bloques cuadrados sobre ocupar el 100% del ancho.
- **Sí:** slots del HUD = `Líneas` + `Nivel`, sin inventar un valor de "Vidas" — decisión explícita del usuario, fiel a las stats reales de Tetris (no tiene vidas).
- **Sí:** conservar el preview de la pieza siguiente como segundo `<canvas>` superpuesto en la esquina del área letterboxed — decisión explícita del usuario; es parte central de jugar bien al Tetris.
- **No:** conservar la pausa por tecla `P` del original — decisión explícita del usuario; la pausa queda solo en el botón PAUSA/REANUDAR de React para no tener dos mecanismos de pausa redundantes.
- **No:** portar el toggle de tema claro/oscuro (`#theme-toggle`, `localStorage['tetris-theme']`) — Arcade Vault no tiene modo claro; se descarta por completo, junto con el color de grid que dependía de él (queda fijo en `#22222e`, el valor oscuro original).
- **Sí:** `id: "tetris"`, `cat: "PUZZLE"`, `color: "cyan"`, cover reusando `cover-tetro` (ya existe, sin CSS nuevo) — decisión explícita del usuario. `color: "cyan"` no tiene variante de botón (`.btn.cyan` no existe en `app/globals.css`), así que el botón JUGAR de la card cae al estilo base — aceptado como decorativo, no se agrega CSS nuevo para esto.
- **Sí:** portar los 8 tipos de pieza reales de `game.js` (incluida la novena entrada `N`/"tuerca") en vez de los 7 que documenta el `CLAUDE.md` desactualizado de esa carpeta — el código fuente es la referencia autoritativa, no su documentación.
- **No:** portar Arkanoid — fuera de alcance, spec futuro.

## Risks

| Risk                                                                                                                                                                     | Mitigation                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El tablero 1:2 dentro de un contenedor 4:3 puede verse "flotando" con mucho espacio vacío a los lados, distinto a la estética de pantalla completa de Asteroids.         | Aceptado explícitamente por el usuario (letterbox); el `nextCanvasRef` y el propio marco `.crt-screen` (con su `.crt-bottom`) mantienen el contexto visual de arcade.                                                                                                        |
| El canvas de preview superpuesto podría taparse con el tablero si el letterbox calcula mal el `width:auto`.                                                              | El contenedor flex centra el canvas principal por altura; el preview usa `position:absolute` sobre el contenedor completo (no sobre el canvas), así que su posición no depende del ancho real calculado del tablero.                                                         |
| Migrar `components/asteroids-game.tsx` al contrato de slots podría romper su HUD si el mapeo de `lives`/`level` a `slots` no es exactamente equivalente al texto actual. | El paso 3 copia literalmente el mismo formato de texto que ya usaba `game-player.tsx` (los corazones repetidos con guion largo de respaldo, y el nivel con cero a la izquierda), solo cambia dónde se genera el string.                                                      |
| Refactorizar los 6 puntos de integración de `isAsteroids` a `RealGame` en el mismo spec que agrega Tetris aumenta el radio de cambio de un solo `/spec-impl`.            | Los pasos 1–3 quedan aislados y verificables por separado (el paso 8 corre `npm run build` recién al final, pero cada paso de `/spec-impl` se revisa individualmente); el criterio de aceptación exige explícitamente que Asteroids siga funcionando igual tras el refactor. |

## What is **not** in this spec

- Controles táctiles/móviles.
- Sonido/efectos de audio.
- El toggle de tema claro/oscuro del Tetris original.
- La pausa por tecla `P`.
- Portar Arkanoid.
- Cambios a los reproductores decorativos de los demás juegos.

Cada uno de estos, si se necesita, va en su propio spec.
