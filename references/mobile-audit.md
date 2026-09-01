# Auditoría móvil

Registro persistente del agente `mobile-porter` (`.claude/agents/mobile-porter.md`). No es un
documento de diseño — cada entrada especificada es una decisión ya escrita en un spec. El agente lo
lee entero antes de trabajar y opera **una zona a la vez**, solo sobre la que el usuario le indique.
`specs/13-controles-tactiles.md` (Implementado) ya resolvió el input táctil de los 4 juegos reales
(D-pad + botones sintéticos) — ninguna entrada de aquí debe reabrir eso.

**Base global (viewport export en `app/layout.tsx` + safe-area + tokens de breakpoint compartidos):
no existe.** La primera zona cuyo spec la necesite debe crearla (contrato: `export const viewport` con
`themeColor`/`viewportFit: "cover"`, uso de `env(safe-area-inset-*)`, y documentar los breakpoints
ad-hoc ya existentes en `app/globals.css` — 520/600/720/820/840/900/980/1100px + `pointer: coarse` —
en vez de inventar nuevos sueltos). Las zonas siguientes solo la citan por referencia.

Formato de una entrada en `## Pendientes` / `## Descartadas`:

```markdown
- [ ] **ZONA** — rutas/archivos principales
      síntoma concreto (archivo:línea) — a qué ancho falla
```

Formato de una entrada en `## Especificadas`:

```markdown
- [x] **ZONA** — spec NN · fecha
      resumen de qué arregla el spec
```

Formato de una entrada en `## Arregladas` (se mueve aquí solo cuando `/spec-impl` ya implementó el
spec en el código, no antes):

```markdown
- [x] **ZONA** — spec NN · fecha de implementación
```

## Pendientes

- [ ] **GLOBAL** — `app/layout.tsx`, `app/globals.css:42`
      sin export `viewport` (sin `themeColor`, sin `viewportFit: "cover"`); ningún CSS usa
      `env(safe-area-inset-*)`; `body { overflow-x: hidden }` enmascara desbordes en vez de
      corregirlos; cero reglas `:focus-visible` en toda la hoja — falla en cualquier viewport con
      notch/home indicator

- [ ] **NAV** — `components/nav.tsx`, `app/globals.css:278-291`, footer inline en `app/layout.tsx:43-55`
      la nav (`logo` + `.logo-text` + spacer + botón "Iniciar Sesión" + hamburguesa) mide ~520px sin
      wrap — desborda a 375px; `.av-mobile-panel` siempre montado, solo `translateX(100%)`, sin
      `inert`/`aria-hidden` (sus 5 enlaces quedan en el tab order incluso en escritorio); footer con
      padding inline fijo `20px 32px`

- [ ] **JUGADOR** — `components/game-player.tsx`, `components/games/touch-controls.tsx`,
      `components/games/skins.tsx`, `components/{asteroids,tetris,arkanoid,snake}-game.tsx`,
      `app/globals.css:995-1179`
      `.touch-pause-btn` (`absolute; top:8; right:20`) se solapa con el botón A — tocar la parte alta
      de "DISPARAR" pausa la partida; `.touch-controls` pide ~296px mínimos, a 320px de viewport solo
      hay 288px disponibles; `.crt { padding: 24px }` nunca se reduce → área jugable de 240×180px a
      320px de ancho; canvas de Tetris es 300×600 (1:2) dentro de un `.crt-screen` 4:3 → se renderiza
      a ~90px de ancho, letterboxed; ningún juego escala por `devicePixelRatio` (se ven borrosos en
      2×/3×); `SkinSwitcher` usa `<button>` sin estilar, muy por debajo de 44×44px de objetivo táctil

- [ ] **DETALLE** — `app/juegos/[id]/page.tsx`, `app/globals.css:860-885,909`
      `.stat-strip` (`grid-template-columns: repeat(3,1fr)`) y `.lb-row`
      (`grid-template-columns: 36px 1fr 110px`) sin ningún breakpoint — nunca se reflowan

- [ ] **HALL** — `components/hall-of-fame.tsx`, `app/globals.css:1514,1575-1660`
      `.hall-table` es una pseudo-tabla en grid; incluso con su override a ≤720px
      (`50px 1fr 90px 90px` + gaps + padding) sigue pidiendo ~284px mínimos, apretado en un viewport
      de 320px con `.av-hall` dejando solo 288px

- [ ] **HOME** — `components/home.tsx`, `app/globals.css:1689,2202,2264-2271`
      `.home-hero { min-height: calc(100vh - 60px) }` usa `vh` en vez de `dvh`/`svh` — salta al
      aparecer/ocultarse la barra del navegador móvil; `.top-row` (`36px 1fr auto auto`) sin
      breakpoint; `.tp-fill` se referencia en JSX (`home.tsx:321`) pero no está definido en
      `app/globals.css` — markup muerto portado de la plantilla original

- [ ] **BIBLIOTECA** — `components/library.tsx`, `components/game-card.tsx`
      tilt 3D de `.game-card` implementado solo con `onMouseMove`/`onMouseLeave`; el estado
      `:hover` (translate + glow) se queda "pegado" tras un tap en iOS Safari por falta de guarda
      `@media (hover: hover)`

- [ ] **LOGIN** — `components/login-form.tsx`, `app/globals.css:1396-1401,1463-1468`
      `.auth-tabs` y `.social` en `grid-template-columns: 1fr 1fr` fijo sin breakpoint — el texto de
      pestaña ("INICIAR SESIÓN" en pixel font con tracking) se aprieta en columnas angostas

- [ ] **ABOUT** — `components/about.tsx`, `app/globals.css:2618-2630`
      `.contact-grid` (`1fr 1.2fr`) solo tiene override a ≤900px; formulario de contacto sin revisar
      a 320-414px de ancho

## Especificadas

_(vacío — ninguna zona tiene spec todavía)_

## Arregladas

_(vacío — ninguna zona está implementada en el código todavía)_

## Descartadas

_(vacío)_
