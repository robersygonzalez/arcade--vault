# SPEC 03 — Página About y envío real de correo con Resend

> **Status:** Draft
> **Depends on:** SPEC 02 (pagina-inicio)
> **Date:** 2026-08-21
> **Objective:** Migrar `about.jsx` de `references/templates/home-about/` a la ruta `/about` de Arcade Vault, agregar el link "Sobre nosotros" al Nav, y conectar su formulario de contacto a un envío de correo real vía Resend a través de `app/api/contact`.

## Scope

**In:**

- Crear `components/about.tsx` (Client Component) migrando `about.jsx` tal cual: hero "ACERCA DE ARCADE VAULT", fila de highlights (❤️ / navegador / crecimiento), divisor animado de píxeles, y sección de contacto con formulario (nombre, correo, mensaje).
- Crear `app/about/page.tsx` que renderiza `<About />` en la ruta `/about`, con `metadata.title = "Arcade Vault · Acerca de"`.
- Agregar el link de navegación **"Sobre nosotros"** a `components/nav.tsx` (nav de escritorio y menú móvil), apuntando a `/about`, con su estado `isActive` (`pathname === "/about"`).
- Migrar a `app/globals.css` el bloque de estilos `ABOUT PAGE` (`.about*`, `.highlight*`, `.contact-*`, `.terminal-success`/`.term-*`, `.btn.press:active`) desde `references/templates/home-about/styles.css`.
- Crear `app/api/contact/route.ts` (Route Handler, `POST`): valida que `name`, `email` y `msg` no estén vacíos, y usa el SDK `resend` del lado del servidor para enviar el mensaje por correo.
- Reemplazar el `setSent(...)` simulado del formulario de `about.jsx` por un envío real: al hacer submit, `components/about.tsx` llama `fetch("/api/contact", { method: "POST", body: JSON.stringify(form) })` y maneja los estados `idle` / `submitting` / `success` / `error`.
- Agregar la dependencia `resend` a `package.json`.
- Crear `.env.local` (no versionado, ya cubierto por `.env*` en `.gitignore`) con la variable `RESEND_API_KEY=` vacía, lista para que el usuario coloque su API key.

**Out of scope (para specs futuros):**

- Verificar un dominio propio en Resend — se usa el remitente sandbox `onboarding@resend.dev` mientras tanto; cambiarlo a un dominio propio no requiere tocar código, solo la constante `FROM_EMAIL`.
- Protección anti-spam (honeypot, rate limiting, captcha) — igual que el resto del MVP, se mantiene simple.
- Guardar los mensajes de contacto en alguna base de datos o mostrar un historial — el correo es el único registro.
- Cualquier cambio a las demás pantallas migradas en spec 01/02.

## Data model

No se introducen estructuras de datos persistentes nuevas.

```ts
// app/api/contact/route.ts — payload esperado
type ContactPayload = { name: string; email: string; msg: string };

// respuesta
type ContactResponse = { ok: true } | { ok: false; error: string };
```

Constantes en `app/api/contact/route.ts` (no configurables por env, no son secretas):

- `TO_EMAIL = "robersygonzalez@gmail.com"` — destinatario fijo.
- `FROM_EMAIL = "Arcade Vault <onboarding@resend.dev>"` — remitente sandbox de Resend.

Variable de entorno (secreta, en `.env.local`, sin valor por ahora):

- `RESEND_API_KEY` — el usuario la completa después de este spec.

## Implementation plan

