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

- [x] **SNAKE** — spec 11 · 2026-08-31
      clasico: #00ff88 (15.7:1) / #baffe0 (18.5:1) / #ffffff (21.0:1) — fondo #000000, sin cambio de aspecto
      neon: #00f5ff (15.0:1) / #00ff88 (15.2:1) / #f5ff00 (18.6:1) — fondo #05050b, halo shadowBlur:10
      retro: #ffb000 (10.6:1) / #cc8800 (6.5:1) / #996600 (3.9:1) — fondo #140d00, sin halo
      (rampa retro reutilizada tal cual de ASTEROIDES/spec 10, mismo fondo #140d00, ya validada ≥3:1)
      frutas (/snake/fruits.png) sin tintar ni halo en ningún skin — sprite atlas de 22 frutas con
      color propio, se mantiene idéntico en los 3 skins por decisión documentada en el spec.

- [x] **ARKANOID** — spec 12 · 2026-08-31
      clasico: sin literales de color de primer plano (spritesheet PNG sin tintar) — fondo #000000, sin cambio de aspecto
      neon: #00f5ff pala/pelota (15.0:1) / #ff006e bloques gray·red·magenta·hotpink (5.3:1) / #f5ff00 bloques yellow (18.6:1) / #00ff88 bloques green (15.2:1) — fondo #05050b, halo shadowBlur:10 solo en pala/pelota
      retro: #ffb000 pala/pelota/bloques gray·red·magenta (10.6:1) / #cc8800 bloques yellow·hotpink (6.5:1) / #996600 bloques cyan·green (3.9:1) — fondo #140d00, sin halo
      (rampa retro reutilizada tal cual de ASTEROIDES/spec 10; tinte aplicado por región del
      spritesheet vía globalCompositeOperation="source-atop", cacheado en Map<SkinId,
      HTMLCanvasElement>; gray comparte color forzado con red porque EXPLOSION_FRAMES.gray reutiliza
      el mismo rectángulo de píxeles que EXPLOSION_FRAMES.red)

- [x] **FROGGER** — spec 14 · 2026-09-02
      clasico: fondos #111318 (carretera) / #00202c (río) / #0a2f1a (seguro) — colores actuales, sin cambio de aspecto
      auto #ff006e (4.85:1) / camión #8a8a92 (5.42:1) / línea carril rgba(245,255,0,.35) (3.02:1) — vs roadBg
      tronco #5a3616 (1.59:1, NO PASA — congelado, es clasico) / tortuga #00ff88 (12.60:1), sumergida α.35 (2.68:1, NO PASA — congelado) — vs riverBg
      rana #00ff88 (10.92/13.86/12.60:1 según zona) / borde meta #f5ff00 (11.25:1) / punto meta #00ff88 (9.18:1) vs goalFill
      neon: fondos #05050b (carretera) / #020814 (río) / #020f0a (seguro), halo shadowBlur:10 en auto/camión/tronco/tortuga/rana/meta
      auto #ff006e (5.30:1) / camión #00f5ff (15.01:1) / línea carril rgba(245,255,0,.40) (3.46:1, alpha subido de .35 porque .35 daba 2.90:1)
      tronco #f5ff00 (18.32:1) / tortuga #00ff88 (14.95:1), sumergida α.42 (3.25:1, alpha subido de .35 porque .35 daba 2.55:1)
      rana #00ff88 (15.16/14.95/14.56:1 según zona) / borde meta #f5ff00 (15.08:1) / punto meta #00ff88 (12.31:1) vs goalFill #04241a
      retro: fondos #140d00 (carretera) / #1a1100 (río) / #0f0900 (seguro), sin halo, rampa reutilizada de spec 10 (#ffb000/#cc8800/#996600)
      auto #ffb000 (10.54:1) / camión #cc8800 (6.52:1) / línea carril #cc8800 sólido (6.52:1, sin alpha — "bordes duros")
      tronco #996600 (3.79:1; #7a4f00 de referencia daba solo 2.62:1 vs riverBg propio de frogger, se descarta igual que en spec 10)
      tortuga #ffb000 (10.20:1), sumergida α.48 (3.21:1, alpha subido de .35 porque .35 daba 2.28:1)
      rana #ffb000 (10.54/10.20/10.82:1 según zona) / borde meta #ffb000 (9.97:1) / punto meta #cc8800 (6.17:1) vs goalFill #1c1400
      barra de tiempo retro invertida: bueno=#996600 (oscuro), malo=#ffb000 (brillante) — única señal de urgencia posible con rampa monocroma
      decisión propia de frogger: 3 fondos de zona por skin (roadBg/riverBg/safeBg), no 1 solo — es el
      único juego donde el fondo codifica información de juego (carretera/río/zona segura)

## Sin skins

- [ ] **TETRIS** — PUZZLE
