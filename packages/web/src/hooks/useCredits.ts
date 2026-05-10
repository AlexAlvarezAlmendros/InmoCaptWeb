import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@/services/apiClient";
import type {
  CreditBalance,
  CreditPack,
  CreditTransaction,
} from "@/types";

export function useCreditBalance() {
  const apiClient = useApiClient();

  return useQuery({
    queryKey: ["creditBalance"],
    queryFn: async () => {
      const response =
        await apiClient.get<{ data: CreditBalance }>("/credits/balance");
      return response.data;
    },
    staleTime: 1000 * 15,
  });
}

export function useCreditPacks() {
  const apiClient = useApiClient();

  return useQuery({
    queryKey: ["creditPacks"],
    queryFn: async () => {
      const response =
        await apiClient.get<{ data: CreditPack[] }>("/credits/packs");
      return response.data;
    },
    staleTime: 1000 * 60 * 10,
  });
}

export function useCreditTransactions(limit = 50) {
  const apiClient = useApiClient();

  return useQuery({
    queryKey: ["creditTransactions", limit],
    queryFn: async () => {
      const response = await apiClient.get<{ data: CreditTransaction[] }>(
        `/credits/transactions?limit=${limit}`,
      );
      return response.data;
    },
    staleTime: 1000 * 30,
  });
}

export function usePackCheckout() {
  const apiClient = useApiClient();

  return useMutation({
    mutationFn: async (packId: string) => {
      const response = await apiClient.post<{ url: string }>(
        "/credits/checkout-session",
        { packId },
      );
      return response.url;
    },
  });
}

export function useVerifyPackSession() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) =>
      apiClient.post<{ success: boolean; packId: string; credits: number }>(
        "/credits/verify-session",
        { sessionId },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["creditBalance"] });
      queryClient.invalidateQueries({ queryKey: ["creditTransactions"] });
      queryClient.invalidateQueries({ queryKey: ["userPlan"] });
    },
  });
}
