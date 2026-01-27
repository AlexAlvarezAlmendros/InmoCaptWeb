import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@/services/apiClient";
import type {
  AdminListRequest,
  ApproveRequestInput,
  ListRequestStatus,
} from "@/types";

// Query keys
export const adminRequestsKeys = {
  all: ["admin", "requests"] as const,
  filtered: (status?: ListRequestStatus) =>
    ["admin", "requests", { status }] as const,
};

// ============================================
// Queries
// ============================================

/**
 * Fetch all list requests (admin)
 */
export function useAdminListRequests(status?: ListRequestStatus) {
  const api = useApiClient();

  return useQuery({
    queryKey: adminRequestsKeys.filtered(status),
    queryFn: () => {
      const params = status ? `?status=${status}` : "";
      return api.get<{ data: AdminListRequest[] }>(
        `/admin/list-requests${params}`,
      );
    },
    select: (response) => response.data,
  });
}

// ============================================
// Mutations
// ============================================

/**
 * Approve a list request
 */
export function useApproveRequest() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      requestId,
      data,
    }: {
      requestId: string;
      data: ApproveRequestInput;
    }) =>
      api.post<{ data: { request: AdminListRequest; listId: string } }>(
        `/admin/list-requests/${requestId}/approve`,
        data,
      ),
    onSuccess: () => {
      // Invalidate requests query
      queryClient.invalidateQueries({ queryKey: adminRequestsKeys.all });
      // Also invalidate lists since a new one was created
      queryClient.invalidateQueries({ queryKey: ["admin", "lists"] });
    },
  });
}

/**
 * Reject a list request
 */
export function useRejectRequest() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: string) =>
      api.post<{ data: AdminListRequest }>(
        `/admin/list-requests/${requestId}/reject`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminRequestsKeys.all });
    },
  });
}
