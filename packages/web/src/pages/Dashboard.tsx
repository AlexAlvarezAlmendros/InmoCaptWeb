import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
} from "@/components/ui";
import { formatRelativeDate, formatPrice } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

// Mock data - will be replaced with API calls
const mockSubscriptions = [
  {
    id: "1",
    list: {
      id: "list-1",
      name: "Madrid Centro",
      location: "Madrid",
      priceCents: 4900,
      currency: "EUR",
      lastUpdatedAt: "2026-01-25T10:00:00Z",
      totalProperties: 156,
      newPropertiesSinceLastUpdate: 12,
    },
  },
  {
    id: "2",
    list: {
      id: "list-2",
      name: "Barcelona Eixample",
      location: "Barcelona",
      priceCents: 4900,
      currency: "EUR",
      lastUpdatedAt: "2026-01-24T15:30:00Z",
      totalProperties: 89,
      newPropertiesSinceLastUpdate: 5,
    },
  },
  {
    id: "3",
    list: {
      id: "list-3",
      name: "Valencia Ciutat Vella",
      location: "Valencia",
      priceCents: 3900,
      currency: "EUR",
      lastUpdatedAt: "2026-01-20T09:00:00Z",
      totalProperties: 45,
      newPropertiesSinceLastUpdate: 0,
    },
  },
];

export function DashboardPage() {
  const navigate = useNavigate();

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

      {mockSubscriptions.length === 0 ? (
        <Card className="text-center">
          <CardContent>
            <p className="text-slate-500">No tienes suscripciones activas.</p>
            <button
              onClick={() => navigate("/app/subscriptions")}
              className="mt-4 text-primary hover:underline"
            >
              Explorar listas disponibles
            </button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {mockSubscriptions.map((subscription) => (
            <Card
              key={subscription.id}
              className="cursor-pointer hover:border-primary"
              onClick={() => navigate(`/app/lists/${subscription.list.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle>{subscription.list.name}</CardTitle>
                  <Badge variant="success">Activa</Badge>
                </div>
                <p className="text-sm text-slate-500">
                  {subscription.list.location}
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Inmuebles totales</span>
                    <span className="font-medium">
                      {subscription.list.totalProperties}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Nuevos</span>
                    <span className="font-medium text-accent">
                      +{subscription.list.newPropertiesSinceLastUpdate}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Actualizado</span>
                    <span className="text-slate-600 dark:text-slate-400">
                      {formatRelativeDate(subscription.list.lastUpdatedAt)}
                    </span>
                  </div>
                  <div className="border-t border-border-light pt-3 dark:border-border-dark">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">
                        Precio mensual
                      </span>
                      <span className="font-semibold text-primary">
                        {formatPrice(
                          subscription.list.priceCents,
                          subscription.list.currency,
                        )}
                      </span>
                    </div>
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
