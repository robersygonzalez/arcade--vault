# SPEC 13 — Controles táctiles para móvil (D-pad + botones)

> **Status:** Implementado
> **Depends on:** SPEC 05 (Asteroides real), SPEC 07 (Tetris real), SPEC 08 (Arkanoid real), SPEC 09 (Snake real)
> **Date:** 2026-09-01
> **Objective:** Añadir un D-pad + hasta 2 botones de acción, visibles solo en dispositivos táctiles, que permitan jugar los 4 juegos reales sin teclado físico.

## Por qué este spec existe

Los 4 juegos reales (`asteroides`, `tetris`, `arkanoid`, `snake`) dependen exclusivamente de
`window.addEventListener("keydown"/"keyup", ...)` leyendo `e.code` (`ArrowLeft/Right/Up/Down`,
`Space`, `KeyX`) — confirmado por `grep -n "addEventListener\|case \"" components/*-game.tsx`.
Arkanoid además soporta `mousemove` sobre el canvas para la pala, pero también acepta
`ArrowLeft`/`ArrowRight` como alternativa (`components/arkanoid-game.tsx` L344). En un móvil, hoy el
canvas se renderiza (`.crt-screen` ya es responsive, `aspect-ratio: 4/3`) pero el juego es
injugable: no hay ninguna fuente de input táctil.

**Decisión de arquitectura clave:** el D-pad y los botones no despachan estado a cada juego por una
API nueva — despachan `KeyboardEvent` sintéticos (`window.dispatchEvent(new KeyboardEvent("keydown",
{ code })`) con el mismo `code` que ya escucha cada juego. Esto significa que **ninguno de los 4
archivos `*-game.tsx` cambia**: sus listeners de teclado existentes consumen el evento sintético
exactamente igual que uno físico. Todo el trabajo nuevo vive en `game-player.tsx` (el marco
compartido que hoy nunca cambia por juego) más un componente visual nuevo y una tabla de
configuración por juego.

## Scope

**In:**

- Componente nuevo `components/games/touch-controls.tsx`: D-pad de 4 direcciones + hasta 2 botones de
  acción etiquetados, renderizado como barra fija debajo del marco CRT.
- Tabla de configuración `TOUCH_CONTROLS: Record<string, TouchControlConfig>` (una entrada por
  `game.id` de `REAL_GAMES`) en `components/games/registry.ts`, mapeando cada dirección/botón al
  `code` de teclado que ya usa ese juego.
- Wiring en `components/game-player.tsx`: renderiza `<TouchControls config={...} />` debajo del
  `.crt`, solo cuando el juego activo es uno de `REAL_GAMES` y su config tiene al menos una tecla
  mapeada.
- Visibilidad exclusivamente táctil vía `@media (pointer: coarse)` en `app/globals.css` — un desktop
  con ventana angosta no ve la barra; una tablet táctil sí, sin importar su ancho.
- Botón PAUSA duplicado, anclado a la barra de controles táctiles (a distancia de pulgar), que llama
  al mismo `togglePause()` ya existente. El HUD superior (Jugador/Puntuación/slots + PAUSA/FIN/SALIR)
  no cambia.
- Presión sostenida en una dirección del D-pad repite el `keydown` cada 150ms (mismo ritmo que el
  auto-repeat de teclado del sistema operativo) hasta soltar; un solo `keyup` al soltar.
- `touch-action: none` en la barra de controles para que arrastrar el dedo sobre el D-pad no haga
  scroll de la página.

**Out of scope:**

- Cualquier cambio dentro de `components/{asteroids,tetris,arkanoid,snake}-game.tsx` — su lógica de
  input no se toca, solo reciben eventos sintéticos indistinguibles de un teclado real.
- Gestos de swipe sobre el canvas — se descartó a favor de D-pad + botones fijos (más predecible,
  mismo patrón en los 4 juegos).
- Arrastre (`touchmove`) directo sobre la pala de Arkanoid — se descartó porque Arkanoid ya acepta
  `ArrowLeft`/`ArrowRight`, así que entra gratis en el mismo D-pad sin código especial.
- Vibración/haptics al tocar los botones.
- Detectar o exigir orientación horizontal (landscape) — el `.crt-screen` ya es responsive en
  cualquier orientación, no se fuerza ninguna.
