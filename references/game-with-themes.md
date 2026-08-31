# Juegos con skins

Registro persistente del agente `skin-designer` (`.claude/agents/skin-designer.md`). No es un
documento de diseño — cada entrada es una decisión ya escrita en un spec. El agente lo lee entero
antes de trabajar y opera **un juego a la vez**, solo sobre el que el usuario le indique.

**Infraestructura (`components/games/skins.ts`): no existe todavía.** El primer juego que se skinee
paga su creación (ver el spec correspondiente); los siguientes solo añaden su paleta.

Formato de una entrada en `## Con skins`:

```markdown
- [x] **TETRIS** — spec 10 · 2026-08-31
      clasico: #4dd0e1 / #ffd54f / ... (colores actuales, congelados)
      neon: #00f5ff (contraste 8.2:1) / #ff006e (contraste 5.1:1) / ...
      retro: #ffb000 (contraste 9.4:1) / #cc8800 (contraste 4.7:1) / ...
```

Formato de una entrada en `## Sin skins`: `- [ ] **<ID>** — <categoría>`.

## Con skins

_(vacío)_

## Sin skins

- [ ] **ASTEROIDES** — SHOOTER
- [ ] **TETRIS** — PUZZLE
- [ ] **ARKANOID** — ARCADE
- [ ] **SNAKE** — ARCADE
