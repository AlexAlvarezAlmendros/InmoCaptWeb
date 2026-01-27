import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@/services/apiClient";
import type {
  AdminList,
  CreateListInput,
  UpdateListInput,
  UploadResult,
  IdealistaUpload,
  PropertyInput,
} from "@/types";

// Type for upload data - can be either format
export type UploadData = IdealistaUpload | { properties: PropertyInput[] };

// Query keys
export const adminListsKeys = {
  all: ["admin", "lists"] as const,
  list: (id: string) => ["admin", "lists", id] as const,
};

// ============================================
// Queries
// ============================================

/**
 * Fetch all lists with stats (admin)
 */
export function useAdminLists() {
  const api = useApiClient();

  return useQuery({
    queryKey: adminListsKeys.all,
    queryFn: () => api.get<{ data: AdminList[] }>("/admin/lists"),
    select: (response) => response.data,
  });
}

/**
 * Fetch single list (admin)
 */
export function useAdminList(listId: string) {
  const api = useApiClient();

  return useQuery({
    queryKey: adminListsKeys.list(listId),
    queryFn: () => api.get<{ data: AdminList }>(`/admin/lists/${listId}`),
    select: (response) => response.data,
    enabled: !!listId,
  });
}

// ============================================
// Mutations
// ============================================

/**
 * Create a new list
 */
export function useCreateList() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateListInput) =>
      api.post<{ data: AdminList }>("/admin/lists", data),
    onSuccess: () => {
      // Invalidate lists query to refetch
      queryClient.invalidateQueries({ queryKey: adminListsKeys.all });
    },
  });
}

/**
 * Update an existing list
 */
export function useUpdateList() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ listId, data }: { listId: string; data: UpdateListInput }) =>
      api.patch<{ data: AdminList }>(`/admin/lists/${listId}`, data),
    onSuccess: (_result, variables) => {
      // Invalidate both the list and the lists collection
      queryClient.invalidateQueries({ queryKey: adminListsKeys.all });
      queryClient.invalidateQueries({
        queryKey: adminListsKeys.list(variables.listId),
      });
    },
  });
}

/**
 * Delete a list
 */
export function useDeleteList() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (listId: string) => api.delete(`/admin/lists/${listId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminListsKeys.all });
    },
  });
}

/**
 * Upload properties to a list (supports Idealista format and simple format)
 */
export function useUploadProperties() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ listId, data }: { listId: string; data: UploadData }) =>
      api.post<{ data: UploadResult }>(`/admin/lists/${listId}/upload`, data),
    onSuccess: (_result, variables) => {
      // Invalidate list to update stats
      queryClient.invalidateQueries({ queryKey: adminListsKeys.all });
      queryClient.invalidateQueries({
        queryKey: adminListsKeys.list(variables.listId),
      });
    },
  });
}
