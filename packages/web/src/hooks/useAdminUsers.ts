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
    queryFn: () => api.get<{ data: AdminUserDetail }>(`/admin/users/${userId}`),
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
    mutationFn: ({
      userId,
      isTestUser,
    }: {
      userId: string;
      isTestUser: boolean;
    }) => api.patch(`/admin/users/${userId}/test`, { isTestUser }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminUsersKeys.all });
    },
  });
}

/**
 * Block or unblock a user's access to the site
 */
export function useToggleUserBlocked() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, blocked }: { userId: string; blocked: boolean }) =>
      api.patch(`/admin/users/${userId}/block`, { blocked }),
    onSuccess: (_data, { userId }) => {
      queryClient.invalidateQueries({ queryKey: adminUsersKeys.all });
      queryClient.invalidateQueries({
        queryKey: adminUsersKeys.detail(userId),
      });
    },
  });
}

/**
 * Permanently delete a user and all their data
 */
export function useDeleteUser() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => api.delete(`/admin/users/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminUsersKeys.all });
    },
  });
}

/**
 * Grant credits to a user (admin gift / manual adjustment)
 */
export function useGrantCredits() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      amount,
      note,
    }: {
      userId: string;
      amount: number;
      note?: string;
    }) => api.post(`/admin/users/${userId}/credits`, { amount, note }),
    onSuccess: (_data, { userId }) => {
      queryClient.invalidateQueries({ queryKey: adminUsersKeys.all });
      queryClient.invalidateQueries({
        queryKey: adminUsersKeys.detail(userId),
      });
    },
  });
}
