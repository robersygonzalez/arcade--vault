# SPEC 14 — Skins de Frogger (clásico / neón / retro)

> **Status:** Draft
> **Depends on:** `specs/game-jam/frogger/01-frogger-core.md` (Frogger real), SPEC 10 (infraestructura compartida de skins, `components/games/skins.tsx`)
> **Date:** 2026-09-02
> **Objective:** Añadir la entrada de Frogger al mapa de paletas compartido y skinear `components/frogger-game.tsx` con los 3 skins obligatorios — `clasico`, `neon`, `retro`.

## Por qué este spec existe

`components/games/skins.tsx` ya existe — lo creó SPEC 10 (Asteroids, el primer juego skineado; ver
`references/game-with-themes.md`, línea de estado de infraestructura). Este spec **no redefine el
contrato**: reutiliza `SkinId`, `SKIN_ORDER`, `SKIN_LABELS`, `useGameSkin`, `SkinSwitcher` tal como
están (citados por referencia, literales exactos en `components/games/skins.tsx` líneas 1-68). Solo
añade `FroggerPalette`, `FROGGER_SKINS` y la entrada `frogger` en `GAME_SKINS`, y adapta
`components/frogger-game.tsx`.

Frogger es 100% vectorial (`fillRect`/`strokeRect`/`arc`/`ellipse`, sin spritesheets) — el más
directo de skinear, como Asteroids. La diferencia notable frente a los 4 juegos ya skineados es que
Frogger **no tiene un único color de fondo de canvas**: `zoneColor(row)` pinta 3 fondos distintos
según la fila (carretera `#111318`, río `#00202c`, zonas seguras/metas `#0a2f1a`), una distinción
visual que es parte del lenguaje del juego (el jugador lee dónde está el peligro por el color de
fondo). Por eso este spec trata las 3 zonas como **3 campos de fondo por skin** en vez de un único
`background`, a diferencia de `AsteroidsPalette`/`SnakePalette`/`ArkanoidPalette` — ver "Decisions".

## Scope

**In:**

- Definir `FroggerPalette` y `FROGGER_SKINS` (los 3 skins) en `components/games/skins.tsx`, y
  registrar `frogger: FROGGER_SKINS` en el `GAME_SKINS` existente (sin tocar las entradas
  `asteroides`, `snake`, `arkanoid` ya presentes).
- Modificar `components/frogger-game.tsx` para leer sus ~19 literales de color desde la paleta activa
  vía un `skinRef` (patrón espejo por ref, igual que `onStatsChangeRef`/`onGameOverRef`, líneas
  164-178 actuales), sin reiniciar el `useEffect` principal (línea 190, deps `[]`) ni la partida en
  curso.
- Halo neón vía `ctx.shadowBlur`/`ctx.shadowColor` en auto, camión, tronco, tortuga, rana y el
  borde/punto de meta cuando el skin activo es `neon`. HUD, fondos de zona y línea de carril
  **no** llevan halo — ver "Decisions".
- Elevar el alpha de "tortuga sumergida" (`0.35` en `clasico`, hoy hardcodeado en el `draw()`) a un
  campo de paleta `turtleSubmergedAlpha`, para poder subirlo en `neon`/`retro` lo suficiente como
  para pasar el mínimo de contraste sin perder la señal visual de "menos visible" — ver
  "Data model" y "Decisions".
- Renderizar `<SkinSwitcher gameId="frogger" skin={skin} onChange={setSkin} />` sobre el canvas,
  esquina inferior derecha.

**Out of scope:**

- Cualquier otro juego — cada uno ya tiene o tendrá su propio `specs/NN-skins-<slug>.md`.
- Persistir el skin elegido en Supabase o asociarlo a una cuenta de usuario — vive solo en
  `localStorage`, por diseño (igual que SPEC 10).
- Animaciones de transición entre skins, sonido o feedback háptico al cambiar de skin.
- Redefinir `SkinId`, `useGameSkin`, `SkinSwitcher` o cualquier otra pieza del contrato de SPEC 10 —
  se importan tal cual desde `@/components/games/skins`.
- Cambiar la lógica de juego de `frogger-game.tsx` (colisiones, temporizador, niveles) — solo se
  tocan literales de color y el nuevo campo `turtleSubmergedAlpha`, que sustituye un número
  hardcodeado por el mismo número leído desde la paleta (sin cambio de comportamiento en `clasico`).

