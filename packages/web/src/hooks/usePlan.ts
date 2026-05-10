import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@/services/apiClient";
import type { Plan, UserPlanData } from "@/types";

export function usePlans() {
  const apiClient = useApiClient();

  return useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const response = await apiClient.get<{ data: Plan[] }>("/plans");
      return response.data;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useUserPlan() {
  const apiClient = useApiClient();

  return useQuery({
    queryKey: ["userPlan"],
    queryFn: async () => {
      const response =
        await apiClient.get<{ data: UserPlanData | null }>("/me/plan");
      return response.data;
    },
    staleTime: 1000 * 30,
  });
}

export function usePlanCheckout() {
  const apiClient = useApiClient();

  return useMutation({
    mutationFn: async (planId: string) => {
      const response = await apiClient.post<{ url: string }>(
        "/plans/checkout-session",
        { planId },
      );
      return response.url;
    },
  });
}

export function useVerifyPlanSession() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) =>
      apiClient.post<{ success: boolean; planId: string }>(
        "/plans/verify-session",
        { sessionId },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userPlan"] });
      queryClient.invalidateQueries({ queryKey: ["creditBalance"] });
    },
  });
}

interface ChangePlanResult {
  type: "upgrade" | "downgrade";
  newPlanId: string;
  newPlanName: string;
  effective: string;
  creditsAdded?: number;
}

export function useChangePlan() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (planId: string) =>
      apiClient.post<ChangePlanResult>("/plans/change-plan", { planId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userPlan"] });
      queryClient.invalidateQueries({ queryKey: ["creditBalance"] });
    },
  });
}

export function useCancelPlan() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => apiClient.post<{ message: string }>("/plans/cancel"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userPlan"] });
    },
  });
}

export function useActivateList() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (listId: string) =>
      apiClient.post<{ success: boolean; listId: string }>(
        `/lists/${listId}/activate`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userPlan"] });
      queryClient.invalidateQueries({ queryKey: ["myLists"] });
      queryClient.invalidateQueries({ queryKey: ["listCatalog"] });
    },
  });
}

interface RequestListChangeParams {
  listId: string;
  action: "add" | "remove" | "swap";
  replaceListId?: string;
}

export function useRequestListChange() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      listId,
      action,
      replaceListId,
    }: RequestListChangeParams) =>
      apiClient.post(`/lists/${listId}/request-change`, {
        action,
        replaceListId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userPlan"] });
    },
  });
}

export function useCancelPendingListChange() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (changeId: string) =>
      apiClient.delete(`/me/pending-list-changes/${changeId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userPlan"] });
    },
  });
}
