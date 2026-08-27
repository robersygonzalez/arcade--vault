# SPEC 05 — Juego real de Asteroids

> **Status:** Draft
> **Depends on:** SPEC 01 (mvp-pantallas-visuales)
> **Date:** 2026-08-26
> **Objective:** Conectar el juego de Asteroids ya creado en `references/started-games/02-asteroids/` a Arcade Vault como una nueva entrada jugable de verdad (`asteroides`) en el reproductor, con HUD, pausa y guardado de puntuación reales, sin tocar los demás juegos decorativos.

## Scope

**In:**

- Agregar la entrada `asteroides` a `GAMES` en `app/data/games.ts` (título "ASTEROIDES", categoría `SHOOTER`, cover `cover-rocas` reutilizada, color `yellow`).
- Crear `components/asteroids-game.tsx`: portar 1:1 la lógica de `references/started-games/02-asteroids/game.js` (clases `Bullet`, `Asteroid`, `PowerUp`, `Ship`, `Particle`, constantes, utilidades, loop) a un Client Component de TypeScript con canvas propio.
- Modificar `components/game-player.tsx` para que, cuando `game.id === "asteroides"`, renderice el juego real dentro de `.crt-screen` en vez de la simulación decorativa (`.game-arena`/`setInterval` falso), y conecte sus botones existentes (PAUSA/REANUDAR, FIN, JUGAR DE NUEVO, SALIR) al juego real.
- HUD de React (`Jugador`/`Puntuación`/`Vidas`/`Nivel`) sincronizado con el estado real del juego; se recorta del canvas el dibujo de `SCORE`/`NIVEL`/vidas (queda duplicado si no), conservando el indicador `3x` del power-up.
- Pausa real (el juego original no la tenía): congela el juego mientras está pausado.
- El modal "FIN DEL JUEGO" y el guardado en `localStorage["av_scores"]` (ya existentes en `game-player.tsx`) se disparan tanto al quedarse sin vidas como al presionar FIN, con la puntuación real.

**Out of scope (para specs futuros):**

- Controles táctiles/móviles — el juego queda solo con teclado (`ArrowLeft`/`ArrowRight`/`ArrowUp`/`Space`), igual que el original.
- Sonido/efectos de audio — el juego original no trae ninguno.
- Reemplazar o eliminar la entrada decorativa `rocas` (queda tal cual, coexistiendo con `asteroides`).
- Persistencia real de puntuaciones de Asteroids en Supabase o su aparición en el Salón de la Fama — sigue el mismo patrón 100% mock del resto del MVP (confirmado como fuera de alcance en spec 04).
- Portar cualquier otro juego de `references/started-games/` (tetris, arkanoid) — cada uno va en su propio spec.
- Cambios al reproductor decorativo de los demás juegos (`bloque-buster`, `caída`, `serpentina`, `glotón`, `invasores`, `rocas`, `ranaria`, `duelo-pixel`).

## Data model

Nueva entrada en `app/data/games.ts` (mismo tipo `Game` ya existente, sin cambios de forma):

```ts
{
  id: "asteroides",
  title: "ASTEROIDES",
  short: "Pilotea tu nave y pulveriza asteroides de verdad.",
  long: "El clásico shooter de gravedad cero, jugable de verdad: rota, acelera y dispara para partir asteroides en fragmentos cada vez más pequeños. Recoge el power-up de disparo triple y sobrevive tantos niveles como puedas.",
  cat: "SHOOTER",
  cover: "cover-rocas",
  color: "yellow",
  best: 38500,
  plays: "5.2K",
}
```

No se agregan estructuras de persistencia nuevas: sigue usando `localStorage["av_scores"]` con la misma forma `{ game, score, name, at }` ya definida en spec 01, ahora con `game: "asteroides"`.

Contrato del nuevo componente (`components/asteroids-game.tsx`):

```ts
export type AsteroidsGameHandle = {
  togglePause: () => void;
  forceGameOver: () => void; // usado por el botón FIN
  restart: () => void; // usado por "JUGAR DE NUEVO"
};

type AsteroidsGameProps = {
  onStatsChange: (stats: { score: number; lives: number; level: number }) => void;
  onGameOver: (finalScore: number) => void;
};
```

Componente `forwardRef<AsteroidsGameHandle, AsteroidsGameProps>`.

## Implementation plan