## Data model

Contrato reutilizado sin cambios, importado de `@/components/games/skins` (definido en SPEC 10,
`components/games/skins.tsx` líneas 1-68): `SkinId`, `SKIN_ORDER`, `SKIN_LABELS`, `useGameSkin`,
`SkinSwitcher`.

Paleta de Frogger — un campo por literal de color censado en `components/frogger-game.tsx`
(`fillStyle`/`strokeStyle`, líneas 386-517: `zoneColor()` L386-388, `drawZones()` L393/396,
`drawGoals()` L413/415/419, `drawEntity()` L433/435/443/445/448/450/463, `drawFrog()` L484/488/495,
`drawHud()` L505/513/517), más `turtleSubmergedAlpha` (sustituye el `0.35` hardcodeado de L462) y
`glowBlur` (mismo patrón que en `AsteroidsPalette`/`SnakePalette`/`ArkanoidPalette`: `0` desactiva el
halo, `>0` lo activa):

```ts
// añadir a components/games/skins.tsx, debajo de GAME_SKINS existente (o antes, reordenando el
// objeto final — el orden de las claves de GAME_SKINS no importa)
export type FroggerPalette = {
  roadBg: string;
  riverBg: string;
  safeBg: string;
  laneDivider: string; // strokeStyle listo para usar (puede incluir rgba con alpha ya resuelto)
  carBody: string;
  carWheel: string;
  truckBody: string;
  truckCabin: string;
  logBody: string;
  logVein: string;
  turtleBody: string;
  turtleSubmergedAlpha: number; // reemplaza el 0.35 hardcodeado de L462 (ctx.globalAlpha)
  frogBody: string;
  frogEyeWhite: string;
  frogEyePupil: string;
  goalFill: string;
  goalBorder: string;
  goalFilledDot: string;
  hudText: string;
  hudLives: string;
  hudTimerGood: string;
  hudTimerWarn: string;
  hudTimerBad: string;
  glowBlur: number;
};

export const FROGGER_SKINS: Record<SkinId, FroggerPalette> = {
  clasico: {
    roadBg: "#111318",
    riverBg: "#00202c",
    safeBg: "#0a2f1a",
    laneDivider: "rgba(245, 255, 0, 0.35)",
    carBody: "#ff006e",
    carWheel: "#000000",
    truckBody: "#8a8a92",
    truckCabin: "#00f5ff",
    logBody: "#5a3616",
    logVein: "#3a2210",
    turtleBody: "#00ff88",
    turtleSubmergedAlpha: 0.35,
    frogBody: "#00ff88",
    frogEyeWhite: "#ffffff",
    frogEyePupil: "#000000",
    goalFill: "#0d3d20",
    goalBorder: "#f5ff00",
    goalFilledDot: "#00ff88",
    hudText: "#ffffff",
    hudLives: "#00ff88",
    hudTimerGood: "#00ff88",
    hudTimerWarn: "#f5ff00",
    hudTimerBad: "#ff006e",
    glowBlur: 0,
  },
  neon: {
    roadBg: "#05050b",
    riverBg: "#020814",
    safeBg: "#020f0a",
    laneDivider: "rgba(245, 255, 0, 0.40)",
    carBody: "#ff006e",
    carWheel: "#000000",
    truckBody: "#00f5ff",
    truckCabin: "#f5ff00",
    logBody: "#f5ff00",
    logVein: "rgba(0, 0, 0, 0.35)",
    turtleBody: "#00ff88",
    turtleSubmergedAlpha: 0.42,
    frogBody: "#00ff88",
    frogEyeWhite: "#ffffff",
    frogEyePupil: "#000000",
    goalFill: "#04241a",
    goalBorder: "#f5ff00",
    goalFilledDot: "#00ff88",
    hudText: "#ffffff",
    hudLives: "#00ff88",
    hudTimerGood: "#00ff88",
    hudTimerWarn: "#f5ff00",
    hudTimerBad: "#ff006e",
    glowBlur: 10,
  },
  retro: {
    roadBg: "#140d00",
    riverBg: "#1a1100",
    safeBg: "#0f0900",
    laneDivider: "#cc8800",
    carBody: "#ffb000",
    carWheel: "#996600",
    truckBody: "#cc8800",
    truckCabin: "#ffb000",
    logBody: "#996600",
    logVein: "#140d00",
    turtleBody: "#ffb000",
    turtleSubmergedAlpha: 0.48,
    frogBody: "#ffb000",
    frogEyeWhite: "#cc8800",
    frogEyePupil: "#996600",
    goalFill: "#1c1400",
    goalBorder: "#ffb000",
    goalFilledDot: "#cc8800",
    hudText: "#ffb000",
    hudLives: "#ffb000",
    hudTimerGood: "#996600",
    hudTimerWarn: "#cc8800",
    hudTimerBad: "#ffb000",
    glowBlur: 0,
  },
};
```

