---
name: add-game
description: Diseña el spec para agregar un juego real y jugable a Arcade Vault, con su fila en la tabla games, su leaderboard en scores y su componente de canvas. Portea juegos de references/started-games/ o define uno nuevo desde cero. No escribe código — produce specs/NN-slug.md listo para /spec-impl.
disable-model-invocation: true
argument-hint: "<carpeta de references/started-games o descripción del juego>"
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion, Bash(ls:*), Bash(date:*)
---

# /add-game — Diseñador de specs para juegos nuevos

## Session context

Fecha de hoy (para el header del spec, nunca la inventes):
!`date +%F`

Specs que ya existen (para el próximo número correlativo):
!`ls specs/ 2>/dev/null || echo "specs/ no existe todavía"`

Juegos disponibles para portear en references/started-games/:
!`ls references/started-games/ 2>/dev/null || echo "references/started-games/ no existe"`

¿El registry de juegos reales ya existe?
!`ls components/games/registry.ts 2>/dev/null || echo "components/games/registry.ts NO existe todavía — el spec debe incluir el paso de refactor"`

---

Esta skill **no escribe código**. Su único producto es `specs/NN-slug.md`, listo para que `/spec-impl` lo implemente. Es una especialización de `/spec` para un caso muy concreto y repetido: agregar un juego jugable de verdad a Arcade Vault, con su fila en `games`, su leaderboard en `scores`, y su componente de canvas.

Antes de seguir, lee los tres archivos de `references/` en esta misma carpeta:

- **`references/platform-contract.md`** — el contrato actual de la plataforma: esquema SQL de `games`/`scores`, por qué las rutas ya son genéricas, los puntos de integración de `game-player.tsx`, el estado objetivo del registry de juegos reales y del HUD flexible, los tokens de color/cover CSS.
- **`references/porting-guide.md`** — cómo portar un `game.js` vanilla de `references/started-games/` a un Client Component de React, con la plantilla completa basada en `components/asteroids-game.tsx`, y la lista de trampas conocidas (aspect ratio, canvas secundarios, acoplamiento al DOM, assets, mouse sobre canvas estirado).
- **`references/spec-skeleton.md`** — el esqueleto literal del spec a rellenar en la Fase 4.

**Restricción central: el spec que produzcas debe ser autosuficiente.** Quien ejecute `/spec-impl` no tiene esta skill cargada — no va a leer `references/`. Todo el SQL, el contrato TypeScript, el snippet del registry y el CSS del cover tienen que quedar **copiados literalmente dentro del spec**, no descritos ni referenciados por nombre de archivo de la skill.

Tus respuestas deben estar en el mismo idioma del prompt inicial (normalmente español, como el resto de specs del repo).

## Fase 1 — Identificar el origen del juego

Mira `$ARGUMENTS`:

**A) Es (o contiene) el nombre de una carpeta de `references/started-games/`** listada en el session context (hoy: `02-asteroids` ya portado, `03-tetris`, `04-arkanoid`) — o el usuario menciona "tetris"/"arkanoid" explícitamente.

Lee completos: `index.html`, `game.js`, y cualquier archivo que estos carguen (`levels.js`, `assets/spritesheet.js`, etc.), más `README.md`/`CLAUDE.md` de esa carpeta si existen.

Con eso, produce una **auditoría de porteo** (usa la tabla de `references/porting-guide.md` como checklist) que cubra explícitamente:

- Tamaño y aspect ratio del canvas original vs. el `4/3` de `.crt-screen` (`app/globals.css`).
- Si hay un segundo `<canvas>` (p. ej. "next piece").
- Qué está acoplado al DOM (`getElementById` de HUD, overlays, botón de restart, toggles de tema) — todo eso lo reemplaza React.
- Si depende de globals cargados por `<script>` separados sin exports (ej. Arkanoid con `LEVELS`/`SPRITES`).
- Si trae assets (`.png`, `.mp3`) que necesitan moverse a `public/`.
- Si hay audio, y si se conserva o se descarta.
- Qué estados de juego tiene (¿hay algo más que `playing`/`paused`/`gameover`, como `'win'`?).
- Qué stats reales expone para el HUD (score, vidas, líneas, nivel, ...).
- Qué teclas o eventos de mouse usa, y si el mouse necesita `getBoundingClientRect()` por vivir en un canvas estirado por CSS.
- Qué dibujo hay que recortar del `draw()` original (HUD, overlays de fin/pausa, reinicio con tecla).

Muestra esta auditoría al usuario antes de pasar a la Fase 2 — es la base de varias preguntas.

**B) Es un juego nuevo, sin código de referencia.** No hay auditoría; en la Fase 2 se pregunta directamente mecánica, controles, condición de fin de partida y qué stats mostrar.

## Fase 2 — Clarificar (nunca saltable)

Pregunta en bloques de 3 a 5, usando `AskUserQuestion` cuando la pregunta tenga opciones concretas. Espera respuesta entre bloques. Como mínimo debes cerrar:

