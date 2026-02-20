import { useState } from "react";
import { Badge, getStateVariant } from "@/components/ui";
import { formatPrice } from "@/lib/utils";
import { PropertyState } from "@/types";

// ─── Demo Data ────────────────────────────────────────────────────
const demoLists = [
  {
    id: "list-1",
    name: "Madrid Centro",
    location: "Madrid",
    totalProperties: 156,
    newProperties: 12,
    lastUpdatedAt: "Hace 2 horas",
  },
  {
    id: "list-2",
    name: "Barcelona Eixample",
    location: "Barcelona",
    totalProperties: 89,
    newProperties: 5,
    lastUpdatedAt: "Hace 1 día",
  },
  {
    id: "list-3",
    name: "Valencia Ciutat Vella",
    location: "Valencia",
    totalProperties: 45,
    newProperties: 0,
    lastUpdatedAt: "Hace 6 días",
  },
];

const demoProperties = [
  {
    id: "1",
    title: "Piso en Calle Gran Vía",
    location: "Centro, Madrid",
    price: 250000,
    m2: 85,
    bedrooms: 3,
    phone: "+34 612 XXX XXX",
    ownerName: "Juan G.",
    state: "new" as PropertyState,
    comment: "",
  },
  {
    id: "2",
    title: "Ático en Malasaña",
    location: "Malasaña, Madrid",
    price: 320000,
    m2: 110,
    bedrooms: 4,
    phone: "+34 623 XXX XXX",
    ownerName: "María L.",
    state: "contacted" as PropertyState,
    comment: "Llamar por la tarde",
  },
  {
    id: "3",
    title: "Estudio en Lavapiés",
    location: "Lavapiés, Madrid",
    price: 180000,
    m2: 65,
    bedrooms: 2,
    phone: "+34 634 XXX XXX",
    ownerName: "Pedro M.",
    state: "captured" as PropertyState,
    comment: "Exclusiva firmada",
  },
  {
    id: "4",
    title: "Chalet en La Moraleja",
    location: "La Moraleja, Madrid",
    price: 450000,
    m2: 150,
    bedrooms: 5,
    phone: "+34 645 XXX XXX",
    ownerName: "Ana S.",
    state: "rejected" as PropertyState,
    comment: "No interesado",
  },
  {
    id: "5",
    title: "Piso en Salamanca",
    location: "Barrio Salamanca, Madrid",
    price: 295000,
    m2: 95,
    bedrooms: 3,
    phone: "+34 656 XXX XXX",
    ownerName: "Carlos R.",
    state: "new" as PropertyState,
    comment: "",
  },
];

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

type DemoView = "dashboard" | "list";

