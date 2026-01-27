import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/services/apiClient";
import type { UserSubscription } from "@/types";

interface SubscriptionsResponse {
  data: UserSubscription[];
}

export function useSubscriptions() {
  const apiClient = useApiClient();

  return useQuery({
    queryKey: ["subscriptions"],
    queryFn: async () => {
      const response =
        await apiClient.get<SubscriptionsResponse>("/me/subscriptions");
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useSubscription(listId: string) {
  const { data: subscriptions, ...rest } = useSubscriptions();

  const subscription = subscriptions?.find((s) => s.listId === listId);

  return {
    ...rest,
    data: subscription,
    hasAccess: subscription?.status === "active",
  };
}
