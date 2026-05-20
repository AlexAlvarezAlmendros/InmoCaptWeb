import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Card, CardContent } from "@/components/ui";
import { formatPrice, formatDate } from "@/lib/utils";
import {
  usePlans,
  useUserPlan,
  usePlanCheckout,
  useChangePlan,
  useCancelPlan,
  useCancelPendingListChange,
  useVerifyPlanSession,
} from "@/hooks/usePlan";
import type { ApiError } from "@/services/apiClient";
import type { Plan } from "@/types";

function PlanCard({
  plan,
  isCurrent,
  isPendingDowngrade,
  highlighted,
  onSelect,
  isLoading,
}: {
  plan: Plan;
  isCurrent: boolean;
  isPendingDowngrade?: boolean;
  highlighted?: boolean;
  onSelect: () => void;
  isLoading: boolean;
}) {
  const isDisabled = isCurrent || isPendingDowngrade || isLoading;

  return (
    <Card
      className={`relative flex flex-col ${
        highlighted ? "border-primary shadow-lg" : ""
      } ${isCurrent ? "ring-2 ring-primary" : ""} ${isPendingDowngrade ? "ring-2 ring-amber-400" : ""}`}
    >
      {highlighted && !isCurrent && !isPendingDowngrade && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-white">
          Más popular
        </span>
      )}
      {isCurrent && (
        <span className="absolute -top-3 right-4 rounded-full bg-green-500 px-3 py-0.5 text-xs font-semibold text-white">
          Plan actual
        </span>
      )}
      {isPendingDowngrade && (
        <span className="absolute -top-3 right-4 rounded-full bg-amber-400 px-3 py-0.5 text-xs font-semibold text-white">
          Cambio programado
        </span>
      )}
      <CardContent className="flex flex-1 flex-col">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
          {plan.name}
        </h3>
        <div className="mt-4 flex items-baseline gap-1">
          <span className="text-4xl font-bold text-slate-900 dark:text-white">
            {formatPrice(plan.priceCents, plan.currency)}
          </span>
          <span className="text-sm text-slate-500">/mes</span>
        </div>

        <ul className="mt-6 flex-1 space-y-3 text-sm">
          <li className="flex items-start gap-2">
            <CheckIcon />
            <span>
              {plan.maxLists === null
                ? "Listas ilimitadas"
                : plan.maxLists === 1
                  ? "1 lista activa"
                  : `${plan.maxLists} listas activas`}
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckIcon />
            <span>
              <strong>{plan.monthlyCredits}</strong> créditos incluidos al mes
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckIcon />
            <span>Top-ups disponibles sin caducidad</span>
          </li>
          {plan.maxLists !== null && (
            <li className="flex items-start gap-2 text-slate-500">
              <InfoIcon />
              <span>Cambio de lista al renovar el ciclo</span>
            </li>
          )}
        </ul>

        <Button
          className="mt-6 w-full"
          variant={highlighted && !isDisabled ? "primary" : "secondary"}
          onClick={onSelect}
          isLoading={isLoading}
          disabled={isDisabled}
        >
          {isCurrent
            ? "Plan actual"
            : isPendingDowngrade
              ? "Cambio programado"
              : "Contratar"}
        </Button>
      </CardContent>
    </Card>
  );
}

