# SPEC 11 — Skins de Snake (clásico / neón / retro)

> **Status:** Implementado
> **Depends on:** SPEC 09 (Snake real), SPEC 10 (infraestructura compartida de skins, `components/games/skins.tsx`)
> **Date:** 2026-08-31
> **Objective:** Añadir la entrada de Snake al mapa de paletas compartido y skinear `components/snake-game.tsx` con los 3 skins obligatorios — `clasico`, `neon`, `retro`.

## Por qué este spec existe

`components/games/skins.tsx` ya existe — lo creó SPEC 10 (Asteroids, el primer juego skineado; ver
`references/game-with-themes.md`, línea de estado de infraestructura). Este spec **no redefine el
contrato**: reutiliza `SkinId`, `SKIN_ORDER`, `SKIN_LABELS`, `useGameSkin`, `SkinSwitcher` tal como
están (citados por referencia, literales exactos en `components/games/skins.tsx` líneas 1-68). Solo
añade `SnakePalette`, `SNAKE_SKINS` y la entrada `snake` en `GAME_SKINS`, y adapta
`components/snake-game.tsx`.

Snake es vectorial para la serpiente (rectángulos `fillRect`/`strokeRect`) pero usa un spritesheet
PNG (`/snake/fruits.png`, 22 frutas) para la comida — a diferencia de Arkanoid, donde el spritesheet
es un único set de bloques con un color base tintable, el atlas de frutas de Snake tiene 22 sprites
con colores naturalistas propios de cada fruta (banana amarilla, uva morada, sandía verde/roja...).
**Decisión:** las frutas se mantienen exactamente iguales en los 3 skins — sin tintar, sin halo. Un
tinte global (p. ej. cian neón o ámbar retro) borraría la identidad visual de cada fruta y las haría
menos legibles como comida reconocible. Ver "Decisions" abajo.

## Scope

**In:**

- Definir `SnakePalette` y `SNAKE_SKINS` (los 3 skins) en `components/games/skins.tsx`, y registrar
  `snake: SNAKE_SKINS` en el `GAME_SKINS` existente (sin tocar la entrada `asteroides` ya presente).
- Modificar `components/snake-game.tsx` para leer sus 3 literales de color desde la paleta activa vía
  un `skinRef` (patrón espejo por ref, igual que `onStatsChangeRef`/`onGameOverRef`, líneas 75-89
  actuales), sin reiniciar el `useEffect` principal (línea 101, deps `[]`) ni la partida en curso.
- Halo neón vía `ctx.shadowBlur`/`ctx.shadowColor` en la cabeza y el cuerpo de la serpiente (incluido
  el `strokeRect` del contorno de la cabeza) cuando el skin activo es `neon`.
- Renderizar `<SkinSwitcher gameId="snake" skin={skin} onChange={setSkin} />` sobre el canvas, esquina
  inferior derecha.

**Out of scope:**

- Cualquier otro juego (Tetris, Arkanoid) — cada uno ya tiene o tendrá su propio
  `specs/NN-skins-<slug>.md`.
- Tintar o reemplazar el spritesheet de frutas (`/snake/fruits.png`) — se mantiene idéntico en los 3
  skins; ver "Por qué este spec existe" y "Decisions".
- Persistir el skin elegido en Supabase o asociarlo a una cuenta de usuario — vive solo en
  `localStorage`, por diseño (igual que SPEC 10).
- Animaciones de transición entre skins, sonido o feedback háptico al cambiar de skin.
- Redefinir `SkinId`, `useGameSkin`, `SkinSwitcher` o cualquier otra pieza del contrato de SPEC 10 —
  se importan tal cual desde `@/components/games/skins`.

## Data model

Contrato reutilizado sin cambios, importado de `@/components/games/skins` (definido en SPEC 10,
`components/games/skins.tsx` líneas 1-68): `SkinId`, `SKIN_ORDER`, `SKIN_LABELS`, `useGameSkin`,
`SkinSwitcher`.

Paleta de Snake — 3 campos, uno por literal de color censado en `components/snake-game.tsx`
(`fillStyle`/`strokeStyle`, líneas 227, 233, 236). `glowBlur` es `0` para desactivar el halo
(`clasico`/`retro`) o un valor `> 0` para activarlo (`neon`), mismo patrón que `AsteroidsPalette`:

```ts
// añadir a components/games/skins.tsx, debajo de GAME_SKINS existente (o antes, reordenando el
// objeto final — el orden de las claves de GAME_SKINS no importa)
export type SnakePalette = {
  background: string;
  snakeHead: string;
  snakeBody: string;
  headOutline: string;
  glowBlur: number;
};

export const SNAKE_SKINS: Record<SkinId, SnakePalette> = {
  clasico: {
    background: "#000000",
    snakeHead: "#baffe0",
    snakeBody: "#00ff88",
    headOutline: "#ffffff",
    glowBlur: 0,
  },
  neon: {
    background: "#05050b",
    snakeHead: "#00f5ff",
    snakeBody: "#00ff88",
    headOutline: "#f5ff00",
    glowBlur: 10,
  },
  retro: {
    background: "#140d00",
    snakeHead: "#ffb000",
    snakeBody: "#cc8800",
    headOutline: "#996600",
    glowBlur: 0,
  },
};
```

