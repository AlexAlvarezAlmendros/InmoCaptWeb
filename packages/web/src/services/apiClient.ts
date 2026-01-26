import { useAuth0 } from "@auth0/auth0-react";
import { useCallback, useMemo } from "react";
import { env } from "@/lib/env";

interface ApiClientOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
}

export interface ApiError extends Error {
  status: number;
  code?: string;
}

class ApiClient {
  private baseUrl: string;
  private getAccessToken: () => Promise<string>;
  private onUnauthorized?: () => void;

  constructor(
    baseUrl: string,
    getAccessToken: () => Promise<string>,
    onUnauthorized?: () => void,
  ) {
    this.baseUrl = baseUrl;
    this.getAccessToken = getAccessToken;
    this.onUnauthorized = onUnauthorized;
  }

  async request<T>(
    endpoint: string,
    options: ApiClientOptions = {},
  ): Promise<T> {
    const { method = "GET", body, headers = {} } = options;

    let token: string;
    try {
      token = await this.getAccessToken();
    } catch (error) {
      // If we can't get a token, redirect to login
      if (this.onUnauthorized) {
        this.onUnauthorized();
      }
      throw error;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    // Handle 401 Unauthorized - redirect to login
    if (response.status === 401) {
      if (this.onUnauthorized) {
        this.onUnauthorized();
      }
      const error = new Error(
        "Session expired. Please log in again.",
      ) as ApiError;
      error.status = 401;
      error.code = "UNAUTHORIZED";
      throw error;
    }

    // Handle other errors
    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: "Unknown error" }));
      const error = new Error(
        errorData.message || errorData.error || `Error ${response.status}`,
      ) as ApiError;
      error.status = response.status;
      error.code = errorData.code;
      throw error;
    }

    // Handle empty responses (204 No Content)
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  get<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: "GET" });
  }

  post<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, { method: "POST", body });
  }

  patch<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, { method: "PATCH", body });
  }

  put<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, { method: "PUT", body });
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: "DELETE" });
  }
}

// Hook to use the API client with automatic 401 handling
export function useApiClient() {
  const { getAccessTokenSilently, logout } = useAuth0();

  // Redirect to login on 401
  const handleUnauthorized = useCallback(() => {
    logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    });
  }, [logout]);

  // Memoize the client to avoid recreating on every render
  const client = useMemo(
    () =>
      new ApiClient(env.API_URL, getAccessTokenSilently, handleUnauthorized),
    [getAccessTokenSilently, handleUnauthorized],
  );

  return client;
}
