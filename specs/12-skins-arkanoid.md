# SPEC 12 — Skins de Arkanoid (clásico / neón / retro)

> **Status:** Aprobado
> **Depends on:** SPEC 08 (Arkanoid real), SPEC 10 (infraestructura compartida de skins, `components/games/skins.tsx`)
> **Date:** 2026-08-31
> **Objective:** Añadir la entrada de Arkanoid al mapa de paletas compartido y skinear `components/arkanoid-game.tsx` con los 3 skins obligatorios — `clasico`, `neon`, `retro` — tintando su spritesheet por skin.

## Por qué este spec existe

`components/games/skins.tsx` ya existe — lo creó SPEC 10 (Asteroids, el primer juego skineado; ver
`references/game-with-themes.md`, línea de estado de infraestructura). SPEC 11 (Snake) ya añadió su
propia entrada al mismo archivo. Este spec **no redefine el contrato**: reutiliza `SkinId`,
`SKIN_ORDER`, `SKIN_LABELS`, `useGameSkin`, `SkinSwitcher` tal como están (citados por referencia,
literales exactos en `components/games/skins.tsx` líneas 1-68). Solo añade `ArkanoidPalette`,
`ARKANOID_SKINS` y la entrada `arkanoid` en `GAME_SKINS`, y adapta `components/arkanoid-game.tsx`.

Arkanoid es distinto de los otros tres juegos skineados hasta ahora: **el 100% de su arte viene de un
spritesheet PNG** (`/arkanoid/spritesheet-breakout.png`), cargado como `HTMLCanvasElement` offscreen
en `loadSpritesheet` (`components/arkanoid-game.tsx` L95-117). El único literal de color en todo el
archivo es el fondo `ctx.fillStyle = "#000"` (L387) — confirmado por
`grep -n "fillStyle\|strokeStyle\|shadowColor" components/arkanoid-game.tsx`, que solo devuelve esa
línea. Pala, pelota, los 7 colores de bloque (`gray`/`red`/`yellow`/`cyan`/`magenta`/`hotpink`/`green`,
usados como claves de sprite, no como hex) y las animaciones de explosión son pixeles del PNG, sin
ningún `fillStyle`/`strokeStyle` que reasignar.

Por eso `neon` y `retro` no pueden implementarse recoloreando literales de código como en Asteroids o
Snake: requieren **tintar copias del spritesheet**. Este spec reemplaza los globals de módulo
`ssImg`/`ssLoaded` (L91-93) — hoy un único canvas compartido entre todos los montajes del componente,
que si se tiñera una sola vez filtraría el tinte de un skin a otro montaje con distinto skin activo —
por un `Map<SkinId, HTMLCanvasElement>` (`tintedCache`) con las 3 variantes ya construidas antes de
arrancar el loop de dibujo. `clasico` reutiliza el canvas crudo sin tocarlo (sin tintar, pixel-idéntico
al Arkanoid actual).

## Scope

**In:**

- Definir `ArkanoidBlockColorName`, `ArkanoidPalette` y `ARKANOID_SKINS` (los 3 skins) en
  `components/games/skins.tsx`, y registrar `arkanoid: ARKANOID_SKINS` en el `GAME_SKINS` existente
  (sin tocar `asteroides`/`snake` ya presentes).
- Reemplazar los globals de módulo `ssImg: HTMLCanvasElement | null` / `ssLoaded: boolean` (L91-93) de
  `components/arkanoid-game.tsx` por `rawImg: HTMLCanvasElement | null`, `ssLoaded: boolean` y
  `tintedCache: Map<SkinId, HTMLCanvasElement>`, poblado con las 3 variantes al terminar de decodificar
  el spritesheet.
- Función `buildTintedCopy(raw, tint)` que clona el canvas crudo y tiñe, región por región, con
  `ctx.globalCompositeOperation = "source-atop"` recortado (`ctx.clip()`) al rectángulo de cada sprite
  (pala, pelota, los 7 bloques, los rectángulos únicos de `EXPLOSION_FRAMES`).
