/**
 * Test utilities for hook + component tests.
 *
 * - `renderHookWithQueryClient`: wraps `renderHook` with a fresh
 *   QueryClientProvider per test so caches don't bleed across tests.
 * - `renderWithProviders`: same idea for component tests.
 */
import * as React from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, renderHook, type RenderOptions } from "@testing-library/react"

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
        // Keep timing deterministic in tests.
        staleTime: 0,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

function wrapperFactory(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

export function renderHookWithQueryClient<TProps, TResult>(
  callback: (props: TProps) => TResult,
  options?: { initialProps?: TProps; client?: QueryClient }
) {
  const client = options?.client ?? makeQueryClient()
  const { initialProps } = options ?? {}
  const result = renderHook(callback, {
    wrapper: wrapperFactory(client),
    initialProps,
  })
  return { ...result, queryClient: client }
}

export function renderWithProviders(
  ui: React.ReactElement,
  options?: RenderOptions & { client?: QueryClient }
) {
  const client = options?.client ?? makeQueryClient()
  return {
    ...render(ui, { wrapper: wrapperFactory(client), ...options }),
    queryClient: client,
  }
}
