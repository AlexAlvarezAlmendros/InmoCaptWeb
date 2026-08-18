import { ReactNode, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { useUserRoles } from "@/hooks/useUserRoles";
import {
  getRouteInfo,
  identify,
  installErrorTracking,
  track,
} from "@/lib/analytics";

const SESSION_FLAG = "inmocapt.analytics.session";

interface AnalyticsProviderProps {
  children: ReactNode;
}

/**
 * Enriquece la analítica automática de Umami con:
 *  - un evento por cambio de ruta usando el patrón (`/app/lists/:listId`),
 *    para poder agregar rutas dinámicas que el pageview automático separa;
 *  - la identidad pseudónima del usuario (id de Auth0 + rol);
 *  - la captura de errores de JavaScript no controlados.
 *
 * Debe montarse dentro del router y del proveedor de Auth0.
 */
export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const location = useLocation();
  const { isAuthenticated, isLoading, user } = useAuth0();
  const { isAdmin, roles } = useUserRoles();
  const identifiedRef = useRef<string | null>(null);

  // Auth0 resuelve la sesión de forma asíncrona: si el evento de ruta
  // dependiera de `isAuthenticated`, cada carga emitiría dos `route_view`.
  const isAuthenticatedRef = useRef(isAuthenticated);
  isAuthenticatedRef.current = isAuthenticated;

  useEffect(() => {
    installErrorTracking();
  }, []);

  // Identidad: se envía una sola vez por usuario y carga de página.
  useEffect(() => {
    if (isLoading) return;

    const userId = isAuthenticated ? user?.sub : undefined;
    if (!userId || identifiedRef.current === userId) return;

    identifiedRef.current = userId;
    identify(userId, {
      role: isAdmin ? "admin" : "agent",
      roles: roles.join(",") || "none",
    });

    // Primer render autenticado de la pestaña: cuenta como inicio de sesión.
    try {
      if (!sessionStorage.getItem(SESSION_FLAG)) {
        sessionStorage.setItem(SESSION_FLAG, "1");
        track("auth_session_start", { role: isAdmin ? "admin" : "agent" });
      }
    } catch {
      /* sessionStorage puede no estar disponible */
    }
  }, [isAuthenticated, isLoading, user?.sub, isAdmin, roles]);

  // Vista de ruta normalizada.
  useEffect(() => {
    const { route, area } = getRouteInfo(location.pathname);
    track("route_view", {
      route,
      area,
      authenticated: isAuthenticatedRef.current,
    });
  }, [location.pathname]);

  return <>{children}</>;
}