1. Agregar la entrada `asteroides` a `GAMES` en `app/data/games.ts` con los valores de la sección "Data model".
2. Crear `components/asteroids-game.tsx`: Client Component con `forwardRef`, portando a TypeScript la lógica completa de `references/started-games/02-asteroids/game.js` (clases `Bullet`, `Asteroid`, `PowerUp`, `Ship`, `Particle`; constantes `RADII`/`SPEEDS`/`POINTS`/`POWERUP_*`/`TRIPLE_SPREAD`; utilidades `wrap`/`dist`/`rand`/`randInt`; funciones `spawnAsteroids`/`initGame`/`nextLevel`/`explode`/`killShip`/`update`/`draw`), todo encapsulado dentro de un único `useEffect`:
   - `<canvas ref={canvasRef} width={800} height={600} style={{ width: "100%", height: "100%" }} />`, misma resolución lógica (800×600) que el original.
   - Loop `requestAnimationFrame` propio del componente, cancelado en el cleanup del efecto.
   - Listeners `keydown`/`keyup` agregados a `window` dentro del efecto y removidos en su cleanup; se agrega `event.preventDefault()` en `ArrowLeft`/`ArrowRight`/`ArrowUp`/`Space` para que no scrolleen la página (el HTML original standalone no lo necesitaba).
   - `drawHUD()` recortada: ya no dibuja `SCORE`/`NIVEL ${level}`/íconos de vida (eso pasa a vivir en el HUD de React); conserva el texto `3x ${tripleShot}s`.
   - Se elimina la rama `state === 'gameover'` de `draw()` que llamaba `drawOverlay('GAME OVER', ...)` — la reemplaza el modal ya existente en `game-player.tsx`.
   - Se elimina `if ( pressed( 'Space' ) ) initGame();` dentro de la rama `state === 'gameover'` de `update()` — el reinicio solo ocurre vía `restart()`.
   - Una vez por frame, si `score`/`lives`/`level` cambiaron respecto al frame anterior, llama a `onStatsChange({ score, lives, level })` (comparación simple para no disparar renders de React a 60 FPS sin necesidad).
   - En el frame donde `state` pasa a `'gameover'` (por quedarse sin vidas o por `forceGameOver()`), llama una única vez a `onGameOver(score)`.
   - Expone vía `useImperativeHandle`: `togglePause()` (alterna un flag interno que hace que `update(dt)` no se llame mientras dura, pero `draw()` sigue corriendo — pantalla congelada), `forceGameOver()` (fuerza `state = 'gameover'`) y `restart()` (llama `initGame()` internamente y limpia el flag de pausa).
3. Modificar `components/game-player.tsx`: cuando `game.id === "asteroides"`, renderizar `<AsteroidsGame ref={gameRef} onStatsChange={...} onGameOver={...} />` dentro de `.crt-screen` en lugar de los `div.game-arena`/`.grid-floor`/`.enemy`/`.player-ship` decorativos y del `setInterval` falso de puntuación; los botones existentes pasan a llamar al ref real: PAUSA/REANUDAR → `togglePause()`, FIN → `forceGameOver()`, JUGAR DE NUEVO → `restart()`; `score`/`lives`/`level` del HUD de React se alimentan de `onStatsChange` en vez del `setInterval`/incremento por umbral actual; `onGameOver` marca `over = true` (abre el modal, igual que hoy). Para cualquier otro `game.id`, el bloque decorativo actual queda sin cambios.
4. Correr `npx next typegen` si hace falta y `npm run build` para confirmar que compila y tipa.

## Acceptance criteria

- [ ] `npm run build` termina sin errores.
- [ ] `/juegos/asteroides` muestra la card y el detalle con la nueva entrada (título "ASTEROIDES", categoría SHOOTER).
- [ ] `/juegos/asteroides/jugar` carga el canvas real del juego (nave, asteroides) con el HUD de React (Puntuación/Vidas/Nivel) sincronizado.
- [ ] `ArrowLeft`/`ArrowRight` rotan la nave, `ArrowUp` acelera (con estela del propulsor), `Space` dispara; ninguna de esas teclas scrollea la página.
- [ ] Destruir un asteroide grande lo divide en dos medianos y estos en dos pequeños; los pequeños desaparecen sin dividirse; la puntuación del HUD sube según el tamaño destruido.
- [ ] Recoger el power-up cian activa disparo triple durante 5s, visible como "3x" en el canvas.
- [ ] Chocar con un asteroide sin invencibilidad resta una vida (el HUD de React lo refleja) y la nave reaparece con parpadeo de invencibilidad.
- [ ] PAUSA congela el juego (nave/asteroides dejan de moverse); REANUDAR lo continúa exactamente donde quedó.
- [ ] FIN fuerza el fin de partida y abre el modal "FIN DEL JUEGO" con la puntuación real alcanzada.
- [ ] Quedarse sin vidas (lives = 0) también abre el mismo modal automáticamente, sin pulsar FIN.
- [ ] Guardar la puntuación desde el modal la persiste en `localStorage["av_scores"]` con `game: "asteroides"`, igual que los demás juegos.
- [ ] "JUGAR DE NUEVO" reinicia el juego real desde cero (score 0, 3 vidas, nivel 1) dentro de la misma pantalla.
- [ ] "SALIR" navega a `/juegos/asteroides` sin dejar el loop corriendo ni listeners de teclado activos (sin warnings de React en consola por actualizar estado tras desmontar).
- [ ] Limpiar un nivel (0 asteroides restantes) genera el siguiente nivel con más rocas, y el HUD de React muestra el nivel incrementado.
- [ ] El resto de los juegos (`bloque-buster`, `caída`, `serpentina`, `glotón`, `invasores`, `rocas`, `ranaria`, `duelo-pixel`) siguen mostrando el reproductor decorativo sin cambios.