Modificar la constante `GAME_SKINS` existente (`components/games/skins.tsx`) para incluir la nueva
entrada, sin tocar las demás:

```ts
export const GAME_SKINS = {
  asteroides: ASTEROIDS_SKINS,
  snake: SNAKE_SKINS,
  arkanoid: ARKANOID_SKINS,
  frogger: FROGGER_SKINS,
} as const;
```

### Paletas y contraste (WCAG, mínimo 3:1 contra el fondo de su propia zona)

A diferencia de los juegos anteriores (un solo fondo de canvas), Frogger valida cada color contra el
fondo de **su** zona: carretera (`roadBg`) para autos/camiones/línea de carril, río (`riverBg`) para
troncos/tortugas, zonas seguras (`safeBg`) para la rana en reposo, el HUD y las metas. La rana se
valida contra las 3, porque cruza las 3 zonas. `goalFill` es un panel decorativo (like un fondo de
segundo plano dentro de la fila de metas) — no se valida contra `safeBg` por la misma razón que los
fondos de zona no se validan entre sí; lo que sí debe leerse es su contenido (`goalBorder`,
`goalFilledDot`), y ambos se validan contra `goalFill`. Accesorios puramente decorativos dibujados
encima de una forma ya sólida (`carWheel` sobre `carBody`, `truckCabin` sobre `truckBody`, `logVein`
sobre `logBody`, `frogEyeWhite`/`frogEyePupil` sobre `frogBody`) no se validan de forma independiente
— no son información legible por sí solos, son detalle sobre una forma que ya pasó su propia
validación.

**`clasico`** (colores actuales de `frogger-game.tsx`, sin cambio de aspecto — **congelado incluso
donde no alcanza 3:1**, ver nota abajo):

| Elemento                           | Color                         | Fondo                         | Contraste                 |
| ---------------------------------- | ----------------------------- | ----------------------------- | ------------------------- |
| Línea de carril (carretera)        | `rgba(245,255,0,0.35)`        | `#111318`                     | 3.02 : 1                  |
| Auto                               | `#ff006e`                     | `#111318`                     | 4.85 : 1                  |
| Camión (cuerpo)                    | `#8a8a92`                     | `#111318`                     | 5.42 : 1                  |
| Tronco                             | `#5a3616`                     | `#00202c`                     | **1.59 : 1 (no pasa)**    |
| Tortuga (visible)                  | `#00ff88`                     | `#00202c`                     | 12.60 : 1                 |
| Tortuga (sumergida, α 0.35)        | `#00ff88` @ 0.35              | `#00202c`                     | **2.68 : 1 (no pasa)**    |
| Rana                               | `#00ff88`                     | `#0a2f1a`/`#111318`/`#00202c` | 10.92 / 13.86 / 12.60 : 1 |
| Borde de meta                      | `#f5ff00`                     | `#0d3d20`                     | 11.25 : 1                 |
| Punto de meta cubierta             | `#00ff88`                     | `#0d3d20`                     | 9.18 : 1                  |
| HUD (texto/vidas)                  | `#ffffff` / `#00ff88`         | `#0a2f1a`                     | 14.64 / 10.92 : 1         |
| Barra de tiempo (buena/media/mala) | `#00ff88`/`#f5ff00`/`#ff006e` | `#0a2f1a`                     | 10.92 / 13.38 / 3.82 : 1  |

**Nota de congelamiento:** el tronco (`#5a3616` sobre `#00202c`, 1.59:1) y la tortuga sumergida
(2.68:1) ya están por debajo de 3:1 en el juego real de hoy. `clasico` es por definición "exactamente
los colores que el juego ya tiene, congelados" — no se tocan aquí. `neon` y `retro`, al ser paletas
nuevas, sí deben pasar 3:1 en los equivalentes (ver abajo) y lo pasan.

