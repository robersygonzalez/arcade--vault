# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Product

**Arcade Vault**: an online platform for playing games and competing for the highest score
(per README.md: "una plataforma para jugar online y competir por la mayor cantidad de puntos").
MVP is built: Home, Library (`/games`), game detail, a real playable arcade with 4 games, Hall of
Fame, About/contact, and a Supabase-backed leaderboard. Auth (`/login`) is still a visual-only mock —
no real session/backend behind it yet.

## Required workflow: Spec Driven Design

Every feature goes through **Spec Driven Design**: a spec in `specs/NN-slug.md` first, approved by hand,
then implemented from it. All specs so far (`specs/01`–`specs/09`) are `Status: Implementado`.

Slash commands (installed as project skills under `.claude/skills/`, mirrored under `.agents/skills/`):

- `/spec` — draft or refine a spec.
- `/spec-impl` — implement an approved spec.
- `/add-game` — specialized `/spec` for adding a new real, playable game (own skill, `.claude/skills/add-game/`).
  It reads `references/started-games/<slug>/` (or a from-scratch description), asks clarifying questions, and
  writes `specs/NN-slug.md` — it never writes code itself. Its `references/platform-contract.md` documents the
  full integration contract (Supabase schema, registry, HUD slots, cover CSS) and
  `references/porting-guide.md` covers porting a vanilla `game.js` to a React canvas component.

Originally sourced from `Klerith/fernando-skills`; `add-game` is a local extension on top of it.

## Read the bundled Next.js docs before writing code

This project runs **Next.js 16.3.1** with **React 19.2** — recent enough that training data is likely stale or wrong.
Before implementing any App Router feature (routing, data fetching, caching, images, metadata, middleware/proxy, etc.),
check `node_modules/next/dist/docs/01-app/` for the current API. Notably:

- `params`, `searchParams`, `cookies()`, `headers()`, `draftMode()` are **async-only** — no sync compatibility layer.
- `middleware.ts` is deprecated in favor of `proxy.ts` (export `proxy`, not `middleware`); `proxy` only runs on the `nodejs` runtime.
- Use the generated type helpers instead of hand-writing prop types: `PageProps<'/route'>`, `LayoutProps<'/route'>`, `RouteContext<'/route'>` (see `app/layout.tsx` for an example). Regenerate with `npx next typegen` after adding/changing routes.
- Turbopack is the default bundler for both `next dev` and `next build` (no `--turbopack` flag needed).
- `next lint` was removed; linting runs via the ESLint CLI directly.

## Skills

- Usa siempre `/frontend-design` cuando quieras hacer diseños de interfaces de usuario.
- Usa `/add-game` para diseñar el spec de un juego real nuevo (ver "Required workflow" arriba).
- `.claude/hooks/format-and-lint.mjs` corre automáticamente (Prettier + ESLint) después de cada `Write`/`Edit` — ver `.claude/settings.json`.

## Architecture

App Router, TypeScript, Tailwind CSS v4 (`app/globals.css`, `@import "tailwindcss"` + `@theme inline`,
no `tailwind.config.js`). Path alias `@/*` → repo root.

**Routes** (`app/`):

- `/` (`app/page.tsx`) — landing/home, queries `games` (`limit(6)`) for a featured rail.
- `/games` — Library, queries all `games`, renders `<Library games={...} />` with client-side search/category filter.
- `/juegos/[id]` — game detail (Server Component), queries `games` by id + top 10 `scores` for that game.
- `/juegos/[id]/jugar` — the player, loads `<GamePlayer game={game} />`.
- `/about` — About + real contact form → `app/api/contact/route.ts` → Resend.
- `/salon-de-la-fama` — Hall of Fame, reads all `scores` + all `games`.
- `/login` — visual-only auth mock (no Supabase Auth wired up — explicitly out of scope so far).

**These routes never change when adding a new game** — they're already generic over the `games`/`scores`
tables. The only game-specific code lives in `components/game-player.tsx` and the registry below.

**Supabase** (`utils/supabase/client.ts` + `server.ts`, via `@supabase/ssr`): two tables, `games` (id,
title, short, long, cat, cover, color, best, plays) and `scores` (id, game_id → games.id, name, score,
created_at). RLS: public `SELECT` on both, public `INSERT` on `scores` only; `games` is admin-only via
migrations (`mcp__supabase__apply_migration`). No local `supabase/migrations/` directory — migrations are
applied directly against the remote project through the Supabase MCP server (configured in `.mcp.json`).

**Real playable games** — `components/games/registry.ts` maps `game.id` → a canvas Client Component via
`REAL_GAMES`, with a shared contract:

```ts
type HudSlot = { label: string; value: string };
type GameStats = { score: number; slots: HudSlot[] };
type RealGameHandle = { togglePause; forceGameOver; restart };
type RealGameProps = { onStatsChange; onGameOver };
```

Currently registered: `asteroides`, `tetris`, `arkanoid`, `snake` (`components/{asteroids,tetris,arkanoid,snake}-game.tsx`).
`game-player.tsx` renders `REAL_GAMES[game.id]` inside `.crt-screen` if present, otherwise falls back to
a decorative fake-score simulation — several other catalog entries (e.g. `bloque-buster`, `serpentina`)
are still decorative-only by design, coexisting with their "real" counterpart under a different id.
HUD stats render from `stats.slots` (flexible, not hardcoded to lives/level). `saveScore()` is fully
generic — inserts `{ game_id, name, score }` into `scores`.

**Cover art**: pure-CSS generator classes in `app/globals.css` (`.cover-bricks`, `.cover-tetro`,
`.cover-snake`, `.cover-glot`, `.cover-invaders`, `.cover-rocas`, `.cover-rana`, `.cover-duelo`,
`.cover-frutal`). `game.color` must be one of `cyan`/`magenta`/`yellow`/`green`; only `.btn.magenta`
and `.btn.yellow` have button variants today — `cyan`/`green` fall back to the base `.btn` style.

**References** (`references/`): `started-games/` holds the vanilla JS sources games get ported from
(`02-asteroids`, `03-tetris`, `04-arkanoid`), `source-assets/` holds raw sprite/asset sources not yet
moved into `public/`, `templates/` holds the original static HTML/JSX mockups the early specs migrated
from — useful for design reference, not live code.

See "Required workflow" above for how feature work should be planned before writing code.
