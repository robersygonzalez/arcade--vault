# SPEC 15 — Arreglo móvil: zona jugador (CRT + HUD + controles táctiles)

> **Status:** Implementado
> **Depends on:** SPEC 13 (Controles táctiles — input, no se reabre), SPEC 05/07/08/09 (los 4 juegos
> reales originales), `specs/game-jam/frogger/01-frogger-core.md` (Frogger, sin `TOUCH_CONTROLS`)
> **Date:** 2026-09-02
> **Objective:** Arreglar el layout/viewport/crispness de la zona jugador (`.crt`, `.touch-controls`,
> `SkinSwitcher`, los 5 canvases reales) para el presupuesto móvil de 320–414px, sin tocar nada de
> input táctil ya resuelto por SPEC 13.

## Por qué este spec existe

`references/mobile-audit.md` trae la zona JUGADOR pendiente desde antes de que existiera Frogger, con
cuatro hallazgos ya confirmados releyendo el código actual: `.touch-pause-btn` (posición absoluta,
`top:8; right:20`) comparte columna con `.touch-actions`; `.touch-controls` pide 296px totales
(padding 40 + dpad 164 + gap 16 + actions 76) pero a 320px de viewport solo hay 288px en `.av-player`
(`app/globals.css:1693-1695`, `padding:0 16px 32px` bajo `max-width:720px`) — 8px de déficit real; `.crt`
nunca reduce su `padding:24px` (`app/globals.css:1011-1021`), así que a 320px el área jugable
(`.crt-screen`) mide 240×180px; y ningún canvas escala por `devicePixelRatio`.

Frogger (`components/frogger-game.tsx`) añade una quinta superficie a esta zona con dos problemas
propios: su canvas es 640×560 (8:7 ≈ 1.1428) mientras `.crt-screen` fuerza `aspect-ratio: 4/3`
(`app/globals.css:1031`) y su `<canvas>` usa `style={{ width: "100%", height: "100%" }}`
(`frogger-game.tsx:622`) sin preservar proporción — el frame CRT lo **estira de forma no uniforme**,
deformando las celdas de 40×40px en rectángulos, en cualquier ancho, no solo móvil. Frogger no tiene
entrada en `TOUCH_CONTROLS` (`components/games/registry.ts:44-68`) — eso es una brecha de **input**,
no de layout, y queda fuera de este spec (ver "Out of scope").

Auditando el resto de la zona junto con Frogger aparece un quinto hallazgo no listado todavía en el
registro: el canvas de vista previa de Tetris (`tetris-game.tsx:431-442`, `NEXT_BLOCK*4` = 96×96px
fijos, `position:absolute; top:8; right:8`, sin clase CSS) se solapa con el canvas principal del juego
cuando `.crt-screen` mide menos de ~333px de ancho — con la matemática actual eso ocurre en **todo** el
rango 320–414px (`.crt-screen` mide 240px a 320px de viewport y 334px a 414px, ambos por debajo o al
límite del umbral).

## Scope

**In:**

- Reestructurar `.touch-controls` (`app/globals.css:1091-1195`) para que `.touch-pause-btn` deje de ser
  `position:absolute` y pase a ocupar su propia fila — elimina el riesgo de solape con `.touch-actions`
  por construcción, sin tocar el despacho de `KeyboardEvent` sintéticos de `touch-controls.tsx` (eso es
  SPEC 13).
- Reducir el presupuesto horizontal de `.touch-controls` a ≤520px de viewport (padding y gap) para
  cerrar el déficit de 8px a 320px, reutilizando el breakpoint `520` ya existente en la hoja.
- Reducir `.crt { padding }` a ≤520px de viewport, reutilizando el mismo breakpoint, para crecer el área
  jugable real (`.crt-screen`) sin tocar `aspect-ratio: 4/3`.
