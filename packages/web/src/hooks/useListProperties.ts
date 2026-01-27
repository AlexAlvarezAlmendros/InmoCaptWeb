import {
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { useApiClient } from "@/services/apiClient";
import type { Property, PropertyState, PaginatedResponse } from "@/types";

type PropertiesResponse = PaginatedResponse<Property>;

interface UseListPropertiesOptions {
  listId: string;
  limit?: number;
  stateFilter?: PropertyState | "all";
  enabled?: boolean;
}

export function useListProperties({
  listId,
  limit = 50,
  stateFilter = "all",
  enabled = true,
}: UseListPropertiesOptions) {
  const apiClient = useApiClient();

  return useInfiniteQuery({
    queryKey: ["listProperties", listId, stateFilter],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      params.set("limit", String(limit));
      if (pageParam) params.set("cursor", pageParam);
      if (stateFilter !== "all") params.set("state", stateFilter);

      return apiClient.get<PropertiesResponse>(
        `/lists/${listId}/properties?${params.toString()}`,
      );
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.cursor : undefined,
    enabled: enabled && !!listId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

interface UpdatePropertyStateParams {
  listId: string;
  propertyId: string;
  state: PropertyState;
}

export function useUpdatePropertyState() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      listId,
      propertyId,
      state,
    }: UpdatePropertyStateParams) => {
      const response = await apiClient.patch<{
        data: { state: PropertyState; updatedAt: string };
      }>(`/lists/${listId}/properties/${propertyId}/state`, { state });
      return response.data;
    },
    onMutate: async ({ listId, propertyId, state }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["listProperties", listId] });

      // Snapshot previous value
      const previousData = queryClient.getQueryData(["listProperties", listId]);

      // Optimistically update
      queryClient.setQueriesData<{
        pages: PropertiesResponse[];
        pageParams: (string | undefined)[];
      }>({ queryKey: ["listProperties", listId] }, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            data: page.data.map((property) =>
              property.id === propertyId
                ? {
                    ...property,
                    state,
                    stateUpdatedAt: new Date().toISOString(),
                  }
                : property,
            ),
          })),
        };
      });

      return { previousData };
    },
    onError: (_error, { listId }, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(
          ["listProperties", listId],
          context.previousData,
        );
      }
    },
    onSettled: (_data, _error, { listId }) => {
      // Invalidate to refetch
      queryClient.invalidateQueries({ queryKey: ["listProperties", listId] });
      // Also invalidate subscriptions to update the count
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
    },
  });
}

interface UpdatePropertyCommentParams {
  listId: string;
  propertyId: string;
  comment: string;
}

export function useUpdatePropertyComment() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      listId,
      propertyId,
      comment,
    }: UpdatePropertyCommentParams) => {
      const response = await apiClient.patch<{
        data: { comment: string; updatedAt: string };
      }>(`/lists/${listId}/properties/${propertyId}/comment`, { comment });
      return response.data;
    },
    onMutate: async ({ listId, propertyId, comment }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["listProperties", listId] });

      // Snapshot previous value
      const previousData = queryClient.getQueryData(["listProperties", listId]);

      // Optimistically update
      queryClient.setQueriesData<{
        pages: PropertiesResponse[];
        pageParams: (string | undefined)[];
      }>({ queryKey: ["listProperties", listId] }, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            data: page.data.map((property) =>
              property.id === propertyId ? { ...property, comment } : property,
            ),
          })),
        };
      });

      return { previousData };
    },
    onError: (_error, { listId }, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(
          ["listProperties", listId],
          context.previousData,
        );
      }
    },
    onSettled: (_data, _error, { listId }) => {
      // Invalidate to refetch
      queryClient.invalidateQueries({ queryKey: ["listProperties", listId] });
    },
  });
}

// Get property stats for a list (useful for showing counts by state)
export function usePropertyStats(listId: string) {
  const { data, ...rest } = useListProperties({
    listId,
    limit: 1000, // Get all for stats
    enabled: !!listId,
  });

  const allProperties = data?.pages.flatMap((page) => page.data) ?? [];

  const stats = {
    total: allProperties.length,
    new: allProperties.filter((p) => p.state === "new").length,
    contacted: allProperties.filter((p) => p.state === "contacted").length,
    captured: allProperties.filter((p) => p.state === "captured").length,
    rejected: allProperties.filter((p) => p.state === "rejected").length,
  };

  return {
    ...rest,
    data: stats,
  };
}
