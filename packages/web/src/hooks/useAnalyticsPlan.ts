import { useEffect, useRef } from "react";
import { useUserPlan } from "@/hooks/usePlan";
import { identify } from "@/lib/analytics";

/** Agrupa el saldo en tramos para que el atributo de sesión sea estable. */
function creditsBucket(total: number): string {
  if (total <= 0) return "0";
  if (total <= 5) return "1-5";
  if (total <= 20) return "6-20";
  if (total <= 50) return "21-50";
  return "50+";
}

/**
 * Añade a la sesión de Umami los atributos del plan del usuario (plan, estado,
 * listas usadas y tramo de créditos), para poder segmentar cualquier informe
 * por tipo de cliente. Se monta en los layouts privados.
 */
export function useAnalyticsPlan(): void {
  const { data: userPlan } = useUserPlan();
  const lastSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    if (!userPlan) return;

    const bucket = creditsBucket(userPlan.credits.total);
    const signature = [
      userPlan.planId,
      userPlan.status,
      userPlan.isActive,
      userPlan.listAccess.length,
      bucket,
    ].join("|");

    if (lastSignatureRef.current === signature) return;
    lastSignatureRef.current = signature;

    identify(null, {
      plan: userPlan.planId,
      plan_status: userPlan.status,
      plan_active: userPlan.isActive,
      lists_used: userPlan.listAccess.length,
      lists_max: userPlan.maxLists ?? "unlimited",
      credits_bucket: bucket,
    });
  }, [userPlan]);
}