- Unificar el ajuste de los 5 `<canvas>` de juego (`asteroids-game.tsx`, `tetris-game.tsx` ×2,
  `arkanoid-game.tsx`, `snake-game.tsx`, `frogger-game.tsx`) a `object-fit: contain` vía una clase CSS
  compartida `.game-canvas` — corrige la deformación de Frogger y el letterboxing manual de Tetris con
  la misma regla; no cambia nada en Asteroids/Snake/Arkanoid porque su canvas ya es 4:3 exacto (800×600).
- Reposicionar/reducir el canvas de vista previa de Tetris (`tetris-game.tsx:431-442`) a ≤520px de
  viewport para que deje de solapar el canvas principal.
- Escalar la resolución real (backing store) de los 5 canvases por `devicePixelRatio` (tope en 3×) vía
  un helper compartido nuevo, para que no se vean borrosos en teléfonos de alta densidad — incluye el
  ajuste companion en `arkanoid-game.tsx:359` (`scaleX = canvas.width / rect.width` deja de ser válido
  tras el cambio y debe usar la constante lógica `W`, no `canvas.width`).
- Dar objetivo táctil ≥44×44px a los 3 botones de `SkinSwitcher` (`components/games/skins.tsx:42-68`),
  hoy `<button>` sin estilar — solo tamaño/posición, sin tocar paletas de color (eso es
  `skin-designer`).
- Acotar la altura de `.crt` en landscape corto (~375×667 girado, ~667×375 resultante) para que
  `.touch-controls` quede alcanzable sin scroll, usando `dvh`.
- Actualizar `references/mobile-audit.md` al final (último paso del plan).

**Out of scope (para otro spec):**

- Añadir `TOUCH_CONTROLS["frogger"]` en `components/games/registry.ts` — Frogger sigue sin ser jugable
  por táctil después de este spec; es una brecha de **input**, no de layout/viewport, y le corresponde
  a un spec propio que siga el patrón de SPEC 13 (D-pad de 4 direcciones, sin botón de acción — Frogger
  no dispara).
- Cualquier cambio a la lógica de juego, colisiones, físicas o reglas dentro de los 5
  `*-game.tsx` — este spec solo toca cómo se inicializa/dimensiona el `<canvas>` (contexto, backing
  store, `className`) y las dos líneas de `arkanoid-game.tsx` señaladas arriba.
- Paletas/contraste de `SkinSwitcher` o de los skins mismos — dominio de `skin-designer`
  (`references/game-with-themes.md`).
- Etiquetas o contenido de los botones de skin ("Clásico"/"Neón"/"Retro") — solo su tamaño de toque.
- Crear la base global (`viewport` export, `env(safe-area-inset-*)`) — ningún elemento de esta zona
  está anclado a un borde de pantalla (`.touch-controls` vive en flujo normal de documento, no
  `fixed`/`sticky`), así que esta zona no la necesita y no la paga; sigue pendiente para NAV u otra
  zona.
- Forzar orientación horizontal — el ajuste de landscape corto solo hace que el layout existente quepa
  sin scroll si el usuario ya está en esa orientación, nunca la exige ni la sugiere.

## Data model

Este spec no introduce datos de juego nuevos. Introduce dos contratos de implementación:

```ts
// components/games/canvas-dpr.ts (nuevo)
export function getHiDPIContext(
  canvas: HTMLCanvasElement,
  logicalWidth: number,
  logicalHeight: number,
): CanvasRenderingContext2D | null {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width = logicalWidth * dpr;
  canvas.height = logicalHeight * dpr;
  const ctx = canvas.getContext("2d");
  if (ctx) ctx.scale(dpr, dpr);
  return ctx;
}
```

Cada `*-game.tsx` sigue dibujando en su sistema de coordenadas lógico existente (800×600, `COLS*BLOCK`,
`CANVAS_W`×`CANVAS_H`, etc.) sin cambios — el helper solo agranda el backing store físico y aplica un
único `ctx.scale(dpr, dpr)` antes de que arranque el loop de dibujo.

```css
/* app/globals.css — clase compartida, reemplaza el style inline width/height de cada canvas */
.game-canvas {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
```