function CheckIcon() {
  return (
    <svg
      className="h-5 w-5 shrink-0 text-primary"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg
      className="h-5 w-5 shrink-0 text-slate-400"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

export function PlansPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: plans, isLoading: isLoadingPlans } = usePlans();
  const { data: userPlan, isLoading: isLoadingUserPlan } = useUserPlan();
  const checkoutMutation = usePlanCheckout();
  const changePlanMutation = useChangePlan();
  const cancelMutation = useCancelPlan();
  const cancelPendingMutation = useCancelPendingListChange();
  const verifySession = useVerifyPlanSession();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [changePlanTarget, setChangePlanTarget] = useState<{ plan: Plan; type: "upgrade" | "downgrade" } | null>(null);
  const [changePlanResult, setChangePlanResult] = useState<{ type: "upgrade" | "downgrade"; planName: string; effective: string; creditsAdded?: number } | null>(null);

  const queryClient = useQueryClient();
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const checkoutStatus = searchParams.get("checkout");
  const sessionId = searchParams.get("session_id");
  const verifiedRef = useRef(false);

  useEffect(() => {
    if (
      checkoutStatus === "success" &&
      sessionId &&
      !verifiedRef.current &&
      !verifySession.isPending
    ) {
      verifiedRef.current = true;
      verifySession.mutate(sessionId, {
        onSettled: () => {
          const next = new URLSearchParams(searchParams);
          next.delete("session_id");
          setSearchParams(next, { replace: true });
        },
      });
    }
  }, [checkoutStatus, sessionId, verifySession, searchParams, setSearchParams]);

  // Determine if user already has an active paid subscription
  const hasPaidActivePlan =
    userPlan?.isActive &&
    !!userPlan.stripeSubscriptionId &&
    userPlan.planId !== "trial";

  const handlePlanSelect = (planId: string) => {
    setCheckoutError(null);
    if (!hasPaidActivePlan) {
      // Trial or no plan: use Stripe Checkout
      setSelectedPlanId(planId);
      checkoutMutation.mutate(planId, {
        onSuccess: (url) => {
          window.location.href = url;
        },
        onError: (err) => {
          setSelectedPlanId(null);
          const apiErr = err as ApiError;
          const message = apiErr.message || "Error al iniciar el pago";
          // If API says the user already has an active plan, refresh userPlan
          // so the UI updates and the change-plan flow is used instead.
          if (apiErr.status === 400 && message.toLowerCase().includes("ya tienes")) {
            queryClient.invalidateQueries({ queryKey: ["userPlan"] });
          } else {
            setCheckoutError(message);
          }
        },
      });
      return;
    }

    // Active paid plan: show confirmation dialog
    const targetPlan = plans?.find((p) => p.id === planId);
    const currentPlan = plans?.find((p) => p.id === userPlan?.planId);
    if (!targetPlan || !currentPlan) return;

    // Sort order is implicit from the plans array (sorted by server)
    const currentIdx = plans!.indexOf(currentPlan);
    const targetIdx = plans!.indexOf(targetPlan);
    const type = targetIdx > currentIdx ? "upgrade" : "downgrade";

    setChangePlanTarget({ plan: targetPlan, type });
  };

  const handleConfirmChangePlan = () => {
    if (!changePlanTarget) return;
    changePlanMutation.mutate(changePlanTarget.plan.id, {
      onSuccess: (result) => {
        setChangePlanTarget(null);
        setChangePlanResult({
          type: result.type,
          planName: result.newPlanName,
          effective: result.effective,
          creditsAdded: result.creditsAdded,
        });
      },
    });
  };

  const handleCancel = () => {
    cancelMutation.mutate(undefined, {
      onSuccess: () => {
        setShowCancelConfirm(false);
      },
    });
  };

  const isLoading = isLoadingPlans || isLoadingUserPlan;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const isTrial = userPlan?.planId === "trial";

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Planes
        </h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Elige el plan que mejor se ajuste a tu volumen de captación.
        </p>
      </div>

      {checkoutStatus === "success" && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300">
          Plan activado correctamente. Tus créditos ya están disponibles.
        </div>
      )}

      {changePlanResult && (
        <div
          className={`mb-6 rounded-lg border p-4 text-sm ${
            changePlanResult.type === "upgrade"
              ? "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300"
              : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
          }`}
        >
          {changePlanResult.type === "upgrade" ? (
            <>
              Plan actualizado a <strong>{changePlanResult.planName}</strong>.
              {changePlanResult.creditsAdded !== undefined &&
                ` Se han añadido ${changePlanResult.creditsAdded} créditos a tu saldo.`}
            </>
          ) : (
            <>
              Tu plan cambiará a <strong>{changePlanResult.planName}</strong> el{" "}
              {formatDate(changePlanResult.effective)}. Hasta entonces sigues con
              tu plan actual.
            </>
          )}
        </div>
      )}

      {/* Trial banner */}
      {isTrial && userPlan && (
        <Card className="mb-6 border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
          <CardContent>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-semibold text-amber-900 dark:text-amber-200">
                  Estás en periodo de prueba
                </h3>
                <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
                  {userPlan.currentPeriodEnd
                    ? `Tu trial termina el ${formatDate(userPlan.currentPeriodEnd)}.`
                    : "Contrata un plan para mantener el acceso."}{" "}
                  Te quedan{" "}
                  <strong>{userPlan.credits.total}</strong> créditos.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current plan summary (paid) */}
      {userPlan && !isTrial && (
        <Card className="mb-6">
          <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Plan actual
                </p>
                <h3 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                  {userPlan.planName}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {userPlan.status === "canceling" ? (
                    <span className="font-medium text-amber-600 dark:text-amber-400">
                      Activo · No se renovará
                    </span>
                  ) : (
                    <>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        Activo
                      </span>
                      {userPlan.currentPeriodEnd &&
                        !userPlan.pendingPlanId &&
                        ` · Renueva el ${formatDate(userPlan.currentPeriodEnd)}`}
                    </>
                  )}
                </p>
                {userPlan.status === "canceling" && userPlan.currentPeriodEnd && (
                  <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
                    Acceso hasta el {formatDate(userPlan.currentPeriodEnd)}
                  </p>
                )}
                {userPlan.pendingPlanId && userPlan.currentPeriodEnd && (
                  <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
                    Cambia a{" "}
                    <strong>
                      {plans?.find((p) => p.id === userPlan.pendingPlanId)
                        ?.name ?? userPlan.pendingPlanId}
                    </strong>{" "}
                    el {formatDate(userPlan.currentPeriodEnd)}
                  </p>
                )}
              </div>
              {userPlan.isActive &&
                userPlan.status === "active" &&
                !userPlan.pendingPlanId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCancelConfirm(true)}
                    className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    Cancelar plan
                  </Button>
                )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Checkout error */}
      {checkoutError && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {checkoutError}
        </div>
      )}

      {/* Plan cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {plans?.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isCurrent={userPlan?.planId === plan.id && userPlan.isActive}
            isPendingDowngrade={userPlan?.pendingPlanId === plan.id}
            highlighted={plan.id === "pro"}
            onSelect={() => handlePlanSelect(plan.id)}
            isLoading={
              (checkoutMutation.isPending || changePlanMutation.isPending) &&
              selectedPlanId === plan.id
            }
          />
        ))}
      </div>

      {/* Pending list changes */}
      {userPlan && userPlan.pendingListChanges.length > 0 && (
        <Card className="mt-8">
          <CardContent>
            <h3 className="mb-3 font-semibold text-slate-900 dark:text-white">
              Cambios de lista programados
            </h3>
            <p className="mb-4 text-sm text-slate-500">
              Se aplicarán automáticamente al renovar tu plan.
            </p>
            <ul className="divide-y divide-border-light dark:divide-border-dark">
              {userPlan.pendingListChanges.map((change) => (
                <li
                  key={change.id}
                  className="flex items-center justify-between py-3 text-sm"
                >
                  <div>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {change.action === "add" && "Añadir"}
                      {change.action === "remove" && "Quitar"}
                      {change.action === "swap" && "Sustituir"}
                    </span>{" "}
                    <span className="text-slate-500">
                      lista <code className="text-xs">{change.listId}</code>
                      {change.replaceListId && (
                        <>
                          {" "}
                          por <code className="text-xs">
                            {change.replaceListId}
                          </code>
                        </>
                      )}
                    </span>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Aplica el {formatDate(change.applyAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => cancelPendingMutation.mutate(change.id)}
                    className="text-xs text-red-600 hover:underline"
                    disabled={cancelPendingMutation.isPending}
                  >
                    Cancelar
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Change plan confirmation modal */}
      {changePlanTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setChangePlanTarget(null)}
        >
          <div
            className="max-w-md rounded-lg bg-card-light p-6 shadow-xl dark:bg-card-dark"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              {changePlanTarget.type === "upgrade"
                ? "Actualizar plan"
                : "Cambiar a plan inferior"}
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              {changePlanTarget.type === "upgrade" ? (
                <>
                  Tu plan cambiará a{" "}
                  <strong>{changePlanTarget.plan.name}</strong> ahora mismo. Se
                  te cobrará la diferencia prorrateada por los días restantes
                  del ciclo actual. Recibirás{" "}
                  <strong>{changePlanTarget.plan.monthlyCredits}</strong>{" "}
                  créditos adicionales sumados a tu saldo actual.
                </>
              ) : (
                <>
                  Tu plan cambiará a{" "}
                  <strong>{changePlanTarget.plan.name}</strong> al finalizar
                  tu ciclo de facturación actual{" "}
                  {userPlan?.currentPeriodEnd &&
                    `(${formatDate(userPlan.currentPeriodEnd)})`}
                  . Hasta entonces mantienes el acceso completo de tu plan
                  actual.
                </>
              )}
            </p>
            <div className="mt-6 flex gap-2">
              <Button
                variant="ghost"
                onClick={() => setChangePlanTarget(null)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmChangePlan}
                isLoading={changePlanMutation.isPending}
                className="flex-1"
              >
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel confirmation modal */}
      {showCancelConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowCancelConfirm(false)}
        >
          <div
            className="max-w-md rounded-lg bg-card-light p-6 shadow-xl dark:bg-card-dark"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              ¿Cancelar tu plan?
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Perderás el acceso a tus listas y los créditos del plan al final
              del ciclo. Tus top-ups comprados se mantienen.
            </p>
            <div className="mt-6 flex gap-2">
              <Button
                variant="ghost"
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1"
              >
                Volver
              </Button>
              <Button
                variant="danger"
                onClick={handleCancel}
                isLoading={cancelMutation.isPending}
                className="flex-1"
              >
                Cancelar plan
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 text-center text-sm text-slate-500">
        ¿Necesitas más créditos?{" "}
        <button
          onClick={() => navigate("/app/credits")}
          className="text-primary hover:underline"
        >
          Comprar packs de créditos →
        </button>
      </div>
    </div>
  );
}
