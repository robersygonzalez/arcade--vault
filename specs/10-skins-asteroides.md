# SPEC 10 — Skins de Asteroids (clásico / neón / retro) + infraestructura compartida

> **Status:** Aprobado
> **Depends on:** SPEC 05 (Asteroids real)
> **Date:** 2026-08-31
> **Objective:** Crear la infraestructura compartida de skins (`components/games/skins.tsx`) y aplicar los 3 skins obligatorios — `clasico`, `neon`, `retro` — a `components/asteroids-game.tsx`.

## Por qué este spec existe

Es el primer juego que se skinea en Arcade Vault: `components/games/skins.ts(x)` todavía no existe
(confirmado por `references/game-with-themes.md` y por `grep -rn "av_skin\|SkinId\|skins.ts"
components/` sin resultados). Este spec paga esa infraestructura compartida además de skinear
Asteroids. Los siguientes juegos (Tetris, Arkanoid, Snake) solo añadirán su entrada al mapa de
paletas, sin redefinir el contrato.

Asteroids es 100% vectorial (círculos, líneas, `strokeRect`) — no hay spritesheets ni sprites PNG que
tintar, así que es el candidato más simple para validar el contrato antes de que lo hereden juegos
más complejos (Arkanoid con su spritesheet, Tetris con su canvas de "siguiente pieza" en JSX).

## Scope

**In:**

- Crear `components/games/skins.tsx` (nota de nombre de archivo abajo, en "Decisions") con:
  `SkinId`, `SKIN_ORDER`, `SKIN_LABELS`, el hook `useGameSkin(gameId)` con persistencia en
  `localStorage['av_skin_<gameId>']` e hidratación SSR-safe, y el componente `<SkinSwitcher gameId
skin onChange>`.
- Definir `AsteroidsPalette`, `ASTEROIDS_SKINS` (los 3 skins) y registrarlo en `GAME_SKINS.asteroides`
  dentro del mismo archivo.
- Modificar `components/asteroids-game.tsx` para leer sus 9 literales de color desde la paleta activa
  vía un `skinRef` (patrón espejo por ref, no reinicia el loop ni la partida), y renderizar
  `<SkinSwitcher>` sobre el canvas.
- Halo neón vía `ctx.shadowBlur` / `ctx.shadowColor` en ship, bullets, asteroides y power-up cuando el
  skin activo es `neon`.

**Out of scope (para specs futuros):**

- Cualquier otro juego (Tetris, Arkanoid, Snake) — cada uno tendrá su propio spec `NN-skins-<slug>.md`
  que solo añade su entrada a `GAME_SKINS`, reutilizando el contrato de este spec.
- Persistir el skin elegido en Supabase o asociarlo a una cuenta de usuario — vive solo en
  `localStorage`, por diseño.
- Animaciones de transición entre skins (el cambio es instantáneo, sin fade).
- Sonido o feedback háptico al cambiar de skin.

## Data model

**Nota de nombre de archivo:** el contrato de arquitectura del agente `skin-designer` nombra el
archivo `components/games/skins.ts`, pero `SkinSwitcher` es un componente JSX — TypeScript exige
extensión `.tsx` para sintaxis JSX. Este spec usa `components/games/skins.tsx`. Los specs de los
siguientes juegos deben importar de esa misma ruta.

```ts
// components/games/skins.tsx
export type SkinId = "clasico" | "neon" | "retro";

export const SKIN_ORDER: SkinId[] = ["clasico", "neon", "retro"];

export const SKIN_LABELS: Record<SkinId, string> = {
  clasico: "Clásico",
  neon: "Neón",
  retro: "Retro",
};
```

Hook de persistencia — replica el idioma SSR-safe de `components/user-context.tsx:18-24` (hidrata en
un `useEffect` de montaje, evita mismatch porque `app/layout.tsx` no tiene script anti-flash):

