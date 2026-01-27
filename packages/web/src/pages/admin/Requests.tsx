import { useState } from "react";
import { Badge, Button, ConfirmDialog } from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import {
  useAdminListRequests,
  useApproveRequest,
  useRejectRequest,
} from "@/hooks/useAdminRequests";
import type { AdminListRequest, ListRequestStatus } from "@/types";

const statusConfig = {
  pending: { label: "Pendiente", variant: "warning" as const },
  approved: { label: "Aprobada", variant: "success" as const },
  rejected: { label: "Rechazada", variant: "error" as const },
};

// Filter tabs
const filterTabs: { value: ListRequestStatus | "all"; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "pending", label: "Pendientes" },
  { value: "approved", label: "Aprobadas" },
  { value: "rejected", label: "Rechazadas" },
];

export function AdminRequestsPage() {
  const [filter, setFilter] = useState<ListRequestStatus | "all">("all");
  const [approvingRequest, setApprovingRequest] =
    useState<AdminListRequest | null>(null);
  const [rejectingRequest, setRejectingRequest] =
    useState<AdminListRequest | null>(null);

  // Form state for approval
  const [listName, setListName] = useState("");
  const [listPrice, setListPrice] = useState("4900");

  // Data fetching
  const {
    data: requests,
    isLoading,
    error,
  } = useAdminListRequests(filter === "all" ? undefined : filter);

  // Mutations
  const approveRequest = useApproveRequest();
  const rejectRequest = useRejectRequest();

  // Handlers
  const handleOpenApprove = (request: AdminListRequest) => {
    setApprovingRequest(request);
    setListName(`${request.location}`);
    setListPrice("4900");
  };

  const handleApprove = async () => {
    if (!approvingRequest || !listName) return;

    await approveRequest.mutateAsync({
      requestId: approvingRequest.id,
      data: {
        name: listName,
        priceCents: parseInt(listPrice, 10) || 4900,
        currency: "EUR",
      },
    });

    setApprovingRequest(null);
    setListName("");
    setListPrice("4900");
  };

  const handleReject = async () => {
    if (!rejectingRequest) return;
    await rejectRequest.mutateAsync(rejectingRequest.id);
    setRejectingRequest(null);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <div className="h-8 w-56 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          <div className="mt-2 h-4 w-72 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-10 w-24 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700"
            />
          ))}
        </div>
        <div className="overflow-hidden rounded-lg border border-border-light bg-card-light dark:border-border-dark dark:bg-card-dark">
          <div className="p-8">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded bg-slate-100 dark:bg-slate-800"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center dark:border-red-800 dark:bg-red-900/20">
        <p className="text-red-600 dark:text-red-400">
          Error al cargar las solicitudes: {error.message}
        </p>
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          Reintentar
        </Button>
      </div>
    );
  }

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

      {/* Filter tabs */}
      <div className="flex gap-2">
        {filterTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              filter === tab.value
                ? "bg-primary text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {requests && requests.length === 0 && (
        <div className="rounded-lg border border-border-light bg-card-light p-12 text-center dark:border-border-dark dark:bg-card-dark">
          <div className="text-4xl">📭</div>
          <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">
            No hay solicitudes
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {filter === "pending"
              ? "No hay solicitudes pendientes"
              : filter === "all"
                ? "Todavía no hay solicitudes de listas"
                : `No hay solicitudes ${statusConfig[filter].label.toLowerCase()}`}
          </p>
        </div>
      )}

      {/* Requests Table */}
      {requests && requests.length > 0 && (
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
              {requests.map((request) => {
                const status =
                  statusConfig[request.status as keyof typeof statusConfig];
                return (
                  <tr
                    key={request.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-900/30"
                  >
                    <td className="px-4 py-4 font-medium">
                      {request.userEmail || (
                        <span className="text-slate-400" title={request.userId}>
                          {request.userId.startsWith("auth0|")
                            ? `Usuario ${request.userId.slice(-8)}`
                            : request.userId}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-slate-600 dark:text-slate-400">
                      {request.location}
                    </td>
                    <td className="max-w-xs truncate px-4 py-4 text-sm text-slate-500">
                      {request.notes || "-"}
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
                          <Button
                            variant="accent"
                            size="sm"
                            onClick={() => handleOpenApprove(request)}
                          >
                            Aprobar
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setRejectingRequest(request)}
                          >
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
      )}

      {/* Approve Modal */}
      <Modal
        isOpen={!!approvingRequest}
        onClose={() => setApprovingRequest(null)}
        title="Aprobar solicitud"
        description="Configura la nueva lista que se creará"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Ubicación solicitada
            </label>
            <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800">
              {approvingRequest?.location}
            </p>
          </div>

          {approvingRequest?.notes && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Notas del agente
              </label>
              <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800">
                {approvingRequest.notes}
              </p>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Nombre de la lista
            </label>
            <Input
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              placeholder="Madrid Centro"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Precio mensual (céntimos)
            </label>
            <Input
              type="number"
              value={listPrice}
              onChange={(e) => setListPrice(e.target.value)}
              placeholder="4900"
            />
            <p className="mt-1 text-xs text-slate-500">
              = €{(parseInt(listPrice, 10) / 100 || 0).toFixed(2)}/mes
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="ghost"
              onClick={() => setApprovingRequest(null)}
              disabled={approveRequest.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="accent"
              onClick={handleApprove}
              disabled={!listName}
              isLoading={approveRequest.isPending}
            >
              Aprobar y crear lista
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reject Confirmation */}
      <ConfirmDialog
        isOpen={!!rejectingRequest}
        onClose={() => setRejectingRequest(null)}
        onConfirm={handleReject}
        title="Rechazar solicitud"
        message={`¿Estás seguro de que quieres rechazar la solicitud de "${rejectingRequest?.location}"?`}
        confirmText="Rechazar"
        variant="danger"
        isLoading={rejectRequest.isPending}
      />
    </div>
  );
}
