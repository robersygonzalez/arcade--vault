# Juegos con skins

Registro persistente del agente `skin-designer` (`.claude/agents/skin-designer.md`). No es un
documento de diseño — cada entrada es una decisión ya escrita en un spec. El agente lo lee entero
antes de trabajar y opera **un juego a la vez**, solo sobre el que el usuario le indique.

**Infraestructura (`components/games/skins.tsx`): existe.** Creada por SPEC 10 (Asteroids, el primer
juego skineado). Nota: el archivo terminó en `.tsx`, no `.ts`, porque exporta el componente JSX
`SkinSwitcher` — los specs siguientes deben importar de `@/components/games/skins` respetando esa
ruta real. Los siguientes juegos solo añaden su paleta a `GAME_SKINS`.

Formato de una entrada en `## Con skins`:

```markdown
- [x] **TETRIS** — spec 10 · 2026-08-31
      clasico: #4dd0e1 / #ffd54f / ... (colores actuales, congelados)
      neon: #00f5ff (contraste 8.2:1) / #ff006e (contraste 5.1:1) / ...
      retro: #ffb000 (contraste 9.4:1) / #cc8800 (contraste 4.7:1) / ...
```

Formato de una entrada en `## Sin skins`: `- [ ] **<ID>** — <categoría>`.

## Con skins

- [x] **ASTEROIDES** — spec 10 · 2026-08-31
      clasico: #ffffff (21.0:1) / #00ffff (16.8:1) / rgba(255,130,0,.85) (6.6:1) — fondo #000000, sin cambio de aspecto
      neon: #00f5ff (15.0:1) / #f5ff00 (18.6:1) / #ff006e (5.3:1) / #00ff88 (15.2:1) — fondo #05050b, halo shadowBlur:10
      retro: #ffb000 (10.6:1) / #cc8800 (6.5:1) / #996600 (3.9:1) — fondo #140d00, sin halo
      (rampa ajustada: #7a4f00 de referencia daba 2.71:1, no pasaba 3:1 → sustituido por #996600)

## Sin skins

- [ ] **TETRIS** — PUZZLE
- [ ] **ARKANOID** — ARCADE
- [ ] **SNAKE** — ARCADE
