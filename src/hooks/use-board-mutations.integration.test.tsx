/**
 * Integration tests for the board-mutation wrappers in
 * `use-board-mutations.ts`.
 *
 * Regression coverage for Fix 4 of the trackWrite-bypass audit
 * (docs/audits/audit-save-bypass-trackwrite.md): the wrappers must wrap
 * the user-supplied `mutationFn` in `trackWrite` so the realtime echo of
 * the resulting write is recognised by `useRealtimeBoardSync`'s
 * echo-window suppression, even if the caller's `mutationFn` itself does
 * NOT call a tracked writer (e.g. a future caller using a raw
 * `invokeEdgeFunction` or `supabase.rpc`).
 *
 * What we assert:
 *   1. While the mutation promise is in flight, `getPendingWriteCount()`
 *      reports > 0 (the wrapper has incremented the counter).
 *   2. After the mutation resolves, `getMillisSinceLastLocalWrite()`
 *      returns < 100ms (the wrapper bumped `lastLocalWriteAt` on success).
 *   3. `getPendingWriteCount()` returns 0 after resolution.
 *
 * The `mutationFn` used here calls a vi-mocked, deliberately UNTRACKED
 * async function — so any tracking observed comes from the wrapper, not
 * from the inner call. That is the property the audit fix locks in.
 */
import { act } from "react"
import { QueryClient } from "@tanstack/react-query"
import { waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}))

import { toast } from "sonner"
import { renderHookWithQueryClient } from "@/test/test-utils"
import { usePatchMutation } from "@/hooks/use-board-mutations"
import {
  getMillisSinceLastLocalWrite,
  getPendingWriteCount,
} from "@/lib/anagrafiche-api"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("use-board-mutations: trackWrite coverage", () => {
  it("usePatchMutation wraps the mutationFn in trackWrite", async () => {
    // Manually-resolvable promise so we can observe the in-flight state.
    let resolveInner: (value: { ok: true }) => void = () => {}
    const innerPromise = new Promise<{ ok: true }>((resolve) => {
      resolveInner = resolve
    })

    // Deliberately UNTRACKED: simulates a raw invokeEdgeFunction caller.
    const mutationFn = vi.fn(async () => innerPromise)

    const { result } = renderHookWithQueryClient(() =>
      usePatchMutation<{ id: string }, { ok: true }, unknown>({
        queryKey: ["test-board"],
        mutationFn,
      }),
    )

    expect(getPendingWriteCount()).toBe(0)

    // Kick off the mutation.
    let mutatePromise: Promise<{ ok: true }> | undefined
    act(() => {
      mutatePromise = result.current.mutateAsync({ id: "r1" })
    })

    // Assertion 1: counter > 0 while in flight. React Query schedules the
    // mutationFn invocation through onMutate -> microtasks, so poll until
    // the wrapper has actually incremented the counter (the inner promise
    // is still unresolved at this point, so it won't drop back to 0).
    await waitFor(() => {
      expect(getPendingWriteCount()).toBeGreaterThan(0)
    })
    expect(mutationFn).toHaveBeenCalledTimes(1)

    // Resolve the inner promise and await the full mutation.
    resolveInner({ ok: true })
    await act(async () => {
      await mutatePromise
    })

    // Assertion 2: lastLocalWriteAt was just bumped.
    expect(getMillisSinceLastLocalWrite()).toBeLessThan(100)
    // Assertion 3: counter back to 0.
    expect(getPendingWriteCount()).toBe(0)
  })
})

describe("use-board-mutations: error visibility (FASE 4 TER.2)", () => {
  it("usePatchMutation surfaces a toast.error and rolls the cache back on failure", async () => {
    const queryKey = ["board-error-case"]
    const mutationFn = vi.fn(async () => {
      throw new Error("update rifiutato dal server")
    })

    // Custom client with gcTime: Infinity. The default test client uses
    // gcTime: 0, which garbage-collects seeded data that has no active query
    // observer (this hook is a mutation, not a query) before onMutate can
    // snapshot it. In production the board always has a live useQuery on the
    // key, so the data persists; gcTime: Infinity reproduces that here.
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity },
        mutations: { retry: false },
      },
    })
    // Seed the cache so onMutate has a snapshot to roll back to.
    queryClient.setQueryData(queryKey, { value: "originale" })

    const { result } = renderHookWithQueryClient(
      () =>
        usePatchMutation<{ value: string }, unknown, { value: string }>({
          queryKey,
          mutationFn,
          applyOptimistic: (_previous, variables) => ({ value: variables.value }),
        }),
      { client: queryClient },
    )

    await act(async () => {
      // mutateAsync rejects; swallow so the test continues to the assertions.
      await result.current.mutateAsync({ value: "ottimistico" }).catch(() => {})
    })

    // The failure is visible to the user.
    expect(toast.error).toHaveBeenCalledWith("update rifiutato dal server")
    // The optimistic value was rolled back to the snapshot.
    expect(queryClient.getQueryData(queryKey)).toEqual({ value: "originale" })
  })

  it("uses the custom errorMessage option when provided", async () => {
    const queryKey = ["board-error-custom-msg"]
    const mutationFn = vi.fn(async () => {
      throw new Error("dettaglio tecnico")
    })

    const { result } = renderHookWithQueryClient(() =>
      usePatchMutation<{ value: string }, unknown, { value: string }>({
        queryKey,
        mutationFn,
        errorMessage: "Impossibile salvare la modifica",
      }),
    )

    await act(async () => {
      await result.current.mutateAsync({ value: "x" }).catch(() => {})
    })

    expect(toast.error).toHaveBeenCalledWith("Impossibile salvare la modifica")
  })
})