## Implementation plan

1. En `app/globals.css`, reestructurar `.touch-controls` (línea 1091 en adelante): cambiar
   `.touch-pause-btn` de `position:absolute` a flex item normal con `order:-1; flex: 0 0 100%;
margin-left: auto; margin-bottom: 12px;` (fuerza su propia fila, alineado a la derecha, sin
   compartir espacio vertical con `.touch-dpad`/`.touch-actions`) y quitar `top`/`right` de su regla.
   Manual test: en DevTools con emulación táctil, PAUSA aparece en su propia fila arriba del D-pad, sin
   overlap visual con ningún botón, en los 5 juegos.
2. Dentro del mismo bloque `@media (pointer: coarse)`, añadir un `@media (max-width: 520px)` anidado
   que reduzca `.touch-controls { padding: 16px 12px 16px; gap: 10px; }` — cierra el déficit de 8px a
   320px (256px de contenido requerido vs 264px disponibles tras el cambio). Manual test: a 320px de
   viewport emulado, ningún botón del D-pad/acciones se recorta ni se superpone.
3. Añadir `@media (max-width: 520px) { .crt { padding: 12px; border-radius: 16px; } .crt-screen {
border-radius: 8px / 16px; } }` cerca del bloque `.crt` existente (línea ~1021). Manual test: a
   320px, `.crt-screen` mide ~264×198px en vez de 240×180px (medir con el inspector).
4. Crear `app/globals.css` clase `.game-canvas` (ver "Data model") junto al bloque `/* ===== player
===== */`. En los 5 archivos de juego, reemplazar el `style={{ width: "100%", height: "100%" }}`
   (o `style={{ height: "100%", width: "auto" }}` en el canvas principal de Tetris) del `<canvas>`
   principal por `className="game-canvas"`. Manual test: Frogger deja de verse estirado (celdas
   vuelven a ser cuadradas), Tetris deja de estar recortado a ~90px de ancho a 320px — ahora se
   centra con letterbox limpio via `object-fit:contain`; Asteroids/Snake/Arkanoid no cambian
   visualmente (su canvas ya es 4:3).
5. Dar clase `className="tetris-next-canvas"` al segundo `<canvas>` de `tetris-game.tsx:431-442`,
   mover su `position/top/right/background/border` inline actuales a una regla CSS
   `.tetris-next-canvas` equivalente, y añadir `@media (max-width: 520px) { .tetris-next-canvas {
width: 56px; height: 56px; top: 6px; right: 6px; } }`. Manual test: a 320px y 414px de viewport
   emulados, la vista previa de la próxima pieza no se superpone con el área de juego principal de
   Tetris (verificar visualmente que no tapa piezas cayendo).
6. Crear `components/games/canvas-dpr.ts` con `getHiDPIContext` (ver "Data model"). Manual test: el
   archivo compila, no se usa todavía en ningún lado.
7. En cada uno de los 5 `*-game.tsx`, reemplazar la llamada a `canvasEl.getContext("2d")` del canvas
   principal por `getHiDPIContext(canvasEl, LOGICAL_W, LOGICAL_H)` con la constante lógica que ya usa
   cada archivo (800/600 en asteroids/arkanoid/snake, `COLS*BLOCK`/`ROWS*BLOCK` en tetris,
   `CANVAS_W`/`CANVAS_H` en frogger). En `arkanoid-game.tsx:359`, cambiar
   `const scaleX = canvas.width / rect.width;` por `const scaleX = W / rect.width;` (constante lógica,
   ya no el backing store físico). Manual test: en un emulador de DevTools con "Device Pixel Ratio" a
   3, los 5 juegos se ven nítidos, no borrosos; el control de pala por mouse en Arkanoid sigue
   respondiendo correctamente al puntero (no se desplaza más rápido de lo esperado).
8. Aplicar el mismo helper al segundo canvas de Tetris (`nextCanvasRef`, `NEXT_BLOCK*4` como lógico).
   Manual test: la vista previa de la pieza siguiente también se ve nítida a DPR 3×.
