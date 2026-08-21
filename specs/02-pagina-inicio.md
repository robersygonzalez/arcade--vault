# SPEC 02 — Página de inicio (Home) como nueva landing

> **Status:** Implementado
> **Depends on:** SPEC 01 (mvp-pantallas-visuales)
> **Date:** 2026-08-20
> **Objective:** Migrar `home.jsx` de `references/templates/home-about/` a la nueva landing page de Arcade Vault en `/`, mover la Biblioteca actual (spec 01) a `/games`, y actualizar el Nav y los links internos en consecuencia.

## Scope

**In:**

- Mover la ruta actual `app/page.tsx` (Biblioteca, migrada en spec 01) a `app/games/page.tsx`, sin cambios de contenido.
- Crear `components/home.tsx` (Client Component) migrando `home.jsx`: hero con silhouettes flotantes, sección "¿Por qué Arcade Vault?", rail de juegos destacados, stats, "Actividad en vivo" (ticker + top jugadores), sección de precios/FAQ, y CTA final.
- Crear el nuevo `app/page.tsx` que renderiza `<Home />` en la ruta `/`.
- Actualizar `components/nav.tsx` para agregar el link "Inicio" (`/`) y cambiar el link "Biblioteca" de `/` a `/games`, tanto en el nav de escritorio como en el menú móvil.
- Actualizar todos los links/redirects internos que asumían que la Biblioteca vivía en `/`, para que apunten a `/games`.
- Migrar a `app/globals.css` los bloques de estilos del Home (`HOME PAGE`, `ACTIVITY`, `PRICING`) desde `references/templates/home-about/styles.css`.

**Out of scope (para specs futuros):**

- La pantalla About / Acerca de (`about.jsx`) y su formulario de contacto — se implementará en un spec futuro.
- El bloque de estilos `GAMEPAD` (`.gp*`) presente en `styles.css` — no lo usa `home.jsx`, pertenece a otra pantalla no definida todavía.
- Cualquier lógica real detrás de "Actividad en vivo" (partidas/puntuaciones reales) — sigue siendo decorativo, igual que el resto del MVP.
- Cambios a `app/data/games.ts`, backend, base de datos o autenticación real — sigue fuera de alcance, igual que spec 01.

## Data model

No se introducen estructuras de datos nuevas ni persistentes.

- El rail de juegos destacados del Home reutiliza `GAMES` (de `app/data/games.ts`) tal cual, tomando `GAMES.slice(0, 6)`.
- Los arrays de "Actividad en vivo" (`ACTIVITY_TICKER`) y "Top jugadores" (`TOP_PLAYERS_TODAY`) quedan como constantes locales hardcodeadas dentro de `components/home.tsx` (mismos valores que `home.jsx`), como placeholder temporal — no se modelan en `app/data/games.ts`.

## Implementation plan

1. Mover `app/page.tsx` (contenido actual de Biblioteca) a `app/games/page.tsx`, sin cambios: mismo `<Library />` y `metadata.title = "Arcade Vault · Biblioteca"`.
2. Crear `components/home.tsx` (Client Component) migrando `home.jsx`: hook `useReveal` (IntersectionObserver sobre `.reveal`), `FloatingSilhouettes`, `MiniCard`, `FeatureIcon`, y el componente `Home` completo. Resolver los `navigate(...)` del original con `useRouter().push(...)` (mismo patrón que `components/game-card.tsx`): `biblioteca` → `/games`, `detalle` → `/juegos/[id]`, `auth` → `/login`, `salon` → `/salon-de-la-fama`.
3. Crear el nuevo `app/page.tsx` que renderiza `<Home />`, con `metadata.title = "Arcade Vault · Inicio"`.
4. Actualizar `components/nav.tsx`: agregar el link "Inicio" (`href="/"`) antes de "Biblioteca"; cambiar el link "Biblioteca" de `href="/"` a `href="/games"`; ajustar `isActive` para que `"home"` sea `pathname === "/"` y `"biblioteca"` sea `pathname.startsWith("/games") || pathname.startsWith("/juegos")`; replicar los cambios en el panel móvil.
5. Actualizar las referencias internas que asumían Biblioteca en `/`, apuntándolas a `/games`: `app/juegos/[id]/page.tsx:41` ("VOLVER AL VAULT"), `components/hall-of-fame.tsx:84` ("VOLVER A LA BIBLIOTECA"), `components/game-player.tsx:98` ("VOLVER AL VAULT"), y `components/login-form.tsx:18,23` (`router.push("/")` tras iniciar sesión / crear cuenta / entrar como invitado).
6. Agregar a `app/globals.css` los bloques de estilos migrados desde `references/templates/home-about/styles.css`: sección `HOME PAGE` (`.home*`, `.feature-*`, `.mini-*`, `.home-stats`/`.stat-*`, `.home-final`/`.final-*`, `.reveal`), `ACTIVITY` (`.activity-*`, `.tick-*`, `.top-*`) y `PRICING` (`.pricing-*`, `.price-*`, `.pc-*`, `.faq-*`). No copiar los bloques `ABOUT PAGE` ni `GAMEPAD`.
7. Correr `npx next typegen` si hace falta (nueva ruta `/games`) y verificar `npm run build`.

