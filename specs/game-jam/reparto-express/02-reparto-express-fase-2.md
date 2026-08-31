# SPEC — REPARTO EXPRESS (fase 2)

> **Status:** Draft
> **Depends on:** specs/game-jam/reparto-express/01-reparto-express-base.md
> **Date:** 2026-08-31
> **Objective:** Agregar tortugas hundibles, power-ups recolectables, patrones de carril nuevos y una curva de dificultad más agresiva sobre el REPARTO EXPRESS base, sin tocar su integración con la plataforma.

## Scope

**In:**

- Tortugas hundibles en los carriles de río: ciclan entre "flotando" (segura) y "hundida" (insegura) con aviso visual previo.
- Power-ups recolectables: escudo, ráfaga de velocidad, freeze de tráfico.
- Patrones de carril nuevos a partir de la oleada 4 (velocidades dispares en un mismo carril, carriles que invierten sentido periódicamente).
- Curva de dificultad más agresiva: el incremento de velocidad por oleada sube de `×1.15` a `×1.25` a partir de la oleada 6.
- Paquete dorado ocasional que duplica los puntos de esa entrega.
- Todo lo verificado en `01-reparto-express-base.md` sigue funcionando igual.

**Out of scope (para specs futuros):**

- Sonido.
- Controles táctiles/móviles.
- Modo cooperativo/versus, niveles con layout distinto al de la fase 1 (filas/columnas fijas), nuevos tipos de vehículo con sprites propios (imágenes externas).

## Data model

**No hay fila nueva en `games` ni tablas nuevas.** Todos los cambios viven dentro de `components/reparto-express-game.tsx` (estado interno del juego); no se toca `app/globals.css` ni `public/reparto-express/` porque esta fase no agrega cover ni assets externos — todo sigue dibujándose con primitivas de canvas. `game_id` en `scores` sigue siendo `"reparto-express"`, sin cambios de esquema.

Extensión del estado interno del componente (no exportado, no forma parte del contrato `RealGameHandle`/`RealGameProps`, que no cambia):

```ts
type Platform = {
  x: number;
  row: number;
  kind: "log" | "turtle";
  sinking?: boolean; // solo kind === "turtle"
  sinkTimer?: number; // solo kind === "turtle"
};

type PowerUp = {
  x: number;
  row: number;
  kind: "shield" | "boost" | "freeze";
};

let shieldActive = false;
let boostUntil = 0; // timestamp de juego hasta el que dura la ráfaga de velocidad
let freezeUntil = 0; // timestamp de juego hasta el que el tráfico/río están congelados
let goldenPackage = false;
```

## Implementation plan

Todos los pasos son cambios dentro de `components/reparto-express-game.tsx`; no hay pasos de plataforma, migración ni CSS.

1. **Tortugas hundibles**: de las plataformas de río, marcar un subconjunto como `kind: "turtle"` (visualmente distintas de los troncos, p. ej. tono verde vs. marrón). Cada tortuga cicla cada 4s entre `sinking: false` (segura) y `sinking: true` (insegura), con 1s de parpadeo de aviso antes de pasar a `sinking: true`. Si el jugador está sobre una tortuga con `sinking: true` al evaluar la colisión de la fila de río, pierde una vida igual que si no hubiera plataforma debajo.
2. **Power-ups**: spawnean con baja probabilidad (p. ej. 1 cada ~8s) en una celda libre de una fila segura (`1`, `2`, `6`, `10`) o sobre una plataforma de río. Se recogen al pisarlos:
   - `shield`: activa `shieldActive = true`. El siguiente choque/caída que hubiera costado una vida se absorbe (no baja `lives`, no resetea `combo`), y `shieldActive` vuelve a `false`.
   - `boost`: activa `boostUntil = now + 6000` — mientras esté activo, el cooldown entre hops del jugador se reduce (o se permite iniciar el siguiente hop antes), dando sensación de movimiento más ágil para esquivar.
   - `freeze`: activa `freezeUntil = now + 4000` — mientras esté activo, vehículos y plataformas no avanzan (`dx = 0` en el `update` de ambos), incluido el arrastre del jugador si está sobre una plataforma congelada.