9. En `components/games/skins.tsx`, añadir clase `className="skin-switcher"` al wrapper de
   `SkinSwitcher` (quitar el `style` inline de posicionamiento) y `className="skin-switcher-btn"` a
   cada `<button>`. En `app/globals.css`, añadir `.skin-switcher { position:absolute; bottom:8px;
right:8px; display:flex; gap:6px; flex-wrap:wrap; justify-content:flex-end; z-index:10; }` y
   `.skin-switcher-btn { min-width:44px; min-height:44px; padding:6px 10px; font-family:var(--mono);
font-size:11px; letter-spacing:0.06em; color:var(--ink-dim); background:rgba(0,0,0,0.55);
border:1px solid var(--line); cursor:pointer; } .skin-switcher-btn[aria-pressed="true"] {
color:var(--cyan); border-color:var(--cyan); }`. Manual test: a 320px, los 3 botones de skin miden
   ≥44×44px cada uno (medir con el inspector) y no se recortan fuera de `.crt-screen`.
10. Añadir `@media (max-height: 480px) and (orientation: landscape) { .crt-screen { width: auto;
height: 48dvh; margin: 0 auto; } }` cerca del bloque `.crt-screen`. Manual test: en DevTools,
    emular 667×375 (landscape corto) — `.player-hud`, `.crt` y `.touch-controls` caben sin necesitar
    scroll para llegar al D-pad.
11. `npm run build` para confirmar que los 5 archivos de juego y el helper nuevo compilan y tipan.

## Acceptance criteria

- [ ] `npm run build` termina sin errores.
- [ ] A 320px de viewport emulado, `.touch-pause-btn` no se superpone con ningún botón de
      `.touch-actions` en Asteroids ni Tetris (los dos juegos con `buttonA`).
- [ ] A 320px de viewport emulado, ningún elemento de `.touch-controls` se recorta ni desborda
      horizontalmente (sin scroll horizontal en la barra).
- [ ] A 320px de viewport emulado, `.crt-screen` mide ~264×198px (antes 240×180px), medible con el
      inspector.
- [ ] Frogger se ve con celdas cuadradas (no rectangulares) en cualquier ancho de ventana, incluidos
      320/375/414px.
- [ ] Tetris ya no se renderiza recortado a ~90px de ancho a 320px — su canvas ahora se centra con
      letterbox uniforme via `object-fit: contain`.
- [ ] A 320px y 414px de viewport emulados, la vista previa de la próxima pieza de Tetris no se
      superpone visualmente con el área de juego principal.
- [ ] Con "Device Pixel Ratio" emulado a 2× o 3× en DevTools, los 5 juegos se ven nítidos (sin blur
      perceptible en bordes de sprites/formas).
- [ ] Con DPR emulado a 2× o 3×, mover el mouse sobre el canvas de Arkanoid mueve la pala a la posición
      correcta bajo el cursor (sin desfase ni velocidad multiplicada).
- [ ] Los 3 botones de `SkinSwitcher` miden ≥44×44px de área de toque en Asteroids, Snake y Arkanoid.
- [ ] En viewport emulado 667×375 (landscape corto), `.touch-controls` es alcanzable sin hacer scroll
      en ningún juego con controles táctiles registrados.
- [ ] Ningún archivo `*-game.tsx` cambia su lógica de juego, colisiones o listeners de teclado — el
      diff se limita a: `className`/inicialización de canvas, y las dos líneas señaladas de
      `arkanoid-game.tsx` (contexto + `scaleX`).
- [ ] `references/mobile-audit.md` mueve JUGADOR de `## Pendientes` a `## Especificadas` con este
      número de spec y la fecha real.

## Decisions

- **Sí:** sacar `.touch-pause-btn` de `position:absolute` a flex item con `flex:0 0 100%` — elimina el
  riesgo de solape por construcción geométrica, no por ajuste fino de coordenadas que se rompe con
  cualquier cambio de fuente/padding futuro.