```ts
export function useGameSkin(gameId: string): [SkinId, (skin: SkinId) => void] {
  const storageKey = `av_skin_${gameId}`;
  const [skin, setSkinState] = useState<SkinId>("clasico");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored === "clasico" || stored === "neon" || stored === "retro") {
        setSkinState(stored);
      }
    } catch {
      // localStorage no disponible (modo privado, etc.) — se queda en "clasico"
    }
  }, [storageKey]);

  const setSkin = (next: SkinId) => {
    setSkinState(next);
    try {
      localStorage.setItem(storageKey, next);
    } catch {
      // no persiste, pero el cambio en memoria sigue funcionando
    }
  };

  return [skin, setSkin];
}
```

`SkinSwitcher` — pill absoluto, esquina inferior derecha, corta la propagación de sus propios eventos
de mouse (defensivo; Asteroids no lee `mousemove` sobre el canvas hoy, pero el componente es
compartido y otros juegos sí lo harán):

```tsx
export function SkinSwitcher({
  gameId,
  skin,
  onChange,
}: {
  gameId: string;
  skin: SkinId;
  onChange: (next: SkinId) => void;
}) {
  return (
    <div
      onMouseMove={(e) => e.stopPropagation()}
      style={{ position: "absolute", bottom: 8, right: 8, display: "flex", gap: 4, zIndex: 10 }}
    >
      {SKIN_ORDER.map((id) => (
        <button
          key={id}
          aria-pressed={id === skin}
          aria-label={`Cambiar skin de ${gameId} a ${SKIN_LABELS[id]}`}
          onClick={() => onChange(id)}
        >
          {SKIN_LABELS[id]}
        </button>
      ))}
    </div>
  );
}
```

(El styling exacto del pill — colores, tipografía `--pixel`/`--mono`, estado activo — queda a
criterio de implementación siguiendo el lenguaje visual ya existente de `game-player.tsx`; no es
crítico para el contrato.)

Paleta de Asteroids — 9 campos, uno por literal de color censado en `components/asteroids-game.tsx`
(`fillStyle`/`strokeStyle`, líneas 113, 178, 225, 230, 318, 335, 374, 532, 539). `particleRgb` y
`shipThrustRgb` se guardan como tripletes `"R,G,B"` (no hex) porque esos dos elementos se dibujan con
alpha variable (`rgba(...)`), y `glowBlur` es `0` para desactivar el halo (`clasico`/`retro`) o un
valor `> 0` para activarlo (`neon`):

```ts
type AsteroidsPalette = {
  background: string;
  ship: string;
  shipThrustRgb: string;
  bullet: string;
  asteroid: string;
  powerUp: string;
  particleRgb: string;
  hudAccent: string;
  glowBlur: number;
};

export const ASTEROIDS_SKINS: Record<SkinId, AsteroidsPalette> = {
  clasico: {
    background: "#000000",
    ship: "#ffffff",
    shipThrustRgb: "255,130,0",
    bullet: "#ffffff",
    asteroid: "#ffffff",
    powerUp: "#00ffff",
    particleRgb: "255,255,255",
    hudAccent: "#00ffff",
    glowBlur: 0,
  },
  neon: {
    background: "#05050b",
    ship: "#00f5ff",
    shipThrustRgb: "245,255,0",
    bullet: "#f5ff00",
    asteroid: "#ff006e",
    powerUp: "#00ff88",
    particleRgb: "0,245,255",
    hudAccent: "#00ff88",
    glowBlur: 10,
  },
  retro: {
    background: "#140d00",
    ship: "#ffb000",
    shipThrustRgb: "204,136,0",
    bullet: "#ffb000",
    asteroid: "#cc8800",
    powerUp: "#ffb000",
    particleRgb: "153,102,0",
    hudAccent: "#ffb000",
    glowBlur: 0,
  },
};

export const GAME_SKINS = {
  asteroides: ASTEROIDS_SKINS,
} as const;
```

### Paletas y contraste (WCAG, mínimo 3:1 contra el fondo de su propio skin)

**`clasico`** (fondo `#000000`, luminancia 0 — colores actuales, sin cambio de aspecto):

| Elemento                  | Color                  | Contraste       |
| ------------------------- | ---------------------- | --------------- |
| Ship / bullet / asteroide | `#ffffff`              | 21.0 : 1        |
| Power-up / HUD            | `#00ffff`              | 16.8 : 1        |
| Partículas                | `rgba(255,255,255,α)`  | 21.0 : 1 (base) |
| Llama de propulsión       | `rgba(255,130,0,0.85)` | 6.6 : 1         |