**`neon`** (fondos azul-negro por zona en vez de negro puro, tokens de `app/globals.css:4-22` + halo):

| Elemento                           | Color                         | Fondo                         | Contraste                 |
| ---------------------------------- | ----------------------------- | ----------------------------- | ------------------------- |
| Línea de carril (carretera)        | `rgba(245,255,0,0.40)`        | `#05050b`                     | 3.46 : 1                  |
| Auto                               | `#ff006e`                     | `#05050b`                     | 5.30 : 1                  |
| Camión (cuerpo)                    | `#00f5ff`                     | `#05050b`                     | 15.01 : 1                 |
| Tronco                             | `#f5ff00`                     | `#020814`                     | 18.32 : 1                 |
| Tortuga (visible)                  | `#00ff88`                     | `#020814`                     | 14.95 : 1                 |
| Tortuga (sumergida, α 0.42)        | `#00ff88` @ 0.42              | `#020814`                     | 3.25 : 1                  |
| Rana                               | `#00ff88`                     | `#05050b`/`#020814`/`#020f0a` | 15.16 / 14.95 / 14.56 : 1 |
| Borde de meta                      | `#f5ff00`                     | `#04241a`                     | 15.08 : 1                 |
| Punto de meta cubierta             | `#00ff88`                     | `#04241a`                     | 12.31 : 1                 |
| HUD (texto/vidas)                  | `#ffffff` / `#00ff88`         | `#020f0a`                     | 19.53 / 14.56 : 1         |
| Barra de tiempo (buena/media/mala) | `#00ff88`/`#f5ff00`/`#ff006e` | `#020f0a`                     | 14.56 / 17.84 / 5.09 : 1  |

`glowBlur: 10`, `shadowColor` = el propio color de cada entidad (auto, camión, tronco, tortuga, rana,
borde/punto de meta) — mismo criterio que SPEC 10/11/12 (halo coherente por entidad, no un color fijo
compartido). El fondo de zona (`roadBg`/`riverBg`/`safeBg`) se aclaró de negro puro a un azul-negro
propio por zona para que el halo tenga dónde sangrar, conservando la distinción de zona (ver
"Decisions").

**Ajuste registrado (línea de carril):** el alpha de referencia de `clasico` (`0.35`) sobre
`#05050b` da 2.90:1, no alcanza 3:1 — se sube a `0.40` (3.46:1).

**Ajuste registrado (tortuga sumergida):** el alpha de referencia de `clasico` (`0.35`) sobre
`#020814` da 2.55:1, no alcanza 3:1 — se sube a `0.42` (3.25:1), suficientemente por debajo del
14.95:1 de la tortuga visible como para conservar la señal de "menos visible".

**`retro`** (fósforo CRT ámbar, 3 tonos, sin halo, sin degradados, bordes duros; fondos de zona
diferenciados solo por luminancia dentro de la misma familia ámbar-negro, no por matiz — ver
"Decisions"):

| Elemento                           | Color                         | Fondo                         | Contraste                 |
| ---------------------------------- | ----------------------------- | ----------------------------- | ------------------------- |
| Línea de carril (carretera)        | `#cc8800`                     | `#140d00`                     | 6.52 : 1                  |
| Auto                               | `#ffb000`                     | `#140d00`                     | 10.54 : 1                 |
| Camión (cuerpo)                    | `#cc8800`                     | `#140d00`                     | 6.52 : 1                  |
| Tronco                             | `#996600`                     | `#1a1100`                     | 3.79 : 1                  |
| Tortuga (visible)                  | `#ffb000`                     | `#1a1100`                     | 10.20 : 1                 |
| Tortuga (sumergida, α 0.48)        | `#ffb000` @ 0.48              | `#1a1100`                     | 3.21 : 1                  |
| Rana                               | `#ffb000`                     | `#140d00`/`#1a1100`/`#0f0900` | 10.54 / 10.20 / 10.82 : 1 |
| Borde de meta                      | `#ffb000`                     | `#1c1400`                     | 9.97 : 1                  |
| Punto de meta cubierta             | `#cc8800`                     | `#1c1400`                     | 6.17 : 1                  |
| HUD (texto/vidas)                  | `#ffb000`                     | `#0f0900`                     | 10.82 : 1                 |
| Barra de tiempo (buena/media/mala) | `#996600`/`#cc8800`/`#ffb000` | `#0f0900`                     | 4.02 / 6.69 / 10.82 : 1   |

