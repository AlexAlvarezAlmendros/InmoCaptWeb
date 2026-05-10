import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@/services/apiClient";
import type {
  Property,
  PaginatedResponse,
  RevealResponseData,
  CreditBalance,
} from "@/types";

interface RevealParams {
  listId: string;
  propertyId: string;
}

interface RevealError extends Error {
  status: number;
  balance?: CreditBalance;
  reason?: "no_credits" | "no_list_access" | "property_not_found";
}

type PropertiesResponse = PaginatedResponse<Property>;

export function useRevealProperty() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<
    RevealResponseData,
    RevealError,
    RevealParams
  >({
    mutationFn: async ({ listId, propertyId }) => {
      const response = await apiClient.post<{ data: RevealResponseData }>(
        `/lists/${listId}/properties/${propertyId}/reveal`,
      );
      return response.data;
    },
    onSuccess: (result, { listId, propertyId }) => {
      if (!result.success || !result.contact) return;

      queryClient.setQueriesData<{
        pages: PropertiesResponse[];
        pageParams: (string | undefined)[];
      }>({ queryKey: ["listProperties", listId] }, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            data: page.data.map((p) =>
              p.id === propertyId
                ? {
                    ...p,
                    phone: result.contact!.phone,
                    sourceUrl: result.contact!.sourceUrl,
                    ownerName: result.contact!.ownerName ?? p.ownerName,
                    isRevealed: true,
                  }
                : p,
            ),
          })),
        };
      });

      queryClient.invalidateQueries({ queryKey: ["creditBalance"] });
      queryClient.invalidateQueries({ queryKey: ["userPlan"] });
    },
  });
}
