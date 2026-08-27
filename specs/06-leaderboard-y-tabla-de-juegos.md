# SPEC 06 — Leaderboard real y tabla de juegos en Supabase

> **Status:** Aprobado
> **Depends on:** SPEC 04 (integracion-supabase), SPEC 05 (juego-asteroides-real)
> **Date:** 2026-08-27
> **Objective:** Reemplazar los datos 100% mock de la Biblioteca y el Salón de la Fama por dos tablas reales en Supabase (`games` y `scores`), de forma que `game-player.tsx` guarde cada puntuación de verdad y las páginas de Biblioteca, detalle de juego y Salón de la Fama lean esos datos reales en vez de `GAMES`/`seededScores()`.

## Scope

**In:**

- Crear la tabla `games` en Supabase vía migración, con las mismas columnas que el tipo `Game` actual (`id`, `title`, `short`, `long`, `cat`, `cover`, `color`, `best`, `plays`), sembrada con los 9 juegos actuales de `app/data/games.ts` (mismos valores estáticos, incluida la fila `asteroides`).
- Crear la tabla `scores` en Supabase en la misma migración, referenciando `games(id)`. Arranca vacía — no se migra `localStorage["av_scores"]`.
- RLS habilitado en ambas tablas: lectura pública en `games` y `scores`; escritura (`INSERT`) pública solo en `scores`. `games` no acepta cambios desde el cliente (se administra vía migraciones).
- `app/games/page.tsx` (Server Component) consulta `games` y pasa la lista como prop a `<Library>`; `components/library.tsx` recibe `games` como prop en vez de importar `GAMES`, conservando el filtro en memoria (búsqueda + categoría) tal cual.
- `app/juegos/[id]/page.tsx` y `app/juegos/[id]/jugar/page.tsx` consultan `games` por `id` en vez de `GAMES.find(...)`.
- `app/juegos/[id]/page.tsx` consulta las top 10 filas de `scores` de ese juego (orden `score desc`) en vez de `seededScores()`, mismo markup del aside "MEJORES PUNTUACIONES".
- `components/game-player.tsx`: `saveScore()` inserta en `scores` (`game_id`, `name`, `score`) vía el cliente de browser en vez de escribir en `localStorage["av_scores"]`. Aplica a todos los juegos, incluido `asteroides` — revierte la exclusión de spec 05 ("no persistencia real para Asteroids").
- `app/salon-de-la-fama/page.tsx` (Server Component) consulta todas las filas de `scores` y todas las `games`, y las pasa como props a `<HallOfFame>`; `components/hall-of-fame.tsx` deja de usar `seededScores()` y agrupa/ordena las filas recibidas en memoria por `game_id` para las tabs, el podio y la tabla, igual que hoy.
- "▸ TU MEJOR MARCA EN {juego}" en Salón de la Fama: con usuario logueado (`useUser()`), se busca entre las filas ya cargadas del juego activo la de mayor `score` con `name` igual (case-insensitive) a `user.name`; si no hay ninguna, la sección no se muestra.
- Eliminar de `app/data/games.ts` lo que deja de usarse tras la migración: el array `GAMES`, la función `seededScores`, el array `PLAYERS` y el tipo `ScoreRow`. Se conservan el tipo `Game` y el array `CATS`.

**Out of scope (para specs futuros):**

- Auth real / login con Supabase — se sigue guardando solo el nombre libre en el modal de fin de partida, sin usuario autenticado.
- Migrar los puntajes que ya existan en `localStorage["av_scores"]` de usuarios actuales — se pierden; la tabla `scores` arranca vacía.
- Recalcular `best`/`plays` de cada juego desde datos reales de `scores` — quedan estáticos, migrados tal cual desde el array actual.
- Cualquier UI de administración para crear/editar juegos desde la app — `games` se administra solo vía migraciones SQL.
- Paginación, rate limiting o validación anti-spam sobre `INSERT` en `scores` — cualquiera puede insertar cualquier puntuación con cualquier nombre, igual que hoy con `localStorage`.
- Realtime (Salón de la Fama actualizándose en vivo sin recargar) — spec 04 ya lo dejó fuera de alcance; sigue fuera.
- Cliente con `SUPABASE_SERVICE_ROLE_KEY` — no hace falta, todo pasa por RLS pública.

