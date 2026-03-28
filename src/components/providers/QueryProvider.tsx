'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

/**
 * TanStack Query Provider
 * 
 * Provides a caching and data-fetching layer to the entire application.
 * Default staleTime is set to 1 minute to prevent excessive refetching while 
 * keeping data reasonably fresh.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false, // Prevents aggressive refetching on tab switch
            retry: 1, // Minimize retry attempts on failure
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
