import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@/services/apiClient";

export interface AvailableList {
  id: string;
  name: string;
  location: string;
  priceCents: number;
  currency: string;
  totalProperties: number;
  lastUpdatedAt: string | null;
}

interface AvailableListsResponse {
  data: AvailableList[];
}

export function useAvailableLists() {
  const apiClient = useApiClient();

  return useQuery({
    queryKey: ["availableLists"],
    queryFn: async () => {
      const response =
        await apiClient.get<AvailableListsResponse>("/lists/available");
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: "always", // Always refetch when user returns from Stripe portal
  });
}

interface CheckoutSessionResponse {
  url: string;
}

export function useCreateCheckoutSession() {
  const apiClient = useApiClient();

  return useMutation({
    mutationFn: async ({ listId }: { listId: string }) => {
      const response = await apiClient.post<CheckoutSessionResponse>(
        "/billing/checkout-session",
        { listId },
      );
      return response;
    },
    onSuccess: (data) => {
      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }
    },
  });
}

interface PortalSessionResponse {
  url: string;
}

export function useCreatePortalSession() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post<PortalSessionResponse>(
        "/billing/portal-session",
      );
      return response;
    },
    onSuccess: (data) => {
      // Invalidate subscriptions when returning from portal
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["availableLists"] });
      // Redirect to Stripe Portal
      if (data.url) {
        window.location.href = data.url;
      }
    },
  });
}

export function useCancelSubscription() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ subscriptionId }: { subscriptionId: string }) => {
      const response = await apiClient.post<{ message: string }>(
        "/billing/cancel-subscription",
        { subscriptionId },
      );
      return response;
    },
    onSuccess: () => {
      // Invalidate subscriptions to refresh the list
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["availableLists"] });
    },
  });
}

export function useVerifyCheckoutSession() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId }: { sessionId: string }) => {
      const response = await apiClient.post<{
        success: boolean;
        listId: string;
      }>("/billing/verify-session", { sessionId });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["availableLists"] });
    },
  });
}