`glowBlur: 0`, sin halo, sin degradados.

**Reutilización de la rampa retro de SPEC 10:** los 3 tonos ámbar (`#ffb000`/`#cc8800`/`#996600`) son
los mismos que ya validó y ajustó SPEC 10 para Asteroids (`#996600` ya sustituye ahí al `#7a4f00` de
referencia por no alcanzar 3:1). Se confirma aquí de nuevo contra los fondos de zona propios de
Frogger porque no son el mismo fondo (`#140d00`/`#1a1100`/`#0f0900` en vez de un único `#140d00`):
el tronco (`#996600` sobre `#1a1100`) da 3.79:1, y `#7a4f00` sobre el mismo fondo da solo 2.62:1 — se
descarta por la misma razón que en SPEC 10.

**Ajuste registrado (tortuga sumergida, retro):** el alpha de referencia de `clasico` (`0.35`) sobre
`#1a1100` da 2.28:1 — se sube a `0.48` (3.21:1).

**Barra de tiempo invertida en retro:** en `clasico`/`neon`, "bueno" es el tono más suave (verde) y
"malo" el más llamativo (magenta). En `retro`, con solo una rampa ámbar disponible, se invierte el
mapeo de brillo: "bueno" usa el tono más oscuro (`#996600`) y "malo" el más brillante (`#ffb000`),
para que la urgencia siga leyéndose como "más brillo = más atención" en vez de perderse dentro de la
misma familia de color. Documentado también en "Decisions".

## Implementation plan

1. En `components/games/skins.tsx`, añadir `FroggerPalette` y `FROGGER_SKINS` (literales exactos de
   la sección "Data model" arriba) y actualizar `GAME_SKINS` para incluir `frogger: FROGGER_SKINS`
   junto a las 3 entradas existentes. Manual test: el archivo sigue compilando (`tsc --noEmit` o
   build parcial).
2. En `components/frogger-game.tsx`, importar `useGameSkin`, `SkinSwitcher`, `FROGGER_SKINS` desde
   `@/components/games/skins`. Al nivel del componente (junto a los `useRef` existentes en líneas
   163-170), llamar `const [skin, setSkin] = useGameSkin("frogger")` y crear
   `const skinRef = useRef(FROGGER_SKINS[skin])` + `useEffect(() => { skinRef.current = FROGGER_SKINS[skin]; }, [skin])`
   — mismo patrón espejo por ref que `onStatsChangeRef`/`onGameOverRef` (líneas 172-178 actuales),
   para que el `useEffect` principal (línea 190, deps `[]`) no se reinicie ni reinicie la partida en
   curso cuando cambia el skin.
3. En `zoneColor(row)` (L385-389), reemplazar los 3 literales por lecturas de `skinRef.current`:
   road → `skinRef.current.roadBg`, río → `skinRef.current.riverBg`, resto → `skinRef.current.safeBg`.
4. En `drawZones()` (L391-406), reemplazar `"rgba(245, 255, 0, 0.35)"` (L396) por
   `skinRef.current.laneDivider`.
5. En `drawGoals()` (L408-425), reemplazar `"#0d3d20"` (L413) → `skinRef.current.goalFill`,
   `"#f5ff00"` (L415) → `skinRef.current.goalBorder`, `"#00ff88"` (L419) →
   `skinRef.current.goalFilledDot`.
6. En `drawEntity()` (L427-470), reemplazar:
   - `"#ff006e"` (L433, auto) → `skinRef.current.carBody`.
   - `"#000"` (L435, ruedas) → `skinRef.current.carWheel`.
   - `"#8a8a92"` (L443, camión cuerpo) → `skinRef.current.truckBody`.
   - `"#00f5ff"` (L445, camión cabina) → `skinRef.current.truckCabin`.
   - `"#5a3616"` (L448, tronco) → `skinRef.current.logBody`.
   - `"#3a2210"` (L450, vetas) → `skinRef.current.logVein`.
   - `"#00ff88"` (L463, tortuga) → `skinRef.current.turtleBody`.
   - `entity.submerged ? 0.35 : 1` (L462, `ctx.globalAlpha`) →
     `entity.submerged ? skinRef.current.turtleSubmergedAlpha : 1`.
