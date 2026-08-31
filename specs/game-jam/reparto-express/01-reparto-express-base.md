# SPEC — REPARTO EXPRESS (base)

> **Status:** Draft
> **Depends on:** SPEC 05, SPEC 06
> **Date:** 2026-08-31
> **Objective:** Agregar REPARTO EXPRESS como juego real y jugable (`reparto-express`) en Arcade Vault: cruzar carriles de tráfico y un río saltando entre troncos/tortugas para entregar paquetes, con combo y oleadas crecientes, integrado al registry de juegos reales ya existente (`components/games/registry.ts`).

Origen: pista `game-jam` a partir del tema "cruzar carriles de tráfico y un río saltando obstáculos, típico Frogger". El concepto Frogger clásico y su equivalente `RANARIA` ya están registrados como **Pendientes** en `references/game-suggestions-todo.md` (misma mecánica de "llegar arriba y listo"), así que este juego se diferencia deliberadamente con un **loop de recolección/entrega** (recoger paquete abajo → cruzar → entregar arriba → reaparecer abajo con paquete nuevo, sin caminar de regreso) y un sistema de **combo + oleadas** que no tienen ni FROGGER ni RANARIA en su descripción registrada. `id: reparto-express` es nuevo, no reutiliza ni `frogger` ni `ranaria`.

## Scope

**In:**

- Agregar la fila `reparto-express` a la tabla `games` en Supabase (título "REPARTO EXPRESS", categoría `ARCADE`, cover `cover-reparto` nueva, color `magenta`).
- Crear la clase CSS nueva `.cover-reparto` en `app/globals.css`.
- Crear `components/reparto-express-game.tsx`: implementación completa del juego en un Client Component con canvas propio (800×600, sin sprites externos — todo dibujado con formas de canvas), usando el contrato `RealGameHandle`/`RealGameProps`/`HudSlot`/`GameStats` que ya expone `components/games/registry.ts` (no se tocan esos tipos, no hace falta migrar nada de plataforma — el registry y el HUD por `slots` ya existen desde SPEC 07).
- Agregar `reparto-express: RepartoExpressGame` a `REAL_GAMES` en `components/games/registry.ts` (una línea + import).
- HUD sincronizado vía `onStatsChange` con slots `Vidas`, `Combo` y `Oleada`, además de `Puntuación`.
- Conectar los botones existentes de `game-player.tsx` (PAUSA/REANUDAR, FIN, JUGAR DE NUEVO, SALIR) al juego real vía el ref expuesto — `game-player.tsx` ya es genérico desde SPEC 07/08, no requiere cambios.
- Mecánica base: tráfico de 3 carriles + río de 3 carriles con troncos/tortugas que se comportan igual (sin hundimiento), loop de entrega con combo, oleadas que aceleran el tráfico y el río, 3 vidas.

**Out of scope (para spec de fase 2 y specs futuros):**

- Tortugas que se hunden periódicamente (mecánica de timing extra sobre el río).
- Power-ups (escudo, ráfaga de velocidad, freeze de tráfico).
- Patrones de carril nuevos por oleada (velocidades dispares en un mismo carril, cambios de sentido, camiones anchos).
- Curva de dificultad más agresiva más allá del incremento lineal simple definido en este spec.
- Paquete dorado / bonus de puntos especiales.
- Sonido.
- Controles táctiles/móviles.

## Data model

Nueva fila en `games` (SQL literal a aplicar con `mcp__supabase__apply_migration`, migración `add_game_reparto_express`):

```sql
insert into public.games (id, title, short, long, cat, cover, color, best, plays) values
  ('reparto-express', 'REPARTO EXPRESS', 'Cruza tráfico y río a contrarreloj para entregar cada paquete.', 'Recoge un paquete, cruza carriles de tráfico y un río saltando entre troncos y tortugas, y entrégalo al otro lado antes de que se acabe el tiempo. Cada entrega sin morir suma combo; el tráfico se acelera con cada oleada.', 'ARCADE', 'cover-reparto', 'magenta', 14200, '9.8K');
```

No se agregan estructuras de persistencia nuevas: sigue usando la tabla `scores` ya existente (`game_id`, `name`, `score`, `created_at`), ahora con `game_id: "reparto-express"`. RLS ya cubre `games`/`scores` desde SPEC 06 — no se toca.

Contrato del nuevo componente (`components/reparto-express-game.tsx`) — reutiliza los tipos ya existentes del registry, no se redefinen:

```ts
import type { RealGameHandle, RealGameProps } from "@/components/games/registry";
```

Slots del HUD emitidos en `onStatsChange`:

