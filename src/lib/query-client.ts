import { QueryClient } from "@tanstack/react-query"

/**
 * App-wide React Query client.
 *
 * Defaults are tuned for a Realtime-driven app: the cache is the source of
 * truth, and queries are invalidated only by mutations or Realtime events —
 * never by polling, window focus, or reconnect. This avoids redundant refetches
 * and lets local optimistic updates / debounced inputs work without races.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache is invalidated explicitly via Realtime / mutation success;
      // there's no point auto-refetching.
      staleTime: Infinity,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
})
