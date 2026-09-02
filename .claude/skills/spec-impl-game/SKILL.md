---
name: spec-impl-game
description: Implementa el spec de un juego siguiendo /spec-impl y, al terminar, encadena en serie los agentes skin-designer y mobile-porter para generar el spec de skins y el spec móvil del juego recién añadido.
disable-model-invocation: true
argument-hint: <NN-spec-del-juego>
---

# /spec-impl-game — Implementador de specs de juego + cadena de agentes

Empaqueta el flujo completo de "juego nuevo": implementa el spec exactamente igual que
`/spec-impl`, y al terminar encadena **en serie** (nunca en paralelo) los agentes
`skin-designer` y `mobile-porter`, que dejan listos el spec de skins y el spec móvil del juego
recién añadido.

**Por qué en serie y no en paralelo:** `skin-designer` y `mobile-porter` escriben cada uno un
`specs/NN-*.md` nuevo tomando el siguiente número correlativo libre — si corrieran a la vez
competirían por el mismo `NN`. Además `skin-designer` necesita leer el componente del juego ya
registrado en `REAL_GAMES`, que solo existe una vez completada la Fase A.

---

## Instrucciones

Sigue las 4 fases en orden estricto. No avances a la siguiente fase si la anterior no terminó
correctamente o el usuario no confirmó cuando se le pidió.

---

### Fase A — Implementación (delegada a /spec-impl)

El argumento recibido es: `$ARGUMENTS`

1. Lee con la herramienta Read el archivo `.claude/skills/spec-impl/SKILL.md` completo y ejecuta
   sus Fases 1 → 4 al pie de la letra, usando `$ARGUMENTS` como el spec objetivo. Eso incluye,
   sin excepción, todas sus reglas: identificar el spec, bloquear si el estado no significa
   "Aprobado" (mensaje de error estándar incluido), crear/cambiar a la rama `spec-NN-slug` según
   `specs/.spec-config.yml`, mostrar el resumen del spec, implementar paso a paso pausando para
   revisión de diff después de cada paso, nunca commitear automáticamente, y detenerse ante
   cualquier ambigüedad para preguntar en vez de improvisar.

2. **Guard propio de este comando** — antes de empezar a implementar (justo tras validar el
   estado "Aprobado" en la Fase 2 de `/spec-impl`), confirma que el spec es realmente de un
   juego: debe registrar una key nueva en `REAL_GAMES` (`components/games/registry.ts`) y/o
   insertar una fila en la tabla `games` de Supabase. Si el spec no hace ninguna de las dos
   cosas, detente y dile al usuario que este spec no es de un juego — que use `/spec-impl` a
   secas — y no continúes con nada de este archivo.

3. Durante la implementación, identifica y recuerda el **`game_id`**: la key exacta que el spec
   añade a `REAL_GAMES`. Al terminar la Fase 4 de `/spec-impl`, confírmalo leyendo
   `components/games/registry.ts` — debe existir esa key. Ese `game_id` es el argumento que
   usarán las Fases B y C de este comando.

4. Como parte de los pasos de implementación (o justo después, si el spec no lo cubre
   explícitamente), asegúrate de que `references/implemented-games.md` quede actualizado con la
   fila del juego nuevo — es la fuente de verdad del catálogo y varios agentes la leen.

5. **No avances a la Fase B hasta que la Fase 4 de `/spec-impl` haya terminado por completo**
   (todos los pasos del plan implementados, no solo iniciados). Si el usuario aborta a mitad de
   la implementación, o decide no continuar, detente ahí — no lances ningún agente.

---

### Fase B — skin-designer (bloqueante)

Solo si la Fase A terminó completa.

1. Pregunta explícitamente: `¿Lanzo skin-designer para <game_id>?` y espera confirmación del
   usuario antes de continuar. Si dice que no, salta directo a la Fase D y repórtalo como
   omitido.