```ts
onStatsChangeRef.current({
  score,
  slots: [
    { label: "Vidas", value: "♥ ".repeat(lives).trim() || "—" },
    { label: "Combo", value: "×" + combo },
    { label: "Oleada", value: String(wave).padStart(2, "0") },
  ],
});
```

## Implementation plan

No hace falta ningún paso de refactor de plataforma: el registry de juegos reales y el HUD por `slots` ya existen desde SPEC 07/08 (`reparto-express` es el quinto juego real).

1. Escribir y aplicar la migración `add_game_reparto_express` con el `INSERT` de la sección "Data model" (`mcp__supabase__apply_migration`).
2. Agregar la clase `.cover-reparto` a `app/globals.css`, después de la sección de covers existente (`.cover-bricks`, `.cover-tetro`, `.cover-snake`, `.cover-glot`, `.cover-invaders`, `.cover-rocas`, `.cover-rana`, `.cover-duelo`, `.cover-frutal`):

   ```css
   .cover-reparto {
     background: linear-gradient(180deg, #1a1a2a 0%, #001f2a 100%);
   }
   .cover-reparto::after {
     content: "";
     position: absolute;
     inset: 0;
     background:
       repeating-linear-gradient(0deg, rgba(245, 255, 255, 0.15) 0 3px, transparent 3px 22px) 50%
         30% / 4px 60% no-repeat,
       radial-gradient(circle at 25% 78%, var(--cyan) 0 3px, transparent 4px),
       radial-gradient(circle at 45% 82%, var(--cyan) 0 3px, transparent 4px),
       radial-gradient(circle at 65% 76%, var(--cyan) 0 3px, transparent 4px),
       radial-gradient(circle at 85% 80%, var(--cyan) 0 3px, transparent 4px);
     filter: drop-shadow(0 0 6px rgba(255, 0, 110, 0.4));
   }
   .cover-reparto::before {
     content: "◆";
     position: absolute;
     left: 47%;
     top: 38%;
     color: var(--magenta);
     font-size: 26px;
     text-shadow: 0 0 8px var(--magenta);
   }
   ```

3. No hay assets externos que mover — todo el juego se dibuja con primitivas de canvas (`fillRect`/`arc`/paths), sin imágenes ni spritesheets.
4. Crear `components/reparto-express-game.tsx` siguiendo la estructura de 16 puntos usada en Asteroids/Tetris/Arkanoid/Snake (`forwardRef<RealGameHandle, RealGameProps>`, refs de callbacks, `useImperativeHandle` con deps vacías, un único `useEffect` con todo el juego, cleanup de `requestAnimationFrame` y listeners), con las siguientes particularidades:

   - **Grid**: 20 columnas × 15 filas de 40px → canvas lógico 800×600 (4:3 exacto, se estira `width: "100%", height: "100%"` sin deformarse ni letterbox, mismo tamaño lógico que Asteroids/Snake).
   - **Filas** (de arriba `0` a abajo `14`):
     - `0`: skyline decorativa, no jugable.
     - `1`: **zona de entrega** (segura) — llegar aquí con el paquete completa la entrega.
     - `2`: mediana segura (franja de pasto decorativa).
     - `3`–`5`: **río**, 3 carriles con troncos/tortugas (sin hundimiento en esta fase — se comportan igual, solo cambia el sprite).
     - `6`: mediana segura (franja de pasto decorativa).
     - `7`–`9`: **tráfico**, 3 carriles con autos.
     - `10`: **zona de inicio/recogida** (segura) — el repartidor arranca aquí con un paquete nuevo.
     - `11`–`14`: acera decorativa, no jugable.
   - Movimiento del jugador limitado a filas `1`–`10` y columnas `0`–`19` (clamp en los bordes, no wrap).
   - **Estado inicial**: jugador en fila 10, columna 10 (centrado), con un paquete. 3 vidas, combo `1`, oleada `1`, score `0`.
   - **Input**: flechas y WASD mapeadas a las 4 direcciones, con `e.preventDefault()` en esos códigos. Cada pulsación mueve al jugador **una celda** en esa dirección (grid-hop discreto por flanco de bajada, patrón `pressed(code)`/`justPressed` de la guía de porteo — no movimiento continuo ni repetición al mantener presionada la tecla). `Espacio` alterna pausa vía el ref (no se lee dentro del loop del juego).
   - **Vehículos (filas 7–9)**: rects de 80×32px, 3 por carril, espaciados ~200px, con wrap-around horizontal (reaparecen del lado opuesto al salir del canvas). Velocidades base: fila 7 = 110px/s (izquierda), fila 8 = 140px/s (derecha), fila 9 = 100px/s (izquierda). Colisión: si el rect de la celda del jugador (40×40 alineado a grid) se solapa con el rect de un vehículo, pierde una vida.
   - **Plataformas de río (filas 3–5)**: rects de 120×32px, 3 por carril, espaciados ~150px dejando huecos de agua, con wrap-around horizontal. Velocidades base: fila 3 = 70px/s (derecha), fila 4 = 90px/s (izquierda), fila 5 = 70px/s (derecha). Mientras el jugador está parado en una fila de río, cada frame se comprueba si su celda se solapa con una plataforma: si sí, su posición `x` en píxeles se desplaza junto con la plataforma (arrastre continuo) hasta que el jugador salte a otra fila (entonces su nueva columna se calcula redondeando su `x` actual al múltiplo de 40 más cercano); si no se solapa con ninguna plataforma, pierde una vida de inmediato (cae al agua). Si el arrastre saca al jugador fuera de `x: 0–760`, también pierde una vida (barrido fuera del canvas).
   - **Entrega y combo**: al llegar a la fila `1` (cualquier columna), se suma `100 × combo` al score, `combo` sube en `1`, y el jugador reaparece de inmediato en fila 10 columna 10 con un paquete nuevo (sin caminar de regreso). Cada 3 entregas, `wave` sube en `1` y todas las velocidades (vehículos y plataformas) se multiplican por `×1.15` respecto a su valor base acumulado.
   - **Pérdida de vida**: al chocar con un vehículo, caer al agua, o ser arrastrado fuera del canvas, `lives` baja en `1`, `combo` vuelve a `1`, y el jugador reaparece en fila 10 columna 10 con un paquete nuevo. Si `lives` llega a `0`, `state = "gameover"`.
   - **`draw()`**: dibuja fondo por franjas de fila (asfalto/río/seguro), vehículos y plataformas como rects de color, jugador como una forma simple distinguible (p. ej. triángulo o rect con acento magenta) con un ícono de paquete cuando lo lleva. No dibuja HUD (score/vidas/combo/oleada) ni overlays de pausa/fin — eso ya lo resuelve `game-player.tsx`.
   - **Acciones expuestas**: `togglePause` (congela `update`, `draw()` sigue corriendo), `forceGameOver` (fuerza `state = "gameover"`), `restart` (reinicializa jugador, vehículos, plataformas, score, vidas, combo, oleada, `paused`, `gameOverFired`).