// ─── Main Component ───────────────────────────────────────────────
export function InteractiveDemo() {
  const [view, setView] = useState<DemoView>("dashboard");
  const [selectedList, setSelectedList] = useState(demoLists[0]);
  const [properties, setProperties] = useState(demoProperties);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [stateFilter, setStateFilter] = useState<PropertyState | "all">("all");

  const handleListClick = (list: (typeof demoLists)[0]) => {
    setSelectedList(list);
    setStateFilter("all");
    setView("list");
  };

  const handleStateChange = (propertyId: string, newState: PropertyState) => {
    setProperties((prev) =>
      prev.map((p) => (p.id === propertyId ? { ...p, state: newState } : p)),
    );
  };

  const handleCommentChange = (propertyId: string, comment: string) => {
    setProperties((prev) =>
      prev.map((p) => (p.id === propertyId ? { ...p, comment } : p)),
    );
  };

  const filteredProperties =
    stateFilter === "all"
      ? properties
      : properties.filter((p) => p.state === stateFilter);

  const stateCounts = PROPERTY_STATES.reduce(
    (acc, s) => {
      acc[s.value] = properties.filter((p) => p.state === s.value).length;
      return acc;
    },
    {} as Record<PropertyState, number>,
  );

  return (
    <div className="overflow-hidden rounded-xl border border-border-light bg-card-light shadow-2xl dark:border-border-dark dark:bg-card-dark">
      {/* ── Browser Chrome (desktop) ────────────────────────────── */}
      <div className="hidden items-center gap-2 border-b border-border-light bg-slate-100 px-4 py-2 dark:border-border-dark dark:bg-slate-900/60 sm:flex">
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-red-400" />
          <div className="h-3 w-3 rounded-full bg-yellow-400" />
          <div className="h-3 w-3 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 text-center">
          <div className="mx-auto inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1 text-xs text-slate-500 dark:bg-slate-800">
            <svg
              className="h-3 w-3 text-green-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                clipRule="evenodd"
              />
            </svg>
            https://www.inmocapt.com/
            {view === "dashboard" ? "dashboard" : `lists/${selectedList.id}`}
          </div>
        </div>
        <Badge variant="info" className="text-[10px]">
          Demo interactiva
        </Badge>
      </div>

      {/* ── Mobile Status Bar ──────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-border-light bg-slate-100 px-3 py-1.5 dark:border-border-dark dark:bg-slate-900/60 sm:hidden">
        <span className="text-[10px] text-slate-400">9:41</span>
        <div className="flex items-center gap-1 rounded-full bg-white px-2 py-0.5 dark:bg-slate-800">
          <svg
            className="h-2.5 w-2.5 text-green-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-[10px] text-slate-500">inmocapt.com</span>
        </div>
        <Badge variant="info" className="text-[8px]">
          Demo
        </Badge>
      </div>

      {/* ── App Header (replica of AppLayout) ──────────────────── */}
      <div className="border-b border-border-light bg-card-light/90 backdrop-blur-sm dark:border-border-dark dark:bg-card-dark/90">
        <div className="flex h-10 items-center justify-between px-3 sm:h-11 sm:px-4">
          <div className="flex items-center gap-3 sm:gap-5">
            <span className="text-xs font-bold text-primary sm:text-sm">
              InmoCapt
            </span>
            {/* Desktop nav */}
            <nav className="hidden items-center gap-0.5 sm:flex">
              <button
                onClick={() => setView("dashboard")}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  view === "dashboard"
                    ? "bg-primary text-white"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                Dashboard
              </button>
              <span className="cursor-default rounded-lg px-2.5 py-1 text-xs font-medium text-slate-400 dark:text-slate-500">
                Suscripciones
              </span>
              <span className="cursor-default rounded-lg px-2.5 py-1 text-xs font-medium text-slate-400 dark:text-slate-500">
                Cuenta
              </span>
            </nav>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden text-xs text-slate-500 sm:inline">
              agente@demo.com
            </span>
            {/* Mobile hamburger icon */}
            <div className="flex h-6 w-6 items-center justify-center rounded text-slate-400 sm:hidden">
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
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </div>
            <span className="hidden cursor-default rounded-lg px-2 py-1 text-xs text-slate-400 sm:inline">
              Cerrar sesión
            </span>
          </div>
        </div>
      </div>

      {/* ── Main Content Area ──────────────────────────────────── */}
      <div className="h-[420px] overflow-y-auto bg-surface-light p-3 dark:bg-surface-dark sm:h-[480px] sm:p-5">
        {view === "dashboard" ? (
          <DemoDashboard lists={demoLists} onListClick={handleListClick} />
        ) : (
          <DemoListDetail
            list={selectedList}
            properties={filteredProperties}
            totalCount={properties.length}
            stateCounts={stateCounts}
            stateFilter={stateFilter}
            onFilterChange={setStateFilter}
            onBack={() => setView("dashboard")}
            onStateChange={handleStateChange}
            onCommentChange={handleCommentChange}
            editingComment={editingComment}
            setEditingComment={setEditingComment}
          />
        )}
      </div>
    </div>
  );
}

