import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  Modal,
  Input,
} from "@/components/ui";
import { formatPrice, formatDate, formatRelativeDate } from "@/lib/utils";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import {
  useAvailableLists,
  useCreateCheckoutSession,
  useCreatePortalSession,
  useCancelSubscription,
} from "@/hooks/useBilling";
import { useCreateListRequest, useListRequests } from "@/hooks/useListRequests";

export function SubscriptionsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const checkoutStatus = searchParams.get("checkout");
  const portalReturned = searchParams.get("portal");

  // Force refetch when returning from Stripe Portal
  useEffect(() => {
    if (portalReturned === "returned") {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["availableLists"] });
      // Clean the query param
      setSearchParams((prev) => {
        prev.delete("portal");
        return prev;
      });
    }
  }, [portalReturned, queryClient, setSearchParams]);

  const { data: subscriptions, isLoading: isLoadingSubscriptions } =
    useSubscriptions();

  const { data: availableLists, isLoading: isLoadingLists } =
    useAvailableLists();

  const createCheckoutSession = useCreateCheckoutSession();
  const createPortalSession = useCreatePortalSession();
  const cancelSubscription = useCancelSubscription();
  const createListRequest = useCreateListRequest();
  const { data: listRequests } = useListRequests();

  const [subscribingListId, setSubscribingListId] = useState<string | null>(
    null,
  );
  const [cancellingSubscriptionId, setCancellingSubscriptionId] = useState<
    string | null
  >(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [subscriptionToCancel, setSubscriptionToCancel] = useState<{
    id: string;
    listName: string;
  } | null>(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestLocation, setRequestLocation] = useState("");
  const [requestNotes, setRequestNotes] = useState("");
  const [requestSuccess, setRequestSuccess] = useState(false);

  // Search & pagination state for available lists
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  const activeSubscriptions = subscriptions?.filter(
    (s) => s.status === "active",
  );

  const handleSubscribe = async (listId: string) => {
    setSubscribingListId(listId);
    try {
      await createCheckoutSession.mutateAsync({ listId });
    } catch (error) {
      console.error("Failed to create checkout session:", error);
    } finally {
      setSubscribingListId(null);
    }
  };

  const handleManageSubscriptions = async () => {
    try {
      await createPortalSession.mutateAsync();
    } catch (error) {
      console.error("Failed to create portal session:", error);
    }
  };

  const handleOpenCancelModal = (subscriptionId: string, listName: string) => {
    setSubscriptionToCancel({ id: subscriptionId, listName });
    setShowCancelModal(true);
  };

  const handleCloseCancelModal = () => {
    setShowCancelModal(false);
    setSubscriptionToCancel(null);
  };

  const handleConfirmCancel = async () => {
    if (!subscriptionToCancel) return;

    setCancellingSubscriptionId(subscriptionToCancel.id);
    try {
      await cancelSubscription.mutateAsync({
        subscriptionId: subscriptionToCancel.id,
      });
      handleCloseCancelModal();
    } catch (error) {
      console.error("Failed to cancel subscription:", error);
    } finally {
      setCancellingSubscriptionId(null);
    }
  };

  const handleOpenRequestModal = () => {
    setRequestLocation("");
    setRequestNotes("");
    setRequestSuccess(false);
    setIsRequestModalOpen(true);
  };

  const handleCloseRequestModal = () => {
    setIsRequestModalOpen(false);
    setRequestLocation("");
    setRequestNotes("");
    setRequestSuccess(false);
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestLocation.trim()) return;

    try {
      await createListRequest.mutateAsync({
        location: requestLocation.trim(),
        notes: requestNotes.trim() || undefined,
      });
      setRequestSuccess(true);
    } catch (error) {
      console.error("Failed to create list request:", error);
    }
  };

  // Filter & paginate available lists
  const filteredLists = useMemo(() => {
    if (!availableLists) return [];
    if (!searchQuery.trim()) return availableLists;
    const q = searchQuery.toLowerCase().trim();
    return availableLists.filter(
      (list) =>
        list.name.toLowerCase().includes(q) ||
        list.location.toLowerCase().includes(q),
    );
  }, [availableLists, searchQuery]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredLists.length / ITEMS_PER_PAGE),
  );
  const paginatedLists = useMemo(
    () =>
      filteredLists.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE,
      ),
    [filteredLists, currentPage],
  );

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  // Filter pending requests
  const pendingRequests =
    listRequests?.filter((r) => r.status === "pending") ?? [];

  return (
    <div className="space-y-8">
      {/* Checkout status messages */}
      {checkoutStatus === "success" && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
          <div className="flex items-center gap-2">
            <svg
              className="h-5 w-5 text-green-600 dark:text-green-400"
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
            <p className="font-medium text-green-700 dark:text-green-300">
              ¡Suscripción completada con éxito!
            </p>
          </div>
          <p className="mt-1 text-sm text-green-600 dark:text-green-400">
            Ya puedes acceder a la lista desde tu dashboard.
          </p>
        </div>
      )}
      {checkoutStatus === "cancelled" && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
          <p className="text-yellow-700 dark:text-yellow-300">
            El proceso de pago fue cancelado. Puedes intentarlo de nuevo cuando
            quieras.
          </p>
        </div>
      )}

      {/* Active Subscriptions */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Suscripciones Activas
          </h2>
          {activeSubscriptions && activeSubscriptions.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleManageSubscriptions}
              disabled={createPortalSession.isPending}
            >
              {createPortalSession.isPending ? (
                <>
                  <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Cargando...
                </>
              ) : (
                "Gestionar pagos"
              )}
            </Button>
          )}
        </div>

        {isLoadingSubscriptions ? (
          <div className="overflow-hidden rounded-lg border border-border-light bg-card-light dark:border-border-dark dark:bg-card-dark">
            <div className="animate-pulse p-8">
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-12 rounded bg-slate-200 dark:bg-slate-700"
                  />
                ))}
              </div>
            </div>
          </div>
        ) : !activeSubscriptions || activeSubscriptions.length === 0 ? (
          <Card>
            <CardContent>
              <div className="py-8 text-center">
                <p className="text-slate-500">
                  No tienes suscripciones activas.
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  Explora las listas disponibles abajo para empezar.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border-light bg-card-light dark:border-border-dark dark:bg-card-dark">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-light bg-slate-50 dark:border-border-dark dark:bg-slate-900/50">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Lista
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Inmuebles
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
                {activeSubscriptions.map((sub) => (
                  <tr
                    key={sub.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-900/30"
                  >
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {sub.listName}
                        </p>
                        <p className="text-sm text-slate-500">
                          {sub.listLocation}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-600 dark:text-slate-400">
                      {sub.totalProperties}
                    </td>
                    <td className="px-4 py-4 text-slate-600 dark:text-slate-400">
                      {sub.currentPeriodEnd
                        ? formatDate(sub.currentPeriodEnd)
                        : "-"}
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant="success">Activa</Badge>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => navigate(`/app/lists/${sub.listId}`)}
                        >
                          Ver lista
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() =>
                            handleOpenCancelModal(sub.id, sub.listName)
                          }
                        >
                          Cancelar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Available Lists */}
      <section>
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Listas Disponibles
          </h2>
          <div className="relative w-full sm:w-72">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <Input
              type="text"
              placeholder="Buscar por nombre o ubicación..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {isLoadingLists ? (
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
                    <div className="mt-4 h-10 rounded bg-slate-200 dark:bg-slate-700" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !availableLists || availableLists.length === 0 ? (
          <Card>
            <CardContent>
              <div className="py-8 text-center">
                <p className="text-slate-500">
                  No hay más listas disponibles para suscribirse.
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  ¿Necesitas una zona que no está cubierta? Solicita una nueva
                  lista abajo.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : filteredLists.length === 0 ? (
          <Card>
            <CardContent>
              <div className="py-8 text-center">
                <p className="text-slate-500">
                  No se encontraron listas para "{searchQuery}".
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  Prueba con otro término de búsqueda.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Pagination Top */}
            {totalPages > 1 && (
              <div className="mb-6 flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
                  {Math.min(currentPage * ITEMS_PER_PAGE, filteredLists.length)}{" "}
                  de {filteredLists.length} listas
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) => {
                      if (totalPages <= 7) return true;
                      if (page === 1 || page === totalPages) return true;
                      if (Math.abs(page - currentPage) <= 1) return true;
                      return false;
                    })
                    .reduce<(number | "ellipsis")[]>((acc, page, idx, arr) => {
                      if (idx > 0 && page - (arr[idx - 1] as number) > 1) {
                        acc.push("ellipsis");
                      }
                      acc.push(page);
                      return acc;
                    }, [])
                    .map((item, idx) =>
                      item === "ellipsis" ? (
                        <span
                          key={`ellipsis-top-${idx}`}
                          className="px-2 text-sm text-slate-400"
                        >
                          …
                        </span>
                      ) : (
                        <button
                          key={item}
                          onClick={() => setCurrentPage(item)}
                          className={`min-w-[36px] rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                            currentPage === item
                              ? "bg-primary text-white"
                              : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                          }`}
                        >
                          {item}
                        </button>
                      ),
                    )}
                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {paginatedLists.map((list) => (
                <Card key={list.id}>
                  <CardHeader>
                    <CardTitle>{list.name}</CardTitle>
                    <p className="text-sm text-slate-500">{list.location}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Inmuebles</span>
                        <span className="font-medium text-slate-900 dark:text-white">
                          {list.totalProperties}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Precio</span>
                        <span className="font-semibold text-primary">
                          {formatPrice(list.priceCents, list.currency)}/mes
                        </span>
                      </div>
                      {list.lastUpdatedAt && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">Actualizado</span>
                          <span className="text-slate-400">
                            {formatRelativeDate(list.lastUpdatedAt)}
                          </span>
                        </div>
                      )}
                      <Button
                        variant="accent"
                        className="mt-4 w-full"
                        onClick={() => handleSubscribe(list.id)}
                        disabled={
                          subscribingListId === list.id ||
                          createCheckoutSession.isPending
                        }
                      >
                        {subscribingListId === list.id ? (
                          <>
                            <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            Procesando...
                          </>
                        ) : (
                          "Suscribirse"
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
                  {Math.min(currentPage * ITEMS_PER_PAGE, filteredLists.length)}{" "}
                  de {filteredLists.length} listas
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) => {
                      if (totalPages <= 7) return true;
                      if (page === 1 || page === totalPages) return true;
                      if (Math.abs(page - currentPage) <= 1) return true;
                      return false;
                    })
                    .reduce<(number | "ellipsis")[]>((acc, page, idx, arr) => {
                      if (idx > 0 && page - (arr[idx - 1] as number) > 1) {
                        acc.push("ellipsis");
                      }
                      acc.push(page);
                      return acc;
                    }, [])
                    .map((item, idx) =>
                      item === "ellipsis" ? (
                        <span
                          key={`ellipsis-${idx}`}
                          className="px-2 text-sm text-slate-400"
                        >
                          …
                        </span>
                      ) : (
                        <button
                          key={item}
                          onClick={() => setCurrentPage(item)}
                          className={`min-w-[36px] rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                            currentPage === item
                              ? "bg-primary text-white"
                              : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                          }`}
                        >
                          {item}
                        </button>
                      ),
                    )}
                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
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
            <Button variant="secondary" onClick={handleOpenRequestModal}>
              Solicitar nueva lista
            </Button>

            {/* Show pending requests */}
            {pendingRequests.length > 0 && (
              <div className="mt-6 border-t border-border-light pt-4 dark:border-border-dark">
                <h4 className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                  Tus solicitudes pendientes
                </h4>
                <div className="space-y-2">
                  {pendingRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800"
                    >
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {request.location}
                        </p>
                        {request.notes && (
                          <p className="text-sm text-slate-500">
                            {request.notes}
                          </p>
                        )}
                      </div>
                      <Badge variant="warning">Pendiente</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Request Modal */}
      <Modal
        isOpen={isRequestModalOpen}
        onClose={handleCloseRequestModal}
        title="Solicitar nueva lista"
        description="Indícanos la zona o ubicación que te interesa y la revisaremos."
        size="md"
      >
        {requestSuccess ? (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <svg
                className="h-8 w-8 text-green-600 dark:text-green-400"
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
            </div>
            <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
              ¡Solicitud enviada!
            </h3>
            <p className="mb-6 text-slate-500">
              Revisaremos tu solicitud y te notificaremos cuando la lista esté
              disponible.
            </p>
            <Button onClick={handleCloseRequestModal}>Cerrar</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmitRequest} className="space-y-4">
            <div>
              <label
                htmlFor="location"
                className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Ubicación / Zona *
              </label>
              <Input
                id="location"
                type="text"
                placeholder="Ej: Zaragoza Centro, Costa del Sol..."
                value={requestLocation}
                onChange={(e) => setRequestLocation(e.target.value)}
                required
              />
            </div>
            <div>
              <label
                htmlFor="notes"
                className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Notas adicionales (opcional)
              </label>
              <textarea
                id="notes"
                placeholder="Cualquier detalle adicional que nos ayude..."
                value={requestNotes}
                onChange={(e) => setRequestNotes(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-border-light bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-border-dark dark:bg-slate-900 dark:text-white dark:placeholder-slate-500"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={handleCloseRequestModal}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={
                  !requestLocation.trim() || createListRequest.isPending
                }
              >
                {createListRequest.isPending ? (
                  <>
                    <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Enviando...
                  </>
                ) : (
                  "Enviar solicitud"
                )}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Cancel Subscription Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={handleCloseCancelModal}
        title="Cancelar suscripción"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-slate-600 dark:text-slate-400">
            ¿Estás seguro de que quieres cancelar tu suscripción a{" "}
            <span className="font-medium text-slate-900 dark:text-white">
              {subscriptionToCancel?.listName}
            </span>
            ?
          </p>
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              Perderás el acceso inmediato a la lista y no podrás ver los
              inmuebles ni sus detalles.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={handleCloseCancelModal}>
              Mantener suscripción
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmCancel}
              disabled={cancelSubscription.isPending}
            >
              {cancellingSubscriptionId === subscriptionToCancel?.id ? (
                <>
                  <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Cancelando...
                </>
              ) : (
                "Sí, cancelar suscripción"
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