- Modificar `drawFrame`/`drawSprite` (L119-148) para recibir el canvas activo (`img`) como parámetro en
  vez de leer el global `ssImg`.
- Modificar `components/arkanoid-game.tsx` para leer el skin activo vía un `skinRef` (patrón espejo por
  ref, igual que `onStatsChangeRef`/`onGameOverRef`, L207-221 actuales), sin reiniciar el `useEffect`
  principal (L233, deps `[]`) ni la partida en curso.
- Halo neón vía `ctx.shadowBlur`/`ctx.shadowColor` en pala y pelota cuando el skin activo es `neon`
  (los bloques y explosiones no llevan halo — son formas rectangulares pequeñas y numerosas; un halo
  por bloque sería ruido visual, no legibilidad).
- Renderizar `<SkinSwitcher gameId="arkanoid" skin={skin} onChange={setSkin} />` sobre el canvas,
  esquina inferior derecha.

**Out of scope:**

- Cualquier otro juego (Tetris) — ya tiene o tendrá su propio `specs/NN-skins-<slug>.md`.
- Rediseñar el propio spritesheet PNG o añadir nuevos assets — el tinte se aplica en runtime sobre el
  canvas ya cargado, no se toca `public/arkanoid/spritesheet-breakout.png`.
- Recuperar el sombreado/degradado interno de cada sprite tras el tinte — ver "Decisions".
- Persistir el skin elegido en Supabase o asociarlo a una cuenta de usuario — vive solo en
  `localStorage`, por diseño (igual que SPEC 10/11).
- Animaciones de transición entre skins, sonido o feedback háptico al cambiar de skin.
- Redefinir `SkinId`, `useGameSkin`, `SkinSwitcher` o cualquier otra pieza del contrato de SPEC 10 — se
  importan tal cual desde `@/components/games/skins`.

## Data model

Contrato reutilizado sin cambios, importado de `@/components/games/skins` (definido en SPEC 10,
`components/games/skins.tsx` líneas 1-68): `SkinId`, `SKIN_ORDER`, `SKIN_LABELS`, `useGameSkin`,
`SkinSwitcher`.

Paleta de Arkanoid — a diferencia de `AsteroidsPalette`/`SnakePalette` (colores planos, un `fillStyle`
por elemento), `ArkanoidPalette.tint` es `null` en `clasico` (sin tintar, el spritesheet crudo se usa
tal cual) o un objeto con los colores a aplicar en `neon`/`retro`. `blockColors` mapea los 7 nombres
que ya usa el código (`BLOCK_COLORS`, L14, y las claves de `SPRITES.blocks`/`EXPLOSION_FRAMES`,
L67-89) a un hex del skin:

```ts
// añadir a components/games/skins.tsx, debajo de GAME_SKINS existente (o antes, reordenando el
// objeto final — el orden de las claves de GAME_SKINS no importa)
export type ArkanoidBlockColorName =
  "gray" | "red" | "yellow" | "cyan" | "magenta" | "hotpink" | "green";

export type ArkanoidTint = {
  paddle: string;
  ball: string;
  blockColors: Record<ArkanoidBlockColorName, string>;
};

export type ArkanoidPalette = {
  background: string;
  glowBlur: number;
  tint: ArkanoidTint | null;
};

export const ARKANOID_SKINS: Record<SkinId, ArkanoidPalette> = {
  clasico: {
    background: "#000000",
    glowBlur: 0,
    tint: null,
  },
  neon: {
    background: "#05050b",
    glowBlur: 10,
    tint: {
      paddle: "#00f5ff",
      ball: "#00f5ff",
      blockColors: {
        gray: "#ff006e",
        red: "#ff006e",
        yellow: "#f5ff00",
        cyan: "#00f5ff",
        magenta: "#ff006e",
        hotpink: "#ff006e",
        green: "#00ff88",
      },
    },
  },
  retro: {
    background: "#140d00",
    glowBlur: 0,
    tint: {
      paddle: "#ffb000",
      ball: "#ffb000",
      blockColors: {
        gray: "#ffb000",
        red: "#ffb000",
        yellow: "#cc8800",
        cyan: "#996600",
        magenta: "#ffb000",
        hotpink: "#cc8800",
        green: "#996600",
      },
    },
  },
};
```

