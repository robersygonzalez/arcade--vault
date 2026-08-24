# SPEC 04 — Integración base de Supabase (cliente DB, sin auth)

> **Status:** Aprobado
> **Depends on:** Ninguno
> **Date:** 2026-08-24
> **Objective:** Conectar Arcade Vault al proyecto Supabase ya existente (`iitjdgzcycdvbwbqtdnp`) instalando y configurando los clientes de `@supabase/ssr` para leer/escribir datos (browser y server), sin ninguna pieza de Auth — ni siquiera temporal.

## Por qué existe esta spec

El proyecto Supabase ya está aprovisionado (`.env.local`/`.env.template` ya tienen `SUPABASE_DB_PASSWORD`) pero el cliente nunca se conectó desde la app. El usuario quiere dejar la conexión a la base de datos lista como base común para specs futuros (persistencia de puntajes del Salón de la Fama, Realtime, Edge Functions y, más adelante, autenticación visual) — pero esta spec **no** implementa ninguna de esas features, y explícitamente no toca nada de Auth, ni siquiera como verificación temporal.

## Scope

**In:**

- Instalar `@supabase/supabase-js` y `@supabase/ssr` en `package.json`.
- Agregar `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` a `.env.local` (valores reales del proyecto `iitjdgzcycdvbwbqtdnp`) y a `.env.template` (placeholders, mismo formato que `RESEND_API_KEY=xxxxxxxxxx`).
- Crear `utils/supabase/client.ts`: cliente de browser (`createBrowserClient`).
- Crear `utils/supabase/server.ts`: cliente de servidor (`createServerClient`) usando `cookies()` de `next/headers` (async en esta versión de Next).
- Verificar `npm run build` (sin ruta de prueba ni llamada real a la API de Supabase).

**Out of scope (para specs futuros):**

- `proxy.ts` y cualquier refresco de sesión — es una pieza de Auth y el usuario no quiere nada de Auth todavía, ni siquiera temporal.
- Cualquier ruta de verificación (`/api/supabase-check` o similar) que llame a `supabase.auth.*` — mismo motivo.
- Reemplazar `components/login-form.tsx` / `components/user-context.tsx` (auth simulada con `localStorage["av_user"]`) por autenticación real de Supabase — spec futuro aparte.
- Crear cualquier tabla en la base de datos (perfiles, puntajes, etc.) o políticas de RLS — se define en el spec que construya esa feature.
- Persistir los puntajes del Salón de la Fama en Supabase (hoy `seededScores()` en `app/data/games.ts` es 100% mock, y `game-player.tsx` escribe a `localStorage["av_scores"]` sin que nadie lo lea).
- Realtime y Edge Functions — mencionados por el usuario como uso futuro, no se tocan en esta spec.
- Cliente con `SUPABASE_SERVICE_ROLE_KEY` (admin, salta RLS) — no hay caso de uso todavía.
- Cualquier cambio de comportamiento visible para el usuario final de la app.

## Data model

Esta spec no introduce tablas ni estructuras de datos persistentes — el schema `public` del proyecto Supabase está vacío (0 tablas) y sigue vacío al terminar esta spec.

Variables de entorno que se agregan:

```
# .env.local (valores reales)
NEXT_PUBLIC_SUPABASE_URL=https://iitjdgzcycdvbwbqtdnp.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key del proyecto, sb_publishable_...>

# .env.template (placeholders)
NEXT_PUBLIC_SUPABASE_URL=xxxxxxxxxx
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=xxxxxxxxxx
```

`SUPABASE_DB_PASSWORD` (ya existente en ambos archivos) no se usa en esta spec — queda reservada para conexión directa a Postgres (migraciones/CLI) en un spec futuro.

## Implementation plan

1. `npm install @supabase/supabase-js @supabase/ssr`.
2. Agregar `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` a `.env.local` con los valores reales del proyecto, y las mismas dos claves con placeholder `xxxxxxxxxx` a `.env.template`.
3. Crear `utils/supabase/client.ts`: exporta `createClient()` que llama `createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!)` de `@supabase/ssr`.
4. Crear `utils/supabase/server.ts`: exporta una función `async createClient()` que obtiene `await cookies()` de `next/headers` y llama `createServerClient(url, publishableKey, { cookies: { getAll, setAll } })`, con `setAll` envuelto en `try/catch` (patrón oficial, ya que `cookies().set` puede fallar en Server Components).
5. Correr `npm run build` para confirmar que ambos archivos compilan y tipan correctamente. No se crea ninguna ruta que llame a la API de Supabase en tiempo de ejecución.

