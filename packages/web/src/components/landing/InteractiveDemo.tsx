import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  getStateLabel,
} from "@/components/ui";
import { formatPrice } from "@/lib/utils";
import { PropertyState } from "@/types";

// Demo data
const demoLists = [
  {
    id: "list-1",
    name: "Madrid Centro",
    location: "Madrid",
    priceCents: 4900,
    currency: "EUR",
    lastUpdatedAt: "Hace 2 horas",
    totalProperties: 156,
    newProperties: 12,
  },
  {
    id: "list-2",
    name: "Barcelona Eixample",
    location: "Barcelona",
    priceCents: 4900,
    currency: "EUR",
    lastUpdatedAt: "Hace 1 día",
    totalProperties: 89,
    newProperties: 5,
  },
  {
    id: "list-3",
    name: "Valencia Ciutat Vella",
    location: "Valencia",
    priceCents: 3900,
    currency: "EUR",
    lastUpdatedAt: "Hace 6 días",
    totalProperties: 45,
    newProperties: 0,
  },
];

const demoProperties = [
  {
    id: "1",
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
    price: 295000,
    m2: 95,
    bedrooms: 3,
    phone: "+34 656 XXX XXX",
    ownerName: "Carlos R.",
    state: "new" as PropertyState,
    comment: "",
  },
];

type DemoView = "dashboard" | "list";