- Aplicar este patrón a juegos futuros — cuando se añada un juego real nuevo, ese `/add-game` deberá
  incluir su propia entrada en `TOUCH_CONTROLS` como parte de su propio spec, no de este.
- Deshabilitar el teclado en móvil — ambas fuentes de input (teclado físico/Bluetooth y D-pad táctil)
  quedan activas en simultáneo.

## Data model

```ts
// añadir a components/games/registry.ts, debajo de RealGameProps existente
export type TouchButton = { code: string; label: string };

export type TouchControlConfig = {
  up?: string; // key code, ej. "ArrowUp"
  down?: string;
  left?: string;
  right?: string;
  buttonA?: TouchButton;
  buttonB?: TouchButton;
};

export const TOUCH_CONTROLS: Record<string, TouchControlConfig> = {
  asteroides: {
    left: "ArrowLeft",
    right: "ArrowRight",
    up: "ArrowUp",
    buttonA: { code: "Space", label: "DISPARAR" },
  },
  tetris: {
    left: "ArrowLeft",
    right: "ArrowRight",
    down: "ArrowDown",
    up: "ArrowUp", // rota, igual que el teclado (case "ArrowUp"/"KeyX" en tetris-game.tsx L371-373)
    buttonA: { code: "Space", label: "CAÍDA" },
  },
  arkanoid: {
    left: "ArrowLeft",
    right: "ArrowRight",
  },
  snake: {
    up: "ArrowUp",
    down: "ArrowDown",
    left: "ArrowLeft",
    right: "ArrowRight",
  },
};
```

Ningún juego llega a usar `buttonB` — Asteroides y Tetris solo necesitan una acción además del
D-pad (disparar / caída rápida), Arkanoid y Snake ninguna. `TouchControls` oculta cualquier
dirección/botón cuyo `code` esté `undefined` en la config (Arkanoid no muestra flechas arriba/abajo;
Snake no muestra ni botón A ni B).

## Implementation plan

1. Crear `components/games/touch-controls.tsx` con el tipo `TouchControlConfig` re-exportado desde
   `registry.ts` y el componente `TouchControls({ config, onPauseTap })`: renderiza el D-pad (4
   `<button>` en cruz, ocultos si su `code` no está en `config`) y hasta 2 botones de acción a la
   derecha, más el botón PAUSA duplicado. Cada botón despacha `keydown` sintético en `onTouchStart` y
   `keyup` en `onTouchEnd`/`onTouchCancel`, con `setInterval(150ms)` mientras el touch sigue activo
   para las 4 direcciones (no para los botones de acción, que son de una sola pulsada). Manual test:
   el archivo compila, el componente no se usa todavía en ningún lado.
2. En `components/games/registry.ts`, añadir `TouchButton`, `TouchControlConfig` y la constante
   `TOUCH_CONTROLS` (literales exactos de "Data model"), sin tocar `REAL_GAMES`,
   `RealGameProps`/`RealGameHandle` existentes.
3. En `app/globals.css`, añadir las reglas de la barra de controles (`.touch-controls`, D-pad, botón
   de acción, botón PAUSA inferior) dentro de un bloque `@media (pointer: coarse) { ... }`, siguiendo
   la paleta CRT existente (cian/magenta, `var(--pixel)`/`var(--mono)`), con `touch-action: none` en
   la barra completa.
4. En `components/game-player.tsx`, importar `TouchControls` y `TOUCH_CONTROLS`. Debajo del `<div
className="crt">...</div>` existente, renderizar `{RealGame && TOUCH_CONTROLS[game.id] && (
<TouchControls config={TOUCH_CONTROLS[game.id]} onPauseTap={togglePause} />)}`. `onPauseTap` reutiliza
   la función `togglePause` ya definida (línea 42-45 actual) — mismo comportamiento que el botón PAUSA
   del HUD superior.
5. `npm run build` para confirmar que todo compila y tipa.

## Acceptance criteria

- [x] `npm run build` termina sin errores.
- [x] Con Chrome DevTools en modo escritorio (sin emulación táctil), la barra de controles no aparece
      en ningún juego.
