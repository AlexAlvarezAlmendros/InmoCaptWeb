import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useApiClient } from "@/services/apiClient";
import { Button } from "@/components/ui";
import type { ApiError } from "@/services/apiClient";

interface StripeSyncResult {
  id: string;
  type: string;
  action: string;
  stripe_price_id?: string;
}

export function AdminMaintenancePage() {
  const api = useApiClient();
  const [syncResults, setSyncResults] = useState<StripeSyncResult[] | null>(null);

  const stripeSync = useMutation({
    mutationFn: () =>
      api.post<{ data: StripeSyncResult[] }>("/admin/stripe-sync", {}),
    onSuccess: (res) => {
      setSyncResults(res.data);
    },
    onError: (err) => {
      const apiErr = err as ApiError;
      alert(`Error: ${apiErr.message || "Error inesperado"}`);
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
        Mantenimiento
      </h1>

      {/* Stripe Sync */}
      <section className="rounded-xl border border-border-light bg-card-light p-6 dark:border-border-dark dark:bg-card-dark">
        <h2 className="mb-1 text-lg font-semibold text-slate-800 dark:text-slate-200">
          Sincronizar planes con Stripe
        </h2>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Crea los productos y precios en Stripe para cada plan y pack de créditos.
          Es idempotente: si ya están sincronizados, no hace nada.
        </p>
        <Button
          onClick={() => stripeSync.mutate()}
          disabled={stripeSync.isPending}
        >
          {stripeSync.isPending ? "Sincronizando…" : "Sincronizar Stripe"}
        </Button>

        {syncResults && (
          <div className="mt-4 overflow-x-auto rounded-lg border border-border-light dark:border-border-dark">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-light bg-slate-50 text-left dark:border-border-dark dark:bg-slate-800/50">
                  <th className="px-4 py-2 font-medium text-slate-600 dark:text-slate-300">ID</th>
                  <th className="px-4 py-2 font-medium text-slate-600 dark:text-slate-300">Tipo</th>
                  <th className="px-4 py-2 font-medium text-slate-600 dark:text-slate-300">Acción</th>
                  <th className="px-4 py-2 font-medium text-slate-600 dark:text-slate-300">Stripe Price ID</th>
                </tr>
              </thead>
              <tbody>
                {syncResults.map((r) => (
                  <tr
                    key={`${r.type}-${r.id}`}
                    className="border-b border-border-light last:border-0 dark:border-border-dark"
                  >
                    <td className="px-4 py-2 font-mono text-slate-800 dark:text-slate-200">{r.id}</td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{r.type}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          r.action === "synced"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : r.action === "already_synced"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400"
                        }`}
                      >
                        {r.action}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-slate-500 dark:text-slate-400">
                      {r.stripe_price_id ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
