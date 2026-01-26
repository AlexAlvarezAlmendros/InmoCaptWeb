import { useParams } from "react-router-dom";
import { Badge, getStateLabel, getStateVariant, Button } from "@/components/ui";
import { formatPrice } from "@/lib/utils";
import { PropertyState } from "@/types";

// Mock data - will be replaced with API calls
const mockProperties = [
  {
    id: "1",
    price: 250000,
    m2: 85,
    bedrooms: 3,
    phone: "+34 612 345 678",
    ownerName: "Juan García",
    sourceUrl: "https://example.com/property/1",
    state: "new" as PropertyState,
    comment: "",
  },
  {
    id: "2",
    price: 320000,
    m2: 110,
    bedrooms: 4,
    phone: "+34 623 456 789",
    ownerName: "María López",
    sourceUrl: "https://example.com/property/2",
    state: "contacted" as PropertyState,
    comment: "Llamar por la tarde",
  },
  {
    id: "3",
    price: 180000,
    m2: 65,
    bedrooms: 2,
    phone: "+34 634 567 890",
    ownerName: "Pedro Martínez",
    sourceUrl: "https://example.com/property/3",
    state: "captured" as PropertyState,
    comment: "Exclusiva firmada",
  },
  {
    id: "4",
    price: 450000,
    m2: 150,
    bedrooms: 5,
    phone: "+34 645 678 901",
    ownerName: "Ana Sánchez",
    sourceUrl: "https://example.com/property/4",
    state: "rejected" as PropertyState,
    comment: "No interesado en agencias",
  },
];

export function ListDetailPage() {
  const { listId } = useParams<{ listId: string }>();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Madrid Centro
        </h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Lista ID: {listId} • 156 inmuebles • Actualizado hoy
        </p>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-border-light bg-card-light dark:border-border-dark dark:bg-card-dark">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-light bg-slate-50 dark:border-border-dark dark:bg-slate-900/50">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Precio
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  M²
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Hab.
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Teléfono
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Propietario
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Estado
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Comentario
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {mockProperties.map((property) => (
                <tr
                  key={property.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-900/30"
                >
                  <td className="whitespace-nowrap px-4 py-4 font-medium">
                    {formatPrice(property.price * 100, "EUR")}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-slate-600 dark:text-slate-400">
                    {property.m2} m²
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-slate-600 dark:text-slate-400">
                    {property.bedrooms}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">
                    <a
                      href={`tel:${property.phone}`}
                      className="text-primary hover:underline"
                    >
                      {property.phone}
                    </a>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-slate-600 dark:text-slate-400">
                    {property.ownerName}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">
                    <Badge variant={getStateVariant(property.state)}>
                      {getStateLabel(property.state)}
                    </Badge>
                  </td>
                  <td className="max-w-xs truncate px-4 py-4 text-sm text-slate-500">
                    {property.comment || "-"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">
                    <div className="flex gap-2">
                      <a
                        href={property.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        Ver anuncio
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination placeholder */}
      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-slate-500">Mostrando 1-4 de 156 inmuebles</p>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" disabled>
            Anterior
          </Button>
          <Button variant="secondary" size="sm">
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  );
}
