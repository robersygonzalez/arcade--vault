# SPEC 01 — MVP: pantallas visuales de Arcade Vault

> **Status:** Apobado
> **Depends on:** —
> **Date:** 2026-08-18
> **Objective:** Migrar las 5 pantallas del prototipo estático en `references/templates/` (Biblioteca, Detalle, Reproductor, Auth, Salón de la Fama) a rutas reales de Next.js App Router, sin implementar ningún juego jugable de verdad.

## Scope

**In:**

- Migrar `nav.jsx` a un componente de navegación compartido (logo, links, contador de créditos estático, menú móvil hamburguesa, estado de sesión).
- Migrar `biblioteca.jsx` a la ruta `/` (Biblioteca): buscador por nombre, filtro por categoría, grid de cards de juego.
- Migrar `detalle.jsx` a `/juegos/[id]`: info del juego, tags, stats, leaderboard mock, botones "Jugar ahora" / "Volver al vault".
- Migrar `reproductor.jsx` a `/juegos/[id]/jugar`: HUD, pantalla CRT decorativa, simulación falsa de puntuación (sin input real de jugador), modal de fin de partida con guardado de score.
- Migrar `auth.jsx` a `/login`: tabs iniciar sesión / crear cuenta, login falso (cualquier usuario entra), modo invitado, botones sociales decorativos.
- Migrar `salon.jsx` a `/salon-de-la-fama`: tabs por juego, podio top 3, tabla de puntuaciones, fila "tu mejor marca" si hay sesión.
- Crear `app/data/games.ts` con los datos ficticios (`GAMES`, `CATS`, `PLAYERS`, `seededScores()`), migrados de `data.jsx`, como placeholder de lo que eventualmente vendrá de una base de datos.
- Sesión de usuario y puntuaciones guardadas persistidas en `localStorage` (`av_user`, `av_scores`), igual que el prototipo.
- Revisión puntual de `app/globals.css` (ya migrado desde `styles.css`) y uso de Tailwind para cualquier ajuste nuevo que no esté cubierto.

**Out of scope (para specs futuros):**

- Juegos jugables reales (cualquier engine o lógica de reglas) — el "juego" del reproductor sigue siendo decorativo.
- Backend, base de datos, autenticación real u OAuth funcional.
- Mostrar en alguna pantalla las puntuaciones guardadas en `av_scores` (el prototipo tampoco lo hace).
- Sonido/efectos de audio.
- Pantallas nuevas fuera de las 5 existentes en `references/templates/` (perfil, tienda de créditos, configuración, etc.).
- Internacionalización — todo queda en español, igual que el prototipo.

## Data model

```ts
// app/data/games.ts
export type Game = {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
  cover: string; // clase CSS: "cover-bricks", "cover-tetro", ...
  color: "cyan" | "magenta" | "yellow" | "green";
  best: number;
  plays: string;
};

export type ScoreRow = { rank: number; name: string; score: number; date: string };

export const GAMES: Game[];
export const CATS: string[]; // ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"]
export const PLAYERS: string[];
export function seededScores(seed: number, count?: number): ScoreRow[];
```

```ts
// sesión de usuario (Context, sincronizado con localStorage "av_user")
type User = { name: string } | null;

// puntuaciones guardadas (localStorage "av_scores", array acumulativo)
type SavedScore = { game: string; score: number; name: string; at: number };
```

Convenciones:

- `id` de cada juego es el slug usado en la ruta `/juegos/[id]` (ej. `bloque-buster`).
- `seededScores(seed, count)` es determinista (mismo seed → mismas filas), igual que en `data.jsx`.

## Implementation plan

1. Crear `app/data/games.ts` con los tipos `Game`/`ScoreRow` y los datos (`GAMES`, `CATS`, `PLAYERS`, `seededScores`) migrados de `data.jsx`.
2. Crear `components/user-context.tsx` (Client Component) con `UserProvider` (lee/escribe `localStorage["av_user"]`) y el hook `useUser()`; envolver `app/layout.tsx` con `<UserProvider>` y renderizar ahí el `<Nav />` y el footer (fuera de `{children}`), migrando el marcado de `nav.jsx` a `components/nav.tsx`.
3. Migrar `biblioteca.jsx` a `app/page.tsx` (Client Component) + `components/game-card.tsx`, reutilizando las clases de `globals.css` y filtrando `GAMES` por búsqueda/categoría.
4. Migrar `detalle.jsx` a `app/juegos/[id]/page.tsx` (Server Component), usando `notFound()` si el `id` no existe en `GAMES`; incluye el leaderboard con `seededScores()`.
5. Migrar `reproductor.jsx` a `components/game-player.tsx` (Client Component), renderizado desde `app/juegos/[id]/jugar/page.tsx`; conserva tal cual la simulación de puntuación (`setInterval`), pausa, fin de partida y guardado del score en `localStorage["av_scores"]`.
6. Migrar `auth.jsx` a `app/login/page.tsx` (Client Component): tabs iniciar sesión/crear cuenta, login falso, botón de invitado, usando `useUser()` del paso 2.
7. Migrar `salon.jsx` a `app/salon-de-la-fama/page.tsx` (Client Component): tabs por juego, podio y tabla, usando `useUser()` para la fila "tu mejor marca".
8. Revisar `app/globals.css` contra las 5 pantallas ya migradas: agregar solo clases/ajustes de Tailwind puntuales que falten, sin duplicar lo que ya existe.
9. Añadir `title` por ruta (`export const metadata` en cada `page.tsx`).

