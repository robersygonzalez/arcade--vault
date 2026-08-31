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

- [ ] **PONG VS CPU** — VERSUS · magenta · cover nuevo `.cover-rebote` (id propuesto `rebote-cpu`) ⭐
      2026-08-30 · Único hueco de categoría: no hay VERSUS real. Implementación más simple de las candidatas (pala + bola + IA), pero exige diseñar un modo 1P-vs-CPU con score individual para el leaderboard; coexiste con `duelo-pixel` (mismo patrón que snake/serpentina).
- [ ] **INVASORES** — SHOOTER · green · cover existente `cover-invaders` (id ya reservado `invasores`)
      2026-08-30 · Fila decorativa sin gemelo real: coste de id/cover cero. SHOOTER ya cubierto por Asteroides, no cierra hueco de categoría.
- [ ] **GLOTÓN** — ARCADE · yellow · cover existente `cover-glot` (id ya reservado `gloton`)
      2026-08-30 · Fila decorativa sin gemelo real: coste de id/cover cero. IA de fantasmas en laberinto es la implementación más compleja de las candidatas; ARCADE ya tiene 2 juegos reales.
- [ ] **RANARIA** — ARCADE · green · cover existente `cover-rana` (id ya reservado `ranaria`)
      2026-08-30 · Fila decorativa sin gemelo real: coste de id/cover cero. Movimiento por carriles verticales encaja peor en el ratio 4:3 fijo del `.crt-screen`; ARCADE ya cubierto dos veces.
- [ ] **GEMAS** — PUZZLE · magenta · cover nuevo `.cover-gemas` (id propuesto `gemas`)
      2026-08-30 · Cierra el hueco real de PUZZLE (hoy solo Tetris). Match-3 con cascadas es más complejo que Tetris (detección de combos, gravedad por columnas) y exige cover nuevo.
- [ ] **CAMPO MINADO** — PUZZLE · cyan · cover nuevo `.cover-minas` (id propuesto `campo-minado`)
      2026-08-30 · Segundo hueco de PUZZLE: grilla navegable por teclado, lógica simple sin física ni colisiones, leaderboard natural por tiempo/celdas. Cover nuevo; UI de banderas/números es diseño extra.
- [ ] **COMBINAR 2048** — PUZZLE · yellow · cover nuevo `.cover-combinar` (id propuesto `combinar-2048`)
      2026-08-30 · Implementación más barata de las PUZZLE nuevas: solo 4 direcciones de teclado, grilla cuadrada que encaja perfecto en 4:3. Riesgo: mecánica muy conocida, poco original junto a Tetris.
- [ ] **CIEMPIÉS** — SHOOTER · yellow · cover nuevo `.cover-ciempies` (id propuesto `ciempies`)
      2026-08-30 · Diversifica SHOOTER (hoy solo Asteroides real) con enemigo segmentado y campo de obstáculos en vez de asteroides sueltos. Cover nuevo; colisión segmento-a-segmento añade complejidad media.
- [ ] **COMANDO DE MISILES** — SHOOTER · magenta · cover nuevo `.cover-misil` (id propuesto `comando-misiles`)
      2026-08-30 · Buen HUD (ciudades restantes, oleada) y encaja en 4:3 horizontal. Requiere apuntado por teclado (cursor con flechas) en vez de mouse, menos natural que un shooter de nave.
- [ ] **CAÍDA** — PUZZLE · magenta · cover existente `cover-tetro` (id ya reservado `caida`)
      2026-08-30 · Fila decorativa sin gemelo real: coste de id/cover cero. Comparte `cover-tetro` con Tetris ya implementado; si se porta conviene diferenciar mecánica (p. ej. match-3) para no sentirse igual.
- [ ] **AVE SALTARINA** — ARCADE · cyan · cover nuevo `.cover-vuelo` (id propuesto `ave-saltarina`)
      2026-08-30 · Implementación muy barata (un botón, física simple) y score infinito encaja perfecto con el leaderboard. ARCADE ya tiene 2 reales, no cierra hueco de categoría; cover nuevo.
