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

- [x] **JUGADOR** — spec 15 · 2026-09-02
      `specs/15-mobile-jugador.md` arregla: `.touch-pause-btn` pasa de `position:absolute` a fila
      propia (elimina solape con botón A); `.touch-controls` reduce padding/gap a ≤520px (cierra
      déficit de 8px a 320px); `.crt` reduce padding a ≤520px (área jugable 240×180 → 264×198 a
      320px); clase compartida `.game-canvas` con `object-fit:contain` en los 5 canvases (incluye
      Frogger, nuevo desde `REAL_GAMES`, que se veía deformado 8:7 dentro del marco 4:3; y corrige el
      letterboxing manual de Tetris); vista previa de próxima pieza de Tetris reposicionada/reducida a
      ≤520px (dejaba de solaparse con el canvas principal); helper `getHiDPIContext` escala los 5
      canvases por `devicePixelRatio` (tope 3×), con el ajuste companion de `scaleX` en
      `arkanoid-game.tsx:359`; `SkinSwitcher` gana objetivo táctil ≥44×44px; `.crt-screen` acotado por
      `dvh` en landscape corto (~667×375). Explícitamente fuera de scope: `TOUCH_CONTROLS["frogger"]`
      (brecha de input, no de layout — Frogger sigue sin ser jugable por táctil, pendiente de spec
      propio).

## Arregladas

_(vacío — ninguna zona está implementada en el código todavía)_

## Descartadas

_(vacío)_
