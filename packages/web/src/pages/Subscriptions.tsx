import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
} from "@/components/ui";
import { formatPrice } from "@/lib/utils";

// Mock data
const mockAvailableLists = [
  {
    id: "list-4",
    name: "Sevilla Centro",
    location: "Sevilla",
    priceCents: 3900,
    currency: "EUR",
    totalProperties: 67,
  },
  {
    id: "list-5",
    name: "Málaga Costa",
    location: "Málaga",
    priceCents: 4500,
    currency: "EUR",
    totalProperties: 112,
  },
  {
    id: "list-6",
    name: "Bilbao",
    location: "Bilbao",
    priceCents: 3500,
    currency: "EUR",
    totalProperties: 34,
  },
];

const mockActiveSubscriptions = [
  {
    id: "1",
    listName: "Madrid Centro",
    renewalDate: "2026-02-25",
    priceCents: 4900,
    currency: "EUR",
  },
  {
    id: "2",
    listName: "Barcelona Eixample",
    renewalDate: "2026-02-24",
    priceCents: 4900,
    currency: "EUR",
  },
  {
    id: "3",
    listName: "Valencia Ciutat Vella",
    renewalDate: "2026-02-20",
    priceCents: 3900,
    currency: "EUR",
  },
];

export function SubscriptionsPage() {
  return (
    <div className="space-y-8">
      {/* Active Subscriptions */}
      <section>
        <h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-white">
          Suscripciones Activas
        </h2>
        <div className="overflow-hidden rounded-lg border border-border-light bg-card-light dark:border-border-dark dark:bg-card-dark">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-light bg-slate-50 dark:border-border-dark dark:bg-slate-900/50">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Lista
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Precio mensual
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Renovación
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Estado
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {mockActiveSubscriptions.map((sub) => (
                <tr key={sub.id}>
                  <td className="px-4 py-4 font-medium">{sub.listName}</td>
                  <td className="px-4 py-4">
                    {formatPrice(sub.priceCents, sub.currency)}/mes
                  </td>
                  <td className="px-4 py-4 text-slate-600 dark:text-slate-400">
                    {sub.renewalDate}
                  </td>
                  <td className="px-4 py-4">
                    <Badge variant="success">Activa</Badge>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Button variant="danger" size="sm">
                      Cancelar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Available Lists */}
      <section>
        <h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-white">
          Listas Disponibles
        </h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {mockAvailableLists.map((list) => (
            <Card key={list.id}>
              <CardHeader>
                <CardTitle>{list.name}</CardTitle>
                <p className="text-sm text-slate-500">{list.location}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Inmuebles</span>
                    <span className="font-medium">{list.totalProperties}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Precio</span>
                    <span className="font-semibold text-primary">
                      {formatPrice(list.priceCents, list.currency)}/mes
                    </span>
                  </div>
                  <Button variant="accent" className="mt-4 w-full">
                    Suscribirse
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Request new list */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle>¿No encuentras tu zona?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-slate-600 dark:text-slate-400">
              Solicita la creación de una nueva lista para tu zona de interés.
            </p>
            <Button variant="secondary">Solicitar nueva lista</Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
