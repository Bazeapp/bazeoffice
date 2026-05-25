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
import { waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { renderHookWithQueryClient } from "@/test/test-utils"
import { usePatchMutation } from "@/hooks/use-board-mutations"
import {
  getMillisSinceLastLocalWrite,
  getPendingWriteCount,
} from "@/lib/anagrafiche-api"

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
