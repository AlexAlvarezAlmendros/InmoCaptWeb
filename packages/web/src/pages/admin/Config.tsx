import { useState, useEffect } from "react";
import { Button } from "@/components/ui";
import { formatPrice } from "@/lib/utils";
import {
  useAdminSettings,
  useUpdateSettings,
  useRecalculatePrices,
} from "@/hooks/useAdminSettings";
import type { PriceRecalculateResult } from "@/types";

export function AdminConfigPage() {
  const { data: settings, isLoading } = useAdminSettings();
  const updateSettings = useUpdateSettings();
  const recalculate = useRecalculatePrices();

  const [priceInput, setPriceInput] = useState<string>("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [recalcResults, setRecalcResults] = useState<
    PriceRecalculateResult[] | null
  >(null);
  const [recalcPricePer, setRecalcPricePer] = useState<number | null>(null);

  // Sync input when settings load
  useEffect(() => {
    if (settings && priceInput === "") {
      setPriceInput(String(settings.pricePerPropertyCents));
    }
  }, [settings, priceInput]);

  const priceInputNumber = parseInt(priceInput, 10);
  const isValidPrice =
    !isNaN(priceInputNumber) &&
    priceInputNumber >= 0 &&
    Number.isInteger(priceInputNumber);

  const handleSave = async () => {
    if (!isValidPrice) return;
    await updateSettings.mutateAsync({
      pricePerPropertyCents: priceInputNumber,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleRecalculate = async () => {
    const result = await recalculate.mutateAsync();
    setRecalcResults(result.data.results);
    setRecalcPricePer(result.data.pricePerPropertyCents);
  };

  if (isLoading) {
    return (
      <div className="space-y-1">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Configuración
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Ajustes de la plataforma
        </p>
      </div>

      {/* Price per property section */}
      <section className="rounded-xl border border-border-light bg-card-light p-6 dark:border-border-dark dark:bg-card-dark">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Precio por inmueble
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          El precio de cada lista se calcula multiplicando este valor por el
          número de inmuebles activos que contiene.
        </p>

        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1 max-w-xs">
            <label
              htmlFor="pricePerProperty"
              className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Céntimos por inmueble
            </label>
            <div className="relative">
              <input
                id="pricePerProperty"
                type="number"
                min={0}
                step={1}
                value={priceInput}
                onChange={(e) => {
                  setPriceInput(e.target.value);
                  setSaveSuccess(false);
                }}
                className="w-full rounded-lg border border-border-light bg-surface-light px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-border-dark dark:bg-surface-dark dark:text-slate-100"
                placeholder="100"
              />
            </div>
            {isValidPrice && (
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                ≈{" "}
                <span className="font-medium text-slate-600 dark:text-slate-300">
                  {formatPrice(priceInputNumber)}
                </span>{" "}
                por inmueble
              </p>
            )}
            {!isValidPrice && priceInput !== "" && (
              <p className="mt-1 text-xs text-red-500">
                Introduce un número entero ≥ 0
              </p>
            )}
          </div>

          <Button
            onClick={handleSave}
            disabled={
              !isValidPrice ||
              updateSettings.isPending ||
              priceInputNumber === settings?.pricePerPropertyCents
            }
            isLoading={updateSettings.isPending}
          >
            {saveSuccess ? "✓ Guardado" : "Guardar configuración"}
          </Button>
        </div>

        {updateSettings.isError && (
          <p className="mt-3 text-sm text-red-500">
            Error al guardar. Inténtalo de nuevo.
          </p>
        )}
      </section>

      {/* Recalculate prices section */}
      <section className="rounded-xl border border-border-light bg-card-light p-6 dark:border-border-dark dark:bg-card-dark">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Recalcular precios de todas las listas
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Actualiza el precio de cada lista publicada usando la fórmula:{" "}
          <span className="font-mono text-slate-600 dark:text-slate-300">
            inmuebles activos × precio por inmueble
          </span>
          . Las listas con 0 inmuebles activos quedarán en €0.
        </p>

        <div className="mt-5">
          <Button
            variant="secondary"
            onClick={handleRecalculate}
            disabled={recalculate.isPending}
            isLoading={recalculate.isPending}
          >
            Recalcular todas las listas
          </Button>
        </div>

        {recalculate.isError && (
          <p className="mt-3 text-sm text-red-500">
            Error al recalcular. Inténtalo de nuevo.
          </p>
        )}

        {/* Results table */}
        {recalcResults !== null && (
          <div className="mt-6">
            <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
              Precio unitario aplicado:{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {recalcPricePer !== null ? formatPrice(recalcPricePer) : "—"}
                /inmueble
              </span>
              {" · "}
              {recalcResults.length}{" "}
              {recalcResults.length === 1
                ? "lista actualizada"
                : "listas actualizadas"}
            </p>

            {recalcResults.length === 0 ? (
              <p className="text-sm text-slate-400">
                No hay listas que actualizar.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border-light dark:border-border-dark">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-light bg-slate-50 text-left dark:border-border-dark dark:bg-slate-800/50">
                      <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-400">
                        Lista
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-400">
                        Inmuebles activos
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-400">
                        Precio anterior
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-400">
                        Precio nuevo
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recalcResults.map((row, idx) => {
                      const changed = row.oldPriceCents !== row.newPriceCents;
                      return (
                        <tr
                          key={row.listId}
                          className={`border-b border-border-light last:border-0 dark:border-border-dark ${
                            idx % 2 === 0
                              ? ""
                              : "bg-slate-50/50 dark:bg-slate-800/20"
                          }`}
                        >
                          <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                            {row.listName}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-slate-600 dark:text-slate-400">
                            {row.activePropertyCount}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-slate-500 dark:text-slate-500">
                            {formatPrice(row.oldPriceCents)}
                          </td>
                          <td
                            className={`px-4 py-3 text-right tabular-nums font-semibold ${
                              changed
                                ? "text-primary"
                                : "text-slate-600 dark:text-slate-400"
                            }`}
                          >
                            {formatPrice(row.newPriceCents)}
                            {changed && (
                              <span className="ml-1 text-xs font-normal text-slate-400">
                                {row.newPriceCents > row.oldPriceCents
                                  ? "↑"
                                  : "↓"}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
