# Guía de porteo — de `game.js` vanilla a componente de React

Basada en el porteo real de `references/started-games/02-asteroids/game.js` a `components/asteroids-game.tsx` (spec 05). Úsala como plantilla al escribir el paso "crear `components/<slug>-game.tsx`" del spec.

## Contrato — cópialo literal en el spec, con los nombres reales

```tsx
"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { RealGameHandle, RealGameProps } from "@/components/games/registry";

const <Slug>Game = forwardRef<RealGameHandle, RealGameProps>(
  function <Slug>Game({ onStatsChange, onGameOver }, ref) {
    // ... ver estructura abajo
  }
);

export default <Slug>Game;
```

Si el registry con `RealGameHandle`/`RealGameProps` todavía no existe en el repo (ver `platform-contract.md` sección 5), el componente usa temporalmente los tipos inline tal como los definía spec 05:

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

## Estructura interna — los 16 puntos del porteo de Asteroids

1. **Refs**: `canvasRef`; `onStatsChangeRef`/`onGameOverRef` (refs que guardan la última versión de los callbacks — evita que el loop de `requestAnimationFrame` cierre sobre una versión vieja); `actionsRef` inicializado con tres no-ops.
2. **Dos efectos pequeños** que mantienen `onStatsChangeRef`/`onGameOverRef` actualizados en cada render.
3. **`useImperativeHandle(ref, () => ({...}), [])`** con deps vacías — delega en `actionsRef.current.*`, así el handle expuesto es estable entre renders.
4. **Un único `useEffect(() => {...}, [])`** contiene todo el juego. Guardas al entrar: `const canvas = canvasRef.current; if (!canvas) return; const context = canvas.getContext("2d"); if (!context) return;` luego las constantes `W`/`H` de resolución lógica.
5. **Input**: `keys`/`justPressed` como records locales; lista de códigos de control (`ArrowLeft`, `ArrowRight`, `ArrowUp`, `Space`, o los que use el juego); `onKeyDown` llama `e.preventDefault()` solo para esos códigos (evita que la página scrollee) y marca `justPressed` solo en el flanco de bajada; listeners agregados a `window` dentro del efecto. `pressed(code)` consume el flanco (una sola vez por pulsación).
6. **Utilidades puras**: lo que el juego original tenga (`wrap`, `dist`, `rand`, `randInt`, o equivalentes).
7. **Entidades**: si el original usa clases, pórtalas 1:1 con los mismos campos como propiedades de clase TS. Si el original usa objetos literales + funciones sueltas (como Tetris y Arkanoid), mantén ese estilo en vez de forzar clases — no hace falta convertir todo a OOP.
8. **Estado mutable del juego** como `let`s dentro del efecto (no `useState` — el loop corre a 60 FPS y `useState` dispararía renders innecesarios).
9. **Funciones de ciclo de vida**: inicialización (`initGame`/`init`), progreso de nivel si aplica, muerte/colisión, todo igual que el original salvo los recortes de la sección siguiente.
10. **`update(dt)`**: igual que el original, pero elimina cualquier lectura de teclado que reinicie el juego (`if (pressed('Space')) initGame()` en la rama de game over) — el reinicio pasa a ser exclusivamente `restart()` desde React.
11. **`draw()`**: elimina el dibujo de HUD que ahora vive en React (score, vidas/líneas, nivel) y cualquier overlay de game over/pausa dibujado en canvas — el modal y el overlay de pausa ya existen en `game-player.tsx`. Conserva solo elementos visuales que no tengan equivalente en el HUD de React (p. ej. el indicador "3x" del power-up en Asteroids).
12. **Sincronización con React** (el bloque más importante) — diffea contra el frame anterior para no renderizar React a 60 FPS sin necesidad, y dispara `onGameOver` una sola vez:

```ts
let lastScore = -1;
let gameOverFired = false;
function notifyIfChanged() {
  if (/* algún stat relevante cambió respecto al frame anterior */) {
    // actualizar los "last*"
    onStatsChangeRef.current({ score, slots: [ /* ... */ ] });
  }
  if (state === "gameover" && !gameOverFired) {
    gameOverFired = true;
    onGameOverRef.current(score);
  }
}
```

