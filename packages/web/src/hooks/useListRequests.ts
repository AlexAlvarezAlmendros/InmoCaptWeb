import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@/services/apiClient";

export interface ListRequest {
  id: string;
  location: string;
  notes: string | null;
  status: "pending" | "approved" | "rejected";
  createdListId: string | null;
  createdAt: string;
}

interface ListRequestsResponse {
  data: ListRequest[];
}

interface CreateListRequestResponse {
  message: string;
  data: ListRequest;
}

export function useListRequests() {
  const apiClient = useApiClient();

  return useQuery({
    queryKey: ["listRequests"],
    queryFn: async () => {
      const response =
        await apiClient.get<ListRequestsResponse>("/list-requests");
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useCreateListRequest() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      location,
      notes,
    }: {
      location: string;
      notes?: string;
    }) => {
      const response = await apiClient.post<CreateListRequestResponse>(
        "/list-requests",
        { location, notes },
      );
      return response.data;
    },
    onSuccess: () => {
      // Invalidate list requests to refetch
      queryClient.invalidateQueries({ queryKey: ["listRequests"] });
    },
  });
}