export function InteractiveDemo() {
  const [view, setView] = useState<DemoView>("dashboard");
  const [selectedList, setSelectedList] = useState(demoLists[0]);
  const [properties, setProperties] = useState(demoProperties);
  const [editingComment, setEditingComment] = useState<string | null>(null);

  const handleListClick = (list: (typeof demoLists)[0]) => {
    setSelectedList(list);
    setView("list");
  };

  const handleStateChange = (propertyId: string, newState: PropertyState) => {
    setProperties((prev) =>
      prev.map((p) => (p.id === propertyId ? { ...p, state: newState } : p))
    );
  };

  const handleCommentChange = (propertyId: string, comment: string) => {
    setProperties((prev) =>
      prev.map((p) => (p.id === propertyId ? { ...p, comment } : p))
    );
  };

  return (
    <div className="rounded-xl border border-border-light bg-card-light shadow-2xl dark:border-border-dark dark:bg-card-dark overflow-hidden">
      {/* Demo Header */}
      <div className="flex items-center gap-2 border-b border-border-light bg-slate-50 px-4 py-2 dark:border-border-dark dark:bg-slate-900/50">
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-red-400"></div>
          <div className="h-3 w-3 rounded-full bg-yellow-400"></div>
          <div className="h-3 w-3 rounded-full bg-green-400"></div>
        </div>
        <div className="flex-1 text-center">
          <span className="text-xs text-slate-500">
            app.inmocapt.com/{view === "dashboard" ? "dashboard" : `lists/${selectedList.id}`}
          </span>
        </div>
        <Badge variant="info" className="text-xs">
          Demo interactiva
        </Badge>
      </div>

      {/* Sidebar + Content */}
      <div className="flex h-[500px]">
        {/* Sidebar */}
        <div className="w-48 border-r border-border-light bg-slate-50/50 p-3 dark:border-border-dark dark:bg-slate-900/30">
          <div className="mb-4">
            <span className="text-lg font-bold text-primary">InmoCapt</span>
          </div>
          <nav className="space-y-1">
            <button
              onClick={() => setView("dashboard")}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                view === "dashboard"
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              Mis Listas
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              Suscripciones
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Cuenta
            </button>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-4">
          {view === "dashboard" ? (
            <DashboardView lists={demoLists} onListClick={handleListClick} />
          ) : (
            <ListView
              list={selectedList}
              properties={properties}
              onBack={() => setView("dashboard")}
              onStateChange={handleStateChange}
              onCommentChange={handleCommentChange}
              editingComment={editingComment}
              setEditingComment={setEditingComment}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Dashboard View Component
function DashboardView({
  lists,
  onListClick,
}: {
  lists: typeof demoLists;
  onListClick: (list: (typeof demoLists)[0]) => void;
}) {
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Mis Listas
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Accede a tus listados FSBO suscritos
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {lists.map((list) => (
          <Card
            key={list.id}
            className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
            onClick={() => onListClick(list)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-sm">{list.name}</CardTitle>
                <Badge variant="success" className="text-xs">
                  Activa
                </Badge>
              </div>
              <p className="text-xs text-slate-500">{list.location}</p>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Inmuebles</span>
                  <span className="font-medium">{list.totalProperties}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Nuevos</span>
                  <span className="font-medium text-accent">
                    +{list.newProperties}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Actualizado</span>
                  <span className="text-slate-600 dark:text-slate-400">
                    {list.lastUpdatedAt}
                  </span>
                </div>
                <div className="border-t border-border-light pt-1.5 dark:border-border-dark">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Precio/mes</span>
                    <span className="font-semibold text-primary">
                      {formatPrice(list.priceCents, list.currency)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// List View Component
function ListView({
  list,
  properties,
  onBack,
  onStateChange,
  onCommentChange,
  editingComment,
  setEditingComment,
}: {
  list: (typeof demoLists)[0];
  properties: typeof demoProperties;
  onBack: () => void;
  onStateChange: (propertyId: string, state: PropertyState) => void;
  onCommentChange: (propertyId: string, comment: string) => void;
  editingComment: string | null;
  setEditingComment: (id: string | null) => void;
}) {
  const states: PropertyState[] = ["new", "contacted", "captured", "rejected"];

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-light text-slate-500 hover:bg-slate-50 dark:border-border-dark dark:hover:bg-slate-800"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {list.name}
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {list.totalProperties} inmuebles • Actualizado {list.lastUpdatedAt}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-border-light dark:border-border-dark">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border-light bg-slate-50 dark:border-border-dark dark:bg-slate-900/50">
                <th className="px-3 py-2 text-left font-medium uppercase tracking-wider text-slate-500">
                  Precio
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
                  Estado
                </th>
                <th className="px-3 py-2 text-left font-medium uppercase tracking-wider text-slate-500">
                  Comentario
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {properties.map((property) => (
                <tr
                  key={property.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-900/30"
                >
                  <td className="whitespace-nowrap px-3 py-2 font-medium">
                    {formatPrice(property.price * 100, "EUR")}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600 dark:text-slate-400">
                    {property.m2} m²
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600 dark:text-slate-400">
                    {property.bedrooms}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-primary">
                    {property.phone}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <select
                      value={property.state}
                      onChange={(e) =>
                        onStateChange(property.id, e.target.value as PropertyState)
                      }
                      className="rounded border border-border-light bg-transparent px-1.5 py-0.5 text-xs dark:border-border-dark focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {states.map((state) => (
                        <option key={state} value={state}>
                          {getStateLabel(state)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    {editingComment === property.id ? (
                      <input
                        type="text"
                        value={property.comment}
                        onChange={(e) =>
                          onCommentChange(property.id, e.target.value)
                        }
                        onBlur={() => setEditingComment(null)}
                        onKeyDown={(e) => e.key === "Enter" && setEditingComment(null)}
                        autoFocus
                        className="w-full rounded border border-primary bg-transparent px-1.5 py-0.5 text-xs focus:outline-none"
                        placeholder="Añadir comentario..."
                      />
                    ) : (
                      <button
                        onClick={() => setEditingComment(property.id)}
                        className="w-full truncate text-left text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      >
                        {property.comment || (
                          <span className="italic text-slate-400">
                            Añadir nota...
                          </span>
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-slate-400">
        💡 Prueba a cambiar el estado o añadir comentarios a los inmuebles
      </p>
    </div>
  );
}