13. **`actionsRef.current`** con las tres acciones: `togglePause` alterna un flag `paused` que hace que `update(dt)` no se llame (pero `draw()` sigue corriendo → pantalla congelada, no en negro); `forceGameOver` fuerza `state = "gameover"`; `restart` reinicializa el estado del juego y limpia `paused`/`gameOverFired`/los "last*".
14. **Loop**:

```ts
function loop(ts: number) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05); // clamp
  lastTime = ts;
  if (!paused) update(dt);
  draw();
  notifyIfChanged();
  rafId = requestAnimationFrame(loop);
}
```

15. **Cleanup del efecto**: `cancelAnimationFrame(rafId)` + remover ambos listeners de teclado (y de mouse si aplica). Sin esto, salir del juego (botón SALIR) deja el loop corriendo y React tira warnings de estado actualizado tras desmontar.
16. **Render**: `<canvas ref={canvasRef} width={W} height={H} style={{ width: "100%", height: "100%" }} />`. Si el aspect ratio no es 4:3, aplica aquí la decisión de letterbox/recorte acordada en la Fase 2 (por ejemplo envolviendo el canvas en un contenedor con `max-width`/`margin: auto` calculado a partir de `W`/`H`).

## Trampas conocidas al portear desde `references/started-games/`

Estas son específicas de Tetris y Arkanoid (los dos juegos aún no portados a la fecha de esta guía) — verifícalas igual para cualquier juego futuro.

- **Aspect ratio no-4:3**: Tetris es 300×600 (1:2). Forzarlo a estirarse al 100% de un contenedor 4:3 lo deforma. Decide y documenta en el spec.
- **Canvas secundario**: Tetris dibuja la pieza siguiente en un `#next-canvas` aparte (120×120). El componente portado necesita un segundo `<canvas>` propio (con su propio `ref`) o dibujar ese preview dentro del mismo canvas principal.
- **Acoplamiento al DOM**: `document.getElementById('score')`, `#overlay`, `#restart-btn`, toggle de tema con `localStorage` — todo esto se recorta. El HUD, el modal de fin de partida y el reinicio ya los provee `game-player.tsx`.
- **Globals entre `<script>`s sin exports**: Arkanoid carga `assets/spritesheet.js` → `levels.js` → `game.js` como tres `<script>` separados que comparten globals implícitos (`LEVELS`, `SPRITES`, `drawSprite`). Al portear a un módulo TS hay que declarar esas dependencias explícitamente (imports, o todo dentro del mismo archivo/efecto) en vez de confiar en el orden de carga de scripts.
- **Assets externos**: imágenes/sonidos (`assets/spritesheet-breakout.png`, `assets/sounds/*.mp3`) deben moverse a `public/<slug>/` y referenciarse por ruta absoluta (`/​<slug>/spritesheet.png`), no por ruta relativa al HTML original.
- **Audio**: si el juego original tiene sonido, decide explícitamente en la Fase 2 si se conserva (requiere manejar autoplay policies del navegador) o se descarta, como se descartó para Asteroids.
- **Mouse sobre un canvas estirado por CSS**: si el juego usa `mousemove`/`click` sobre el canvas (Arkanoid mueve la pala con el mouse), las coordenadas del evento deben corregirse con `canvas.getBoundingClientRect()` y el ratio `canvas.width / rect.width`, porque el canvas interno (p. ej. 800×600) no coincide en píxeles con su tamaño renderizado al 100% del contenedor.
- **Estados extra**: Arkanoid tiene `gameState: 'win'` además de `'playing' | 'paused' | 'gameover'`. `game-player.tsx` hoy solo entiende "partida terminada" (abre el modal de fin). Decide en la Fase 2 si `'win'` también dispara `onGameOver` (con un mensaje distinto sería un cambio de scope mayor — probablemente fuera de alcance de un primer porteo) o si simplemente se trata como fin de partida normal.
- **Botones dibujados dentro del canvas**: Arkanoid dibuja un botón de pausa en el propio canvas (`PAUSE_BTN_*`). Se recorta igual que cualquier HUD en canvas — la pausa ya la controla el botón PAUSA/REANUDAR de React.
