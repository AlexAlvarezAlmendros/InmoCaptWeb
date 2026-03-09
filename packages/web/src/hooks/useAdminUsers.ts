import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@/services/apiClient";
import type { AdminUser, AdminUserDetail } from "@/types";

// Query keys
export const adminUsersKeys = {
  all: ["admin", "users"] as const,
  detail: (userId: string) => ["admin", "users", userId] as const,
};

/**
 * Fetch all users with stats (admin)
 */
export function useAdminUsers() {
  const api = useApiClient();

  return useQuery({
    queryKey: adminUsersKeys.all,
    queryFn: () => api.get<{ data: AdminUser[] }>("/admin/users"),
    select: (response) => response.data,
  });
}

/**
 * Fetch single user with subscription details (admin)
 */
export function useAdminUser(userId: string | null) {
  const api = useApiClient();

  return useQuery({
    queryKey: adminUsersKeys.detail(userId ?? ""),
    queryFn: () =>
      api.get<{ data: AdminUserDetail }>(`/admin/users/${userId}`),
    select: (response) => response.data,
    enabled: !!userId,
  });
}

/**
 * Toggle the test user flag
 */
export function useToggleTestUser() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, isTestUser }: { userId: string; isTestUser: boolean }) =>
      api.patch(`/admin/users/${userId}/test`, { isTestUser }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminUsersKeys.all });
    },
  });
}
