# Contrato de plataforma — Arcade Vault

Todo lo que un juego nuevo tiene que respetar para integrarse. Copia los bloques literales que necesites directo dentro del spec que estés escribiendo — quien implemente no tiene esta referencia a mano.

## 1. Esquema Supabase (`specs/06-leaderboard-y-tabla-de-juegos.md`)

```sql
create table public.games (
  id text primary key,
  title text not null,
  short text not null,
  long text not null,
  cat text not null,        -- "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS"
  cover text not null,      -- clase CSS: "cover-bricks", "cover-tetro", ...
  color text not null,      -- "cyan" | "magenta" | "yellow" | "green"
  best integer not null,
  plays text not null
);

create table public.scores (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references public.games(id),
  name text not null,
  score integer not null,
  created_at timestamptz not null default now()
);
```

RLS ya está habilitado y con policies de `SELECT` público en ambas y `INSERT` público en `scores` — **agregar un juego no toca RLS**, solo inserta una fila en `games`. Plantilla del `INSERT` a copiar en el spec, con los valores reales acordados en la Fase 2:

```sql
insert into public.games (id, title, short, long, cat, cover, color, best, plays) values
  ('<slug>', '<TÍTULO>', '<short>', '<long>', '<CAT>', '<cover-clase>', '<color>', <best>, '<plays>');
```

Se aplica con `mcp__supabase__apply_migration`, nombre de migración `add_game_<slug>`.

## 2. `app/data/games.ts` — solo tipos

```ts
export type Game = {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
  cover: string;
  color: "cyan" | "magenta" | "yellow" | "green";
  best: number;
  plays: string;
};

export const CATS: string[] = ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"];
```

No hay array `GAMES` que editar — el catálogo vive en Supabase desde spec 06. Solo tocas este archivo si el juego necesita una `cat` que no exista todavía (entonces también agregas el valor a `CATS`).

## 3. Por qué las rutas ya son genéricas — no hace falta tocarlas

| Ruta                             | Query                                                             | Consecuencia                                                                                 |
| -------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `app/page.tsx`                   | `from("games").select("*").limit(6)`                              | El juego nuevo puede o no aparecer en Home según orden/límite; no requiere cambio de código. |
| `app/games/page.tsx`             | `from("games").select("*")` → `<Library games={...} />`           | Aparece automáticamente en la Biblioteca.                                                    |
| `app/juegos/[id]/page.tsx`       | `.eq("id", id).single<Game>()` + top 10 de `scores` por `game_id` | Detalle y leaderboard del juego funcionan solo con la fila en `games`.                       |
| `app/juegos/[id]/jugar/page.tsx` | misma query de `games`                                            | Carga `<GamePlayer game={game} />`.                                                          |
| `app/salon-de-la-fama/page.tsx`  | todas las `scores` + todas las `games`                            | El tab del juego nuevo aparece solo.                                                         |

**Ninguna de estas rutas se edita al agregar un juego.** Si el spec que estás escribiendo propone tocarlas, es una señal de que algo se está haciendo mal — la única pieza que sabe distinguir un juego de otro es `components/game-player.tsx` (sección 4) y el registry (sección 5).

## 4. `components/game-player.tsx` — puntos de integración

`saveScore()` ya es genérico y no requiere cambios para ningún juego nuevo:

```ts
const saveScore = async () => {
  const supabase = createClient();
  const { error } = await supabase.from("scores").insert({ game_id: game.id, name, score });
  if (!error) setSaved(true);
};
```

Lo que sí depende de qué juego es, hoy resuelto con `const isAsteroids = game.id === "asteroides"` en 6 sitios (esto es exactamente lo que el registry de la sección 5 reemplaza):

1. `useEffect` del `setInterval` de puntuación falsa — debe desactivarse para cualquier juego real, no solo Asteroids.
2. `useEffect` del incremento de nivel falso — misma idea.
3. `togglePause` — debe llamar al `ref` del juego real si existe.
4. `endGame` (botón FIN) — debe llamar `forceGameOver()` del juego real si existe, en vez de `setOver(true)` directo.
5. `restart` (botón JUGAR DE NUEVO) — debe llamar `restart()` del juego real si existe.
6. El render dentro de `.crt-screen` — debe montar el componente real si `game.id` está en el registry, o el `.game-arena` decorativo si no.

## 5. Estado objetivo — registry de juegos reales

Si `components/games/registry.ts` **no existe todavía** (confirmar con el session context de `SKILL.md`), el primer paso del plan de implementación debe crearlo:

```ts
// components/games/registry.ts
import type { ComponentType, RefAttributes } from "react";
import AsteroidsGame from "@/components/asteroids-game";

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
};
```