**`neon`** (fondo `#05050b`, luminancia 0.00165 — tokens de `app/globals.css:4-22` + halo):

| Elemento          | Color               | Contraste |
| ----------------- | ------------------- | --------- |
| Ship / partículas | `#00f5ff` (cyan)    | 15.0 : 1  |
| Bullet / llama    | `#f5ff00` (yellow)  | 18.6 : 1  |
| Asteroide         | `#ff006e` (magenta) | 5.3 : 1   |
| Power-up / HUD    | `#00ff88` (green)   | 15.2 : 1  |

`glowBlur: 10`, `shadowColor` = el propio color de cada entidad (halo coherente, no un color fijo
compartido).

**`retro`** (fondo `#140d00`, luminancia 0.00436 — fósforo CRT ámbar, sin halo, sin degradados):

| Elemento                       | Color     | Contraste |
| ------------------------------ | --------- | --------- |
| Ship / bullet / power-up / HUD | `#ffb000` | 10.6 : 1  |
| Asteroide / llama              | `#cc8800` | 6.5 : 1   |
| Partículas                     | `#996600` | 3.9 : 1   |

**Ajuste de contraste registrado:** la rampa ámbar de referencia (`skin-designer.md`) sugiere
`#ffb000 → #cc8800 → #7a4f00`. El tercer tono (`#7a4f00`) da **2.71:1** contra `#140d00` — no alcanza
el mínimo de 3:1, así que se sustituye por `#996600` (**3.91:1**) para el tono más oscuro de la
rampa (partículas de explosión). Se documenta aquí y en `references/game-with-themes.md` porque es
una desviación deliberada de la rampa de ejemplo.

## Implementation plan

1. Crear `components/games/skins.tsx` con `SkinId`, `SKIN_ORDER`, `SKIN_LABELS`, `useGameSkin`,
   `SkinSwitcher`, `AsteroidsPalette`, `ASTEROIDS_SKINS` y `GAME_SKINS` — literales exactos de la
   sección "Data model" arriba. Manual test: el archivo compila solo (`tsc --noEmit` o build parcial),
   sin consumirlo todavía.
2. En `components/asteroids-game.tsx`, importar `useGameSkin`, `SkinSwitcher`, `ASTEROIDS_SKINS` desde
   `@/components/games/skins`. Al nivel del componente (fuera del `useEffect` del loop de juego, junto
   a los demás `useRef`), llamar `const [skin, setSkin] = useGameSkin("asteroides")` y crear
   `const skinRef = useRef(ASTEROIDS_SKINS[skin])` + `useEffect(() => { skinRef.current =
ASTEROIDS_SKINS[skin]; }, [skin])` — mismo patrón espejo por ref que `onStatsChangeRef` /
   `onGameOverRef` (líneas 13-27 actuales), para que el `useEffect` principal (línea 39, deps `[]`) no
   se reinicie ni reinicie la partida en curso cuando cambia el skin.
3. Dentro del `useEffect` principal, reemplazar los 9 literales censados por lecturas de
   `skinRef.current`:
   - L113 `c.fillStyle = "#fff"` (Bullet.draw) → `skinRef.current.bullet`.
   - L178 `c.strokeStyle = "#fff"` (Asteroid.draw) → `skinRef.current.asteroid`.
   - L225/L230 `"#0ff"` (PowerUp.draw, borde y texto "3x") → `skinRef.current.powerUp`.
   - L318 `c.strokeStyle = "#fff"` (Ship.draw) → `skinRef.current.ship`.
   - L335 `"rgba(255, 130, 0, 0.85)"` (llama) → `` `rgba(${skinRef.current.shipThrustRgb}, 0.85)` ``.
   - L374 `` `rgba(255,255,255,${alpha})` `` (Particle.draw) → `` `rgba(${skinRef.current.particleRgb},${alpha.toFixed(2)})` ``.
   - L532 `c.fillStyle = "#0ff"` (drawHUD, texto "3x Ns") → `skinRef.current.hudAccent`.
   - L539 `c.fillStyle = "#000"` (fondo, `draw()`) → `skinRef.current.background`.
