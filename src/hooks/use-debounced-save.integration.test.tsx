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
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderHookWithQueryClient } from "@/test/test-utils"

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}))

vi.mock("@/lib/write-tracking", () => ({
  beginPendingWrite: vi.fn(),
  endPendingWrite: vi.fn(),
}))

import { toast } from "sonner"
import { endPendingWrite } from "@/lib/write-tracking"
import { useDebouncedSave } from "@/hooks/use-debounced-save"
import { DebouncedTextarea } from "@/components/ui/debounced-input"

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

describe("useDebouncedSave — in-flight committedValue resync", () => {
  it("keeps the typed draft while onSave is unresolved, then applies the queued resync", async () => {
    let resolveSave: (() => void) | null = null
    const onSave = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve
        }),
    )

    const { result, rerender } = renderHookWithQueryClient(
      ({ committed }: { committed: string }) =>
        useDebouncedSave<string>(committed, onSave, { debounceMs: 0 }),
      { initialProps: { committed: "server-v1" } },
    )

    act(() => {
      result.current.onChange("typed-draft")
    })

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith("typed-draft")
    })
    expect(result.current.value).toBe("typed-draft")

    // Peer/detail resync arrives while the write is still in flight.
    act(() => {
      rerender({ committed: "server-v2" })
    })
    expect(result.current.value).toBe("typed-draft")

    await act(async () => {
      resolveSave?.()
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(result.current.value).toBe("server-v2")
    })
  })
})

describe("useDebouncedSave — identity switch (gate feedback regression)", () => {
  it("flushes the pending edit to the PREVIOUS record and resets the draft when identity changes", async () => {
    // Each render binds onSave to the current identity, mirroring how the gate
    // views bind the save to the selected worker.
    const saved: Array<{ identity: string; value: string }> = []

    const { result, rerender } = renderHookWithQueryClient(
      ({ committed, identity }: { committed: string; identity: string }) =>
        useDebouncedSave<string>(
          committed,
          async (value) => {
            saved.push({ identity, value })
          },
          // Long debounce so the timer never fires on its own — only the
          // identity-change flush should persist the edit.
          { debounceMs: 5000, identity },
        ),
      { initialProps: { committed: "commento di A", identity: "worker-A" } },
    )

    // Operator types a comment while worker A is selected.
    act(() => {
      result.current.onChange("nuovo commento per A")
    })
    expect(result.current.value).toBe("nuovo commento per A")

    // Operator switches to worker B before the debounce fires.
    act(() => {
      rerender({ committed: "commento di B", identity: "worker-B" })
    })

    // The pending edit is flushed to worker A (not B).
    await waitFor(() => {
      expect(saved).toEqual([{ identity: "worker-A", value: "nuovo commento per A" }])
    })

    // The draft no longer shows A's text: it resets to B's committed value.
    expect(result.current.value).toBe("commento di B")
  })
})

describe("useDebouncedSave — focus-aware resync (BAZ-187)", () => {
  // Renders the real DebouncedTextarea so the hook is driven through its DOM
  // consumer: we exercise focus/blur and assert cursor-preservation as "the
  // value under the caret is not replaced". A committedValue that changes while
  // the field is focused used to call setDraft(committedValue), which swaps the
  // textarea value under the cursor and jumps the caret to the end (BAZ-187).
  //
  // TRAP 1 (false-greens doc): drive a real element with fireEvent.change, never
  // form.setValue. Real timers + waitFor (TRAP 5): the debounce is 0ms here, so
  // waitFor(onSave called) is enough to know the save settled and the field went
  // clean while staying focused — the exact window the guard must cover.
  function Harness({
    committed,
    onSave,
  }: {
    committed: string
    onSave: (value: string) => Promise<void>
  }) {
    return (
      <DebouncedTextarea
        aria-label="nota"
        committedValue={committed}
        onSave={onSave}
        debounceMs={0}
      />
    )
  }

  it("does NOT overwrite a FOCUSED field on a committedValue resync; applies it on blur", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { rerender } = render(<Harness committed="server-v1" onSave={onSave} />)
    const textarea = screen.getByLabelText("nota") as HTMLTextAreaElement

    textarea.focus()
    fireEvent.focus(textarea)
    fireEvent.change(textarea, { target: { value: "sto scrivendo" } })

    // debounce(0) fires and the save settles → the field is CLEAN but still focused.
    await waitFor(() => expect(onSave).toHaveBeenCalledWith("sto scrivendo"))

    // A realtime echo changes the committed value while the caret is in the field.
    rerender(<Harness committed="server-v2" onSave={onSave} />)

    // BUG (pre-fix): the focused draft is clobbered to "server-v2" and the caret
    // jumps. Expected: the in-focus draft survives untouched.
    expect(textarea.value).toBe("sto scrivendo")

    // On blur the deferred committed value lands.
    fireEvent.blur(textarea)
    await waitFor(() => expect(textarea.value).toBe("server-v2"))
  })

  it("still applies a committedValue resync immediately when the field is NOT focused", () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { rerender } = render(<Harness committed="server-v1" onSave={onSave} />)
    const textarea = screen.getByLabelText("nota") as HTMLTextAreaElement

    // No focus: a peer update must land right away — unchanged behavior for the
    // ~133 fields on this hook, and the guard against the fix over-reaching.
    rerender(<Harness committed="server-v2" onSave={onSave} />)
    expect(textarea.value).toBe("server-v2")
  })

  it("does not apply a resync that settles while still focused (applyQueuedCommitted focus guard)", async () => {
    // Covers the SECOND focus guard — the one in applyQueuedCommitted (not the
    // sync effect): focus, type (dirty), let the debounce fire so a save is
    // in-flight, deliver a committedValue resync while the save is unresolved
    // (queued via the savesInFlight branch), then let the save settle WHILE the
    // field is still focused. Its .finally calls applyQueuedCommitted with
    // isDirty=false and savesInFlight=0 — only the isFocusedRef term stops it
    // from setDraft-ing the queued value under the caret. Mutation-verify:
    // removing isFocusedRef from applyQueuedCommitted reds this test.
    let resolveSave: (() => void) | null = null
    const onSave = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve
        }),
    )
    const { rerender } = render(<Harness committed="server-v1" onSave={onSave} />)
    const textarea = screen.getByLabelText("nota") as HTMLTextAreaElement

    textarea.focus()
    fireEvent.focus(textarea)
    fireEvent.change(textarea, { target: { value: "sto scrivendo" } })

    // Save is now in flight (unresolved), field clean + still focused.
    await waitFor(() => expect(onSave).toHaveBeenCalledWith("sto scrivendo"))

    // Resync arrives while the save is in flight → queued.
    rerender(<Harness committed="server-v2" onSave={onSave} />)
    expect(textarea.value).toBe("sto scrivendo")

    // Save settles WHILE STILL FOCUSED → applyQueuedCommitted runs but must
    // early-return on isFocusedRef, not clobber the caret.
    await act(async () => {
      resolveSave?.()
      await Promise.resolve()
    })
    expect(textarea.value).toBe("sto scrivendo")

    // Blur drains the queue.
    fireEvent.blur(textarea)
    await waitFor(() => expect(textarea.value).toBe("server-v2"))
  })
})
