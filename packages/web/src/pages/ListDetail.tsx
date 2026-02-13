import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Badge,
  getStateLabel,
  getStateVariant,
  Button,
  Card,
  CardContent,
} from "@/components/ui";
import { formatPrice } from "@/lib/utils";
import { PropertyState, Property } from "@/types";
import { useSubscription } from "@/hooks/useSubscriptions";
import {
  useListProperties,
  useUpdatePropertyState,
  useUpdatePropertyComment,
} from "@/hooks/useListProperties";

const PROPERTY_STATES: { value: PropertyState; label: string }[] = [
  { value: "new", label: "Nuevo" },
  { value: "contacted", label: "Contactado" },
  { value: "captured", label: "Captado" },
  { value: "rejected", label: "Rechazado" },
];

const STATE_FILTERS: { value: PropertyState | "all"; label: string }[] = [
  { value: "all", label: "Todos" },
  ...PROPERTY_STATES,
];

function PropertyRow({
  property,
  onStateChange,
  onCommentChange,
}: {
  property: Property;
  onStateChange: (propertyId: string, state: PropertyState) => void;
  onCommentChange: (propertyId: string, comment: string) => void;
}) {
  const [isEditingComment, setIsEditingComment] = useState(false);
  const [commentValue, setCommentValue] = useState(property.comment || "");

  // Keep local state in sync with prop
  const handleCommentSave = () => {
    onCommentChange(property.id, commentValue);
    setIsEditingComment(false);
  };

  const handleCommentCancel = () => {
    setCommentValue(property.comment || "");
    setIsEditingComment(false);
  };

  return (
    <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
      <td className="px-3 py-3">
        <div className="max-w-[180px]">
          {property.title && (
            <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
              {property.title}
            </p>
          )}
          <p className="font-semibold text-primary">
            {formatPrice(property.price * 100, "EUR")}
          </p>
          {property.location && (
            <p className="truncate text-xs text-slate-500">
              {property.location}
            </p>
          )}
        </div>
      </td>
      <td className="whitespace-nowrap px-3 py-3 text-sm text-slate-600 dark:text-slate-400">
        {property.m2 ? `${property.m2} m²` : "-"}
      </td>
      <td className="whitespace-nowrap px-3 py-3 text-sm text-slate-600 dark:text-slate-400">
        {property.bedrooms ?? "-"}
      </td>
      <td className="whitespace-nowrap px-3 py-3 text-sm">
        {property.phone ? (
          <a
            href={`tel:${property.phone}`}
            className="text-primary hover:underline"
          >
            {property.phone}
          </a>
        ) : (
          <span className="text-slate-400">-</span>
        )}
      </td>
      <td className="px-3 py-3 text-sm text-slate-600 dark:text-slate-400">
        {property.ownerName || "-"}
      </td>
      <td className="whitespace-nowrap px-3 py-3 text-sm">
        <select
          value={property.state}
          onChange={(e) =>
            onStateChange(property.id, e.target.value as PropertyState)
          }
          className={`rounded-md border px-2 py-1 text-sm font-medium transition-colors ${
            property.state === "new"
              ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
              : property.state === "contacted"
                ? "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                : property.state === "captured"
                  ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300"
                  : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300"
          }`}
        >
          {PROPERTY_STATES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-3">
        {isEditingComment ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={commentValue}
              onChange={(e) => setCommentValue(e.target.value)}
              className="w-36 rounded border border-border-light px-2 py-1 text-sm dark:border-border-dark dark:bg-slate-800"
              placeholder="Comentario..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCommentSave();
                if (e.key === "Escape") handleCommentCancel();
              }}
            />
            <button
              onClick={handleCommentSave}
              className="text-green-600 hover:text-green-700"
              title="Guardar"
            >
              <svg
                className="h-5 w-5"
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
            </button>
            <button
              onClick={handleCommentCancel}
              className="text-slate-400 hover:text-slate-600"
              title="Cancelar"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsEditingComment(true)}
            className="group flex items-center gap-1 text-sm text-slate-500 hover:text-primary"
          >
            <span className="max-w-[120px] truncate">
              {property.comment || "Añadir comentario"}
            </span>
            <svg
              className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
          </button>
        )}
      </td>
      <td className="whitespace-nowrap px-3 py-3 text-sm">
        {property.sourceUrl && (
          <a
            href={property.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            Ver anuncio
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
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        )}
      </td>
    </tr>
  );
}