Modificar la constante `GAME_SKINS` existente (`components/games/skins.tsx` líneas 118-120) para
incluir la nueva entrada, sin tocar `asteroides`:

```ts
export const GAME_SKINS = {
  asteroides: ASTEROIDS_SKINS,
  snake: SNAKE_SKINS,
} as const;
```

### Paletas y contraste (WCAG, mínimo 3:1 contra el fondo de su propio skin)

**`clasico`** (fondo `#000000`, luminancia 0 — colores actuales de `snake-game.tsx`, sin cambio de
aspecto):

| Elemento               | Color     | Contraste |
| ---------------------- | --------- | --------- |
| Cuerpo de la serpiente | `#00ff88` | 15.7 : 1  |
| Cabeza de la serpiente | `#baffe0` | 18.5 : 1  |
| Contorno de la cabeza  | `#ffffff` | 21.0 : 1  |

**`neon`** (fondo `#05050b`, luminancia 0.00165 — tokens de `app/globals.css:4-22` + halo):

| Elemento               | Color              | Contraste |
| ---------------------- | ------------------ | --------- |
| Cabeza de la serpiente | `#00f5ff` (cyan)   | 15.0 : 1  |
| Cuerpo de la serpiente | `#00ff88` (green)  | 15.2 : 1  |
| Contorno de la cabeza  | `#f5ff00` (yellow) | 18.6 : 1  |

`glowBlur: 10`, `shadowColor` = el propio color de cada elemento (cabeza con halo cian, cuerpo con
halo verde, contorno con halo amarillo) — mismo criterio que SPEC 10 (halo coherente por entidad, no
un color fijo compartido).

**`retro`** (fondo `#140d00`, luminancia 0.00436 — fósforo CRT ámbar, sin halo, sin degradados;
misma rampa validada en SPEC 10):

| Elemento               | Color     | Contraste |
| ---------------------- | --------- | --------- |
| Cabeza de la serpiente | `#ffb000` | 10.6 : 1  |
| Cuerpo de la serpiente | `#cc8800` | 6.5 : 1   |
| Contorno de la cabeza  | `#996600` | 3.9 : 1   |

**Reutilización de la rampa retro de SPEC 10:** los 3 tonos ámbar (`#ffb000`, `#cc8800`, `#996600`) y
el fondo (`#140d00`) son exactamente los mismos que ya validó y ajustó SPEC 10 para Asteroids —
`#996600` ya sustituye ahí al `#7a4f00` de referencia por no alcanzar 3:1 (2.71:1). No hace falta
recalcular: mismos hex, mismo fondo, mismo resultado.

**Frutas (`/snake/fruits.png`):** sin cambio en ningún skin — sprite PNG con colores propios fijos,
sin `fillStyle`/`strokeStyle`/`shadowColor` aplicado. No se evalúa contraste porque no hay literal de
color de primer plano que ajustar (es una imagen rasterizada, no un color sólido).

## Implementation plan

1. En `components/games/skins.tsx`, añadir `SnakePalette` y `SNAKE_SKINS` (literales exactos de la
   sección "Data model" arriba) y actualizar `GAME_SKINS` para incluir `snake: SNAKE_SKINS` junto a
   `asteroides: ASTEROIDS_SKINS` ya existente. Manual test: el archivo sigue compilando
   (`tsc --noEmit` o build parcial).
2. En `components/snake-game.tsx`, importar `useGameSkin`, `SkinSwitcher`, `SNAKE_SKINS` desde
   `@/components/games/skins`. Al nivel del componente (junto a los `useRef` existentes en líneas
   74-81), llamar `const [skin, setSkin] = useGameSkin("snake")` y crear
   `const skinRef = useRef(SNAKE_SKINS[skin])` + `useEffect(() => { skinRef.current = SNAKE_SKINS[skin]; }, [skin])`
   — mismo patrón espejo por ref que `onStatsChangeRef`/`onGameOverRef` (líneas 83-89 actuales), para
   que el `useEffect` principal (línea 101, deps `[]`) no se reinicie ni reinicie la partida en curso
   cuando cambia el skin.
3. Dentro de `draw()` (líneas 226-251), reemplazar los 3 literales censados por lecturas de
   `skinRef.current`:
   - L227 `ctx.fillStyle = "#000"` (fondo) → `skinRef.current.background`.
   - L233 `ctx.fillStyle = isHead ? "#baffe0" : "#00ff88"` → `isHead ? skinRef.current.snakeHead : skinRef.current.snakeBody`.
   - L236 `ctx.strokeStyle = "#ffffff"` (contorno de la cabeza) → `skinRef.current.headOutline`.
   - No tocar el bloque de `ctx.drawImage(fruitImg, ...)` (líneas 242-250) — las frutas quedan
     idénticas en los 3 skins, según "Decisions".