## Acceptance criteria

- [x] `npm run build` termina sin errores.
- [x] `/` muestra la nueva Home (hero, "¿Por qué Arcade Vault?", juegos destacados, stats, actividad en vivo, precios/FAQ, CTA final), con las animaciones `.reveal` activándose al hacer scroll.
- [x] `/games` muestra la Biblioteca con el mismo comportamiento que antes de este spec (buscador, chips de categoría, grid de juegos).
- [x] El Nav muestra los links "Inicio", "Biblioteca" y "Salón de la Fama"; "Inicio" está activo solo en `/`, "Biblioteca" está activo en `/games` y en `/juegos/[id]`.
- [x] El logo del Nav navega a `/`.
- [x] "EXPLORAR JUEGOS", "VER TODOS LOS JUEGOS →" e "INSERTAR MONEDA →" en el Home navegan a `/games`.
- [x] "CREAR CUENTA" y "EMPEZAR GRATIS →" en el Home navegan a `/login`.
- [x] Click en una mini-card de juego del Home navega a `/juegos/[id]` del juego correspondiente.
- [x] "VER SALÓN →" en el Home navega a `/salon-de-la-fama`.
- [x] "VOLVER AL VAULT" (detalle y reproductor) y "VOLVER A LA BIBLIOTECA" (salón de la fama) navegan a `/games`.
- [x] Iniciar sesión, crear cuenta o entrar como invitado desde `/login` redirige a `/games`.
- [x] El Home coincide visualmente con `references/templates/home-about/home.jsx` (colores neón, tipografías pixel/mono, silhouettes flotantes, ticker de actividad, ranking de top jugadores, tarjeta de precios).
- [x] El menú móvil del Nav incluye "Inicio" y navega correctamente.

## Decisions

- **Sí:** Home reemplaza a la Biblioteca en `/`, y la Biblioteca se muda a `/games` — decisión explícita del usuario.
- **Sí:** los arrays de "actividad en vivo" y "top jugadores" del Home quedan como constantes locales hardcodeadas dentro de `components/home.tsx`, sin modelarlos en `app/data/games.ts` — decisión explícita del usuario ("datos mock los dejas como constantes temporalmente").
- **Sí:** el rail de juegos destacados del Home reutiliza el mismo array `GAMES` ya existente en `app/data/games.ts` (`GAMES.slice(0, 6)`), sin crear una estructura nueva — decisión explícita del usuario.
- **Sí:** navegación con `useRouter().push(...)` para los CTAs y mini-cards del Home, igual que el patrón ya usado en `components/game-card.tsx` — consistencia con el resto del código existente.
- **No:** la pantalla About (`about.jsx`) — el usuario indicó explícitamente que se implementará en un spec futuro.
- **No:** el bloque de estilos `.gp*` (GAMEPAD) presente en `styles.css` — no lo usa `home.jsx` ni `about.jsx`; pertenece a una pantalla fuera de alcance.
- **No:** cambios en `app/data/games.ts` — se reutiliza tal cual.

## What is **not** in this spec

- La pantalla About / Acerca de (`about.jsx`) y su formulario de contacto — spec futuro.
- Cualquier lógica real detrás de "Actividad en vivo" conectada a partidas o puntuaciones reales — sigue siendo decorativo/mock.
- El bloque de estilos GAMEPAD (`.gp*`) del template.
- Backend, base de datos o autenticación real — sigue fuera de alcance, igual que spec 01.

Cada uno de estos, si se necesita, va en su propio spec.