- [ ] **EMPUJA CAJAS** — PUZZLE · green · cover nuevo `.cover-empuja` (id propuesto `empuja-cajas`)
      2026-08-30 · Tercer hueco de PUZZLE, mecánica de puzzle puro sin reflejos (tipo Sokoban). Leaderboard menos natural (niveles/movimientos, no contador continuo); cover nuevo.
- [ ] **MEMORIA SIMON** — PUZZLE · yellow · cover nuevo `.cover-memoria` (id propuesto `memoria-simon`)
      2026-08-30 · Implementación trivial (secuencia de teclas), HUD simple (ronda actual). Partidas cortas pueden dar un leaderboard con techo bajo, poco competitivo.
- [ ] **TOPERIA** — ARCADE · magenta · cover nuevo `.cover-topo` (id propuesto `toperia`)
      2026-08-30 · Barato de implementar (temporizador + grilla de topos), buen HUD (combo, tiempo). ARCADE ya saturado (2 reales + 3 reservados); cover nuevo.
- [ ] **DEFENSOR** — SHOOTER · cyan · cover nuevo `.cover-defensor` (id propuesto `defensor`)
      2026-08-30 · Diversifica SHOOTER con scroll horizontal y mecánica de rescate, pero es la más compleja de las shooter candidatas (terreno, secuestro, scroll continuo); cover nuevo.
- [ ] **AEROHOCKEY CONTRA CPU** — VERSUS · cyan · cover existente `cover-duelo` (id ya reservado `duelo-pixel`)
      2026-08-30 · Backup de VERSUS si `rebote-cpu` se descarta: reusa fila y cover de `duelo-pixel` a coste cero. Redundante si ambos se implementan — mismo hueco de categoría que `rebote-cpu`.
- [ ] **CAZADOR** — SHOOTER · green · cover nuevo `.cover-caceria` (id propuesto `cazador`)
      2026-08-30 · Mecánica de puntería pensada para mouse; adaptarla a teclado (cursor discreto) degrada el control frente a otros shooters candidatos. Cover nuevo.
- [ ] **ROCAS** — SHOOTER · yellow · cover existente `cover-rocas` (id ya reservado `rocas`)
      2026-08-30 · Fila decorativa sin gemelo real: coste de id/cover cero, pero mecánica prácticamente idéntica a Asteroides ya implementado — redundancia alta, poco valor de catálogo.
- [ ] **BLOQUE BUSTER** — ARCADE · cyan · cover existente `cover-bricks` (id ya reservado `bloque-buster`)
      2026-08-30 · Fila decorativa sin gemelo real: coste de id/cover cero, pero mecánica idéntica a Arkanoid ya implementado — redundancia alta, el patrón real+decorativo solo aporta si el juego es distinto.
- [ ] **SERPENTINA** — ARCADE · green · cover existente `cover-snake` (id ya reservado `serpentina`)
      2026-08-30 · Fila decorativa sin gemelo real: coste de id/cover cero, pero es el mismo concepto que Snake ya implementado — redundancia máxima de las 20 candidatas, última prioridad.

- [ ] **FROGGER** — ARCADE · green · cover nuevo `.cover-frogger` (id propuesto `frogger`)
      2026-08-31 · Cruzar carriles de tráfico y río saltando entre obstáculos, típico Frogger. Equivalente/duplicado conceptual de `RANARIA` ya pendiente (mismo cruce de rana); pedido explícito por nombre, se deja trazado por separado.

## Implementados

- [x] **ASTEROIDES** — SHOOTER · spec 05 · 2026-08-27
- [x] **TETRIS** — PUZZLE · spec 07 · 2026-08-28
- [x] **ARKANOID** — ARCADE · spec 08 · 2026-08-29
- [x] **SNAKE** — ARCADE · spec 09 · 2026-08-29

## Descartados

_(vacío)_
