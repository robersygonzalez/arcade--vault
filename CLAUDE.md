# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Product

**Arcade Vault**: an online platform for playing games and competing for the highest score
(per README.md: "una plataforma para jugar online y competir por la mayor cantidad de puntos").
It is currently unbuilt — the repo is still the stock `create-next-app` scaffold.

## Required workflow: Spec Driven Design

README.md mandates building this project with **Spec Driven Design**, driven through the `/spec` and
`/spec-impl` slash commands from the `Klerith/fernando-skills` skill pack
(https://github.com/Klerith/fernando-skills). In practice this means: don't jump straight to
implementation code for a feature — go through `/spec` to produce/refine a spec first, then `/spec-impl`
to implement from it.

**This skill pack is not yet installed** (no `.claude/` directory exists in this repo). If `/spec` or
`/spec-impl` aren't available when they're needed, install it first:

```bash
npx skills@latest add Klerith/fernando-skills
```

## Read the bundled Next.js docs before writing code

This project runs **Next.js 16.3.1** with **React 19.2** — recent enough that training data is likely stale or wrong.
Before implementing any App Router feature (routing, data fetching, caching, images, metadata, middleware/proxy, etc.),
check `node_modules/next/dist/docs/01-app/` for the current API. Notably:

- `params`, `searchParams`, `cookies()`, `headers()`, `draftMode()` are **async-only** — no sync compatibility layer.
- `middleware.ts` is deprecated in favor of `proxy.ts` (export `proxy`, not `middleware`); `proxy` only runs on the `nodejs` runtime.
- Use the generated type helpers instead of hand-writing prop types: `PageProps<'/route'>`, `LayoutProps<'/route'>`, `RouteContext<'/route'>` (see `app/layout.tsx` for an example). Regenerate with `npx next typegen` after adding/changing routes.
- Turbopack is the default bundler for both `next dev` and `next build` (no `--turbopack` flag needed).
- `next lint` was removed; linting runs via the ESLint CLI directly.

## Commands

```bash
npm run dev     # start dev server (Turbopack)
npm run build   # production build (Turbopack)
npm run start   # run the production build
npm run lint    # eslint (flat config, eslint.config.mjs)
```

There is no test runner configured in this project yet.

## Architecture

This is currently a stock `create-next-app` project (App Router, TypeScript, Tailwind CSS v4) with no
application code beyond the generated template — `app/layout.tsx` and `app/page.tsx` are still the
default scaffold. Structure so far:

- `app/` — App Router root. `layout.tsx` defines the HTML shell and loads the Geist fonts; `globals.css`
  configures Tailwind v4 via `@import "tailwindcss"` + `@theme inline` (no `tailwind.config.js` — theme
  tokens are defined directly in CSS).
- Path alias `@/*` → repo root (`tsconfig.json`).

See "Required workflow" above for how feature work should be planned before writing code.
