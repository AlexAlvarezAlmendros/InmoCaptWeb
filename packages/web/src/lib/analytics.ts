/**
 * Capa de analítica sobre Umami (self-hosted en analiticas.alexalvarez.dev).
 *
 * El tracker y el grabador de sesiones se cargan desde `index.html`, que además
 * decide si deben ejecutarse (solo en los dominios de producción). Aquí solo se
 * envían eventos, de forma que llamar a `track()` en local es un no-op seguro.
 *
 * El catálogo completo de eventos está documentado en `docs/ANALYTICS.md`.
 */

type EventValue = string | number | boolean | null | undefined;

export type EventData = Record<string, EventValue>;

/** Nombres de evento admitidos. Añadir aquí antes de usar uno nuevo. */
export type AnalyticsEvent =
  // Navegación y sesión
  | "route_view"
  | "scroll_depth"
  | "auth_login_start"
  | "auth_session_start"
  | "auth_logout"
  | "js_error"
  // Landing
  | "landing_cta_click"
  | "landing_pricing_click"
  | "landing_legal_click"
  // Demo interactiva
  | "demo_start"
  | "demo_list_open"
  | "demo_back"
  | "demo_filter"
  | "demo_state_change"
  | "demo_comment_save"
  // Página pública de precios
  | "pricing_cta_click"
  | "pricing_plan_select"
  | "pricing_pack_click"
  | "pricing_legal_click"
  // Planes (app)
  | "plan_checkout_start"
  | "plan_checkout_error"
  | "plan_checkout_success"
  | "plan_change_open"
  | "plan_change_confirm"
  | "plan_cancel_open"
  | "plan_cancel_confirm"
  | "plan_pending_change_cancel"
  | "plan_credits_click"
  // Créditos
  | "credits_pack_checkout_start"
  | "credits_purchase_success"
  | "credits_empty_landing"
  // Dashboard
  | "dashboard_list_open"
  | "dashboard_list_activate"
  | "dashboard_list_activate_error"
  | "dashboard_swap_open"
  | "dashboard_swap_confirm"
  | "dashboard_upgrade_click"
  | "dashboard_checkout_success"
  // Solicitudes de lista
  | "list_request_open"
  | "list_request_submit"
  | "list_request_error"
  // Detalle de lista
  | "property_reveal_click"
  | "property_reveal_success"
  | "property_reveal_blocked"
  | "property_state_change"
  | "property_comment_save"
  | "list_filter_change"
  | "list_search"
  | "list_load_more"
  | "list_no_credits_modal"
  | "list_no_credits_buy_click"
  // Suscripciones por lista
  | "subscription_checkout_start"
  | "subscription_cancel_open"
  | "subscription_cancel_confirm"
  | "subscription_search"
  | "billing_portal_open"
  // Cuenta
  | "account_preferences_save"
  | "account_password_reset_request"
  | "account_delete_open"
  | "account_delete_confirm";

interface UmamiApi {
  track: (event?: string | object, data?: EventData) => void;
  identify: (id?: string | EventData, data?: EventData) => void;
}

declare global {
  interface Window {
    umami?: UmamiApi;
  }
}

// Límites que impone Umami en los datos de evento.
const MAX_STRING_LENGTH = 500;
const MAX_PROPERTIES = 50;

// El tracker es `async`, así que los primeros eventos pueden llegar antes que él.
const MAX_QUEUED_CALLS = 50;
const FLUSH_INTERVAL_MS = 300;
const FLUSH_TIMEOUT_MS = 15_000;

type PendingCall = (umami: UmamiApi) => void;

const pending: PendingCall[] = [];
let flushTimer: ReturnType<typeof setInterval> | undefined;
let waitedMs = 0;

function stopFlushing(): void {
  if (flushTimer !== undefined) {
    clearInterval(flushTimer);
    flushTimer = undefined;
  }
}

function flush(): void {
  const umami = window.umami;
  if (!umami) return;
  stopFlushing();
  while (pending.length > 0) {
    const call = pending.shift();
    try {
      call?.(umami);
    } catch {
      /* la analítica nunca debe romper la app */
    }
  }
}

function enqueue(call: PendingCall): void {
  if (pending.length >= MAX_QUEUED_CALLS) return;
  pending.push(call);
  if (flushTimer !== undefined) return;

  waitedMs = 0;
  flushTimer = setInterval(() => {
    waitedMs += FLUSH_INTERVAL_MS;
    if (window.umami) {
      flush();
    } else if (waitedMs >= FLUSH_TIMEOUT_MS) {
      // El tracker no está (dominio no permitido, bloqueador, sin red):
      // se descartan los eventos en cola y se deja de esperar.
      pending.length = 0;
      stopFlushing();
    }
  }, FLUSH_INTERVAL_MS);
}