Modificar la constante `GAME_SKINS` existente para incluir la nueva entrada, sin tocar
`asteroides`/`snake`:

```ts
export const GAME_SKINS = {
  asteroides: ASTEROIDS_SKINS,
  snake: SNAKE_SKINS, // si SPEC 11 ya corrió; si no, añadir solo la clave arkanoid a lo que exista
  arkanoid: ARKANOID_SKINS,
} as const;
```

**Restricción técnica de `EXPLOSION_FRAMES.gray`:** en `components/arkanoid-game.tsx` (L67-72),
`EXPLOSION_FRAMES.gray` usa exactamente el mismo rectángulo de píxeles (`sx: 256, sy: 176, ...`) que
`EXPLOSION_FRAMES.red`. Es el mismo pedazo de spritesheet — teñirlo con dos colores distintos según la
clave (`gray` vs `red`) no es posible, el segundo tinte simplemente sobrescribiría al primero. Por eso
`blockColors.gray === blockColors.red` en ambos skins tintados (`neon`: `#ff006e` ambos; `retro`:
`#ffb000` ambos). Es una restricción heredada del spritesheet original, no algo que este spec
introduzca: en `clasico` (sin tintar) un bloque `gray` ya explota hoy con los píxeles de la animación
`red`. El sprite _estático_ del bloque `gray` (`SPRITES.blocks.gray`, L81) sí es un rectángulo
independiente — pero se mantiene igual color que su explosión por simplicidad y consistencia visual
(un bloque y su propia explosión deben verse del mismo color).

### Paletas y contraste (WCAG, mínimo 3:1 contra el fondo de su propio skin)

