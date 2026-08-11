# Analítica (Umami)

InmoCapt envía su analítica a la instancia autoalojada de Umami en
`https://analiticas.alexalvarez.dev` (website id
`79358895-19fb-481f-ba7d-261e2da757e6`).

## Cómo está montado

| Pieza | Dónde | Qué hace |
| --- | --- | --- |
| Cargador | `packages/web/index.html` | Inyecta `script.js` (pageviews + eventos) y `recorder.js` (replays + heatmaps) |
| Wrapper | `packages/web/src/lib/analytics.ts` | `track()`, `trackOnce()`, `identify()`, patrones de ruta y captura de errores |
| Provider | `packages/web/src/app/providers/AnalyticsProvider.tsx` | `route_view`, identidad del usuario, errores JS |
| Plan | `packages/web/src/hooks/useAnalyticsPlan.ts` | Añade plan/créditos a la sesión (montado en `AppLayout`) |
| Scroll | `packages/web/src/hooks/useScrollDepth.ts` | `scroll_depth` en landing y precios |

### Reglas del cargador

- **Solo produce datos en `inmocapt.com` y `www.inmocapt.com`.** En local, en
  previews de Vercel o en cualquier otro host no se carga nada.
  Para depurar desde otro host: `localStorage.setItem("umami.force", "1")`.
- **Respeta _Do Not Track_.** Si el navegador lo activa no se carga ni el
  tracker ni el grabador de sesiones (`recorder.js` no soporta la opción de
  forma nativa, por eso se comprueba antes de inyectarlo).
- **Sanea la URL** (`data-before-send` → `window.umamiBeforeSend`): los
  parámetros `session_id`, `code`, `state`, `token`, `id_token`,
  `access_token`, `refresh_token`, `email` e `invitation` se sustituyen por
  `redacted` antes de enviar nada.

### Pageviews

Umami registra los pageviews automáticamente y engancha `history.pushState`, así
que los cambios de ruta del SPA se cuentan solos. Como eso separa cada
`/app/lists/<uuid>` en una fila distinta, además emitimos `route_view` con el
patrón normalizado (`/app/lists/:listId`) para poder agregar.

### Atributos de sesión (`identify`)

- Al autenticarse: id de Auth0 (`sub`) + `role` (`admin` / `agent`) + `roles`.
- Dentro del área privada: `plan`, `plan_status`, `plan_active`, `lists_used`,
  `lists_max` y `credits_bucket` (`0`, `1-5`, `6-20`, `21-50`, `50+`).

Nunca se envía email, teléfono, nombre del propietario, texto de búsqueda ni
contenido de comentarios.

## Catálogo de eventos

Los nombres están tipados en `AnalyticsEvent` (`src/lib/analytics.ts`): añadir
uno nuevo obliga a declararlo primero, lo que evita que se cuelen variantes.

### Navegación y sesión

| Evento | Datos | Cuándo |
| --- | --- | --- |
| `route_view` | `route`, `area`, `authenticated` | Cada cambio de ruta |
| `scroll_depth` | `page`, `depth` (25/50/75/100) | Profundidad en landing y precios |
| `auth_login_start` | `location`, `page` | Clic que lanza el registro/login de Auth0 |
| `auth_session_start` | `role` | Primer render autenticado de la pestaña |
| `auth_logout` | `location` | Cierre de sesión |
| `js_error` | `message`, `source`, `route` | Error no capturado (máx. 5 por carga) |

### Landing

| Evento | Datos |
| --- | --- |
| `landing_cta_click` | `location` (`header`, `hero`, `final_cta`), `action` |
| `landing_pricing_click` | `location` (`header`, `pricing_section`) |
| `landing_legal_click` | `doc` |

### Demo interactiva

| Evento | Datos |
| --- | --- |
| `demo_start` | — (primera interacción, una vez por visita) |
| `demo_list_open` | `list` |
| `demo_back` | `location` |
| `demo_filter` | `filter`, `list` |
| `demo_state_change` | `state`, `list` |
| `demo_comment_save` | `list` (una vez por visita, no por tecla) |

### Precios (público)