function run(call: PendingCall): void {
  if (typeof window === "undefined") return;
  const umami = window.umami;
  if (!umami) {
    enqueue(call);
    return;
  }
  try {
    call(umami);
  } catch {
    /* la analítica nunca debe romper la app */
  }
}

/** Recorta y normaliza los datos a lo que Umami acepta. */
function sanitize(data?: EventData): EventData | undefined {
  if (!data) return undefined;

  const clean: EventData = {};
  let count = 0;

  for (const [key, value] of Object.entries(data)) {
    if (count >= MAX_PROPERTIES) break;
    if (value === undefined || value === null) continue;

    if (typeof value === "string") {
      if (value === "") continue;
      clean[key] = value.slice(0, MAX_STRING_LENGTH);
    } else if (typeof value === "number") {
      if (!Number.isFinite(value)) continue;
      clean[key] = Math.round(value * 10_000) / 10_000;
    } else {
      clean[key] = value;
    }
    count += 1;
  }

  return Object.keys(clean).length > 0 ? clean : undefined;
}

/** Envía un evento personalizado. Seguro de llamar siempre. */
export function track(event: AnalyticsEvent, data?: EventData): void {
  const payload = sanitize(data);
  run((umami) => {
    if (payload) umami.track(event, payload);
    else umami.track(event);
  });
}

const firedOnce = new Set<string>();

/** Envía un evento como mucho una vez por carga de página. */
export function trackOnce(
  key: string,
  event: AnalyticsEvent,
  data?: EventData,
): void {
  if (firedOnce.has(key)) return;
  firedOnce.add(key);
  track(event, data);
}

/**
 * Asocia la sesión actual con un usuario y/o unos atributos.
 * Pasar `null` como id guarda los atributos sin identificar a nadie.
 */
export function identify(id: string | null, data?: EventData): void {
  const payload = sanitize(data) ?? {};
  run((umami) => {
    if (id) umami.identify(id, payload);
    else umami.identify(payload);
  });
}

// ─── Rutas ────────────────────────────────────────────────────────────

/** Zona funcional de la app a la que pertenece una ruta. */
export type RouteArea = "landing" | "legal" | "app" | "admin" | "unknown";

const ROUTE_PATTERNS: { match: RegExp; route: string; area: RouteArea }[] = [
  { match: /^\/$/, route: "/", area: "landing" },
  { match: /^\/pricing\/?$/, route: "/pricing", area: "landing" },
  { match: /^\/legal\/[^/]+\/?$/, route: "/legal/:doc", area: "legal" },
  { match: /^\/app\/admin\/?$/, route: "/app/admin", area: "admin" },
  {
    match: /^\/app\/admin\/[^/]+\/?$/,
    route: "/app/admin/:section",
    area: "admin",
  },
  { match: /^\/app\/?$/, route: "/app", area: "app" },
  {
    match: /^\/app\/lists\/[^/]+\/?$/,
    route: "/app/lists/:listId",
    area: "app",
  },
  { match: /^\/app\/[^/]+\/?$/, route: "/app/:section", area: "app" },
];

/**
 * Convierte un pathname en un patrón de ruta estable, para poder agregar
 * `/app/lists/<uuid>` en un único informe.
 */
export function getRouteInfo(pathname: string): {
  route: string;
  area: RouteArea;
} {
  for (const { match, route, area } of ROUTE_PATTERNS) {
    if (match.test(pathname)) return { route, area };
  }
  return { route: pathname, area: "unknown" };
}

// ─── Errores de JavaScript ────────────────────────────────────────────

const MAX_TRACKED_ERRORS = 5;
let trackedErrors = 0;
let errorTrackingInstalled = false;

/**
 * Registra los errores no capturados como eventos, con un tope por carga de
 * página para no inundar el panel cuando algo falla en bucle.
 */
export function installErrorTracking(): void {
  if (errorTrackingInstalled || typeof window === "undefined") return;
  errorTrackingInstalled = true;

  const report = (message: string, source?: string) => {
    if (trackedErrors >= MAX_TRACKED_ERRORS) return;
    trackedErrors += 1;
    track("js_error", {
      message: message.slice(0, 200),
      source: source?.slice(0, 200),
      route: getRouteInfo(window.location.pathname).route,
    });
  };

  window.addEventListener("error", (event) => {
    if (!event.message) return;
    report(event.message, event.filename);
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason as unknown;
    const message =
      reason instanceof Error
        ? reason.message
        : typeof reason === "string"
          ? reason
          : "unhandled rejection";
    report(message, "promise");
  });
}