4. Agregar el halo neón: antes de cada `stroke()`/`fill()` de ship, bullet, asteroide y power-up en
   sus respectivos métodos `draw()`, si `skinRef.current.glowBlur > 0` setear `c.shadowBlur =
skinRef.current.glowBlur` y `c.shadowColor` igual al color propio de esa entidad (no un color fijo
   compartido); resetear `c.shadowBlur = 0` inmediatamente después de cada trazo, y siempre antes del
   `fillRect` de fondo en `draw()` (línea 539-540) para que el halo nunca manche todo el canvas.
5. Envolver el `return` de `AsteroidsGame` (línea 619-621) en un `<div style={{ position: "relative",
width: "100%", height: "100%" }}>` que contenga el `<canvas>` existente sin cambios y
   `<SkinSwitcher gameId="asteroides" skin={skin} onChange={setSkin} />`.
6. `npm run build` para confirmar que todo compila y tipa.

## Acceptance criteria

- [ ] `npm run build` termina sin errores.
- [ ] Con el skin `clasico` activo (default, sin tocar nada), Asteroids se ve pixel-idéntico al
      estado actual antes de este spec.
- [ ] `<SkinSwitcher>` aparece como un pill en la esquina inferior derecha del canvas de Asteroids,
      con las 3 opciones `Clásico`/`Neón`/`Retro`.
- [ ] Elegir `neon` cambia el fondo a `#05050b`, colorea ship/bullets/asteroides/power-up con los
      tokens del sitio, y agrega halo (`shadowBlur`) visible alrededor de cada uno.
- [ ] Elegir `retro` cambia el fondo a `#140d00`, usa solo tonos ámbar de la rampa (`#ffb000`,
      `#cc8800`, `#996600`), y no muestra ningún halo ni degradado.
- [ ] Cambiar de skin en medio de una partida no reinicia la nave, el score, los asteroides en
      pantalla ni el nivel — solo cambia el color en el siguiente frame.
- [ ] Recargar la página después de elegir `neon` o `retro` conserva ese skin (persistencia en
      `localStorage['av_skin_asteroides']`), sin parpadeo de hidratación en consola.
- [ ] Los demás 3 juegos (Tetris, Arkanoid, Snake) no cambian de aspecto ni de comportamiento — este
      spec no los toca.

## Decisions

- **Sí:** `components/games/skins.tsx` (no `.ts`) — exporta un componente JSX (`SkinSwitcher`), y
  TypeScript exige `.tsx` para sintaxis JSX.
- **Sí:** `particleRgb`/`shipThrustRgb` como tripletes `"R,G,B"` en vez de hex — esos dos elementos ya
  se dibujaban con alpha variable en el original; guardar el hex y convertirlo en runtime sería una
  dependencia extra sin necesidad.
- **Sí:** el halo usa el color propio de cada entidad como `shadowColor` (no un cyan fijo compartido)
  — mantiene la lectura de "cada elemento brilla con su propio color" en vez de un halo genérico.
- **No:** `#7a4f00` como tono más oscuro de la rampa retro — falla el mínimo de 3:1 (2.71:1). Se usa
  `#996600` (3.91:1) en su lugar; ver tabla de contraste arriba.
- **No:** persistir el skin en Supabase — vive en `localStorage`, coherente con que Arcade Vault no
  tiene sesión real todavía (`/login` es mock).
- **No:** tocar `game-player.tsx` — el pill lo renderiza el propio `asteroids-game.tsx`, como indica
  el contrato de arquitectura.

## What is **not** in this spec

- Skins de Tetris, Arkanoid o Snake — cada uno en su propio `specs/NN-skins-<slug>.md`.
- Persistencia de skin por cuenta de usuario.
- Transiciones animadas entre skins.

## Último paso

Actualizar `references/game-with-themes.md`: mover `ASTEROIDES` de `## Sin skins` a `## Con skins`
con este número de spec, la fecha real y las 3 paletas con sus ratios de contraste; actualizar la
línea de estado de infraestructura a "existe" (`components/games/skins.tsx`, creado por este spec).