5. Agregar `reparto-express: RepartoExpressGame` a `REAL_GAMES` en `components/games/registry.ts`, con su import `import RepartoExpressGame from "@/components/reparto-express-game";`.
6. Correr `npm run build` para confirmar que todo compila y tipa. No hace falta `npx next typegen` (no se tocan rutas).

## Acceptance criteria

- [ ] `npm run build` termina sin errores.
- [ ] La fila `reparto-express` aparece en `/games` con cover `cover-reparto`, categoría ARCADE, color magenta.
- [ ] `/juegos/reparto-express` muestra el detalle correcto y no revienta con `notFound()`.
- [ ] `/juegos/reparto-express/jugar` carga el canvas real del juego con el HUD de React sincronizado (Puntuación + Vidas + Combo + Oleada).
- [ ] Flechas y WASD mueven al jugador una celda por pulsación; ninguna tecla de control scrollea la página.
- [ ] Cruzar un carril de tráfico y chocar con un vehículo hace perder una vida y respawnea al jugador en la zona de inicio.
- [ ] Pararse en el río sobre un tronco/tortuga arrastra al jugador junto con la plataforma; quedar sin plataforma debajo (o ser arrastrado fuera del canvas) hace perder una vida.
- [ ] Llegar a la zona de entrega suma `100 × combo` puntos, sube el combo, y respawnea al jugador de inmediato en la zona de inicio con un paquete nuevo (sin tener que caminar de regreso).
- [ ] Cada 3 entregas sube la `Oleada` y el tráfico/río se mueven visiblemente más rápido.
- [ ] Perder una vida resetea el `Combo` a `×1`.
- [ ] Quedarse sin vidas (0) termina la partida y abre el modal "FIN DEL JUEGO" con la puntuación real.
- [ ] PAUSA congela el juego (nada se mueve, incluidos vehículos y plataformas); REANUDAR lo continúa exactamente donde quedó.
- [ ] FIN fuerza el fin de partida y abre el modal "FIN DEL JUEGO".
- [ ] Guardar la puntuación desde el modal inserta una fila en `scores` con `game_id: "reparto-express"` (verificable con una query a la tabla).
- [ ] El aside "MEJORES PUNTUACIONES" de `/juegos/reparto-express` y las tabs de `/salon-de-la-fama` muestran esa puntuación tras guardarla.
- [ ] "JUGAR DE NUEVO" reinicia el juego real desde cero dentro de la misma pantalla (vidas, combo, oleada y score vuelven a su estado inicial).
- [ ] "SALIR" navega a `/juegos/reparto-express` sin dejar el loop corriendo ni listeners activos (sin warnings de React en consola).
- [ ] El resto de los juegos (decorativos y reales, incluida `ranaria`) siguen funcionando sin cambios.

