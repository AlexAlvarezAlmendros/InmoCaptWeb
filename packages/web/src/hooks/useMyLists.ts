import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/services/apiClient";

export interface MyListCard {
  id: string;
  name: string;
  location: string;
  totalProperties: number;
  newPropertiesCount: number;
  lastUpdatedAt: string;
}

export interface CatalogList {
  id: string;
  name: string;
  location: string;
  totalProperties: number;
  lastUpdatedAt: string | null;
}

export function useMyLists() {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: ["myLists"],
    queryFn: async () => {
      const response = await apiClient.get<{ data: MyListCard[] }>("/me/lists");
      return response.data;
    },
    staleTime: 1000 * 30,
  });
}

export function useListCatalog() {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: ["listCatalog"],
    queryFn: async () => {
      const response = await apiClient.get<{ data: CatalogList[] }>(
        "/lists/catalog",
      );
      return response.data;
    },
    staleTime: 1000 * 60,
  });
}