- [x] Con Chrome DevTools → Toggle device toolbar (emulación táctil activa), la barra aparece debajo
      del CRT en los 4 juegos, con el subconjunto de flechas/botones que le corresponde a cada uno
      (Arkanoid solo izquierda/derecha, Snake las 4 flechas sin botones, Tetris y Asteroides con su
      botón de acción etiquetado).
- [x] Tocar y mantener una flecha del D-pad mueve/rota/acelera igual que mantener la tecla física
      equivalente, en los 4 juegos.
- [x] Tocar el botón de acción de Asteroides dispara un proyectil; el de Tetris hace caída rápida de
      la pieza actual.
- [x] El botón PAUSA de la barra inferior pausa/reanuda el juego igual que el PAUSA del HUD superior;
      ambos reflejan el mismo estado.
- [x] Ningún archivo `components/{asteroids,tetris,arkanoid,snake}-game.tsx` cambia — el diff de este
      spec toca solo `components/game-player.tsx`, `components/games/registry.ts`,
      `components/games/touch-controls.tsx` (nuevo) y `app/globals.css`.
- [x] Con un teclado físico/Bluetooth conectado en modo táctil, las teclas de flecha/Space/KeyX siguen
      funcionando exactamente igual que hoy, en paralelo al D-pad.
- [x] Arrastrar el dedo sobre la barra de controles no hace scroll de la página.

## Decisions

- **Sí:** despachar `KeyboardEvent` sintéticos con el mismo `code` que cada juego ya escucha, en vez
  de una API nueva de control por juego — cero cambios en los 4 archivos `*-game.tsx`, cero riesgo de
  romper su lógica de input ya probada.
- **Sí:** `@media (pointer: coarse)` para la visibilidad, en vez de un breakpoint de ancho de
  viewport — es la señal semánticamente correcta de "no hay cursor de precisión", cubre tablets
  táctiles grandes y excluye ventanas de escritorio angostas.
- **Sí:** D-pad + hasta 2 botones fijos, en vez de gestos de swipe — predecible y con el mismo patrón
  visual en los 4 juegos; un swipe significa cosas distintas en Snake (cambiar de dirección) que en
  Tetris (mover vs. rotar vs. caída), lo que obligaría a un diseño de gestos distinto por juego.
- **Sí:** Arkanoid usa el D-pad izquierda/derecha en vez de `touchmove` para arrastrar la pala —
  Arkanoid ya acepta esas mismas teclas por teclado, así que no requiere ningún código especial,
  solo una entrada más en `TOUCH_CONTROLS`.
- **Sí:** repetir el `keydown` cada 150ms mientras se mantiene una dirección — replica el
  auto-repeat de teclado del sistema operativo, necesario para el movimiento paso a paso de Tetris
  (`case "ArrowLeft"` mueve una celda por evento, no por frame); en los juegos que leen estado
  sostenido por frame (Asteroides, Arkanoid) los `keydown` repetidos son inofensivos, el estado ya
  era `true`.
- **Sí:** duplicar PAUSA en la barra inferior sin tocar el HUD superior — FIN y SALIR se usan con
  mucha menos frecuencia que PAUSA durante una partida, no justifican ocupar espacio junto al D-pad.
- **No:** tocar `components/{asteroids,tetris,arkanoid,snake}-game.tsx` — ver "Por qué este spec
  existe".
- **No:** deshabilitar los listeners de teclado en viewport móvil — un teclado Bluetooth conectado a
  un móvil/tablet debe seguir funcionando; ambas fuentes de input coexisten sin conflicto porque
  ambas terminan en el mismo `keys[e.code] = true/false`.
- **No:** aplicar el patrón a juegos futuros dentro de este spec — cada juego real nuevo añade su
  propia fila a `TOUCH_CONTROLS` en su propio spec de implementación.
- **No:** vibración/haptics, sonido, o animación de transición al mostrar/ocultar la barra.

## What is **not** in this spec

- Cambios dentro de los 4 componentes de juego (`*-game.tsx`).
- Gestos de swipe o arrastre directo sobre el canvas.
- Soporte para juegos reales futuros — su propio spec añade su fila a `TOUCH_CONTROLS`.
- Bloqueo u obligación de orientación horizontal.
- Vibración/haptics al tocar los controles.
