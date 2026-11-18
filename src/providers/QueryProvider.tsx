'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes fresh data
            gcTime: 15 * 60 * 1000, // 15 minutes garbage collection
            refetchOnWindowFocus: false,
            // Slow / dropped connections get up to 2 retries with backoff; a 4xx
            // (not found, forbidden, bad request) won't change on retry, so fail fast.
            retry: (failureCount, error: any) => {
              const status = error?.response?.status;
              if (status && status >= 400 && status < 500) return false;
              return failureCount < 2;
            },
            retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
