# To Do — sugerencias de juegos

Memoria persistente del agente `game-planner` (`.claude/agents/game-planner.md`). No es un
documento de diseño — cada entrada es una decisión registrada. El agente la lee entera antes de
sugerir nada y nunca repite un juego ya presente en cualquiera de las tres secciones.

Formato de una entrada:

- **Pendiente** (2 líneas, la segunda indentada 6 espacios):
  ```markdown
  - [ ] **PONG** — VERSUS · magenta · cover nuevo `.cover-pong`
        2026-08-30 · Único hueco de categoría: no hay VERSUS real. Port trivial, 1 canvas.
  ```
  El candidato recomendado de la última ejecución lleva `⭐` al final de su primera línea; una
  ejecución nueva quita el `⭐` de la anterior antes de poner el suyo.
- **Implementado**: `- [x] **SNAKE** — ARCADE · spec 09 · 2026-08-29`
- **Descartado**: `- ~~**FROGGER**~~ — 2026-08-30 · Razón del descarte.`

## Pendientes

_(vacío — el agente `game-planner` añade aquí sus candidatos)_

## Implementados

- [x] **ASTEROIDES** — SHOOTER · spec 05 · 2026-08-27
- [x] **TETRIS** — PUZZLE · spec 07 · 2026-08-28
- [x] **ARKANOID** — ARCADE · spec 08 · 2026-08-29
- [x] **SNAKE** — ARCADE · spec 09 · 2026-08-29

## Descartados

_(vacío)_
