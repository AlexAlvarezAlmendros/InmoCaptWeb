import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Analytics } from '@vercel/analytics/react';
import { AppRouter } from './router';
import { AuthProvider } from './providers/AuthProvider';
import { AnalyticsProvider } from './providers/AnalyticsProvider';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AnalyticsProvider>
            <AppRouter />
          </AnalyticsProvider>
        </AuthProvider>
      </BrowserRouter>
      <Analytics />
    </QueryClientProvider>
  );
}