7. En `drawFrog()` (L472-502), reemplazar `"#00ff88"` (L484) → `skinRef.current.frogBody`, `"#fff"`
   (L488) → `skinRef.current.frogEyeWhite`, `"#000"` (L495) → `skinRef.current.frogEyePupil`.
8. En `drawHud()` (L504-519), reemplazar `"#fff"` (L505, score/nivel) → `skinRef.current.hudText`,
   `"#00ff88"` (L513, vidas) → `skinRef.current.hudLives`, y el ternario de la barra de tiempo (L517,
   `frac > 0.5 ? "#00ff88" : frac > 0.2 ? "#f5ff00" : "#ff006e"`) →
   `frac > 0.5 ? skinRef.current.hudTimerGood : frac > 0.2 ? skinRef.current.hudTimerWarn : skinRef.current.hudTimerBad`.
9. Agregar el halo neón: en `drawEntity()` (auto, camión, tronco, tortuga) y en `drawFrog()`, y en el
   `strokeRect`/`ellipse` de meta cubierta dentro de `drawGoals()` — si `skinRef.current.glowBlur > 0`
   setear `ctx.shadowBlur = skinRef.current.glowBlur` y `ctx.shadowColor` igual al color que se está
   por dibujar (no un color fijo compartido); resetear `ctx.shadowBlur = 0` inmediatamente después de
   cada trazo. El fondo de zona (`drawZones()`), la línea de carril, y el HUD (`drawHud()`) **no**
   llevan halo — ver "Decisions". Confirmar que `ctx.shadowBlur` queda en `0` antes de
   `drawZones()` en el siguiente frame, para que el halo del frame anterior nunca manche los
   `fillRect` de fondo.
10. Envolver el `return` de `FroggerGame` (línea 616-625) — que ya tiene un `<div style={{ position:
"relative", ... }}>` — agregando `<SkinSwitcher gameId="frogger" skin={skin} onChange={setSkin} />`
    junto al `<canvas>` existente sin cambios.
11. `npm run build` para confirmar que todo compila y tipa.

## Acceptance criteria

- [ ] `npm run build` termina sin errores.
- [ ] Con el skin `clasico` activo (default, sin tocar nada), Frogger se ve pixel-idéntico al estado
      actual antes de este spec, incluida la tortuga sumergida al 35% de opacidad.
- [ ] `<SkinSwitcher>` aparece como un pill en la esquina inferior derecha del canvas de Frogger, con
      las 3 opciones `Clásico`/`Neón`/`Retro`.
- [ ] Elegir `neon` cambia los 3 fondos de zona a sus variantes azul-negro (`#05050b`/`#020814`/`#020f0a`),
      colorea las entidades con los tokens del sitio, y agrega halo (`shadowBlur`) visible en auto,
      camión, tronco, tortuga, rana y meta cubierta — sin halo en fondo de zona, línea de carril ni
      HUD.
- [ ] Elegir `retro` cambia los 3 fondos de zona a variantes ámbar-negro
      (`#140d00`/`#1a1100`/`#0f0900`), usa solo los 3 tonos de la rampa (`#ffb000`/`#cc8800`/`#996600`)
      en toda entidad y en el HUD, y no muestra ningún halo ni degradado.
- [ ] La tortuga sumergida sigue siendo visiblemente más tenue que la tortuga visible en los 3 skins
      (contraste bajo por diseño en `clasico`, ≥3:1 en `neon`/`retro`).
- [ ] Cambiar de skin en medio de una partida no reinicia la rana, el score, el nivel, las entidades
      en pantalla ni el temporizador de la ronda — solo cambia el color en el siguiente frame.
- [ ] Recargar la página después de elegir `neon` o `retro` conserva ese skin (persistencia en
      `localStorage['av_skin_frogger']`), sin parpadeo de hidratación en consola.
- [ ] Los demás juegos (Asteroids, Tetris, Arkanoid, Snake) no cambian de aspecto ni de comportamiento
      — este spec no los toca.

## Decisions

- **Sí:** reutilizar el contrato completo de `components/games/skins.tsx` de SPEC 10 sin
  modificarlo — solo se añaden `FroggerPalette`/`FROGGER_SKINS` y una clave a `GAME_SKINS`.