1. **Fila de `games`**: `id` (kebab-case, minúsculas — es la PK y va a ser el `game_id` de cada fila de `scores`), `title`, `short`, `long`, `cat` (debe ser `ARCADE`, `PUZZLE`, `SHOOTER` o `VERSUS`; si el usuario quiere una categoría nueva, avisa que eso también cambia `CATS` en `app/data/games.ts`), `color` (`cyan`, `magenta`, `yellow` o `green` — recuerda que `.btn` no tiene variantes para `cyan`/`green`, ver `platform-contract.md`), `best` y `plays` (valores decorativos iniciales, igual que los 9 juegos existentes).
2. **Cover**: ¿reusa una de las 8 clases `.cover-*` ya existentes en `app/globals.css`, o necesita una nueva `.cover-<slug>`? Si es nueva, qué paleta/forma (la respuesta alimenta el CSS del paso de implementación).
3. **HUD**: qué `slots` declara el juego además de Puntuación (p. ej. Vidas+Nivel, o Líneas+Nivel).
4. **Canvas**: resolución lógica del juego. Si no es 4:3, cómo se resuelve (letterbox, recorte, o forzar el canvas a 4:3 reescalando la lógica).
5. Si viene de `references/started-games/`: confirmar la lista de recortes/assets de la auditoría de la Fase 1.
6. **Fuera de alcance**: táctil/móvil, sonido, dificultad progresiva, cualquier cosa que el usuario mencione de pasada y que merezca su propio spec — señálalo y pregunta si queda fuera.

Deja de preguntar solo cuando puedas responder sin inventar nada: qué archivos van a cambiar, cuál es el primer y el último paso ejecutable, y cómo se verifica que el juego quedó funcionando.

## Fase 3 — Detectar el estado de la plataforma

Usa el session context y, si hace falta, Grep/Glob para confirmar:

- ¿Existe `components/games/registry.ts`? Si no, el plan de implementación **debe empezar** con el paso de crearlo y migrar `components/game-player.tsx` (ver `platform-contract.md` para el snippet exacto y los 6 puntos de integración que hoy dependen de `isAsteroids`).
- Si el registry ya existe: ¿su contrato usa `slots` para el HUD? Si `components/asteroids-game.tsx` (o el registry) todavía no emite `slots`, el plan también debe incluir esa migración, una sola vez.
- ¿La clase de cover elegida en la Fase 2 ya existe en `app/globals.css`? Si sí, el paso de CSS se reduce a "reusar `.cover-x`, sin cambios".

Estos pasos de refactor de plataforma solo aparecen la primera vez. En specs posteriores (segundo, tercer juego...) el registry y el HUD flexible ya existen, y el plan se reduce a agregar una fila al registry.

## Fase 4 — Escribir `specs/NN-<slug>.md`

Sigue el esqueleto de `references/spec-skeleton.md`, en español con las etiquetas de sección en inglés (mismo estilo que los specs 05/06 ya en el repo). Header:

```
> **Status:** Draft
> **Depends on:** SPEC 05, SPEC 06
> **Date:** <fecha del session context>
> **Objective:** <una sola frase>
```

El plan de implementación sigue este orden canónico (omite los pasos de refactor de plataforma si la Fase 3 confirmó que ya están hechos):

1. _(solo la primera vez)_ Crear `components/games/registry.ts` y migrar `game-player.tsx` de `isAsteroids` al registry — snippet completo copiado de `platform-contract.md`.
2. _(solo la primera vez)_ HUD flexible con `slots` — cambios exactos en el contrato y en `game-player.tsx`.
3. Migración Supabase `add_game_<slug>` — el `INSERT` en `games` **escrito literal**, con los valores acordados en la Fase 2.
4. CSS del cover en `app/globals.css` — la clase completa, o la nota de que se reusa una existente.
5. Mover assets a `public/<slug>/` (solo si aplica).
6. `components/<slug>-game.tsx` — el bloque de contrato TypeScript completo (`Handle`/`Props`) y la lista numerada de qué portar y qué recortar, tomando `porting-guide.md` como plantilla.
7. Una línea nueva en `REAL_GAMES` del registry.
8. `npm run build` (agrega `npx next typegen` solo si el paso tocó rutas).

Acceptance criteria como checklist booleano — build limpio, la card aparece en `/games` y en `/` (si entra en el `limit(6)`), `/juegos/<id>` y `/juegos/<id>/jugar` funcionan, controles responden sin scrollear la página, pausa/reanudar/fin/reinicio funcionan, guardar una puntuación inserta en `scores` con el `game_id` correcto y aparece en el aside de mejores puntuaciones y en `/salon-de-la-fama`, salir del juego no deja listeners ni loops colgando, y los demás juegos siguen intactos.

Decisions y Risks: documenta explícitamente qué se recortó del juego original (si venía de `references/`) y por qué, igual que hizo spec 05 con Asteroids.

## Fase 5 — Confirmar y parar

Anuncia la ruta del archivo creado, recuerda que queda en `Draft` y que hay que aprobarlo a mano, e indica que el siguiente paso es `/spec-impl NN-<slug>`. **No ofrezcas implementarlo ni escribas código** — tu trabajo termina en la confirmación.

## Reglas duras

- Nunca escribas código fuera del propio `specs/NN-slug.md`.
- Nunca marques el spec como `Approved` — eso lo hace el usuario después de releerlo.
- Nunca asumas valores de la Fase 2 que el usuario no confirmó (id, cat, color, slots, resolución del canvas).
- El spec debe ser legible y ejecutable sin volver a invocar esta skill: todo el SQL, TypeScript y CSS necesarios van copiados dentro, no resumidos.
