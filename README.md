<div align="center">

# InmoCapt

**Los pisos que vende su dueño, ya localizados. El agente paga un crédito y se lleva el teléfono.**

[![Demo](https://img.shields.io/badge/demo-inmo--capt--web--api.vercel.app-4dd4ac)](https://inmo-capt-web-api.vercel.app)
[![React + Vite](https://img.shields.io/badge/React-Vite%20%2B%20TS-61dafb)](packages/web/)
[![Fastify](https://img.shields.io/badge/Fastify-Node%2020-000000)](packages/api/)
[![Turso](https://img.shields.io/badge/Turso-libSQL-4ff8d2)](packages/api/src/db/schema.sql)
[![Stripe](https://img.shields.io/badge/Stripe-planes%20%2B%20cr%C3%A9ditos-635bff)](packages/api/src/routes/billing.ts)

[El problema](#el-problema) ·
[Planes y créditos](#planes-y-créditos) ·
[Cómo está montado](#cómo-está-montado) ·
[Arrancarlo](#arrancarlo)

</div>

---

## El problema

La captación es la mitad del trabajo de un agente inmobiliario, y consiste en encontrar al
particular que ha puesto su piso a la venta por su cuenta **antes que los otros doce agentes de la
zona**. Eso hoy se hace a mano: rastrear portales, cribar los anuncios de agencia, apuntar
teléfonos en una libreta.

InmoCapt vende ese trabajo ya hecho: **listas por zona** de inmuebles publicados por particulares,
y dentro de cada una, el contacto detrás de un botón.

## Planes y créditos

El modelo empezó siendo una suscripción por lista con precio variable según cuántos inmuebles
tuviera ese mes. Se cambió por una razón concreta: **el agente no sabía cuánto iba a pagar en
mayo**, y un precio impredecible es churn garantizado.

Hoy son tres planes con una economía de créditos encima:

| Plan | Precio/mes | Listas | Créditos | Para quién |
|---|---:|---:|---:|---|
| **Starter** | 29 € | 1 | 30 | Agente que está probando |
| **Pro** | 69 € | 2 | 100 | Agente con sus zonas definidas |
| **Unlimited** | 149 € | ilimitadas | 300 | Agencia o alta actividad |

**Un crédito = revelar un contacto**: teléfono y URL original **juntos**, en un solo movimiento.
Por separado no valen nada —un teléfono sin anuncio o un anuncio sin teléfono no cierran una
visita— y juntos dan una regla que el cliente entiende sin leer nada: *1 crédito = 1 lead*.

Las reglas del ciclo, que son donde se decide si el modelo es honesto:

- Lo revelado **queda revelado para siempre** para ese usuario: consultarlo tres días después no
  se vuelve a cobrar.
- Los créditos del plan **se conceden el día de renovación y no se acumulan**.
- Los **top-ups** (packs de 20/60/150 créditos, entre 0,60 € y 0,40 € el crédito) **no caducan** y
  **se gastan los últimos**: primero se consume lo que regala la suscripción. Lo que has pagado
  aparte es tuyo.
- Al cancelar mantienes los créditos hasta el final del periodo pagado; los top-ups se quedan.

El modelo completo, con el porqué de cada decisión, en
[`docs/SUBSCRIPTION_MODEL_V2.md`](docs/SUBSCRIPTION_MODEL_V2.md).

## Cómo está montado

```
packages/
  web/     React + TypeScript + Vite + Tailwind — landing, panel del agente y admin
  api/     Fastify + TypeScript — rutas, servicios y esquema SQL
  video/   El vídeo promocional, renderizado con Remotion (React, no un editor)
```

El backend separa **rutas** de **servicios**, y los servicios llevan el peso del negocio:
`creditService` y `revealService` (la economía), `subscriptionService` y `planService` (Stripe),
`listService` y `propertyService` (el catálogo), `listRequestService` (peticiones de zona nueva),
`agentStateService`, `emailService` y `trialExpirationJob`.

Autenticación con **Auth0** vía plugin de Fastify, validación con esquemas propios, base en
**Turso** (`packages/api/src/db/schema.sql`) y cobros en **Stripe**, sembrable con `stripeSeed.ts`.

En el frontend, cada capacidad tiene su hook — `useCredits`, `useReveal`, `useBilling`, `usePlan`,
`useMyLists`, `useAdminUsers`… — y la analítica de producto (embudo de plan, profundidad de scroll)
está documentada en [`docs/ANALYTICS.md`](docs/ANALYTICS.md).

## Arrancarlo

```bash
npm install                                            # workspaces
cp packages/web/.env.example packages/web/.env.local
cp packages/api/.env.example packages/api/.env         # Auth0, Turso, Stripe, correo
npm run dev                                            # api y web en paralelo
```

| Comando | Qué hace |
|---|---|
| `npm run dev:web` · `npm run dev:api` | Uno solo de los dos |
| `npm run build` | Construye todos los paquetes |
| `npm run lint` · `npm run typecheck` | ESLint y `tsc` en todo el workspace |
| `npm test` | Tests de los paquetes que los tengan |

Antes del primer arranque: base creada en Turso con el `schema.sql` aplicado, aplicación y API en
Auth0, y en Stripe las claves de test más el webhook apuntando a la API.

Node ≥ 20.

## Estado

Proyecto privado en desarrollo. La documentación funcional y técnica vive en
`.github/instructions/`; el modelo de suscripción v2 (planes + créditos) es la línea de trabajo
principal.

## Licencia

`UNLICENSED` — proyecto privado, todos los derechos reservados.