// ─── Dashboard View (matches pages/Dashboard.tsx) ─────────────────
function DemoDashboard({
  lists,
  onListClick,
}: {
  lists: typeof demoLists;
  onListClick: (list: (typeof demoLists)[0]) => void;
}) {
  return (
    <div>
      <div className="mb-3 sm:mb-5">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white sm:text-xl">
          Mis Listas
        </h2>
        <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400 sm:mt-1 sm:text-sm">
          Accede a tus listados de particulares suscritos
        </p>
      </div>

      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {lists.map((list) => (
          <button
            key={list.id}
            onClick={() => onListClick(list)}
            className="group rounded-xl border border-border-light bg-card-light p-4 text-left transition-all hover:border-primary hover:shadow-md dark:border-border-dark dark:bg-card-dark"
          >
            {/* Header */}
            <div className="mb-3 flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-semibold text-slate-900 dark:text-white">
                  {list.name}
                </h3>
                <p className="text-xs text-slate-500">{list.location}</p>
              </div>
              <Badge variant="success" className="ml-2 shrink-0">
                Activa
              </Badge>
            </div>

            {/* Stats — matches real Dashboard cards */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Inmuebles totales</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {list.totalProperties}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Nuevos</span>
                {list.newProperties > 0 ? (
                  <Badge variant="success" className="font-medium">
                    +{list.newProperties}
                  </Badge>
                ) : (
                  <span className="text-slate-400">0</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Actualizado</span>
                <span className="text-slate-600 dark:text-slate-400">
                  {list.lastUpdatedAt}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── List Detail View (matches pages/ListDetail.tsx) ──────────────
function DemoListDetail({
  list,
  properties,
  totalCount,
  stateCounts,
  stateFilter,
  onFilterChange,
  onBack,
  onStateChange,
  onCommentChange,
  editingComment,
  setEditingComment,
}: {
  list: (typeof demoLists)[0];
  properties: typeof demoProperties;
  totalCount: number;
  stateCounts: Record<PropertyState, number>;
  stateFilter: PropertyState | "all";
  onFilterChange: (f: PropertyState | "all") => void;
  onBack: () => void;
  onStateChange: (id: string, state: PropertyState) => void;
  onCommentChange: (id: string, comment: string) => void;
  editingComment: string | null;
  setEditingComment: (id: string | null) => void;
}) {
  return (
    <div>
      {/* ── Header with back + filter (matches real) ─────────── */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button
            onClick={onBack}
            className="mb-1 flex items-center gap-1 text-xs text-slate-500 hover:text-primary"
          >
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Volver al dashboard
          </button>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {list.name}
          </h2>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
            {list.location} • {totalCount} inmuebles
          </p>
        </div>

        {/* State filter pills */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="hidden text-xs text-slate-500 sm:inline">
            Filtrar:
          </span>
          <div className="flex flex-wrap gap-1 sm:flex-nowrap sm:gap-0 sm:rounded-lg sm:border sm:border-border-light sm:dark:border-border-dark">
            {STATE_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => onFilterChange(f.value)}
                className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors sm:rounded-none sm:text-xs sm:first:rounded-l-lg sm:last:rounded-r-lg ${
                  stateFilter === f.value
                    ? "bg-primary text-white"
                    : "bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Stats row (matches real) ─────────────────────────── */}
      <div className="mb-3 grid grid-cols-2 gap-2 sm:mb-4 sm:grid-cols-4 sm:gap-3">
        {PROPERTY_STATES.map((state) => (
          <button
            key={state.value}
            onClick={() => onFilterChange(state.value)}
            className={`rounded-lg border p-2 text-center transition-colors ${
              stateFilter === state.value
                ? "border-primary bg-primary/5"
                : "border-border-light hover:border-primary/50 dark:border-border-dark"
            }`}
          >
            <Badge
              variant={getStateVariant(state.value)}
              className="mb-0.5 text-[10px]"
            >
              {state.label}
            </Badge>
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              {stateCounts[state.value]}
            </p>
          </button>
        ))}
      </div>

      {/* ── Properties Table (desktop) ─────────────────────── */}
      <div className="hidden overflow-hidden rounded-lg border border-border-light bg-card-light dark:border-border-dark dark:bg-card-dark sm:block">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border-light bg-slate-50 dark:border-border-dark dark:bg-slate-900/50">
                <th className="px-3 py-2 text-left font-medium uppercase tracking-wider text-slate-500">
                  Inmueble
                </th>
                <th className="px-3 py-2 text-left font-medium uppercase tracking-wider text-slate-500">
                  M²
                </th>
                <th className="px-3 py-2 text-left font-medium uppercase tracking-wider text-slate-500">
                  Hab.
                </th>
                <th className="px-3 py-2 text-left font-medium uppercase tracking-wider text-slate-500">
                  Teléfono
                </th>
                <th className="px-3 py-2 text-left font-medium uppercase tracking-wider text-slate-500">
                  Propietario
                </th>
                <th className="px-3 py-2 text-left font-medium uppercase tracking-wider text-slate-500">
                  Estado
                </th>
                <th className="px-3 py-2 text-left font-medium uppercase tracking-wider text-slate-500">
                  Comentario
                </th>
                <th className="px-3 py-2 text-left font-medium uppercase tracking-wider text-slate-500">
                  Enlace
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {properties.map((property) => (
                <DemoPropertyRow
                  key={property.id}
                  property={property}
                  isEditing={editingComment === property.id}
                  onEdit={() => setEditingComment(property.id)}
                  onStopEdit={() => setEditingComment(null)}
                  onStateChange={onStateChange}
                  onCommentChange={onCommentChange}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Properties Cards (mobile) ─────────────────────────── */}
      <div className="space-y-2.5 sm:hidden">
        {properties.map((property) => (
          <DemoPropertyCard
            key={property.id}
            property={property}
            isEditing={editingComment === property.id}
            onEdit={() => setEditingComment(property.id)}
            onStopEdit={() => setEditingComment(null)}
            onStateChange={onStateChange}
            onCommentChange={onCommentChange}
          />
        ))}
      </div>

      {/* ── Footer (matches real) ────────────────────────────── */}
      <p className="mt-3 text-center text-[10px] text-slate-400 sm:text-[11px]">
        Mostrando {properties.length} de {totalCount} inmuebles
        <span className="mx-1 sm:mx-2">•</span>
        <span className="text-primary">
          Prueba a cambiar estados y añadir comentarios
        </span>
      </p>
    </div>
  );
}

// ─── Property Row (matches real PropertyRow styling) ──────────────
function DemoPropertyRow({
  property,
  isEditing,
  onEdit,
  onStopEdit,
  onStateChange,
  onCommentChange,
}: {
  property: (typeof demoProperties)[0];
  isEditing: boolean;
  onEdit: () => void;
  onStopEdit: () => void;
  onStateChange: (id: string, state: PropertyState) => void;
  onCommentChange: (id: string, comment: string) => void;
}) {
  return (
    <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
      {/* Inmueble */}
      <td className="px-3 py-2">
        <div className="max-w-[140px]">
          <p className="truncate text-xs font-medium text-slate-900 dark:text-white">
            {property.title}
          </p>
          <p className="font-semibold text-primary">
            {formatPrice(property.price * 100, "EUR")}
          </p>
          <p className="truncate text-[10px] text-slate-500">
            {property.location}
          </p>
        </div>
      </td>
      {/* M² */}
      <td className="whitespace-nowrap px-3 py-2 text-slate-600 dark:text-slate-400">
        {property.m2} m²
      </td>
      {/* Hab */}
      <td className="whitespace-nowrap px-3 py-2 text-slate-600 dark:text-slate-400">
        {property.bedrooms}
      </td>
      {/* Teléfono */}
      <td className="whitespace-nowrap px-3 py-2 text-primary">
        {property.phone}
      </td>
      {/* Propietario */}
      <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
        {property.ownerName}
      </td>
      {/* Estado (colored select — matches real) */}
      <td className="whitespace-nowrap px-3 py-2">
        <select
          value={property.state}
          onChange={(e) =>
            onStateChange(property.id, e.target.value as PropertyState)
          }
          className={`rounded-md border px-1.5 py-0.5 text-xs font-medium transition-colors ${
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
      {/* Comentario (inline edit — matches real) */}
      <td className="px-3 py-2">
        {isEditing ? (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={property.comment}
              onChange={(e) => onCommentChange(property.id, e.target.value)}
              onBlur={onStopEdit}
              onKeyDown={(e) => e.key === "Enter" && onStopEdit()}
              autoFocus
              className="w-28 rounded border border-primary bg-transparent px-1.5 py-0.5 text-xs focus:outline-none dark:bg-slate-800"
              placeholder="Comentario..."
            />
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                onStopEdit();
              }}
              className="text-green-600 hover:text-green-700"
            >
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
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </button>
          </div>
        ) : (
          <button
            onClick={onEdit}
            className="group flex max-w-[100px] items-center gap-1 text-slate-500 hover:text-primary"
          >
            <span className="truncate">
              {property.comment || (
                <span className="italic text-slate-400">Añadir nota...</span>
              )}
            </span>
            <svg
              className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
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
      {/* Enlace */}
      <td className="whitespace-nowrap px-3 py-2">
        <span className="inline-flex items-center gap-0.5 text-primary">
          Ver
          <svg
            className="h-3 w-3"
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
        </span>
      </td>
    </tr>
  );
}

// ─── Mobile Property Card ─────────────────────────────────────────
function DemoPropertyCard({
  property,
  isEditing,
  onEdit,
  onStopEdit,
  onStateChange,
  onCommentChange,
}: {
  property: (typeof demoProperties)[0];
  isEditing: boolean;
  onEdit: () => void;
  onStopEdit: () => void;
  onStateChange: (id: string, state: PropertyState) => void;
  onCommentChange: (id: string, comment: string) => void;
}) {
  return (
    <div className="rounded-lg border border-border-light bg-card-light p-3 dark:border-border-dark dark:bg-card-dark">
      {/* Top row: title + state */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
            {property.title}
          </p>
          <p className="text-xs text-slate-500">{property.location}</p>
        </div>
        <select
          value={property.state}
          onChange={(e) =>
            onStateChange(property.id, e.target.value as PropertyState)
          }
          className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[11px] font-medium transition-colors ${
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
      <div className="mb-2 flex items-center gap-3 text-xs">
        <span className="font-semibold text-primary">
          {formatPrice(property.price * 100, "EUR")}
        </span>
        <span className="text-slate-500">{property.m2} m²</span>
        <span className="text-slate-500">{property.bedrooms} hab.</span>
      </div>

      {/* Contact row */}
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="text-slate-600 dark:text-slate-400">
          {property.ownerName}
        </span>
        <span className="text-primary">{property.phone}</span>
      </div>

      {/* Comment row */}
      <div className="border-t border-border-light pt-2 dark:border-border-dark">
        {isEditing ? (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={property.comment}
              onChange={(e) => onCommentChange(property.id, e.target.value)}
              onBlur={onStopEdit}
              onKeyDown={(e) => e.key === "Enter" && onStopEdit()}
              autoFocus
              className="flex-1 rounded border border-primary bg-transparent px-2 py-1 text-xs focus:outline-none dark:bg-slate-800"
              placeholder="Añadir comentario..."
            />
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                onStopEdit();
              }}
              className="text-green-600"
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
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </button>
          </div>
        ) : (
          <button
            onClick={onEdit}
            className="flex w-full items-center gap-1 text-xs text-slate-500"
          >
            <svg
              className="h-3 w-3 shrink-0"
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
                <span className="italic text-slate-400">Añadir nota...</span>
              )}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
