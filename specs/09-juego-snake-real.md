# SPEC 09 — Snake real y jugable

> **Status:** Aprobado
> **Depends on:** SPEC 05, SPEC 06
> **Date:** 2026-08-29
> **Objective:** Implementar Snake como juego real y jugable (`snake`) en Arcade Vault, con su fila en `games`, su leaderboard en `scores`, sprites de frutas propios, y su entrada en el registry de juegos reales ya existente (`components/games/registry.ts`).

## Scope

**In:**

- Agregar la fila `snake` a la tabla `games` en Supabase (título "SNAKE", categoría `ARCADE`, cover `cover-frutal` nueva, color `green`), como entrada **nueva y separada** de la decorativa `serpentina` (que sigue existiendo sin cambios, con su cover `cover-snake`) — mismo patrón que `asteroides`/`rocas`, `tetris`/`caída` y `arkanoid`/`bloque-buster`.
- Crear la clase CSS nueva `.cover-frutal` en `app/globals.css`, inspirada en la paleta de `fruits.png`.
- Mover `references/source-assets/snake-assets/fruits.png` a `public/snake/fruits.png`.
- Portear las coordenadas de `references/source-assets/snake-assets/sprites.js` a un array TypeScript embebido en el componente (no se copia `sprites.js` tal cual — ver "Data model").
- Crear `components/snake-game.tsx`: implementación completa del snake clásico en un Client Component con canvas propio, usando el contrato `RealGameHandle`/`RealGameProps`/`HudSlot`/`GameStats` que ya expone `components/games/registry.ts` (no se tocan esos tipos, no hace falta migrar nada de plataforma — es el cuarto juego real, el registry y el HUD por `slots` ya existen desde SPEC 07).
- Agregar `snake: SnakeGame` a `REAL_GAMES` en `components/games/registry.ts` (una línea + import, el registry ya existe).
- HUD sincronizado vía `onStatsChange` con slots `Longitud` y `Velocidad`, además de `Puntuación`.
- Conectar los botones existentes de `game-player.tsx` (PAUSA/REANUDAR, FIN, JUGAR DE NUEVO, SALIR) al juego real vía el ref expuesto — `game-player.tsx` ya es genérico desde SPEC 07/08, no requiere cambios.

**Out of scope (para specs futuros):**

- Sonido.
- Controles táctiles/móviles (swipe).
- Dificultad progresiva más allá del incremento simple de velocidad definido en este spec (p. ej. obstáculos, niveles con paredes internas).
- Reemplazar o tocar la entrada decorativa `serpentina` (queda tal cual, coexistiendo con `snake`).

## Data model

Nueva fila en `games` (SQL literal a aplicar con `mcp__supabase__apply_migration`, migración `add_game_snake`):

```sql
insert into public.games (id, title, short, long, cat, cover, color, best, plays) values
  ('snake', 'SNAKE', 'Come frutas, crece y no choques contigo mismo.', 'El clásico snake, jugable de verdad: mueve la serpiente con flechas o WASD, come las 22 frutas del atlas para crecer y sumar puntos, y esquiva tu propia cola. La velocidad aumenta cada pocas frutas — sobrevive todo lo que puedas antes de chocar contigo mismo o con el borde del tablero.', 'ARCADE', 'cover-frutal', 'green', 9400, '11.5K');
```

No se agregan estructuras de persistencia nuevas: sigue usando la tabla `scores` ya existente (`game_id`, `name`, `score`, `created_at`), ahora con `game_id: "snake"`. RLS ya cubre `games`/`scores` desde SPEC 06 — no se toca.

Contrato del nuevo componente (`components/snake-game.tsx`) — reutiliza los tipos ya existentes del registry, no se redefinen:

```ts
import type { RealGameHandle, RealGameProps } from "@/components/games/registry";
```

Slots del HUD emitidos en `onStatsChange`: `{ score, slots: [{ label: "Longitud", value: String(snake.length) }, { label: "Velocidad", value: String(speedLevel) }] }`.

Atlas de sprites de frutas — portea literal las coordenadas de `sprites.js` (fuente: `fruits.png`, hoja de 3790×442px, fondo transparente, fila útil y=136–295) como una constante TypeScript dentro de `components/snake-game.tsx` (no cargar `sprites.js` como `<script>` global — ese patrón de globals implícitos es justo lo que se evita, ver trampas conocidas de porteo):