4. Agregar el halo neón: antes del `ctx.fillRect` de cada segmento (línea 234) y antes del
   `ctx.strokeRect` del contorno de la cabeza (línea 238), si `skinRef.current.glowBlur > 0` setear
   `ctx.shadowBlur = skinRef.current.glowBlur` y `ctx.shadowColor` igual al color que se está por
   dibujar (`snakeHead`/`snakeBody` para el `fillRect`, `headOutline` para el `strokeRect`); resetear
   `ctx.shadowBlur = 0` inmediatamente después de cada trazo, y siempre antes del `ctx.fillRect` de
   fondo (línea 228) para que el halo nunca manche todo el canvas en el siguiente frame.
5. Envolver el `return` de `SnakeGame` (línea 322) en un
   `<div style={{ position: "relative", width: "100%", height: "100%" }}>` que contenga el `<canvas>`
   existente sin cambios y `<SkinSwitcher gameId="snake" skin={skin} onChange={setSkin} />`.
6. `npm run build` para confirmar que todo compila y tipa.

## Acceptance criteria

- [x] `npm run build` termina sin errores.
- [x] Con el skin `clasico` activo (default, sin tocar nada), Snake se ve pixel-idéntico al estado
      actual antes de este spec (incluidas las frutas, sin cambio).
- [x] `<SkinSwitcher>` aparece como un pill en la esquina inferior derecha del canvas de Snake, con
      las 3 opciones `Clásico`/`Neón`/`Retro`.
- [x] Elegir `neon` cambia el fondo a `#05050b`, colorea cabeza/cuerpo/contorno con los tokens del
      sitio (`#00f5ff`/`#00ff88`/`#f5ff00`), y agrega halo (`shadowBlur`) visible alrededor de la
      serpiente; las frutas se ven exactamente igual que en `clasico`.
- [x] Elegir `retro` cambia el fondo a `#140d00`, usa solo tonos ámbar de la rampa (`#ffb000`,
      `#cc8800`, `#996600`), y no muestra ningún halo ni degradado; las frutas se ven exactamente
      igual que en `clasico`.
- [x] Cambiar de skin en medio de una partida no reinicia la serpiente, la fruta actual, el score ni
      la velocidad — solo cambia el color en el siguiente frame.
- [x] Recargar la página después de elegir `neon` o `retro` conserva ese skin (persistencia en
      `localStorage['av_skin_snake']`), sin parpadeo de hidratación en consola.
- [x] Los demás juegos (Asteroids, Tetris, Arkanoid) no cambian de aspecto ni de comportamiento — este
      spec no los toca.

## Decisions

- **Sí:** reutilizar el contrato completo de `components/games/skins.tsx` de SPEC 10 sin
  modificarlo — solo se añaden `SnakePalette`/`SNAKE_SKINS` y una clave a `GAME_SKINS`.
- **Sí:** reutilizar exactamente la rampa ámbar retro (`#ffb000`/`#cc8800`/`#996600` sobre
  `#140d00`) ya validada por SPEC 10 — mismos hex, mismo fondo, mismo resultado de contraste; evita
  recalcular y mantiene coherencia visual entre juegos con el mismo skin activo.
- **No:** tintar el spritesheet de frutas (`/snake/fruits.png`) en `neon`/`retro` — a diferencia del
  spritesheet de bloques de Arkanoid (un solo color base tintable), el atlas de Snake tiene 22 frutas
  con colores naturalistas propios; tintarlas globalmente las haría menos reconocibles y rompería su
  propósito como comida. Se mantienen idénticas en los 3 skins.
- **No:** aplicar halo a las frutas en `neon` — mismo razonamiento; el halo neón se limita a la
  serpiente (cabeza, cuerpo, contorno), que sí son formas vectoriales sólidas.
- **No:** persistir el skin en Supabase — vive en `localStorage`, coherente con SPEC 10 y con que
  Arcade Vault no tiene sesión real todavía (`/login` es mock).
- **No:** tocar `game-player.tsx` — el pill lo renderiza el propio `snake-game.tsx`, como indica el
  contrato de arquitectura de SPEC 10.

## What is **not** in this spec

- Skins de Tetris o Arkanoid — cada uno en su propio `specs/NN-skins-<slug>.md`.
- Cualquier cambio al spritesheet de frutas o a su lógica de selección aleatoria.
- Persistencia de skin por cuenta de usuario.
- Transiciones animadas entre skins.

## Último paso

Actualizar `references/game-with-themes.md`: mover `SNAKE` de `## Sin skins` a `## Con skins` con
este número de spec, la fecha real y las 3 paletas con sus ratios de contraste. La línea de estado de
infraestructura ya dice "existe" (creada por SPEC 10) — no requiere cambio.