1. Agregar `resend` a `package.json` (`npm install resend`).
2. Crear `.env.local` con `RESEND_API_KEY=` (vacío) si no existe.
3. Crear `app/api/contact/route.ts`: Route Handler `POST` que lee `{ name, email, msg }` del body, responde `400` con `{ ok: false, error: "..." }` si algún campo viene vacío, instancia `new Resend(process.env.RESEND_API_KEY)` y llama `resend.emails.send({ from: FROM_EMAIL, to: TO_EMAIL, replyTo: email, subject: \`Nuevo mensaje de ${name} · Arcade Vault\`, text: msg })`; responde `200` con `{ ok: true }` si Resend no devuelve error, o `500` con `{ ok: false, error: "..." }` si falla (API key inválida, red, etc.).
4. Crear `components/about.tsx` migrando `about.jsx`: mismo hook de `IntersectionObserver` sobre `.reveal` (idéntico patrón a `useReveal` de `components/home.tsx`), `HighlightIcon`, hero, highlights, divisor y sección de contacto.
5. En `components/about.tsx`, reemplazar la lógica de envío: estado `status: "idle" | "submitting" | "success" | "error"`. En `onSubmit`, si `name`/`email`/`msg` están vacíos aplica el mismo `shake` que el template; si no, pone `status = "submitting"`, hace `fetch("/api/contact", ...)`, y según la respuesta pasa a `"success"` (muestra el mismo bloque `terminal-success` del template) o `"error"` (muestra un mensaje inline en magenta/rojo debajo del botón, ej. "No se pudo enviar el mensaje. Intenta de nuevo.", y deja el formulario editable con los datos que el usuario ya escribió, sin borrarlos).
6. Crear `app/about/page.tsx` (Server Component) que renderiza `<About />` con `metadata.title = "Arcade Vault · Acerca de"`.
7. Actualizar `components/nav.tsx`: agregar `<Link href="/about">Sobre nosotros</Link>` después de "Salón de la Fama", tanto en `.links` (desktop) como en el panel móvil; extender `isActive` con el caso `"about"` (`pathname === "/about"`).
8. Agregar a `app/globals.css` el bloque `ABOUT PAGE` de `references/templates/home-about/styles.css` (líneas ~1071–1146: `.about`, `.about-hero`, `.about-title`, `.about-mission`, `.highlight-row`/`.highlight*`, `.about-divider`/`.div-bar`/`.div-pixels`, `.about-contact`/`.contact-grid`/`.contact-intro`/`.contact-title`/`.contact-sub`/`.contact-tips`, `.contact-form` (+ `.shake`, `textarea`), `.btn.press:active`, `.terminal-success`/`.term-*`). No copiar el bloque `GAMEPAD` (sigue fuera de alcance, igual que spec 02).
9. Correr `npx next typegen` si hace falta (nueva ruta `/about`) y verificar `npm run build`.

## Acceptance criteria

- [ ] `npm run build` termina sin errores.
- [ ] `/about` muestra el hero "ACERCA DE ARCADE VAULT", la fila de highlights, el divisor animado y la sección de contacto, con las animaciones `.reveal` activándose al hacer scroll.
- [ ] El Nav (escritorio y menú móvil) muestra el link "Sobre nosotros" apuntando a `/about`, activo solo en esa ruta.
- [ ] Enviar el formulario con algún campo vacío agita el formulario (`shake`) y no llama a `/api/contact`.
- [ ] Enviar el formulario completo llama a `POST /api/contact`; mientras espera la respuesta el botón indica estado de envío (`submitting`).
- [ ] Si `/api/contact` responde `ok: true`, se muestra el mismo bloque `terminal-success` del template con el nombre del usuario, y "ENVIAR OTRO MENSAJE" reinicia el formulario.
- [ ] Si `/api/contact` responde `ok: false` (por ejemplo, `RESEND_API_KEY` vacía), se muestra el mensaje de error inline debajo del botón y los datos escritos por el usuario permanecen en el formulario.
- [ ] `app/api/contact/route.ts` no envía el correo si `name`, `email` o `msg` vienen vacíos (responde `400`).
- [ ] `.env.local` existe con `RESEND_API_KEY=` vacía y no se sube a git (ya cubierto por `.env*` en `.gitignore`).

## Decisions

- **Sí:** ruta `/about`, decisión explícita del usuario.
- **Sí:** el link del Nav dice **"Sobre nosotros"**, no "Acerca de" como en `nav.jsx` del template — decisión explícita del usuario; el contenido de la propia página About conserva el texto "ACERCA DE" del template (kicker, título) porque no se pidió cambiarlo.
- **Sí:** implementación con `app/api/contact/route.ts` (Route Handler) llamado por `fetch` desde el cliente, y el SDK `resend` usado únicamente del lado del servidor — decisión explícita del usuario.
- **Sí:** remitente sandbox `onboarding@resend.dev` mientras no haya dominio propio verificado — recomendación aceptada por el usuario; cambiar a dominio propio después es solo cambiar la constante `FROM_EMAIL`.
- **Sí:** destinatario fijo `robersygonzalez@gmail.com`, hardcodeado en `route.ts` (no es secreto) — decisión explícita del usuario.
- **Sí:** `RESEND_API_KEY` queda vacía en `.env.local`; el usuario la completa después de este spec — decisión explícita del usuario.
- **Sí:** ante fallo de envío se muestra un mensaje de error inline (no solo el `shake`) y el formulario conserva los datos ya escritos — decisión explícita del usuario, para no perder lo que el jugador ya escribió.
- **No:** protección anti-spam (honeypot, rate limiting, captcha) — fuera de alcance del MVP, igual que el resto del proyecto.
- **No:** persistir los mensajes de contacto en una base de datos — el correo es el único registro; no hay backend/DB en este proyecto todavía.

## What is **not** in this spec

- Verificación de un dominio propio en Resend (se documenta como configuración futura vía `FROM_EMAIL`).
- Protección anti-spam del formulario de contacto.
- Persistencia o historial de los mensajes enviados.
- Cambios a las pantallas ya migradas en spec 01/02.

Cada uno de estos, si se necesita, va en su propio spec.