```ts
const FRUIT_SPRITES = [
  { name: "banana", x: 34, y: 136, w: 110, h: 160 },
  { name: "orange", x: 186, y: 136, w: 150, h: 160 },
  { name: "grape", x: 378, y: 136, w: 110, h: 160 },
  { name: "garlic", x: 540, y: 136, w: 130, h: 160 },
  { name: "eggplant", x: 712, y: 136, w: 130, h: 160 },
  { name: "strawberry", x: 894, y: 136, w: 110, h: 160 },
  { name: "cherry", x: 1066, y: 136, w: 110, h: 160 },
  { name: "carrot", x: 1228, y: 136, w: 130, h: 160 },
  { name: "mushroom", x: 1400, y: 136, w: 130, h: 160 },
  { name: "broccoli", x: 1582, y: 136, w: 110, h: 160 },
  { name: "watermelon", x: 1734, y: 136, w: 150, h: 160 },
  { name: "pepper", x: 1906, y: 136, w: 150, h: 160 },
  { name: "kiwi", x: 2068, y: 136, w: 170, h: 160 },
  { name: "lemon", x: 2250, y: 136, w: 140, h: 160 },
  { name: "peach", x: 2432, y: 136, w: 130, h: 160 },
  { name: "peanut", x: 2604, y: 136, w: 130, h: 160 },
  { name: "apple", x: 2786, y: 136, w: 110, h: 160 },
  { name: "tomato", x: 2948, y: 136, w: 130, h: 160 },
  { name: "berries", x: 3110, y: 136, w: 150, h: 160 },
  { name: "grapes2", x: 3302, y: 136, w: 110, h: 160 },
  { name: "pineapple", x: 3454, y: 136, w: 150, h: 160 },
  { name: "melon", x: 3637, y: 136, w: 130, h: 160 },
] as const;
```

La imagen se carga una vez con `new Image()` apuntando a `/snake/fruits.png` dentro del `useEffect` del juego (mismo patrón que cualquier asset externo — esperar `onload` antes de dibujar, o tolerar el primer frame sin sprite si aún no cargó).

## Implementation plan

No hace falta ningún paso de refactor de plataforma: el registry de juegos reales y el HUD por `slots` ya existen desde SPEC 07/08 (`snake` es el cuarto juego real).

1. Escribir y aplicar la migración `add_game_snake` con el `INSERT` de la sección "Data model" (`mcp__supabase__apply_migration`).
2. Agregar la clase `.cover-frutal` a `app/globals.css`, después de la sección de covers existente (`.cover-bricks`, `.cover-tetro`, `.cover-snake`, `.cover-glot`, `.cover-invaders`, `.cover-rocas`, `.cover-rana`, `.cover-duelo`):

   ```css
   .cover-frutal {
     background: linear-gradient(135deg, #3a1a00, #0a0a18);
   }
   .cover-frutal::after {
     content: "";
     position: absolute;
     inset: 0;
     background-image:
       radial-gradient(circle at 30% 40%, var(--yellow) 0 10px, transparent 11px),
       radial-gradient(circle at 58% 68%, var(--magenta) 0 8px, transparent 9px),
       radial-gradient(circle at 78% 32%, var(--green) 0 9px, transparent 10px);
     filter: drop-shadow(0 0 6px rgba(245, 255, 0, 0.35));
   }
   ```

