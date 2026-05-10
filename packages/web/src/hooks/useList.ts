import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/services/apiClient";

export interface ListInfo {
  id: string;
  name: string;
  location: string;
  currency: string;
  lastUpdatedAt: string;
}

export function useList(listId: string | undefined) {
  const apiClient = useApiClient();

  return useQuery({
    queryKey: ["list", listId],
    queryFn: async () => {
      const response = await apiClient.get<{ data: ListInfo }>(
        `/lists/${listId}`,
      );
      return response.data;
    },
    enabled: !!listId,
    staleTime: 1000 * 60,
  });
}
