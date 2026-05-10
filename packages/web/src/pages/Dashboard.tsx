import { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Button,
  Modal,
  Input,
} from "@/components/ui";
import { formatRelativeDate, formatDate } from "@/lib/utils";
import { useUserPlan, useActivateList, useRequestListChange, useVerifyPlanSession } from "@/hooks/usePlan";
import { useMyLists, useListCatalog } from "@/hooks/useMyLists";
import type { CatalogList, MyListCard } from "@/hooks/useMyLists";
import { useCreateListRequest, useListRequests } from "@/hooks/useListRequests";

export function DashboardPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: userPlan, isLoading: isLoadingPlan } = useUserPlan();
  const verifySession = useVerifyPlanSession();
  const verifiedRef = useRef(false);

  const checkoutStatus = searchParams.get("checkout");
  const sessionId = searchParams.get("session_id");

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
  const { data: myLists, isLoading: isLoadingMyLists } = useMyLists();
  const { data: catalog, isLoading: isLoadingCatalog } = useListCatalog();
  const activateList = useActivateList();
  const requestChange = useRequestListChange();

  const [searchQuery, setSearchQuery] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [swapTarget, setSwapTarget] = useState<CatalogList | null>(null);
  const [swapReplaceId, setSwapReplaceId] = useState<string>("");
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestLocation, setRequestLocation] = useState("");
  const [requestNotes, setRequestNotes] = useState("");

  const createListRequest = useCreateListRequest();
  const { data: myListRequests } = useListRequests();
  const recentRequests = useMemo(() => {
    if (!myListRequests) return [];
    return [...myListRequests].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [myListRequests]);

  const maxLists = userPlan?.maxLists ?? 0;
  const isUnlimited = userPlan?.maxLists === null;
  const usedSlots = userPlan?.listAccess.length ?? 0;
  const slotsAvailable = isUnlimited || usedSlots < maxLists;
  const hasActivePlan = Boolean(userPlan?.isActive);

  type PendingChange = NonNullable<
    typeof userPlan
  >["pendingListChanges"][number];

  const pendingByListId = useMemo(() => {
    const map = new Map<string, PendingChange>();
    userPlan?.pendingListChanges.forEach((c) => {
      map.set(c.listId, c);
      if (c.replaceListId) map.set(c.replaceListId, c);
    });
    return map;
  }, [userPlan]);

  const filteredCatalog = useMemo(() => {
    if (!catalog) return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.location.toLowerCase().includes(q),
    );
  }, [catalog, searchQuery]);

  const handleActivate = async (list: CatalogList) => {
    setActionError(null);
    try {
      await activateList.mutateAsync(list.id);
    } catch (err: unknown) {
      const e = err as { message?: string; data?: { error?: string } };
      setActionError(e.data?.error || e.message || "Error al activar la lista");
    }
  };

  const handleQueueSwap = async () => {
    if (!swapTarget || !swapReplaceId) return;
    setActionError(null);
    try {
      await requestChange.mutateAsync({
        listId: swapTarget.id,
        action: "swap",
        replaceListId: swapReplaceId,
      });
      setSwapTarget(null);
      setSwapReplaceId("");
    } catch (err: unknown) {
      const e = err as { message?: string; data?: { error?: string } };
      setActionError(e.data?.error || e.message || "Error al programar el cambio");
    }
  };

  const openSwapModal = (list: CatalogList) => {
    setActionError(null);
    setSwapReplaceId(myLists?.[0]?.id ?? "");
    setSwapTarget(list);
  };

  const openRequestModal = () => {
    setActionError(null);
    setRequestLocation("");
    setRequestNotes("");
    setIsRequestModalOpen(true);
  };

  const handleSubmitRequest = async () => {
    const location = requestLocation.trim();
    if (!location) return;
    setActionError(null);
    try {
      await createListRequest.mutateAsync({
        location,
        notes: requestNotes.trim() || undefined,
      });
      setIsRequestModalOpen(false);
      setRequestLocation("");
      setRequestNotes("");
    } catch (err: unknown) {
      const e = err as { message?: string; data?: { error?: string } };
      setActionError(
        e.data?.error || e.message || "Error al enviar la solicitud",
      );
    }
  };

  const isLoading = isLoadingPlan || isLoadingMyLists || isLoadingCatalog;

  if (isLoading) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Mis Listas
          </h1>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-4 w-full rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="h-4 w-1/2 rounded bg-slate-200 dark:bg-slate-700" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!userPlan || !hasActivePlan) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Mis Listas
        </h1>
        <Card className="mt-6 text-center">
          <CardContent>
            <div className="py-8">
              <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
                No tienes un plan activo
              </h3>
              <p className="mb-4 text-slate-500">
                Contrata un plan para acceder a listados de particulares.
              </p>
              <Button onClick={() => navigate("/app/plans")}>Ver planes</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const quotaLabel = isUnlimited
    ? "Listas ilimitadas"
    : `${usedSlots} / ${maxLists} listas usadas`;

  return (
    <div className="space-y-8">
      {checkoutStatus === "success" && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300">
          Plan activado correctamente. Tus créditos ya están disponibles.
        </div>
      )}

      {/* Header with plan summary */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Mis Listas
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Plan{" "}
            <span className="font-medium text-slate-900 dark:text-white">
              {userPlan.planName}
            </span>{" "}
            · {quotaLabel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="info">{userPlan.credits.total} créditos</Badge>
          {userPlan.currentPeriodEnd && (
            <span className="text-xs text-slate-500">
              {userPlan.planId === "trial" ? "Termina" : "Renueva"}{" "}
              {formatRelativeDate(userPlan.currentPeriodEnd)}
            </span>
          )}
        </div>
      </div>

      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {actionError}
        </div>
      )}

      {/* Pending changes banner */}
      {userPlan.pendingListChanges.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
            Tienes {userPlan.pendingListChanges.length} cambio
            {userPlan.pendingListChanges.length === 1 ? "" : "s"} programado
            {userPlan.pendingListChanges.length === 1 ? "" : "s"} al renovar
          </p>
          <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">
            Se aplicarán el{" "}
            {userPlan.currentPeriodEnd
              ? formatDate(userPlan.currentPeriodEnd)
              : "próximo ciclo"}
            . Puedes revisarlos desde{" "}
            <button
              onClick={() => navigate("/app/plans")}
              className="underline hover:no-underline"
            >
              Planes
            </button>
            .
          </p>
        </div>
      )}

      {/* My lists */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
          Listas activas
        </h2>
        {!myLists || myLists.length === 0 ? (
          <Card>
            <CardContent>
              <div className="py-6 text-center text-slate-500">
                Aún no has elegido ninguna lista. Selecciónala del catálogo
                abajo.
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {myLists.map((list) => (
              <MyListCardView
                key={list.id}
                list={list}
                onClick={() => navigate(`/app/lists/${list.id}`)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Catalog */}
      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {slotsAvailable ? "Añadir listas" : "Cambiar listas"}
          </h2>
          <Input
            type="text"
            placeholder="Buscar por nombre o ubicación..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="sm:w-72"
          />
        </div>

        {!slotsAvailable && (
          <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
            Has usado las {maxLists} listas de tu plan. Puedes programar un
            cambio que se aplicará al renovar, o{" "}
            <button
              onClick={() => navigate("/app/plans")}
              className="text-primary underline hover:no-underline"
            >
              subir de plan
            </button>{" "}
            para añadir más al instante.
          </div>
        )}

        {filteredCatalog.length === 0 ? (
          <Card>
            <CardContent>
              <div className="py-6 text-center text-slate-500">
                {searchQuery
                  ? `No hay listas para "${searchQuery}".`
                  : "No hay más listas en el catálogo."}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredCatalog.map((list) => {
              const pending = pendingByListId.get(list.id);
              return (
                <CatalogListCard
                  key={list.id}
                  list={list}
                  pending={pending}
                  slotsAvailable={slotsAvailable}
                  isActivating={
                    activateList.isPending && activateList.variables === list.id
                  }
                  onActivate={() => handleActivate(list)}
                  onSwap={() => openSwapModal(list)}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* Request new list */}
      <section>
        <Card>
          <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  ¿No encuentras tu zona?
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Solicita una nueva lista y la crearemos para ti.
                </p>
              </div>
              <Button variant="accent" onClick={openRequestModal}>
                Solicitar nueva lista
              </Button>
            </div>
            {recentRequests.length > 0 && (
              <div className="mt-4 border-t border-border-light pt-4 dark:border-border-dark">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Mis solicitudes
                </p>
                <ul className="space-y-3">
                  {recentRequests.map((req) => (
                    <li
                      key={req.id}
                      className="flex items-start justify-between gap-3 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-slate-700 dark:text-slate-300">
                          {req.location}
                        </p>
                        {req.notes && (
                          <p className="mt-0.5 text-xs text-slate-500">
                            {req.notes}
                          </p>
                        )}
                        {req.status === "approved" && req.createdListId && (
                          <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                            Lista creada — ya disponible en el catálogo
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        {req.status === "pending" && (
                          <Badge variant="warning">Pendiente</Badge>
                        )}
                        {req.status === "approved" && (
                          <>
                            <Badge variant="success">Aprobada</Badge>
                            {req.createdListId && (
                              <Button
                                size="sm"
                                isLoading={
                                  activateList.isPending &&
                                  activateList.variables === req.createdListId
                                }
                                onClick={() => {
                                  if (!req.createdListId) return;
                                  if (slotsAvailable) {
                                    activateList.mutate(req.createdListId);
                                  } else {
                                    openSwapModal({
                                      id: req.createdListId,
                                      name: req.location,
                                      location: req.location,
                                      totalProperties: 0,
                                      lastUpdatedAt: null,
                                    });
                                  }
                                }}
                              >
                                {slotsAvailable
                                  ? "Añadir a mi plan"
                                  : "Programar cambio"}
                              </Button>
                            )}
                          </>
                        )}
                        {req.status === "rejected" && (
                          <Badge variant="error">Rechazada</Badge>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Request new list modal */}
      <Modal
        isOpen={isRequestModalOpen}
        onClose={() => !createListRequest.isPending && setIsRequestModalOpen(false)}
        title="Solicitar nueva lista"
        description="Indícanos qué zona te gustaría que cubriéramos."
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label
              htmlFor="request-location"
              className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Ubicación
            </label>
            <Input
              id="request-location"
              value={requestLocation}
              onChange={(e) => setRequestLocation(e.target.value)}
              placeholder="Ej: Valencia Centro"
              autoFocus
            />
          </div>
          <div>
            <label
              htmlFor="request-notes"
              className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Notas <span className="text-slate-400">(opcional)</span>
            </label>
            <textarea
              id="request-notes"
              value={requestNotes}
              onChange={(e) => setRequestNotes(e.target.value)}
              rows={3}
              placeholder="Barrios que te interesan, rango de precios, etc."
              className="w-full rounded-lg border border-border-light bg-white px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-border-dark dark:bg-slate-900"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => setIsRequestModalOpen(false)}
              disabled={createListRequest.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmitRequest}
              disabled={!requestLocation.trim() || createListRequest.isPending}
              isLoading={createListRequest.isPending}
            >
              Enviar solicitud
            </Button>
          </div>
        </div>
      </Modal>

      {/* Swap modal */}
      <Modal
        isOpen={Boolean(swapTarget)}
        onClose={() => setSwapTarget(null)}
        title="Programar cambio de lista"
        size="sm"
      >
        {swapTarget && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Añadir <strong>{swapTarget.name}</strong> a tu plan al renovar.
              ¿Qué lista quieres sustituir?
            </p>
            <div className="space-y-2">
              {myLists?.map((l) => (
                <label
                  key={l.id}
                  className={`flex items-center gap-2 rounded-lg border p-3 cursor-pointer transition-colors ${
                    swapReplaceId === l.id
                      ? "border-primary bg-primary/5"
                      : "border-border-light hover:border-slate-300 dark:border-border-dark"
                  }`}
                >
                  <input
                    type="radio"
                    name="swap-replace"
                    value={l.id}
                    checked={swapReplaceId === l.id}
                    onChange={(e) => setSwapReplaceId(e.target.value)}
                    className="text-primary"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {l.name}
                    </p>
                    <p className="text-xs text-slate-500">{l.location}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setSwapTarget(null)}>
                Cancelar
              </Button>
              <Button
                onClick={handleQueueSwap}
                disabled={!swapReplaceId || requestChange.isPending}
                isLoading={requestChange.isPending}
              >
                Programar cambio
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function MyListCardView({
  list,
  onClick,
}: {
  list: MyListCard;
  onClick: () => void;
}) {
  return (
    <Card
      className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="line-clamp-1">{list.name}</CardTitle>
          <Badge variant="success">Activa</Badge>
        </div>
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
            <span className="text-slate-500">Nuevos</span>
            {list.newPropertiesCount > 0 ? (
              <Badge variant="success" className="font-medium">
                +{list.newPropertiesCount}
              </Badge>
            ) : (
              <span className="text-slate-400">0</span>
            )}
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Actualizado</span>
            <span className="text-slate-600 dark:text-slate-400">
              {list.lastUpdatedAt
                ? formatRelativeDate(list.lastUpdatedAt)
                : "Sin datos"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CatalogListCard({
  list,
  pending,
  slotsAvailable,
  isActivating,
  onActivate,
  onSwap,
}: {
  list: CatalogList;
  pending?: {
    action: "add" | "remove" | "swap";
    replaceListId: string | null;
  };
  slotsAvailable: boolean;
  isActivating: boolean;
  onActivate: () => void;
  onSwap: () => void;
}) {
  return (
    <Card>
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
          {list.lastUpdatedAt && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Actualizado</span>
              <span className="text-slate-400">
                {formatRelativeDate(list.lastUpdatedAt)}
              </span>
            </div>
          )}
          {pending ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
              {pending.action === "add" && "Se añadirá al renovar"}
              {pending.action === "swap" && "Cambio programado al renovar"}
              {pending.action === "remove" && "Se quitará al renovar"}
            </div>
          ) : slotsAvailable ? (
            <Button
              className="mt-2 w-full"
              onClick={onActivate}
              isLoading={isActivating}
            >
              Elegir esta lista
            </Button>
          ) : (
            <Button
              className="mt-2 w-full"
              variant="secondary"
              onClick={onSwap}
            >
              Programar cambio
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
