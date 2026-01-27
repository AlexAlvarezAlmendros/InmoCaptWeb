import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@/services/apiClient";

export interface UserProfile {
  id: string;
  email: string;
  emailNotificationsOn: boolean;
  createdAt: string;
}

interface UserPreferences {
  emailNotificationsOn?: boolean;
}

export function useUserProfile() {
  const apiClient = useApiClient();

  return useQuery({
    queryKey: ["userProfile"],
    queryFn: async () => {
      return apiClient.get<UserProfile>("/me");
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

export function useUpdatePreferences() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (preferences: UserPreferences) => {
      const response = await apiClient.patch<{
        message: string;
        data: UserPreferences;
      }>("/me/preferences", preferences);
      return response;
    },
    onSuccess: () => {
      // Invalidate user profile to refetch
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
    },
  });
}