- **Sí:** modelar 3 fondos de zona (`roadBg`/`riverBg`/`safeBg`) en vez de un único `background`,
  a diferencia de los otros 3 juegos ya skineados. Frogger es el único de los 4 donde el fondo
  codifica información de juego (carretera vs. río vs. zona segura) — colapsarlo a un solo color
  perdería esa lectura, incluso siendo puramente cosmético el cambio de skin.
- **Sí:** en `neon`, aclarar los 3 fondos de zona de sus tonos originales a variantes azul-negro
  (`#05050b`/`#020814`/`#020f0a`) en vez de reusar los literales de `clasico` — sigue la regla de
  identidad de `neon` ("fondo azul-negro en vez de negro puro para que el halo sangre") aplicada a
  cada zona, preservando la distinción de zona con 3 tonos de la misma familia fría.
- **Sí:** en `retro`, diferenciar los 3 fondos de zona solo por luminancia dentro de la misma familia
  ámbar-negro (`#140d00`/`#1a1100`/`#0f0900`), no por matiz — mantiene el espíritu "monocromo" de la
  identidad retro (una sola familia de color en toda la pantalla) sin sacrificar la legibilidad de
  zona.
- **Sí:** subir `turtleSubmergedAlpha` de `0.35` (clasico) a `0.42` (neon) y `0.48` (retro) — el valor
  de referencia no alcanza 3:1 contra ninguno de los 2 fondos de río nuevos; se sube lo mínimo
  necesario para pasar el umbral (con margen) sin igualar el alpha de la tortuga visible, conservando
  la señal de "está sumergida, es menos segura".
- **Sí:** subir el alpha de la línea de carril de `0.35` a `0.40` en `neon` por la misma razón
  (`0.35` da 2.90:1 contra `#05050b`, no pasa). En `retro` se usa un color sólido sin alpha
  (`#cc8800`), coherente con "sin degradados, bordes duros" de la identidad retro.
- **Sí:** invertir el mapeo de brillo de la barra de tiempo en `retro` (bueno = tono oscuro, malo =
  tono brillante) — con una sola familia de color disponible, el brillo es la única señal de urgencia
  que queda; se prioriza que "más brillo = más peligro" siga leyéndose sobre imitar literalmente el
  mapeo verde/amarillo/magenta de `clasico`/`neon`, que no existe en la rampa ámbar.
- **Sí:** reutilizar exactamente los 3 tonos ámbar de SPEC 10 (`#ffb000`/`#cc8800`/`#996600`) — mismo
  criterio que SPEC 11/12, coherencia visual entre juegos con el mismo skin activo; se recalculó el
  contraste contra los fondos de zona propios de Frogger porque no son literalmente el mismo fondo.
- **No:** validar independientemente accesorios decorativos dibujados sobre una forma ya sólida
  (`carWheel`, `truckCabin`, `logVein`, `frogEyeWhite`/`frogEyePupil`) — no son información legible
  por sí solos.
- **No:** aplicar halo neón al fondo de zona, la línea de carril o el HUD — el halo se reserva a las
  entidades de juego (auto, camión, tronco, tortuga, rana, meta cubierta) para que el texto del HUD
  se mantenga nítido y el fondo nunca se manche.
- **No:** congelar `clasico` para "arreglar" el tronco (1.59:1) o la tortuga sumergida (2.68:1), que
  hoy no alcanzan 3:1 contra sus fondos — `clasico` es por definición el estado actual del juego sin
  cambios; el ajuste vive solo en `neon`/`retro`, paletas nuevas donde sí se exige el mínimo.
- **No:** persistir el skin en Supabase — vive en `localStorage`, coherente con SPEC 10 y con que
  Arcade Vault no tiene sesión real todavía (`/login` es mock).
- **No:** tocar `game-player.tsx` — el pill lo renderiza el propio `frogger-game.tsx`, como indica el
  contrato de arquitectura de SPEC 10.

## What is **not** in this spec

- Skins de otros juegos — cada uno en su propio `specs/NN-skins-<slug>.md`.
- Cualquier cambio a la lógica de juego, colisiones, niveles o temporizador de Frogger.
- Persistencia de skin por cuenta de usuario.
- Transiciones animadas entre skins.

## Último paso

Actualizar `references/game-with-themes.md`: mover `FROGGER` de (agregar primero a) `## Sin skins` a
`## Con skins` con este número de spec, la fecha real y las 3 paletas con sus ratios de contraste. La
línea de estado de infraestructura ya dice "existe" (creada por SPEC 10) — no requiere cambio.
