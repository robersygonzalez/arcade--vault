# Esqueleto de spec para un juego nuevo

Rellena todos los `<marcadores>` con los valores confirmados en la Fase 2. No dejes ningún marcador sin resolver en el archivo final. Este esqueleto sigue el formato de `.claude/skills/spec/template.md` y el precedente real de `specs/05-juego-asteroides-real.md`.

````markdown
# SPEC <NN> — <Título del juego>

> **Status:** Draft
> **Depends on:** SPEC 05, SPEC 06
> **Date:** <fecha del session context>
> **Objective:** <una sola frase — qué juego se agrega y cómo se integra>

## Scope

**In:**

- Agregar la fila `<slug>` a la tabla `games` en Supabase (título "<TÍTULO>", categoría `<CAT>`, cover `<cover-clase>`, color `<color>`).
- Crear `components/<slug>-game.tsx`: portar/implementar la lógica del juego a un Client Component de TypeScript con canvas propio.
- <Si aplica> Crear `components/games/registry.ts` y migrar `components/game-player.tsx` de `isAsteroides` al registry de juegos reales.
- <Si aplica> Migrar el contrato de stats a `slots` flexibles en el HUD.
- Conectar los botones existentes de `game-player.tsx` (PAUSA/REANUDAR, FIN, JUGAR DE NUEVO, SALIR) al juego real vía el ref expuesto.
- HUD de React sincronizado con el estado real del juego mediante `onStatsChange`.
- El modal "FIN DEL JUEGO" y el guardado en `scores` (ya existentes) se disparan tanto al perder como al presionar FIN.

**Out of scope (para specs futuros):**

- <lo que el usuario descartó explícitamente en la Fase 2: táctil/móvil, sonido, dificultad progresiva, etc.>

## Data model

Nueva fila en `games` (SQL literal a aplicar con `mcp__supabase__apply_migration`, migración `add_game_<slug>`):

```sql
insert into public.games (id, title, short, long, cat, cover, color, best, plays) values
  ('<slug>', '<TÍTULO>', '<short>', '<long>', '<CAT>', '<cover-clase>', '<color>', <best>, '<plays>');
```

No se agregan estructuras de persistencia nuevas: sigue usando la tabla `scores` ya existente (`game_id`, `name`, `score`, `created_at`), ahora con `game_id: "<slug>"`.

Contrato del nuevo componente (`components/<slug>-game.tsx`):

```ts
export type <Slug>GameHandle = {
  togglePause: () => void;
  forceGameOver: () => void;
  restart: () => void;
};

type <Slug>GameProps = {
  onStatsChange: (stats: { score: number; slots: { label: string; value: string }[] }) => void;
  onGameOver: (finalScore: number) => void;
};
```

Componente `forwardRef<<Slug>GameHandle, <Slug>GameProps>`. Slots del HUD: <lista de slots acordada, p. ej. "Vidas" y "Nivel", o "Líneas" y "Nivel">.

<Si el registry ya existe, reemplaza el bloque de tipos anterior por una referencia a `RealGameHandle`/`RealGameProps` de `components/games/registry.ts` y omite redefinirlos.>

## Implementation plan

<Numera solo los pasos que apliquen; omite los de refactor de plataforma si ya están hechos>

1. <Si el registry no existe> Crear `components/games/registry.ts` con los tipos `HudSlot`/`GameStats`/`RealGameHandle`/`RealGameProps` y el mapa `REAL_GAMES`; migrar `components/game-player.tsx` en sus 6 puntos de integración (los dos `useEffect` decorativos, `togglePause`, `endGame`, `restart`, el render) de `isAsteroides` a `REAL_GAMES[game.id]`.
2. <Si el HUD todavía no usa slots> Cambiar el contrato de `onStatsChange` a `{ score, slots }`; actualizar el HUD de `game-player.tsx` para renderizar `slots` dinámicamente; adaptar `components/asteroids-game.tsx` para emitir sus slots (`Vidas`, `Nivel`).
3. Escribir y aplicar la migración `add_game_<slug>` con el `INSERT` de la sección "Data model".
4. <Si el cover es nuevo> Agregar `.cover-<slug>` (+ `::after`/`::before` si aplica) a `app/globals.css`, después de la sección de covers existente. <Si se reusa un cover existente, decir cuál y que no hace falta CSS nuevo.>
5. <Solo si el juego trae assets> Mover `<lista de assets>` a `public/<slug>/` y actualizar las rutas de carga.
6. Crear `components/<slug>-game.tsx`: <resumen de 2-4 líneas de qué se portea o implementa, y qué se recorta del original si viene de `references/started-games/` — HUD en canvas, overlays de fin/pausa, reinicio con tecla, botones dibujados en canvas>.
7. Agregar `<slug>: <Slug>Game` a `REAL_GAMES` en `components/games/registry.ts` (con su import).
8. Correr `npm run build` para confirmar que todo compila y tipa<; correr `npx next typegen` si el paso 1 o algún otro tocó rutas>.

## Acceptance criteria

- [ ] `npm run build` termina sin errores.
- [ ] La fila `<slug>` aparece en `/games` con los datos correctos (título, cover, categoría).
- [ ] `/juegos/<slug>` muestra el detalle correcto y no revienta con `notFound()`.
- [ ] `/juegos/<slug>/jugar` carga el canvas real del juego con el HUD de React sincronizado (Puntuación + <slots acordados>).
- [ ] <Controles del juego> responden correctamente y ninguna tecla de control scrollea la página.
- [ ] PAUSA congela el juego (nada se mueve); REANUDAR lo continúa exactamente donde quedó.
- [ ] FIN fuerza el fin de partida y abre el modal "FIN DEL JUEGO" con la puntuación real.
- [ ] <Si aplica: quedarse sin vidas / condición de derrota> también abre el mismo modal automáticamente.
- [ ] Guardar la puntuación desde el modal inserta una fila en `scores` con `game_id: "<slug>"` (verificable con una query a la tabla).
- [ ] El aside "MEJORES PUNTUACIONES" de `/juegos/<slug>` y las tabs de `/salon-de-la-fama` muestran esa puntuación tras guardarla.
- [ ] "JUGAR DE NUEVO" reinicia el juego real desde cero dentro de la misma pantalla.
- [ ] "SALIR" navega a `/juegos/<slug>` sin dejar el loop corriendo ni listeners activos (sin warnings de React en consola).
- [ ] El resto de los juegos (decorativos y reales) siguen funcionando sin cambios.

## Decisions

- **Sí:** <decisiones explícitas del usuario tomadas en la Fase 2 — id/cat/color/cover, qué se recorta del original, qué slots usa el HUD, cómo se resuelve el aspect ratio>.
- **No:** <lo marcado fuera de alcance — mismo contenido que "Out of scope">.

## Risks

| Risk                                                                                               | Mitigation                     |
| -------------------------------------------------------------------------------------------------- | ------------------------------ |
| <riesgo específico de este porteo, p. ej. aspect ratio no-4:3, canvas secundario, assets externos> | <mitigación concreta acordada> |

## What is **not** in this spec

- <repetir la lista de "Out of scope">

Cada uno de estos, si se necesita, va en su propio spec.
````