// ─── Mobile Property Card ─────────────────────────────────────────
function PropertyCard({
  property,
  onStateChange,
  onCommentChange,
}: {
  property: Property;
  onStateChange: (propertyId: string, state: PropertyState) => void;
  onCommentChange: (propertyId: string, comment: string) => void;
}) {
  const [isEditingComment, setIsEditingComment] = useState(false);
  const [commentValue, setCommentValue] = useState(property.comment || "");

  const handleCommentSave = () => {
    onCommentChange(property.id, commentValue);
    setIsEditingComment(false);
  };

  const handleCommentCancel = () => {
    setCommentValue(property.comment || "");
    setIsEditingComment(false);
  };

  return (
    <div className="rounded-lg border border-border-light bg-card-light p-3 dark:border-border-dark dark:bg-card-dark">
      {/* Top row: title + state */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {property.title && (
            <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
              {property.title}
            </p>
          )}
          {property.location && (
            <p className="text-xs text-slate-500">{property.location}</p>
          )}
        </div>
        <select
          value={property.state}
          onChange={(e) =>
            onStateChange(property.id, e.target.value as PropertyState)
          }
          className={`shrink-0 rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
            property.state === "new"
              ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
              : property.state === "contacted"
                ? "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                : property.state === "captured"
                  ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300"
                  : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300"
          }`}
        >
          {PROPERTY_STATES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Price + details row */}
      <div className="mb-2 flex items-center gap-3 text-sm">
        <span className="font-semibold text-primary">
          {formatPrice(property.price * 100, "EUR")}
        </span>
        {property.m2 && (
          <span className="text-slate-500">{property.m2} m²</span>
        )}
        {property.bedrooms != null && (
          <span className="text-slate-500">{property.bedrooms} hab.</span>
        )}
      </div>

      {/* Contact row */}
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-slate-600 dark:text-slate-400">
          {property.ownerName || "-"}
        </span>
        {property.phone ? (
          <a
            href={`tel:${property.phone}`}
            className="text-primary hover:underline"
          >
            {property.phone}
          </a>
        ) : (
          <span className="text-slate-400">-</span>
        )}
      </div>

      {/* Source link */}
      {property.sourceUrl && (
        <div className="mb-2">
          <a
            href={property.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Ver anuncio
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </div>
      )}

      {/* Comment row */}
      <div className="border-t border-border-light pt-2 dark:border-border-dark">
        {isEditingComment ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={commentValue}
              onChange={(e) => setCommentValue(e.target.value)}
              className="flex-1 rounded border border-primary bg-transparent px-2 py-1 text-sm focus:outline-none dark:bg-slate-800"
              placeholder="Añadir comentario..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCommentSave();
                if (e.key === "Escape") handleCommentCancel();
              }}
            />
            <button
              onClick={handleCommentSave}
              className="text-green-600 hover:text-green-700"
            >
              <svg
                className="h-5 w-5"
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
            </button>
            <button
              onClick={handleCommentCancel}
              className="text-slate-400 hover:text-slate-600"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsEditingComment(true)}
            className="flex w-full items-center gap-1.5 text-sm text-slate-500"
          >
            <svg
              className="h-3.5 w-3.5 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
            <span className="truncate">
              {property.comment || (
                <span className="italic text-slate-400">
                  Añadir comentario...
                </span>
              )}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

export function ListDetailPage() {
  const { listId } = useParams<{ listId: string }>();
  const navigate = useNavigate();
  const [stateFilter, setStateFilter] = useState<PropertyState | "all">("all");

  const {
    data: subscription,
    isLoading: isLoadingSubscription,
    hasAccess,
  } = useSubscription(listId || "");

  const {
    data,
    isLoading: isLoadingProperties,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useListProperties({
    listId: listId || "",
    stateFilter,
    enabled: !!listId && hasAccess,
  });

  const updateStateMutation = useUpdatePropertyState();
  const updateCommentMutation = useUpdatePropertyComment();

  const handleStateChange = useCallback(
    (propertyId: string, state: PropertyState) => {
      if (!listId) return;
      updateStateMutation.mutate({ listId, propertyId, state });
    },
    [listId, updateStateMutation],
  );

  const handleCommentChange = useCallback(
    (propertyId: string, comment: string) => {
      if (!listId) return;
      updateCommentMutation.mutate({ listId, propertyId, comment });
    },
    [listId, updateCommentMutation],
  );

  // Flatten all pages of properties
  const properties = data?.pages.flatMap((page) => page.data) ?? [];
  const totalProperties = data?.pages[0]?.total ?? 0;
  const stateCounts = data?.pages[0]?.stateCounts ?? {
    new: 0,
    contacted: 0,
    captured: 0,
    rejected: 0,
  };

  // Loading state
  if (isLoadingSubscription) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // No access
  if (!hasAccess) {
    return (
      <div>
        <Card className="mx-auto max-w-md text-center">
          <CardContent>
            <div className="py-8">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <svg
                  className="h-8 w-8 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m0 0v2m0-2h2m-2 0H9m3-10V5a3 3 0 00-6 0v4m9-4.243V19a2 2 0 01-2 2H6a2 2 0 01-2-2V7.757a2 2 0 01.879-1.683l6-3.75a2 2 0 012.242 0l6 3.75A2 2 0 0118 7.757z"
                  />
                </svg>
              </div>
              <h2 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
                Acceso restringido
              </h2>
              <p className="mb-4 text-slate-500">
                No tienes una suscripción activa para esta lista.
              </p>
              <Button onClick={() => navigate("/app/subscriptions")}>
                Ver suscripciones
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button
            onClick={() => navigate("/app/dashboard")}
            className="mb-2 flex items-center gap-1 text-sm text-slate-500 hover:text-primary"
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
            Volver al dashboard
          </button>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {subscription?.listName}
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            {subscription?.listLocation} • {totalProperties} inmuebles
          </p>
        </div>

        {/* State filter */}
        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-slate-500 sm:block">
            Filtrar:
          </span>
          <div className="flex flex-wrap gap-1 sm:gap-0 sm:rounded-lg sm:border sm:border-border-light sm:dark:border-border-dark">
            {STATE_FILTERS.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setStateFilter(filter.value)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors sm:rounded-none sm:first:rounded-l-lg sm:last:rounded-r-lg ${
                  stateFilter === filter.value
                    ? "bg-primary text-white"
                    : "bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 sm:bg-white sm:dark:bg-slate-900"
                } border border-border-light dark:border-border-dark sm:border-0`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {PROPERTY_STATES.map((state) => {
          const count = stateCounts[state.value];
          return (
            <button
              key={state.value}
              onClick={() => setStateFilter(state.value)}
              className={`rounded-lg border p-3 text-center transition-colors ${
                stateFilter === state.value
                  ? "border-primary bg-primary/5"
                  : "border-border-light hover:border-primary/50 dark:border-border-dark"
              }`}
            >
              <Badge variant={getStateVariant(state.value)} className="mb-1">
                {state.label}
              </Badge>
              <p className="text-xl font-bold text-slate-900 dark:text-white">
                {count}
              </p>
            </button>
          );
        })}
      </div>

      {/* Table */}
      {isLoadingProperties ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : properties.length === 0 ? (
        <Card className="text-center">
          <CardContent>
            <div className="py-12">
              <p className="text-slate-500">
                {stateFilter === "all"
                  ? "No hay inmuebles en esta lista."
                  : `No hay inmuebles con estado "${getStateLabel(stateFilter)}".`}
              </p>
              {stateFilter !== "all" && (
                <button
                  onClick={() => setStateFilter("all")}
                  className="mt-2 text-primary hover:underline"
                >
                  Ver todos los inmuebles
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-lg border border-border-light bg-card-light dark:border-border-dark dark:bg-card-dark sm:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-light bg-slate-50 dark:border-border-dark dark:bg-slate-900/50">
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Inmueble
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      M²
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Hab.
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Teléfono
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Propietario
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Estado
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Comentario
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Enlace
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light dark:divide-border-dark">
                  {properties.map((property) => (
                    <PropertyRow
                      key={property.id}
                      property={property}
                      onStateChange={handleStateChange}
                      onCommentChange={handleCommentChange}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 sm:hidden">
            {properties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                onStateChange={handleStateChange}
                onCommentChange={handleCommentChange}
              />
            ))}
          </div>

          {/* Load more */}
          {hasNextPage && (
            <div className="mt-6 flex justify-center">
              <Button
                variant="secondary"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? (
                  <>
                    <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Cargando...
                  </>
                ) : (
                  "Cargar más inmuebles"
                )}
              </Button>
            </div>
          )}

          {/* Count */}
          <p className="mt-4 text-center text-sm text-slate-500">
            Mostrando {properties.length} de {totalProperties} inmuebles
          </p>
        </>
      )}
    </div>
  );
}
