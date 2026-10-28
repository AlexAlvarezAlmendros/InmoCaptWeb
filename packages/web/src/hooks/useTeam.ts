import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@/services/apiClient";
import type { TeamData } from "@/types";

export function useTeam() {
  const apiClient = useApiClient();

  return useQuery({
    queryKey: ["team"],
    queryFn: async () => {
      const response = await apiClient.get<{ data: TeamData }>("/team");
      return response.data;
    },
    staleTime: 1000 * 30,
  });
}

/**
 * Joining or leaving a team changes which lists, reveals and notes the user
 * sees, so everything list-related is refetched.
 */
function useInvalidateTeamScope() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ["team"] });
    queryClient.invalidateQueries({ queryKey: ["userPlan"] });
    queryClient.invalidateQueries({ queryKey: ["myLists"] });
    queryClient.invalidateQueries({ queryKey: ["listCatalog"] });
    queryClient.invalidateQueries({ queryKey: ["list"] });
    queryClient.invalidateQueries({ queryKey: ["listProperties"] });
  };
}

export function useInviteToTeam() {
  const apiClient = useApiClient();
  const invalidate = useInvalidateTeamScope();

  return useMutation({
    mutationFn: async (email: string) =>
      apiClient.post<{ data: { id: string; email: string } }>(
        "/team/invitations",
        { email },
      ),
    // The first invitation creates the team, which moves the owner's notes
    onSuccess: invalidate,
  });
}

export function useCancelTeamInvitation() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) =>
      apiClient.delete(`/team/invitations/${invitationId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
    },
  });
}

export function useAcceptTeamInvitation() {
  const apiClient = useApiClient();
  const invalidate = useInvalidateTeamScope();

  return useMutation({
    mutationFn: async (invitationId: string) =>
      apiClient.post<{ success: boolean; teamId: string }>(
        `/team/invitations/${invitationId}/accept`,
      ),
    onSuccess: invalidate,
  });
}

export function useDeclineTeamInvitation() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) =>
      apiClient.post(`/team/invitations/${invitationId}/decline`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
    },
  });
}

export function useRemoveTeamMember() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) =>
      apiClient.delete(`/team/members/${encodeURIComponent(userId)}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
      queryClient.invalidateQueries({ queryKey: ["listProperties"] });
    },
  });
}

export function useLeaveTeam() {
  const apiClient = useApiClient();
  const invalidate = useInvalidateTeamScope();

  return useMutation({
    mutationFn: async () =>
      apiClient.post<{ success: boolean; outcome: "left" | "dissolved" }>(
        "/team/leave",
      ),
    onSuccess: invalidate,
  });
}