**`clasico`** (fondo `#000000`, sin cambio de aspecto): no hay literales de color de primer plano que
evaluar. El único `fillStyle`/`strokeStyle`/`shadowColor` en `arkanoid-game.tsx` es el fondo `"#000"`
(L387); pala, pelota, bloques y explosiones son píxeles de `spritesheet-breakout.png` sin ningún hex
de código detrás — mismo caso que las frutas de Snake (`SPEC 11`, "no se evalúa contraste porque no
hay un hex de código que ajustar"). `tint: null` garantiza que el canvas se usa exactamente como hoy.

**`neon`** (fondo `#05050b`, luminancia 0.00165 — tokens de `app/globals.css:4-22` + halo):

| Elemento                                 | Color               | Contraste |
| ---------------------------------------- | ------------------- | --------- |
| Pala / pelota                            | `#00f5ff` (cyan)    | 15.0 : 1  |
| Bloques `gray`/`red`/`magenta`/`hotpink` | `#ff006e` (magenta) | 5.3 : 1   |
| Bloques `yellow`                         | `#f5ff00` (yellow)  | 18.6 : 1  |
| Bloques `cyan`                           | `#00f5ff` (cyan)    | 15.0 : 1  |
| Bloques `green`                          | `#00ff88` (green)   | 15.2 : 1  |

`glowBlur: 10` solo en pala y pelota (`shadowColor` = su propio color, `#00f5ff`); los bloques no
llevan halo (ver "Scope"). Los 4 tokens neón oficiales del sitio cubren solo 4 colores; con 7 nombres
de bloque originales, algunos colapsan al mismo token — se prioriza el mapeo semántico por nombre
(`cyan`→cyan, `yellow`→yellow, `green`→green) y el resto (`red`/`magenta`/`hotpink`/`gray`) cae en
`magenta`, el token más cercano en temperatura de color. Documentado también en "Decisions".

**`retro`** (fondo `#140d00`, luminancia 0.00436 — fósforo CRT ámbar, sin halo, sin degradados; misma
rampa validada en SPEC 10):

| Elemento                       | Color     | Contraste |
| ------------------------------ | --------- | --------- |
| Pala / pelota                  | `#ffb000` | 10.6 : 1  |
| Bloques `gray`/`red`/`magenta` | `#ffb000` | 10.6 : 1  |
| Bloques `yellow`/`hotpink`     | `#cc8800` | 6.5 : 1   |
| Bloques `cyan`/`green`         | `#996600` | 3.9 : 1   |

**Reutilización de la rampa retro de SPEC 10:** los 3 tonos ámbar (`#ffb000`, `#cc8800`, `#996600`) y
el fondo (`#140d00`) son exactamente los mismos que ya validó y ajustó SPEC 10 para Asteroids —
`#996600` ya sustituye ahí al `#7a4f00` de referencia por no alcanzar 3:1 (2.71:1). No hace falta
recalcular: mismos hex, mismo fondo, mismo resultado. El nivel 1 de Arkanoid (`rowColors1`, L151)
alterna `t1/t2/t3/t1/t2/t3` entre sus 6 filas — el ciclo de 3 tonos produce un patrón legible incluso
en monocromo.

## Implementation plan

1. En `components/games/skins.tsx`, añadir `ArkanoidBlockColorName`, `ArkanoidTint`, `ArkanoidPalette`
   y `ARKANOID_SKINS` (literales exactos de "Data model"), y actualizar `GAME_SKINS` para incluir
   `arkanoid: ARKANOID_SKINS` **preservando cualquier otra clave que ya exista** (`asteroides`, y
   `snake` si SPEC 11 ya se implementó). Manual test: el archivo sigue compilando (`tsc --noEmit` o
   build parcial).
2. En `components/arkanoid-game.tsx`, reemplazar los globals `ssImg`/`ssLoaded` (L91-93) por
   `rawImg: HTMLCanvasElement | null`, `ssLoaded: boolean` (se mantiene), `ssCallbacks` (se mantiene) y
   `const tintedCache = new Map<SkinId, HTMLCanvasElement>()`. Añadir la función module-level
   `buildTintedCopy(raw: HTMLCanvasElement, tint: ArkanoidTint): HTMLCanvasElement` que: crea un canvas
   del mismo tamaño, dibuja `raw` completo, y por cada región (`SPRITES.paddle` → `tint.paddle`,
   `SPRITES.ball` → `tint.ball`, cada entrada de `SPRITES.blocks` → `tint.blockColors[name]`, cada
   rectángulo único dentro de `EXPLOSION_FRAMES` → `tint.blockColors[name]` de esa misma clave) hace
   `ctx.save()` → `ctx.beginPath()` + `ctx.rect(...)` + `ctx.clip()` → `ctx.globalCompositeOperation =
"source-atop"` → `ctx.fillStyle = color` + `ctx.fillRect(...)` sobre el mismo rectángulo →
   `ctx.restore()`. Iterar los 4 frames de cada color de `EXPLOSION_FRAMES` está bien aunque
   `gray`/`red` compartan rectángulo (ver "Restricción técnica" arriba): al usar el mismo color para
   ambas claves, teñir el rectángulo dos veces es idempotente.
3. En el `onload` de `loadSpritesheet` (L104-114), tras construir el canvas crudo, asignarlo a
   `rawImg` (en vez de `ssImg`) y poblar `tintedCache`: `tintedCache.set("clasico", rawImg)` (sin
   tintar), `tintedCache.set("neon", buildTintedCopy(rawImg, ARKANOID_SKINS.neon.tint!))`,
   `tintedCache.set("retro", buildTintedCopy(rawImg, ARKANOID_SKINS.retro.tint!))`, luego
   `ssLoaded = true` y disparar `ssCallbacks` como hoy. Manual test: sigue compilando.
4. Actualizar `drawFrame` (L119-129) y `drawSprite` (L131-148) para recibir `img: HTMLCanvasElement |
null` como segundo parámetro (`drawFrame(ctx, img, frame, x, y, w, h)` /
   `drawSprite(ctx, img, name, x, y, w, h)`), reemplazando toda lectura del global `ssImg` por `img`;
   el guard pasa a ser `if (!ssLoaded || !img) return;`.
5. Dentro del componente, junto a los `useRef` existentes (L206-213), importar `useGameSkin`,
   `SkinSwitcher`, `ARKANOID_SKINS` desde `@/components/games/skins`, llamar
   `const [skin, setSkin] = useGameSkin("arkanoid")` y crear
   `const skinRef = useRef({ id: skin, palette: ARKANOID_SKINS[skin] })` +
   `useEffect(() => { skinRef.current = { id: skin, palette: ARKANOID_SKINS[skin] }; }, [skin])` —
   mismo patrón espejo por ref que `onStatsChangeRef`/`onGameOverRef` (L215-221 actuales), para que el
   `useEffect` principal (L233, deps `[]`) no se reinicie ni reinicie la partida en curso cuando cambia
   el skin.
6. Dentro de `draw()` (L386-402):
   - Al inicio: `const img = tintedCache.get(skinRef.current.id) ?? rawImg;`.
   - L387 `ctx.fillStyle = "#000"` → `ctx.fillStyle = skinRef.current.palette.background;`.
   - Pasar `img` como segundo argumento en cada llamada existente a `drawSprite`/`drawFrame`: los
     bloques (L392), las explosiones (L397), la pala y la pelota (L400-401).
   - Antes de dibujar la pala: si `skinRef.current.palette.glowBlur > 0`, `ctx.shadowBlur =
skinRef.current.palette.glowBlur` y `ctx.shadowColor = skinRef.current.palette.tint!.paddle`;
     resetear `ctx.shadowBlur = 0` justo después de `drawSprite(ctx, img, "paddle", ...)`. Repetir el
     mismo patrón para la pelota con `tint!.ball`.
7. Envolver el `return` de `ArkanoidGame` (L486-488) en un `<div style={{ position: "relative", width:
"100%", height: "100%" }}>` que contenga el `<canvas>` existente sin cambios y
   `<SkinSwitcher gameId="arkanoid" skin={skin} onChange={setSkin} />`.
8. `npm run build` para confirmar que todo compila y tipa.

## Acceptance criteria

- [ ] `npm run build` termina sin errores.
- [ ] Con el skin `clasico` activo (default, sin tocar nada), Arkanoid se ve pixel-idéntico al estado
      actual antes de este spec (spritesheet sin tintar).
- [ ] `<SkinSwitcher>` aparece como un pill en la esquina inferior derecha del canvas de Arkanoid, con
      las 3 opciones `Clásico`/`Neón`/`Retro`, y no interfiere con el control de la pala por
      `mousemove` (mover el mouse sobre el pill no mueve la pala).
- [ ] Elegir `neon` cambia el fondo a `#05050b`, tiñe pala/pelota de cian (`#00f5ff`) con halo visible,
      y tiñe los bloques según `blockColors` (amarillo, cian, magenta o verde según su nombre
      original), sin perder la forma de cada sprite.
- [ ] Elegir `retro` cambia el fondo a `#140d00`, tiñe pala/pelota/bloques solo con tonos ámbar de la
      rampa (`#ffb000`, `#cc8800`, `#996600`), sin halo.
- [ ] Un bloque `gray` y su animación de explosión se ven del mismo color entre sí en cualquier skin
      (restricción técnica documentada arriba).
- [ ] Cambiar de skin en medio de una partida no reinicia la pala, la pelota, los bloques vivos, el
      score, las vidas ni el nivel — solo cambia el color en el siguiente frame.
- [ ] Recargar la página después de elegir `neon` o `retro` conserva ese skin (persistencia en
      `localStorage['av_skin_arkanoid']`), sin parpadeo de hidratación en consola.
- [ ] Montar dos instancias de Arkanoid con distinto skin (o cambiar de skin, desmontar y volver a
      montar) no filtra el tinte de una hacia la otra — cada montaje lee su propia entrada de
      `tintedCache`, construida una sola vez a partir del mismo `rawImg`.
- [ ] Los demás juegos (Asteroids, Snake, Tetris) no cambian de aspecto ni de comportamiento — este
      spec no los toca.

## Decisions

- **Sí:** tinte por región con `ctx.globalCompositeOperation = "source-atop"` recortado con
  `ctx.clip()`, en vez de un tinte plano sobre todo el spritesheet — un tinte único global perdería la
  distinción entre los 7 colores de bloque, que el juego usa para leer patrones de nivel. Teñir región
  por región conserva esa variedad dentro de los tonos permitidos por cada skin.
- **Sí:** `tintedCache: Map<SkinId, HTMLCanvasElement>` construido una sola vez al cargar el
  spritesheet, con las 3 variantes ya listas antes de arrancar el loop — evita reconstruir el tinte en
  cada cambio de skin y evita el bug de fuga entre montajes que tenían los globals `ssImg`/`ssLoaded`
  compartidos.
- **Sí:** `tint: null` en `clasico` en vez de un objeto con hex "aproximados" — no hay forma honesta de
  extraer el hex exacto de un píxel de PNG sin inspeccionar el asset, y no hace falta: `clasico` usa el
  canvas crudo sin ninguna operación de tinte, así que es pixel-idéntico por construcción, no por
  aproximación.
- **Sí:** `blockColors.gray === blockColors.red` en `neon` y `retro` — restricción heredada de
  `EXPLOSION_FRAMES.gray` compartiendo rectángulo de píxeles con `EXPLOSION_FRAMES.red` en el
  spritesheet original (ver "Data model"); no es una limitación introducida por este spec.
- **Sí:** el tinte reemplaza el sombreado/degradado interno del sprite original (bisel, luces) por un
  color plano de silueta — coherente con la identidad `retro` (bordes duros, sin degradados) y
  aceptable en `neon` porque el halo (`shadowBlur`) compensa visualmente la pérdida de textura en pala
  y pelota; los bloques, al ser rectángulos simples, no pierden legibilidad.
- **No:** halo en los bloques — a diferencia de pala/pelota/nave (formas únicas y grandes), hay hasta
  60 bloques simultáneos en pantalla; darles halo individual sería ruido visual, no una mejora.
- **No:** reconstruir `tintedCache` en cada cambio de skin — se construye una sola vez al cargar el
  spritesheet (las 3 variantes son estáticas, no dependen de estado de partida).
- **No:** persistir el skin en Supabase — vive en `localStorage`, coherente con SPEC 10/11 y con que
  Arcade Vault no tiene sesión real todavía (`/login` es mock).
- **No:** tocar `game-player.tsx` — el pill lo renderiza el propio `arkanoid-game.tsx`, como indica el
  contrato de arquitectura de SPEC 10.

## What is **not** in this spec

- Skins de Tetris — su propio `specs/NN-skins-<slug>.md`.
- Cualquier cambio al spritesheet PNG (`public/arkanoid/spritesheet-breakout.png`) o a los niveles.
- Recuperar el sombreado/degradado interno de los sprites tras el tinte.
- Persistencia de skin por cuenta de usuario.
- Transiciones animadas entre skins.

## Último paso

Actualizar `references/game-with-themes.md`: mover `ARKANOID` de `## Sin skins` a `## Con skins` con
este número de spec, la fecha real y las 3 paletas con sus ratios de contraste. La línea de estado de
infraestructura ya dice "existe" (creada por SPEC 10) — no requiere cambio.