## Data model

Migración nueva en Supabase que crea dos tablas:

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

alter table public.games enable row level security;
alter table public.scores enable row level security;

create policy "games are publicly readable" on public.games
  for select using (true);

create policy "scores are publicly readable" on public.scores
  for select using (true);

create policy "anyone can insert a score" on public.scores
  for insert with check (true);

insert into public.games (id, title, short, long, cat, cover, color, best, plays) values
  ('bloque-buster', 'BLOQUE BUSTER', ..., 28450, '12.4K'),
  ('caida', 'CAÍDA', ..., 184220, '31.8K'),
  ('serpentina', 'SERPENTINA', ..., 7820, '9.1K'),
  ('gloton', 'GLOTÓN', ..., 96400, '27.2K'),
  ('invasores', 'INVASORES', ..., 54190, '18.0K'),
  ('rocas', 'ROCAS', ..., 41200, '15.6K'),
  ('asteroides', 'ASTEROIDES', ..., 38500, '5.2K'),
  ('ranaria', 'RANARIA', ..., 18900, '6.4K'),
  ('duelo-pixel', 'DUELO PIXEL', ..., 24, '4.2K');
  -- valores completos (short/long) copiados literalmente de app/data/games.ts
```

`app/data/games.ts` después de esta spec:

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

`GAMES`, `seededScores`, `PLAYERS` y `ScoreRow` se eliminan del archivo — sin equivalentes nuevos; los componentes que los usaban pasan a recibir filas de `games`/`scores` como props o vía query directa.

## Implementation plan

1. Escribir y aplicar (`mcp__supabase__apply_migration`) una migración `create_games_and_scores` con el SQL de la sección "Data model": crea `games` y `scores`, habilita RLS, agrega las tres policies, e inserta las 9 filas de `games` con los valores literales de `app/data/games.ts` actual (incluida `asteroides`).
2. Actualizar `app/data/games.ts`: quitar `GAMES`, `seededScores`, `PLAYERS`, `ScoreRow`; dejar solo `Game` y `CATS`.
3. `app/games/page.tsx`: convertir en `async function`, hacer `await createClient()` (server) y `select("*")` sobre `games`; pasar el resultado como prop `games` a `<Library />`.
4. `components/library.tsx`: recibir `games: Game[]` como prop en vez de importar `GAMES`; el resto de la lógica (búsqueda, chips de categoría) no cambia.
5. `app/juegos/[id]/page.tsx`: reemplazar `GAMES.find(...)` por `select("*").eq("id", id).single()` sobre `games`, y `seededScores(...)` por `select("*").eq("game_id", id).order("score", { ascending: false }).limit(10)` sobre `scores`; adaptar el mapeo de filas al mismo markup (`rank` se deriva del índice, `date` se formatea desde `created_at`).
6. `app/juegos/[id]/jugar/page.tsx`: reemplazar `GAMES.find(...)` por el mismo query a `games` del paso 5.
7. `components/game-player.tsx`: cambiar `saveScore()` para hacer `await` de un `insert` en `scores` (`game_id: game.id, name, score`) con el cliente de browser (`utils/supabase/client.ts`); solo llama `setSaved(true)` si el insert no devuelve error (si falla, se deja `saved` en `false` para que el usuario pueda reintentar). Se quita el bloque `try { localStorage... } catch {}`.
8. `app/salon-de-la-fama/page.tsx`: convertir en `async function`, consultar todas las filas de `scores` (`select("*").order("score", { ascending: false })`) y todas las `games`; pasar ambas listas como props a `<HallOfFame />`.
9. `components/hall-of-fame.tsx`: recibir `scores`/`games` como props; reemplazar `seededScores(tab...)` por un `useMemo` que filtra `scores` por `game_id === tab` (ya vienen ordenadas por score); si hay menos de 3 filas para el juego activo, no se renderiza el podio (solo la tabla, o un mensaje si hay 0); recalcular "tu mejor marca" buscando, dentro de esas filas filtradas, la de mayor `score` con `name` igual (case-insensitive) a `user.name` — si no existe ninguna, no se renderiza esa sección.
10. Correr `npm run build` para confirmar que todo compila y tipa; correr `npx next typegen` si hace falta tras los cambios de rutas.

## Acceptance criteria

- [ ] `npm run build` termina sin errores.
- [ ] `list_tables` muestra `games` (9 filas) y `scores` (0 filas) recién aplicada la migración.
- [ ] `/games` (Biblioteca) muestra las 9 cards con los mismos datos que antes (título, cover, best, plays), ahora leídos de Supabase.
- [ ] La búsqueda y los chips de categoría en `/games` siguen filtrando igual que antes (sin refetch, en memoria).
- [ ] `/juegos/[id]` muestra el detalle correcto para cada uno de los 9 juegos y no revienta con `notFound()` para ids válidos.
- [ ] `/juegos/[id]/jugar` carga el reproductor correcto para cada juego (decorativo o real, según corresponda).
- [ ] Terminar una partida de cualquier juego (incluido `asteroides`) y presionar "GUARDAR PUNTUACIÓN" inserta una fila nueva en `scores` con el `game_id`, `name` y `score` correctos (verificable con una query a la tabla).
- [ ] Si el insert falla (ej. red caída), el modal no muestra "PUNTUACIÓN GUARDADA_" y el botón sigue disponible para reintentar.
- [ ] El aside "MEJORES PUNTUACIONES" de `/juegos/[id]` muestra las filas reales de `scores` para ese juego (top 10 por score), vacío o corto si aún no hay partidas guardadas.
- [ ] `/salon-de-la-fama` muestra tabs por juego; cada tab filtra las filas reales de `scores` de ese `game_id`, ordenadas por score.
- [ ] Un juego con menos de 3 puntuaciones guardadas no muestra el podio (silver/gold/bronze) roto por filas inexistentes.
- [ ] Un juego con 0 puntuaciones guardadas no rompe la página (mensaje o tabla vacía, sin error de runtime).
- [ ] Con un usuario logueado (`login-form`) que ya guardó una puntuación con su mismo nombre, "▸ TU MEJOR MARCA EN {juego}" muestra esa puntuación real; si no guardó ninguna, la sección no aparece.
- [ ] `app/data/games.ts` ya no exporta `GAMES`, `seededScores`, `PLAYERS` ni `ScoreRow`; ningún archivo del repo los importa.
- [ ] Insertar en `scores` funciona sin estar logueado (sin sesión de Supabase Auth) — confirma que la policy de `INSERT` público quedó bien configurada.

## Decisions

- **Sí:** un solo spec combinado para `games` y `scores` en vez de dos specs separados — decisión explícita del usuario, aunque toca varias áreas (DB, RLS, Biblioteca, detalle, Salón de la Fama, `game-player`).
- **Sí:** "tabla de juegos" significa una tabla real en la base de datos (`games`), reemplazando el array estático `app/data/games.ts` — decisión explícita del usuario, no una vista tabular de UI.
- **Sí:** "leaderboard" significa reemplazar `seededScores()` por datos reales de una tabla `scores`, reutilizando la página Salón de la Fama existente — decisión explícita del usuario, no una página nueva separada.
- **Sí:** el guardado de puntuación sigue siendo solo por nombre/iniciales libres, sin auth real — decisión explícita del usuario, coherente con que spec 04 dejó Auth fuera de alcance.
- **Sí:** la tabla `scores` arranca vacía; no se migran los puntajes que pudieran existir en `localStorage["av_scores"]` de sesiones previas — decisión explícita del usuario (son datos mock que nadie leía).
- **Sí:** `best`/`plays` de `games` quedan estáticos, migrados tal cual del array actual, sin recalcularse desde `scores` — decisión explícita del usuario, para no requerir agregaciones/vistas nuevas en este spec.
- **Sí:** la Biblioteca sigue siendo un Client Component que filtra en memoria; el fetch a Supabase ocurre una sola vez en el Server Component de la ruta (`app/games/page.tsx`) — decisión explícita del usuario, mismo patrón que ya usan `app/juegos/[id]/page.tsx` y `.../jugar/page.tsx`.
- **Sí:** Asteroids queda incluido guardando puntuaciones reales en `scores` igual que el resto de juegos — decisión explícita del usuario; revierte la exclusión de spec 05 ("persistencia real de puntuaciones de Asteroids... fuera de alcance").
- **Sí:** "tu mejor marca" en Salón de la Fama se calcula buscando por `name` (case-insensitive) dentro de las filas reales del juego activo — decisión explícita del usuario; funciona sin auth real porque el nombre es lo único que vincula partida y usuario logueado.
- **Sí:** RLS con `SELECT` público en ambas tablas e `INSERT` público solo en `scores` (sin límites de tasa ni validación) — inferido del modelo de confianza que la app ya tiene hoy (cualquiera podía escribir cualquier score en `localStorage`); no se introduce ninguna restricción nueva.
- **No:** UI de administración para crear/editar juegos — `games` se administra vía migraciones SQL; fuera de alcance.
- **No:** recalcular `best`/`plays` desde `scores` reales — fuera de alcance, spec futuro si se necesita.
- **No:** paginación o límites en `scores` — fuera de alcance, no hay volumen que lo justifique todavía.
- **No:** Realtime ni `SUPABASE_SERVICE_ROLE_KEY` — ya descartados en spec 04, siguen fuera.

## Risks

| Risk                                                                                                                                                                                                                  | Mitigation                                                                                                                                                                                                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| La policy de `INSERT` público en `scores` sin ninguna validación permite que cualquiera inserte puntuaciones absurdas o spam (nombres ofensivos, scores negativos/gigantes).                                          | Aceptado explícitamente como parte del mismo modelo de confianza que ya tenía `localStorage`; queda documentado aquí para una futura decisión de validación/rate limiting fuera de este spec.                                     |
| `game-player.tsx` pasa de una escritura síncrona a `localStorage` a un `insert` async a Supabase; si la red falla a mitad de partida, el usuario podría perder su puntuación sin darse cuenta.                        | El plan exige no marcar `saved = true` si el insert falla, dejando el botón "GUARDAR PUNTUACIÓN" disponible para reintentar.                                                                                                      |
| Migrar `app/games/page.tsx` y `app/salon-de-la-fama/page.tsx` de estáticos a `async` con queries a Supabase puede introducir un error 500 si la tabla está vacía o la query falla, donde antes el mock nunca fallaba. | Los queries usan solo `SELECT` público (sin auth) sobre tablas ya sembradas por la migración del paso 1; `npm run build` y una revisión manual de `/games` y `/salon-de-la-fama` confirman que no rompen antes de cerrar el spec. |
| Eliminar `GAMES`/`seededScores`/`PLAYERS`/`ScoreRow` de `app/data/games.ts` puede dejar imports rotos si algún archivo no listado en este spec los usa.                                                               | El paso 2 se hace después de mapear todos los usos actuales (Biblioteca, detalle, jugar, Salón de la Fama, `game-player`); `npm run build` falla en tiempo de compilación si queda algún import roto.                             |

## What is **not** in this spec

- Auth real / login con Supabase — el guardado sigue siendo solo por nombre libre.
- Migración de puntajes existentes en `localStorage["av_scores"]`.
- Recalcular `best`/`plays` desde datos reales de `scores`.
- UI de administración para crear/editar juegos.
- Paginación, rate limiting o validación anti-spam sobre `scores`.
- Realtime y `SUPABASE_SERVICE_ROLE_KEY`.

Cada uno de estos, si se necesita, va en su propio spec.