- **Sí:** `object-fit: contain` uniforme en los 5 canvases en vez de mantener el hack manual
  `width:auto` de Tetris o el estiramiento sin control de Frogger — una sola regla CSS reemplaza dos
  soluciones ad-hoc distintas y es un no-op donde el ratio ya coincide (Asteroids/Snake/Arkanoid).
- **Sí:** tope de `devicePixelRatio` en 3× (`Math.min(window.devicePixelRatio || 1, 3)`) — dispositivos
  con DPR 4+ existen pero son raros; sin tope, un canvas de 800px lógico generaría un backing store de
  3200+px físicos, con costo de memoria/rendimiento no justificado por la ganancia visual marginal.
- **Sí:** arreglar `arkanoid-game.tsx:359` (`scaleX`) como parte de este spec, no como spec aparte —
  es una consecuencia directa e inevitable del cambio de DPR en el mismo archivo; dejarlo roto
  rompería el control por mouse de la pala en cualquier pantalla con DPR≠1.
- **Sí:** reutilizar el breakpoint `520` ya existente en la hoja para los ajustes de ancho — evita
  sumar un décimo breakpoint ad-hoc a la lista ya censada (520/600/720/820/840/900/980/1100).
- **Sí:** un breakpoint nuevo por altura (`max-height: 480px`) para landscape corto — ningún breakpoint
  existente en la hoja mide por altura; los de ancho no sirven para este eje.
- **No:** añadir `TOUCH_CONTROLS["frogger"]` aquí — es una brecha de input, no de layout, y merece su
  propio spec siguiendo el patrón exacto de SPEC 13.
- **No:** tocar la lógica de juego, colisiones o listeners de teclado de ningún `*-game.tsx` — mismo
  principio que SPEC 13, extendido a "cómo se ve" en vez de "cómo se controla".
- **No:** rediseñar las etiquetas o el contenido visual de `SkinSwitcher` — solo su área de toque.
- **No:** pagar la base global (`viewport` export/safe-area) desde este spec — nada en esta zona vive
  anclado a un borde de pantalla en `position:fixed`/`sticky`.
- **No:** forzar u ofrecer landscape — el ajuste de altura corta solo evita que el layout existente se
  rompa si el usuario ya rotó el teléfono.

## Risks

| Riesgo                                                                                                                  | Mitigación                                                                                                                                                           |
| ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El cambio de DPR toca 5 archivos de juego distintos — riesgo de romper el `getContext` de alguno                        | Cada cambio es una sola línea (reemplazar `getContext("2d")` por `getHiDPIContext(...)`); `npm run build` + prueba manual por juego antes de dar el paso por cerrado |
| `object-fit: contain` en Tetris cambia el tamaño renderizado del canvas respecto al hack `width:auto` actual            | Ambos enfoques producen el mismo resultado visual (canvas centrado, letterboxed, proporción 1:2 preservada) — verificar con captura antes/después                    |
| Reposicionar `.touch-pause-btn` fuera de `position:absolute` puede afectar el `z-index`/apilamiento visual sobre el CRT | El botón nunca se superponía al CRT (vivía dentro de `.touch-controls`, debajo del frame) — el cambio es solo dentro de esa barra, sin tocar el stacking del CRT     |

## What is **not** in this spec

- `TOUCH_CONTROLS["frogger"]` — brecha de input, spec propio siguiendo el patrón de SPEC 13.
- Cambios a la lógica de juego, física o reglas de ningún `*-game.tsx`.
- Paletas de color, contraste o etiquetas de `SkinSwitcher` o de los skins — dominio de
  `skin-designer`.
- La base global de `viewport`/safe-area — esta zona no la necesita, sigue pendiente para otra zona.
- Forzar orientación horizontal.
- Cualquier otra zona del sitio (nav, detalle, hall, home, biblioteca, login, about) — una sola zona
  por spec, por diseño del agente `mobile-porter`.