## Decisions

- **Sí:** nueva entrada `asteroides` en vez de reusar `rocas` — decisión explícita del usuario; ambas conviven en la Biblioteca aunque `rocas` siga siendo decorativa.
- **Sí:** reusar la clase `cover-rocas` para la card de `asteroides` — decisión explícita del usuario, sin agregar CSS nuevo.
- **Sí:** HUD de React sincronizado vía callback, ocultando `SCORE`/`NIVEL`/vidas del canvas — decisión explícita del usuario; se conserva el indicador `3x` en canvas por no tener equivalente en el HUD de React.
- **Sí:** implementar pausa real deteniendo `update(dt)` — decisión explícita del usuario, aunque el juego original no la tenía.
- **Sí:** FIN fuerza game over igual que quedarse sin vidas — decisión explícita del usuario.
- **Sí:** `best`/`plays` de la nueva entrada son valores decorativos fijos, igual que el resto de `GAMES` — decisión explícita del usuario; no se conecta `av_scores` a ningún leaderboard real (mismo patrón que el resto del MVP, ver spec 04).
- **Sí:** componente único `components/asteroids-game.tsx` (sin subcarpeta `components/games/`) — decisión explícita del usuario.
- **Sí:** canvas interno 800×600 escalado por CSS a 100% del contenedor `.crt-screen` — decisión explícita del usuario.
- **Sí:** `preventDefault()` en las teclas de control — necesidad técnica al vivir dentro de una página con scroll (el HTML standalone original no lo necesitaba).
- **Sí:** se quita `if (pressed('Space')) initGame()` de la rama gameover y el `drawOverlay('GAME OVER', ...)` — el modal existente de `game-player.tsx` los reemplaza; dejar ambos causaría un reinicio invisible para React si el jugador presiona espacio con el modal abierto.
- **No:** controles táctiles/móviles — fuera de alcance, decisión explícita del usuario; solo teclado como el original.
- **No:** sonido — no existe en el juego original, no se agrega.
- **No:** el `favicon.svg` del juego original — el sitio ya tiene su propio favicon; no se reemplaza.
- **No:** tocar los demás juegos de `GAMES` ni sus reproductores decorativos — fuera de alcance.
- **No:** persistir puntuaciones reales de Asteroids en Supabase ni mostrarlas en el Salón de la Fama — sigue el mismo patrón mock que el resto del MVP (spec 04 lo deja explícitamente fuera).

## Risks

| Risk                                                                                                                                                        | Mitigation                                                                                                                                  |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Llamar `onStatsChange` en cada uno de los 60 frames/segundo sin filtrar degradaría el rendimiento de React.                                                 | El plan exige comparar contra el frame anterior y solo notificar cuando `score`/`lives`/`level` cambian de verdad.                          |
| Los listeners de teclado en `window` o el `requestAnimationFrame` podrían quedar activos si el componente se desmonta a mitad de partida (ej. botón SALIR). | Listeners y loop se registran y cancelan dentro del mismo `useEffect`, con cleanup garantizado por React al desmontar.                      |
| Dos entradas casi idénticas en la Biblioteca ("ROCAS" decorativa y "ASTEROIDES" real, mismo arte de card) pueden confundir sobre cuál es jugable de verdad. | Aceptado explícitamente por el usuario; queda documentado aquí para una futura decisión (diferenciar o retirar "rocas") fuera de este spec. |

## What is **not** in this spec

- Controles táctiles/móviles.
- Sonido/efectos de audio.
- Reemplazar o eliminar la entrada decorativa `rocas`.
- Persistencia real de puntuaciones de Asteroids en Supabase o en el Salón de la Fama.
- Portar cualquier otro juego de `references/started-games/` (tetris, arkanoid).
- Cambios a los reproductores decorativos de los demás juegos.

Cada uno de estos, si se necesita, va en su propio spec.