## Acceptance criteria

- [ ] `npm run build` termina sin errores.
- [ ] `/` muestra la Biblioteca; buscar "caida" filtra a 1 resultado; los chips de categoría filtran el grid.
- [ ] Click en una card navega a `/juegos/[id]` y muestra la info y el leaderboard de ese juego.
- [ ] "JUGAR AHORA" en `/juegos/[id]` navega a `/juegos/[id]/jugar` y muestra el HUD + pantalla CRT con la puntuación subiendo sola.
- [ ] "PAUSA" detiene el incremento de puntuación; "REANUDAR" lo continúa.
- [ ] "FIN" abre el modal de fin de partida; guardar la puntuación la persiste en `localStorage["av_scores"]` y muestra el toast "PUNTUACIÓN GUARDADA".
- [ ] `/login` permite iniciar sesión con cualquier usuario/contraseña o entrar como invitado; tras iniciar sesión el nombre aparece en el Nav.
- [ ] Recargar la página después de iniciar sesión conserva la sesión (`localStorage["av_user"]`).
- [ ] Cerrar sesión desde el Nav limpia `av_user` y el botón vuelve a mostrar "Iniciar Sesión".
- [ ] `/salon-de-la-fama` muestra podio y tabla por juego, cambia de juego con los tabs, y muestra la fila "tu mejor marca" solo con sesión iniciada.
- [ ] El menú móvil (hamburguesa) abre/cierra en pantallas angostas y navega a las mismas rutas que el nav de escritorio.
- [ ] Las 5 pantallas coinciden visualmente con `references/templates/*.jsx` (colores neón, tipografías pixel/mono, efectos CRT/scanlines).

## Decisions

- **Sí:** rutas anidadas en español (`/`, `/juegos/[id]`, `/juegos/[id]/jugar`, `/login`, `/salon-de-la-fama`) — jerárquicas y legibles; confirmado por el usuario.
- **Sí:** datos mock en `app/data/games.ts` — el usuario indicó explícitamente que ahí vivirán los datos ficticios que eventualmente vendrán de una base de datos.
- **Sí:** `reproductor.jsx` se copia tal cual, incluyendo el loop falso de puntuación y el guardado en `localStorage` — el usuario lo definió como placeholder temporal hasta que existan pantallas de juego reales; no cuenta como "implementar un juego" porque no hay input del jugador ni reglas.
- **Sí:** persistencia con `localStorage` (`av_user`, `av_scores`) igual que el prototipo — sin backend, consistente con "solo parte visual".
- **Sí:** `app/globals.css` se mantiene tal cual está migrado; cualquier ajuste adicional se hace con clases utilitarias de Tailwind en vez de agregar más CSS a mano, según indicación del usuario.
- **Sí:** `GameDetail` como Server Component (no necesita estado de cliente); Library, Auth, HallOfFame y GamePlayer son Client Components por su interactividad.
- **No:** librería de estado global (Zustand/Redux) — un React Context simple alcanza para el único estado compartido (usuario).
- **No:** mostrar en alguna pantalla los scores guardados en `av_scores` — el prototipo tampoco lo hace; el Salón de la Fama sigue usando datos mock generados por `seededScores()`.
- **No:** autenticación real, backend ni base de datos — fuera de alcance de este MVP visual.

## What is **not** in this spec

- Juegos reales jugables (ningún engine, ninguna lógica de reglas).
- Backend, base de datos, autenticación real u OAuth funcional.
- Mostrar las puntuaciones guardadas en `av_scores` en alguna pantalla.
- Sonido/efectos de audio.
- Pantallas nuevas fuera de las 5 presentes en `references/templates/` (perfil de usuario, tienda de créditos, configuración, etc.).
- Internacionalización / soporte multi-idioma.

Cada uno de estos, si se necesita, va en su propio spec.
