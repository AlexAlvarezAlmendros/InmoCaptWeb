import { Button, Badge } from "@/components/ui";
import { formatPrice, formatDate } from "@/lib/utils";

// Mock data
const mockLists = [
  {
    id: "list-1",
    name: "Madrid Centro",
    location: "Madrid",
    priceCents: 4900,
    currency: "EUR",
    subscriberCount: 45,
    totalProperties: 156,
    lastUpdatedAt: "2026-01-25T10:00:00Z",
  },
  {
    id: "list-2",
    name: "Barcelona Eixample",
    location: "Barcelona",
    priceCents: 4900,
    currency: "EUR",
    subscriberCount: 32,
    totalProperties: 89,
    lastUpdatedAt: "2026-01-24T15:30:00Z",
  },
  {
    id: "list-3",
    name: "Valencia Ciutat Vella",
    location: "Valencia",
    priceCents: 3900,
    currency: "EUR",
    subscriberCount: 18,
    totalProperties: 45,
    lastUpdatedAt: "2026-01-20T09:00:00Z",
  },
];

export function AdminListsPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Gestión de Listas
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Administra todas las listas de la plataforma
          </p>
        </div>
        <Button variant="accent">+ Nueva Lista</Button>
      </div>

      {/* Lists Table */}
      <div className="overflow-hidden rounded-lg border border-border-light bg-card-light dark:border-border-dark dark:bg-card-dark">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-light bg-slate-50 dark:border-border-dark dark:bg-slate-900/50">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                Lista
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                Ubicación
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                Precio
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                Suscriptores
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                Inmuebles
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                Última actualización
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light dark:divide-border-dark">
            {mockLists.map((list) => (
              <tr key={list.id}>
                <td className="px-4 py-4 font-medium">{list.name}</td>
                <td className="px-4 py-4 text-slate-600 dark:text-slate-400">
                  {list.location}
                </td>
                <td className="px-4 py-4">
                  {formatPrice(list.priceCents, list.currency)}/mes
                </td>
                <td className="px-4 py-4">
                  <Badge>{list.subscriberCount}</Badge>
                </td>
                <td className="px-4 py-4 text-slate-600 dark:text-slate-400">
                  {list.totalProperties}
                </td>
                <td className="px-4 py-4 text-slate-600 dark:text-slate-400">
                  {formatDate(list.lastUpdatedAt)}
                </td>
                <td className="px-4 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" size="sm">
                      Editar
                    </Button>
                    <Button variant="accent" size="sm">
                      Subir JSON
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
