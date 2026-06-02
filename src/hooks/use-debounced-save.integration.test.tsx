/**
 * Regression tests for `useDebouncedSave` error visibility (FASE 4 TER.3).
 *
 * This hook backs ~133 editable fields across the app. It used to be
 * fire-and-forget (`void onSave(...).finally(...)` with no `.catch`): a
 * rejected save logged to the console and the user kept seeing the typed
 * value as if it had persisted ("salvataggio silenzioso"). The fix added
 * `.catch(notifySaveError)` (→ `toast.error`) on both the debounced path and
 * the flush-on-unmount path.
 *
 * What we assert:
 *   1. A rejecting `onSave` on the debounced path surfaces a `toast.error`.
 *   2. A resolving `onSave` does NOT toast (no false alarms).
 *   3. The cleanup still runs (endPendingWrite) regardless of outcome.
 */
import { act } from "react"
import { waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderHookWithQueryClient } from "@/test/test-utils"

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}))

vi.mock("@/lib/anagrafiche-api", () => ({
  beginPendingWrite: vi.fn(),
  endPendingWrite: vi.fn(),
}))

import { toast } from "sonner"
import { endPendingWrite } from "@/lib/anagrafiche-api"
import { useDebouncedSave } from "@/hooks/use-debounced-save"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("useDebouncedSave — error visibility (FASE 4 TER.3)", () => {
  it("shows a toast.error when the debounced onSave rejects", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("save fallito sul server"))

    const { result } = renderHookWithQueryClient(() =>
      useDebouncedSave<string>("valore-iniziale", onSave, { debounceMs: 0 }),
    )

    act(() => {
      result.current.onChange("valore digitato")
    })

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith("valore digitato")
      expect(toast.error).toHaveBeenCalledWith("save fallito sul server")
    })
    // Cleanup still runs even on failure.
    await waitFor(() => {
      expect(endPendingWrite).toHaveBeenCalled()
    })
  })

  it("does NOT toast when the debounced onSave resolves", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)

    const { result } = renderHookWithQueryClient(() =>
      useDebouncedSave<string>("valore-iniziale", onSave, { debounceMs: 0 }),
    )

    act(() => {
      result.current.onChange("ok")
    })

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith("ok")
    })
    expect(toast.error).not.toHaveBeenCalled()
  })

  it("falls back to a generic message when the error has no message", async () => {
    const onSave = vi.fn().mockRejectedValue("stringa di errore non-Error")

    const { result } = renderHookWithQueryClient(() =>
      useDebouncedSave<string>("x", onSave, { debounceMs: 0 }),
    )

    act(() => {
      result.current.onChange("y")
    })

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Errore durante il salvataggio")
    })
  })
})