Y `components/game-player.tsx` migra los 6 puntos de la sección 4 de `isAsteroids` a:

```ts
import { REAL_GAMES } from "@/components/games/registry";
// ...
const RealGame = REAL_GAMES[game.id];
```

Cada punto pasa de `if (isAsteroids) ...` a `if (RealGame) ...`, y el render pasa de `isAsteroids ? <AsteroidsGame .../> : <div className="game-arena">...` a `RealGame ? <RealGame ref={gameRef} .../> : <div className="game-arena">...`.

**Si el registry ya existe**, agregar un juego nuevo es una sola línea: `<slug>: SlugGame,` dentro de `REAL_GAMES`, más el import correspondiente. No hay que tocar `game-player.tsx` de nuevo.

## 6. HUD flexible — `slots`

El HUD de React hoy es fijo (Puntuación / Vidas / Nivel). Si el contrato del registry **todavía no usa `slots`** (es decir, si acabás de crear el registry en el paso anterior, o si `asteroides-game.tsx` sigue emitiendo `{ score, lives, level }` en vez de `{ score, slots }`), el plan también incluye:

- Cambiar `onStatsChange` en el contrato para que reciba `{ score: number, slots: HudSlot[] }` en vez de `{ score, lives, level }`.
- En `game-player.tsx`, reemplazar los bloques fijos de Vidas/Nivel del HUD por `stats.slots.map(slot => <div className="hud-stat"><div className="l">{slot.label}</div><div className="v">{slot.value}</div></div>)`. Los bloques de "Jugador" y "Puntuación" no cambian.
- Adaptar `components/asteroids-game.tsx` para que declare `slots: [{ label: "Vidas", value: "♥ ".repeat(lives).trim() || "—" }, { label: "Nivel", value: String(level).padStart(2, "0") }]`.

Un juego sin vidas (p. ej. Tetris) declara sus propios slots, típicamente `[{ label: "Líneas", value: String(lines) }, { label: "Nivel", value: ... }]` — no fuerza un valor falso de "vidas".

**Si el HUD flexible ya existe**, el nuevo juego solo define qué `slots` emite — no hay cambios de plataforma que hacer.

## 7. CSS — tokens de color y sistema de covers

Tokens en `:root` (`app/globals.css`): `--cyan #00f5ff`, `--magenta #ff006e`, `--yellow #f5ff00`, `--green #00ff88`. El campo `color` de `games` debe ser uno de estos cuatro nombres.

**Atención:** `components/game-card.tsx` mapea `game.color` al botón JUGAR, pero solo existen `.btn.magenta` y `.btn.yellow` en `app/globals.css`. `cyan` y `green` caen al `.btn` base (sin variante de color). Si el juego usa `color: "cyan"` o `"green"`, el botón JUGAR de su card se verá igual que el default — decisión a confirmar con el usuario en la Fase 2, no un bug a arreglar de más.

Sistema de covers (`app/globals.css`, sección `/* ===== Cover art generators (pure CSS) ===== */`), 8 clases ya existentes: `.cover-bricks`, `.cover-tetro`, `.cover-snake`, `.cover-glot`, `.cover-invaders`, `.cover-rocas`, `.cover-rana`, `.cover-duelo`. Un cover nuevo sigue esta receta (reemplaza `XXXXX` por el slug real, sin espacio antes de `{`):

```css
.cover-XXXXX {
  background: linear-gradient(135deg, #<oscuro-1>, #0a0a18); /* o radial-gradient */
}
.cover-XXXXX::after {
  content: "";
  position: absolute;
  inset: 0;
  background: /* radial-gradient / linear-gradient / repeating-linear-gradient usando var(--cyan|--magenta|--yellow|--green) */;
  filter: drop-shadow(0 0 6px rgba(<rgb-del-color>, 0.5));
}
```

`::before` opcional para un glifo central (`content: "▲"` en `.cover-rocas`, `content: "•••"` en `.cover-glot`). Se consume como `<div className={"cover-bg " + game.cover}>` dentro de `.cover` (card) o `.detail-cover` (detalle) — nada que tocar en los componentes, solo agregar la clase CSS.

## 8. `.crt-screen` y el canvas

`.crt-screen` es `aspect-ratio: 4/3; overflow: hidden`. Un canvas lógico 800×600 (como Asteroids) encaja exacto con `style={{ width: "100%", height: "100%" }}`. Un canvas con otra proporción (Tetris es 300×600, es decir 1:2) se va a deformar o recortar si se estira igual — la Fase 2 de la skill debe forzar una decisión explícita (letterbox con barras, recorte, o redimensionar la lógica del juego a 4:3) antes de escribir el plan de implementación.