3. Mover `references/source-assets/snake-assets/fruits.png` a `public/snake/fruits.png`. No se mueve `sprites.js` — sus coordenadas ya quedaron portadas como `FRUIT_SPRITES` en la sección "Data model".
4. Crear `components/snake-game.tsx` siguiendo la estructura de 16 puntos usada en Asteroids/Tetris/Arkanoid (`forwardRef<RealGameHandle, RealGameProps>`, refs de callbacks, `useImperativeHandle` con deps vacías, un único `useEffect` con todo el juego, cleanup de `requestAnimationFrame` y listeners), con las siguientes particularidades de Snake:
   - **Grid**: 20 columnas × 15 filas de 40px cada una → canvas lógico 800×600 (4:3 exacto, se estira `width: "100%", height: "100%"` sin deformarse ni letterbox, mismo tamaño lógico que Asteroids).
   - **Estado inicial**: serpiente de longitud 3, centrada en el grid (columna 10, filas 7-8-9), moviendo hacia la derecha. Una fruta con sprite aleatorio de `FRUIT_SPRITES` en una celda libre aleatoria.
   - **Input**: flechas y WASD mapeadas a las 4 direcciones, con `e.preventDefault()` en esos códigos para no scrollear la página. La dirección se guarda en un buffer de "próxima dirección" y se aplica solo en el siguiente tick — se ignora si es exactamente la dirección opuesta a la actual (evita que la serpiente se choque consigo misma al revertir instantáneamente sobre su propio cuello).
   - **Movimiento por tick discreto** (no movimiento continuo por `dt` como Asteroids): un acumulador de tiempo suma `dt` en cada frame de `requestAnimationFrame`; cuando el acumulador alcanza `tickMs`, se ejecuta un paso de juego (mover la serpiente una celda, resetear el acumulador) y luego se dibuja. `draw()` puede correr en cada frame de rAF igualmente para mantener el loop simple, aunque visualmente solo cambia en cada tick.
   - **Velocidad**: `tickMs` inicial 150, baja 5ms cada 5 frutas comidas, con piso de 70ms (nunca queda injugable). El nivel de velocidad mostrado en el HUD (`speedLevel`) es `Math.floor(frutasComidas / 5) + 1`.
   - **Crecimiento y puntaje**: al comer una fruta, la serpiente crece 1 segmento (no se recorta la cola ese tick) y se suman 10 puntos; aparece una fruta nueva con sprite aleatorio en una celda libre (validar que no caiga sobre el cuerpo de la serpiente).
   - **Colisión**: chocar contra cualquier borde del grid, o contra cualquier celda ocupada por el propio cuerpo (excluyendo la cola si se va a mover ese mismo tick), termina el juego (`state = "gameover"`).
   - **Dibujo del cuerpo**: bloques sólidos verdes (`var(--green)` o equivalente hex) dibujados con `ctx.fillRect` por celda, sin gradientes ni sprites — la cabeza puede diferenciarse con un tono ligeramente distinto o un borde, a criterio de implementación.
   - **Dibujo de la fruta**: `ctx.drawImage` recortando el sprite activo de `fruits.png` según sus `{x, y, w, h}` en `FRUIT_SPRITES`, escalado a la celda de 40×40 preservando el aspect ratio del recorte original (no estirarlo a cuadrado si el sprite no lo es — centrar dentro de la celda).
   - **`draw()`**: no dibuja HUD (score/longitud/velocidad) ni overlays de pausa/fin — eso ya lo resuelve `game-player.tsx`.
   - **Acciones expuestas**: `togglePause` (congela el tick, `draw()` sigue corriendo), `forceGameOver` (fuerza `state = "gameover"`), `restart` (reinicializa serpiente, fruta, score, `tickMs`, `paused`, `gameOverFired`).
5. Agregar `snake: SnakeGame` a `REAL_GAMES` en `components/games/registry.ts`, con su import `import SnakeGame from "@/components/snake-game";`.
6. Correr `npm run build` para confirmar que todo compila y tipa. No hace falta `npx next typegen` (no se tocan rutas).

## Acceptance criteria

- [ ] `npm run build` termina sin errores.
- [ ] La fila `snake` aparece en `/games` con cover `cover-frutal`, categoría ARCADE, junto a la card "SERPENTINA" decorativa sin cambios.
- [ ] `/juegos/snake` muestra el detalle correcto y no revienta con `notFound()`.
- [ ] `/juegos/snake/jugar` carga el canvas real del juego con el HUD de React sincronizado (Puntuación + Longitud + Velocidad).
- [ ] Flechas y WASD mueven la serpiente correctamente; ninguna tecla de control scrollea la página.
- [ ] Intentar revertir directamente sobre el propio cuello no causa una muerte instantánea injusta (la dirección opuesta se ignora).
- [ ] Comer una fruta hace crecer la serpiente, suma 10 puntos, y aparece una fruta nueva con un sprite aleatorio del atlas en una celda libre.
- [ ] La velocidad aumenta (tick más corto) cada 5 frutas comidas, con piso de 70ms.
- [ ] Chocar contra el borde del tablero o contra el propio cuerpo termina la partida y abre el modal "FIN DEL JUEGO" con la puntuación real.
- [ ] PAUSA congela el juego (nada se mueve); REANUDAR lo continúa exactamente donde quedó.
- [ ] FIN fuerza el fin de partida y abre el modal "FIN DEL JUEGO".
- [ ] Guardar la puntuación desde el modal inserta una fila en `scores` con `game_id: "snake"` (verificable con una query a la tabla).
- [ ] El aside "MEJORES PUNTUACIONES" de `/juegos/snake` y las tabs de `/salon-de-la-fama` muestran esa puntuación tras guardarla.
- [ ] "JUGAR DE NUEVO" reinicia el juego real desde cero dentro de la misma pantalla.
- [ ] "SALIR" navega a `/juegos/snake` sin dejar el loop corriendo ni listeners activos (sin warnings de React en consola).
- [ ] El resto de los juegos (decorativos y reales, incluida `serpentina`) siguen funcionando sin cambios.