3. **Patrones de carril nuevos** (activos desde `wave >= 4`): en cada nueva oleada a partir de la 4, sortear para 1 de los 6 carriles (3 tráfico + 3 río) uno de estos patrones en vez del patrón base uniforme: (a) dos velocidades intercaladas entre los vehículos/plataformas de ese carril, o (b) el carril invierte su sentido cada 8s. El patrón elegido se mantiene fijo durante toda la oleada.
4. **Curva de dificultad más agresiva**: el multiplicador de velocidad por oleada (definido en el spec base como `×1.15` cada 3 entregas) sube a `×1.25` cada 3 entregas a partir de `wave >= 6`.
5. **Paquete dorado**: cada 5 entregas exitosas, el paquete que recibe el jugador al reaparecer se marca `goldenPackage = true` (distinto visualmente, p. ej. tono amarillo/dorado en vez del ícono magenta base). Si esa entrega se completa, otorga `100 × combo × 2` en vez de `100 × combo`; si el jugador pierde una vida llevando el paquete dorado, se pierde igual que cualquier entrega en curso (no hay penalización extra, y el siguiente paquete vuelve a ser normal).
6. Verificar manualmente contra el checklist de "Acceptance criteria" de `01-reparto-express-base.md` que nada de lo anterior rompe el loop base (colisión de tráfico, arrastre en río, entrega/combo/oleada, pausa, fin de partida, guardado de score).
7. Correr `npm run build` para confirmar que todo compila y tipa.

## Acceptance criteria

- [ ] `npm run build` termina sin errores.
- [ ] Las tortugas alternan visualmente entre flotando/hundida, con un aviso previo perceptible antes de hundirse.
- [ ] Estar sobre una tortuga hundida hace perder una vida, igual que caer al agua sin plataforma.
- [ ] El power-up `shield` absorbe el siguiente choque o caída sin bajar `Vidas` ni resetear `Combo`, y se consume tras usarse una vez.
- [ ] El power-up `boost` hace notablemente más ágil el movimiento del jugador durante su duración, y deja de tener efecto al expirar.
- [ ] El power-up `freeze` detiene visiblemente todos los vehículos y plataformas (incluido el arrastre del jugador si está sobre una plataforma) durante su duración.
- [ ] A partir de la oleada 4, al menos un carril de tráfico o río muestra un patrón distinto al uniforme (velocidades intercaladas o inversión periódica de sentido).
- [ ] A partir de la oleada 6, el incremento de velocidad por oleada es perceptiblemente mayor que en oleadas 1–5.
- [ ] Cada 5 entregas, el paquete se muestra visualmente distinto (dorado) y su entrega otorga el doble de puntos (`100 × combo × 2`).
- [ ] Todo lo verificado en `01-reparto-express-base.md` (movimiento, colisión de tráfico, arrastre en río, entrega/combo/oleada base, pausa/reanudar, fin de partida, guardado de score en `scores`, HUD, SALIR sin listeners colgados) sigue funcionando igual después de esta fase.
- [ ] El resto de los juegos (decorativos y reales) siguen funcionando sin cambios.

## Decisions

- **Sí:** tortugas hundibles como mecánica de riesgo adicional sobre el río — decisión explícita del usuario, reservada desde el corte de fase 2 del spec base.
- **Sí:** tres power-ups (`shield`, `boost`, `freeze`) — decisión explícita del usuario.
- **Sí:** patrones de carril nuevos solo a partir de la oleada 4, y curva de dificultad más agresiva solo a partir de la oleada 6 — números concretos elegidos para no volver el juego injugable desde el inicio, consistente con el criterio de "piso jugable" ya usado en Snake (spec 09).
- **Sí:** paquete dorado cada 5 entregas con puntos duplicados, sin penalización extra si se pierde — decisión explícita del usuario, mantiene el mismo modelo de riesgo que un paquete normal.
- **No:** sonido, controles táctiles/móviles, modo cooperativo/versus, sprites externos — fuera de alcance, decisión explícita del usuario.

## Risks

| Risk                                                                                                                                       | Mitigation                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Acumular tortugas hundibles + patrones de carril nuevos + curva agresiva al mismo tiempo puede volver el juego injugable demasiado pronto. | Patrones nuevos y curva agresiva quedan con umbrales de oleada explícitos (`wave >= 4` y `wave >= 6`), no desde la oleada 1.                                            |
| El power-up `freeze` puede interactuar mal con el arrastre del jugador sobre una plataforma si no se congela también su `dx` de arrastre.  | El `update` de plataformas pone `dx = 0` mientras `freezeUntil` esté vigente, y el arrastre del jugador usa ese mismo `dx`, así que se congela junto con la plataforma. |
| El paquete dorado puede sentirse injusto si su ventana de doble puntos no es clara para quien juega.                                       | Se diferencia visualmente en todo momento mientras el jugador lo lleva (no hay temporizador oculto ni condición no visible).                                            |

## What is **not** in this spec

- Sonido.
- Controles táctiles/móviles.
- Modo cooperativo/versus.
- Niveles con layout distinto al de filas/columnas fijas del spec base.
- Vehículos/plataformas con sprites o imágenes externas (todo sigue siendo primitivas de canvas).

Cada uno de estos, si se necesita, va en su propio spec.