2. Si confirma, lanza **un solo** subagente `skin-designer` (Task/Agent tool,
   `run_in_background: false` — necesitas su resultado antes de seguir) con un prompt que:
   - nombre un único juego: el `game_id` confirmado en la Fase A (el agente rechaza procesar
     varios juegos a la vez por diseño — nunca le pases una lista);
   - explique que el juego acaba de implementarse en la rama actual y ya está registrado en
     `REAL_GAMES`, incluyendo la ruta real de su componente
     (`components/<slug>-game.tsx`);
   - cite el spec de origen (`specs/NN-slug.md` de la Fase A) como contexto de qué se acaba de
     construir.

3. El agente lee `references/game-with-themes.md`, diseña los 3 skins obligatorios
   (`clasico`/`neon`/`retro`) validando contraste, escribe `specs/NN-skins-<slug>.md` en estado
   `Propuesto`/`Draft` y actualiza su propio registro. Su salida no la ve el usuario — captura la
   ruta exacta del spec que generó para reportarla en la Fase D.

---

### Fase C — mobile-porter (bloqueante, solo tras B)

No arranques esta fase hasta que la Fase B haya devuelto (o haya sido omitida) — así el
`ls specs/` que hace `mobile-porter` internamente ve ya consumido el número que usó
`skin-designer`, evitando colisión de `NN`.

1. Antes de preguntar nada, lee `references/mobile-audit.md` y busca la entrada **JUGADOR**:
   - si sigue bajo `## Pendientes` → la zona candidata por defecto es `jugador`;
   - si ya aparece en `## Especificadas` o `## Arregladas` → no la relances a ciegas. Usa
     `AskUserQuestion` ofreciendo: (a) re-auditar `jugador` acotado a lo que trajo el juego
     nuevo, (b) elegir otra zona de la lista real (`global`, `nav`, `detalle`, `hall`, `home`,
     `biblioteca`, `login`, `about`), o (c) saltar esta fase.

2. Pregunta explícitamente: `¿Lanzo mobile-porter para la zona <zona>?` y espera confirmación. Si
   dice que no, salta a la Fase D y repórtalo como omitido.

3. Si confirma, lanza **un solo** subagente `mobile-porter` (`run_in_background: false`) con un
   prompt que:
   - nombre una única zona (nunca varias en la misma corrida);
   - indique que acaba de añadirse el juego `<game_id>` — su canvas, su HUD y sus
     `TOUCH_CONTROLS` en `components/games/registry.ts` son superficie nueva a considerar dentro
     de esa zona.

   No hace falta recordarle el límite de `specs/13-controles-tactiles.md` (input táctil ya
   resuelto) — el agente ya lo respeta por su propia definición.

4. El agente escribe `specs/NN-mobile-<zona>.md` y actualiza `references/mobile-audit.md`.
   Captura la ruta exacta para la Fase D.

---

### Fase D — Cierre

Reporta al usuario, sin excepción, lo que efectivamente se hizo (implementación + fases B/C
ejecutadas u omitidas). Si ambas fases corrieron, usa este formato:

```
✅ Juego implementado y cadena completa.

Juego:      <game_id>   (rama spec-NN-slug)
Skins:      specs/NN-skins-<slug>.md      — Propuesto
Móvil:      specs/NN-mobile-<zona>.md     — Propuesto

Los 2 specs están en Propuesto: apruébalos a mano y luego:
  /spec-impl specs/NN-skins-<slug>.md
  /spec-impl specs/NN-mobile-<zona>.md
```

Si alguna fase se omitió, dilo explícitamente en vez del bloque completo (qué se generó y qué
no, y por qué).

**Reglas que no se rompen nunca:**

- No marques ningún spec como `Aprobado` — en este repo aprueba el humano, a mano.
- No encadenes `/spec-impl` sobre los specs que generen `skin-designer`/`mobile-porter`.
- No hagas commit en ningún momento de este flujo salvo que el usuario lo pida explícitamente.
- Un juego / una zona por invocación de cada agente — si el usuario pide procesar varios juegos o
  varias zonas de una vez, ofrécele correr `/spec-impl-game` de nuevo para cada uno.
