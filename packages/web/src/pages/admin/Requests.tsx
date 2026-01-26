import { Badge, Button } from "@/components/ui";
import { formatDate } from "@/lib/utils";

// Mock data
const mockRequests = [
  {
    id: "1",
    userEmail: "agente1@example.com",
    location: "Zaragoza Centro",
    notes:
      "Necesito listados de la zona centro de Zaragoza, especialmente Gran Vía y alrededores.",
    status: "pending",
    createdAt: "2026-01-23T14:00:00Z",
  },
  {
    id: "2",
    userEmail: "agente2@example.com",
    location: "Alicante Playa",
    notes: "Zona costera de Alicante, desde San Juan hasta el centro.",
    status: "pending",
    createdAt: "2026-01-22T09:30:00Z",
  },
  {
    id: "3",
    userEmail: "agente3@example.com",
    location: "Granada Centro",
    notes: "Centro histórico de Granada.",
    status: "approved",
    createdAt: "2026-01-20T11:00:00Z",
  },
];

const statusConfig = {
  pending: { label: "Pendiente", variant: "warning" as const },
  approved: { label: "Aprobada", variant: "success" as const },
  rejected: { label: "Rechazada", variant: "error" as const },
};

export function AdminRequestsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Solicitudes de Listas
        </h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Gestiona las solicitudes de nuevas listas de los agentes
        </p>
      </div>

      {/* Requests Table */}
      <div className="overflow-hidden rounded-lg border border-border-light bg-card-light dark:border-border-dark dark:bg-card-dark">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-light bg-slate-50 dark:border-border-dark dark:bg-slate-900/50">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                Usuario
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                Ubicación
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                Notas
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                Fecha
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
            {mockRequests.map((request) => {
              const status =
                statusConfig[request.status as keyof typeof statusConfig];
              return (
                <tr key={request.id}>
                  <td className="px-4 py-4 font-medium">{request.userEmail}</td>
                  <td className="px-4 py-4 text-slate-600 dark:text-slate-400">
                    {request.location}
                  </td>
                  <td className="max-w-xs truncate px-4 py-4 text-sm text-slate-500">
                    {request.notes}
                  </td>
                  <td className="px-4 py-4 text-slate-600 dark:text-slate-400">
                    {formatDate(request.createdAt)}
                  </td>
                  <td className="px-4 py-4">
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </td>
                  <td className="px-4 py-4 text-right">
                    {request.status === "pending" && (
                      <div className="flex justify-end gap-2">
                        <Button variant="accent" size="sm">
                          Aprobar
                        </Button>
                        <Button variant="danger" size="sm">
                          Rechazar
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
