import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@/services/apiClient";
import type { AdminSettings, RecalculatePricesResponse } from "@/types";
import { adminListsKeys } from "./useAdminLists";

export const adminSettingsKeys = {
  all: ["admin", "settings"] as const,
};

/**
 * Fetch current platform settings
 */
export function useAdminSettings() {
  const api = useApiClient();

  return useQuery({
    queryKey: adminSettingsKeys.all,
    queryFn: () => api.get<{ data: AdminSettings }>("/admin/settings"),
    select: (response) => response.data,
  });
}

/**
 * Update platform settings (price per property)
 */
export function useUpdateSettings() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AdminSettings) =>
      api.patch<{ data: AdminSettings }>("/admin/settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminSettingsKeys.all });
    },
  });
}

/**
 * Recalculate all list prices based on active property count × price per property
 */
export function useRecalculatePrices() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      api.post<{ data: RecalculatePricesResponse }>(
        "/admin/settings/recalculate-prices",
        {},
      ),
    onSuccess: () => {
      // Refresh admin lists so the updated prices are reflected
      queryClient.invalidateQueries({ queryKey: adminListsKeys.all });
    },
  });
}