## Decisions

- **Sí:** `id: "snake"` nuevo, separado de la entrada decorativa `serpentina` (que no se toca) — decisión explícita del usuario, mismo patrón que `asteroides`/`rocas`, `tetris`/`caída` y `arkanoid`/`bloque-buster`: el juego real nunca reemplaza la fila decorativa preexistente.
- **Sí:** `cat: "ARCADE"`, `color: "green"` — decisiones explícitas del usuario. `color: "green"` no tiene variante de botón (`.btn.green` no existe en `app/globals.css`), así que el botón JUGAR de la card cae al estilo base — aceptado como decorativo, mismo trade-off ya aceptado en `arkanoid` con `cyan`.
- **Sí:** cover nueva `.cover-frutal` (en vez de reusar `.cover-snake`, que queda reservada para la decorativa `serpentina`), con paleta inspirada en `fruits.png` — decisión explícita del usuario.
- **Sí:** grilla nativa 800×600 (20×15 celdas de 40px), 4:3 exacto — decisión explícita del usuario, mismo canvas lógico que Asteroids, sin letterbox.
- **Sí:** controles flechas + WASD — decisión explícita del usuario.
- **Sí:** choque contra el borde del tablero = game over (no wrap-around) — decisión explícita del usuario.
- **Sí:** las 22 frutas del atlas rotan aleatoriamente en cada spawn — decisión explícita del usuario.
- **Sí:** cuerpo de la serpiente dibujado con bloques sólidos verdes (canvas/CSS), sin sprites propios — decisión explícita del usuario, ya que solo se proveyeron sprites de frutas.
- **Sí:** slots del HUD = Longitud + Velocidad — decisión explícita del usuario.
- **No:** sonido, controles táctiles/móviles, dificultad progresiva más allá del incremento de velocidad simple — fuera de alcance, decisión explícita del usuario.

## Risks

| Risk                                                                                                                                                                                                                                 | Mitigation                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| El movimiento por tick discreto es un patrón distinto al de Asteroids/Arkanoid (movimiento continuo por `dt`) — un mal manejo del acumulador puede producir movimiento a velocidad incorrecta o saltos de más de una celda por tick. | Acumulador de tiempo simple con clamp de `dt`, y un solo paso de juego por tick aunque el frame llegue tarde (no "recuperar" ticks perdidos de golpe). |
| Buffer de dirección mal manejado puede permitir revertir sobre el propio cuello si se presionan dos teclas en el mismo tick (ej. arriba y luego abajo antes del siguiente paso).                                                     | Comparar la nueva dirección contra la dirección _actual_ del último tick aplicado (no contra el buffer anterior) antes de aceptarla.                   |
| Sprites de fruta con proporciones distintas entre sí (110×160 a 170×160) pueden verse deformados si se estiran a la celda cuadrada de 40×40 sin cuidado.                                                                             | Escalar preservando aspect ratio y centrar dentro de la celda, no forzar `w`/`h` de destino iguales al tamaño de celda.                                |
| `fruits.png` puede no estar cargado (`Image.onload`) en los primeros frames del juego.                                                                                                                                               | Tolerar el primer frame sin dibujar el sprite (o dibujar un placeholder simple) hasta que `onload` dispare; no bloquear el loop esperando la carga.    |

## What is **not** in this spec

- Sonido.
- Controles táctiles/móviles (swipe).
- Dificultad progresiva más allá del incremento simple de velocidad (obstáculos, paredes internas, niveles).
- Reemplazar o tocar la entrada decorativa `serpentina`.

Cada uno de estos, si se necesita, va en su propio spec.