## Decisions

- **Sí:** `id: "reparto-express"` — decisión explícita del usuario, elegido justamente para no chocar con `frogger` (Pendiente en `game-suggestions-todo.md`) ni con `ranaria` (fila decorativa ya existente en `games`).
- **Sí:** mecánica de fusión "cruce + recolección/entrega con combo y oleadas" en vez del Frogger clásico de "llegar arriba y listo" — decisión explícita del usuario tras validar la propuesta de fusión (opción A, "REPARTO EXPRESS"), para diferenciarse de la mecánica ya registrada en `FROGGER` y `RANARIA` (Pendientes).
- **Sí:** `cat: "ARCADE"`, `color: "magenta"` — decisiones explícitas del usuario. `magenta` tiene variante de botón (`.btn.magenta`) en `app/globals.css`, a diferencia de `cyan`/`green` (ya sobrecargados en el catálogo).
- **Sí:** `best: 14200`, `plays: "9.8K"` — valores decorativos explícitos del usuario, en el rango medio-bajo de los juegos ARCADE existentes.
- **Sí:** cover nueva `.cover-reparto` (gradiente asfalto→río, carriles con línea discontinua, ondas de río en cian, paquete en magenta) — decisión explícita del usuario, evita reusar `.cover-rana` (reservada para `ranaria`).
- **Sí:** slots del HUD = `Vidas`, `Combo`, `Oleada` — decisión explícita del usuario.
- **Sí:** grilla nativa 800×600 (20×15 celdas de 40px), 4:3 exacto, sin letterbox — decisión explícita del usuario, mismo canvas lógico que Asteroids/Snake.
- **Sí:** controles flechas + WASD, movimiento grid-hop de una celda por pulsación — decisión explícita del usuario.
- **Sí:** pausa con `Espacio` — decisión explícita del usuario.
- **Sí:** loop de entrega con respawn automático abajo (sin caminar de regreso) — decisión explícita del usuario.
- **Sí:** 3 vidas iniciales — decisión explícita del usuario.
- **Sí:** tortugas y troncos se comportan igual en esta fase (sin hundimiento) — decisión explícita del usuario, reservado para la fase 2.
- **No:** sonido, controles táctiles/móviles, tortugas hundibles, power-ups, patrones de carril nuevos, curva de dificultad agresiva, paquete dorado — fuera de alcance, decisión explícita del usuario, reservado para `02-reparto-express-fase-2.md`.

## Risks

| Risk                                                                                                                                                                                    | Mitigation                                                                                                                                                                                 |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Que el loop de entrega/combo no se perciba lo bastante distinto del Frogger clásico ya registrado como Pendiente (`FROGGER`/`RANARIA`), quedando en un clon con otro nombre.            | Combo, oleada y respawn instantáneo con paquete nuevo quedan visibles en el HUD todo el tiempo; el spec de fase 2 profundiza aún más la diferenciación (power-ups, tortugas hundibles).    |
| Combinar movimiento grid-discreto del jugador con movimiento continuo en píxeles de autos/troncos puede producir colisiones imprecisas si no se usan los mismos rects para ambos casos. | Todas las comprobaciones de colisión (auto y plataforma) usan el rect de 40×40 de la celda actual del jugador contra el rect real del vehículo/plataforma, sin mezclar unidades.           |
| El arrastre sobre troncos puede sacar al jugador fuera del canvas sin que sea obvio para quien juega por qué perdió una vida.                                                           | Se trata igual que "caer al agua" (mismo feedback visual), y el límite de arrastre (`x: 0–760`) es el mismo rango que el movimiento normal del jugador.                                    |
| Cover nueva `.cover-reparto` sin verificación visual previa contra el resto del catálogo.                                                                                               | Reutiliza los mismos tokens de color (`var(--cyan)`, `var(--magenta)`) y la misma técnica de capas (`::after`/`::before`) que las covers ya existentes, para mantener consistencia visual. |

## What is **not** in this spec

- Tortugas que se hunden periódicamente.
- Power-ups (escudo, ráfaga de velocidad, freeze de tráfico).
- Patrones de carril nuevos por oleada (velocidades dispares, cambios de sentido, camiones).
- Curva de dificultad más agresiva más allá del incremento lineal simple.
- Paquete dorado / bonus de puntos especiales.
- Sonido.
- Controles táctiles/móviles.

Cada uno de estos, si se necesita, va en su propio spec (el primero, `02-reparto-express-fase-2.md`, ya cubre varios).