## Acceptance criteria

- [ ] `npm run build` termina sin errores.
- [ ] `@supabase/supabase-js` y `@supabase/ssr` aparecen en `package.json`.
- [ ] `.env.local` contiene `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` con los valores reales del proyecto.
- [ ] `.env.template` contiene las mismas dos claves con valores placeholder, sin datos reales.
- [ ] No existe `proxy.ts` en la raíz ni ninguna ruta que llame a `supabase.auth.*`.
- [ ] No se crea ninguna tabla nueva en la base de datos del proyecto Supabase (`list_tables` sigue devolviendo 0 tablas en `public`).
- [ ] `login-form.tsx`, `user-context.tsx`, `game-player.tsx` y `hall-of-fame.tsx` no cambian de comportamiento — siguen usando `localStorage`/`seededScores()` tal cual.

## Decisions

- **Sí:** se crean `utils/supabase/client.ts` y `utils/supabase/server.ts` siguiendo el patrón oficial `@supabase/ssr` — decisión explícita del usuario, como base para specs futuros que sí consulten la base de datos.
- **Sí:** nombres de variables de entorno `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (la convención nueva de Supabase, `sb_publishable_...`) en vez del legacy `..._ANON_KEY` — decisión explícita del usuario durante la implementación (revierte la decisión original de esta spec, que había elegido el legacy anon key).
- **No:** `proxy.ts` — es una pieza de Auth (refresco de sesión) y el usuario no quiere nada de Auth todavía, ni siquiera temporal. Se agrega en el spec futuro de autenticación visual.
- **No:** ruta de verificación (`/api/supabase-check` o similar) — la versión anterior de esta spec la proponía usando `supabase.auth.getUser()`, pero eso es Auth; el usuario pidió explícitamente quitarla. La verificación de esta spec es solo que el build pase.
- **No:** cliente con `SUPABASE_SERVICE_ROLE_KEY` (admin) — no hay caso de uso todavía; se agrega en el spec que lo necesite (ej. Edge Functions).
- **No:** reemplazar `login-form.tsx`/`user-context.tsx` por auth real — spec futuro aparte.
- **No:** crear tablas (perfiles, puntajes) — se define en el spec que construya esa feature.
- **No:** Realtime ni Edge Functions — uso futuro mencionado por el usuario, no se implementan aquí.

## Risks

| Risk                                                                                                                                                                         | Mitigation                                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sin `proxy.ts` ni ruta de verificación, un error de configuración (env var mal escrita, key inválida) no se detecta hasta que un spec futuro haga la primera query real.     | Aceptado explícitamente por el usuario como parte del scope reducido de esta spec; el spec que agregue la primera query real deberá validar la conexión en ese momento. |
| `SUPABASE_DB_PASSWORD` ya está en `.env.local`/`.env.template` pero no se usa en esta spec — riesgo de que alguien asuma que ya hay conexión directa a Postgres configurada. | Documentado explícitamente en "Data model" que esa variable queda reservada para un spec futuro (migraciones/CLI).                                                      |

## What is **not** in this spec

- `proxy.ts` y cualquier refresco de sesión de Auth — spec futuro.
- Cualquier ruta de verificación que llame a `supabase.auth.*` — spec futuro.
- Autenticación visual real (reemplazar `login-form.tsx`/`user-context.tsx`) — spec futuro.
- Cualquier tabla de base de datos (perfiles, puntajes) o políticas de RLS — spec futuro.
- Persistencia real de puntajes del Salón de la Fama — spec futuro.
- Realtime y Edge Functions — uso futuro mencionado pero no implementado aquí.
- Cliente con service role key — spec futuro, cuando haga falta saltar RLS.

Cada uno de estos, si se necesita, va en su propio spec.
