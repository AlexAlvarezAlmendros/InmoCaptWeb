import { useAuth0 } from '@auth0/auth0-react';
import { env } from '@/lib/env';

interface ApiClientOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
}

class ApiClient {
  private baseUrl: string;
  private getAccessToken: () => Promise<string>;

  constructor(baseUrl: string, getAccessToken: () => Promise<string>) {
    this.baseUrl = baseUrl;
    this.getAccessToken = getAccessToken;
  }

  async request<T>(endpoint: string, options: ApiClientOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {} } = options;

    const token = await this.getAccessToken();

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Error desconocido' }));
      throw new Error(error.message || `Error ${response.status}`);
    }

    return response.json();
  }

  get<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  post<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, { method: 'POST', body });
  }

  patch<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, { method: 'PATCH', body });
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// Hook to use the API client
export function useApiClient() {
  const { getAccessTokenSilently } = useAuth0();

  return new ApiClient(env.API_URL, getAccessTokenSilently);
}