| Evento | Datos |
| --- | --- |
| `pricing_cta_click` | `location`, `action` |
| `pricing_plan_select` | `plan`, `action` |
| `pricing_pack_click` | `pack`, `credits`, `price` |
| `pricing_legal_click` | `doc` |

### Planes (privado)

| Evento | Datos |
| --- | --- |
| `plan_checkout_start` | `plan`, `from_plan` |
| `plan_checkout_error` | `plan`, `status`, `reason` |
| `plan_checkout_success` | — (vuelta de Stripe) |
| `plan_change_open` / `plan_change_confirm` | `plan`, `from_plan`, `type` |
| `plan_cancel_open` / `plan_cancel_confirm` | `plan` |
| `plan_pending_change_cancel` | `list` |
| `plan_credits_click` | `plan` |

### Créditos

| Evento | Datos |
| --- | --- |
| `credits_pack_checkout_start` | `pack`, `credits`, `price_cents`, `balance` |
| `credits_purchase_success` | — |
| `credits_empty_landing` | — (llegada con `?reason=empty`) |

### Dashboard y solicitudes

| Evento | Datos |
| --- | --- |
| `dashboard_list_open` | `list`, `new_properties` |
| `dashboard_list_activate` | `list`, `plan`, `slots_used`, `source` |
| `dashboard_list_activate_error` | `list`, `reason` |
| `dashboard_swap_open` / `dashboard_swap_confirm` | `list`, `replaces`, `plan` |
| `dashboard_upgrade_click` | `location` (`no_plan`, `no_slots`, `pending_changes`, `list_no_access`) |
| `dashboard_checkout_success` | — |
| `list_request_open` / `list_request_submit` / `list_request_error` | `source`, `has_notes`, `reason` |

### Detalle de lista (núcleo del producto)

| Evento | Datos |
| --- | --- |
| `property_reveal_click` | `list`, `credits` |
| `property_reveal_success` | `list` |
| `property_reveal_blocked` | `list`, `reason` (`no_credits`, `error`), `status` |
| `property_state_change` | `list`, `state` |
| `property_comment_save` | `list`, `cleared` |
| `list_filter_change` | `list`, `filter`, `location` |
| `list_search` | `list`, `action`, `has_text`, `has_min_price`, `has_max_price` |
| `list_load_more` | `list`, `loaded`, `total` |
| `list_no_credits_modal` | `list`, `source` |
| `list_no_credits_buy_click` | `list`, `source`, `credits` |

### Suscripciones por lista y cuenta

| Evento | Datos |
| --- | --- |
| `subscription_checkout_start` | `list` |
| `subscription_cancel_open` / `subscription_cancel_confirm` | `subscription` |
| `subscription_search` | — (una vez por visita) |
| `billing_portal_open` | `location`, `plan` |
| `account_preferences_save` | `email_notifications` |
| `account_password_reset_request` | `provider` |
| `account_delete_open` / `account_delete_confirm` | `plan` |

## Embudos recomendados en el panel

1. **Adquisición →️ registro:** `route_view` (`/`) → `landing_cta_click` →
   `auth_login_start` → `auth_session_start`.
2. **Registro → plan de pago:** `auth_session_start` → `plan_checkout_start` →
   `plan_checkout_success`.
3. **Activación real:** `dashboard_list_activate` → `dashboard_list_open` →
   `property_reveal_success`.
4. **Falta de créditos → recompra:** `property_reveal_blocked` →
   `list_no_credits_buy_click` → `credits_pack_checkout_start` →
   `credits_purchase_success`.
5. **Interés en la demo:** `demo_start` → `demo_state_change` →
   `landing_cta_click`.

Segmentando cualquiera de ellos por el atributo `plan` o `role` se separa el
comportamiento de clientes de pago, trial y cuentas internas de administración.

## Añadir un evento nuevo

1. Declarar el nombre en `AnalyticsEvent` (`src/lib/analytics.ts`).
2. Llamar a `track("nombre", { ... })` desde el manejador correspondiente.
3. Documentarlo en la tabla que le corresponda de este fichero.

Reglas: nombres en `snake_case`, sin datos personales, sin texto libre escrito
por el usuario, y `trackOnce()` para cualquier cosa que cuelgue de un `onChange`
(si no, se emite un evento por pulsación de tecla).
