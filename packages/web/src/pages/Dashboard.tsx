import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
} from "@/components/ui";
import { formatRelativeDate } from "@/lib/utils";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { useVerifyCheckoutSession } from "@/hooks/useBilling";
import { useEffect, useRef } from "react";

export function DashboardPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: subscriptions, isLoading, error } = useSubscriptions();
  const verifySession = useVerifyCheckoutSession();
  const verifiedRef = useRef(false);

  // When returning from Stripe checkout, verify the session to ensure
  // the subscription is recorded in the DB (fallback if webhook failed)
  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (sessionId && !verifiedRef.current) {
      verifiedRef.current = true;
      verifySession.mutate(
        { sessionId },
        {
          onSettled: () => {
            // Clean up URL params regardless of success/failure
            setSearchParams({}, { replace: true });
          },
        },
      );
    }
  }, [searchParams, setSearchParams, verifySession]);

  if (isLoading) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Mis Listas
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Accede a tus listados FSBO suscritos
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="mt-2 h-4 w-1/2 rounded bg-slate-200 dark:bg-slate-700" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-4 w-full rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="h-4 w-1/2 rounded bg-slate-200 dark:bg-slate-700" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Mis Listas
          </h1>
        </div>
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
          <CardContent>
            <p className="text-red-600 dark:text-red-400">
              Error al cargar las suscripciones. Inténtalo de nuevo más tarde.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeSubscriptions = subscriptions?.filter(
    (s) => s.status === "active",
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Mis Listas
        </h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Accede a tus listados FSBO suscritos
        </p>
      </div>

      {!activeSubscriptions || activeSubscriptions.length === 0 ? (
        <Card className="text-center">
          <CardContent>
            <div className="py-8">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <svg
                  className="h-8 w-8 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-medium text-slate-900 dark:text-white">
                No tienes suscripciones activas
              </h3>
              <p className="mb-4 text-slate-500">
                Explora las listas disponibles y suscríbete para acceder a los
                inmuebles FSBO.
              </p>
              <button
                onClick={() => navigate("/app/subscriptions")}
                className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
              >
                Explorar listas disponibles
              </button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {activeSubscriptions.map((subscription) => (
            <Card
              key={subscription.id}
              className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
              onClick={() => navigate(`/app/lists/${subscription.listId}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="line-clamp-1">
                    {subscription.listName}
                  </CardTitle>
                  <Badge variant="success">Activa</Badge>
                </div>
                <p className="text-sm text-slate-500">
                  {subscription.listLocation}
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Inmuebles totales</span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {subscription.totalProperties}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Nuevos</span>
                    {subscription.newPropertiesCount > 0 ? (
                      <Badge variant="success" className="font-medium">
                        +{subscription.newPropertiesCount}
                      </Badge>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Actualizado</span>
                    <span className="text-slate-600 dark:text-slate-400">
                      {subscription.lastUpdatedAt
                        ? formatRelativeDate(subscription.lastUpdatedAt)
                        : "Sin datos"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
