import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@/services/apiClient";
import type { AdminListRequest, ListRequestStatus } from "@/types";

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
 * Approve a list request (marks it approved — does not create a list)
 */
export function useApproveRequest() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: string) =>
      api.post<{ data: AdminListRequest }>(
        `/admin/list-requests/${requestId}/approve`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminRequestsKeys.all });
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
