/**
 * Characterization tests for `useAutoSaveForm` (FASE 5 BIS) — U4 / Target A2.
 *
 * This hook is the form-context replacement for the old manual
 * useState+resync pattern (covered by draft-resync-tier2). It bundles three
 * delicate behaviors whose regression reintroduces the realtime stale-field /
 * clobbered-edit bug class:
 *   1. resync-without-clobber: server `defaults` changes resync CLEAN fields but
 *      keep fields the user is editing (`form.reset(defaults, { keepDirtyValues })`);
 *   2. reset-gating keyed on the JSON signature so a content-equal new defaults
 *      object does not re-reset on every render;
 *   3. autosave of changed fields (via useAutoSaveFormFields) with a pause guard,
 *      dirty-tracking, an error toast, and no-save-on-reset.
 *
 * Each test pins the CURRENT behavior and is written to go red if its guard is
 * removed. The save engine only reacts to genuine `type: "change"` watch events,
 * so save-path scenarios drive a registered input with `fireEvent.change` — a
 * bare `setValue` would hit the reset/echo branch and never save (a false green).
 * Only `sonner` is mocked; `onSave` / `isPaused` are injected test doubles. The
 * hook uses no QueryClient, so plain `render` / `renderHook` are intentional here
 * (not the `*WithQueryClient` helpers from test-utils).
 */
import * as React from "react"
import {
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}))

import { toast } from "sonner"
import { useAutoSaveForm } from "@/hooks/use-auto-save-form"

type Values = { a: string; b: string }

function Harness({
  defaults,
  onSave,
  isPaused,
  debounceMs,
}: {
  defaults: Values
  onSave: (patch: Partial<Values>) => Promise<void> | void
  isPaused?: () => boolean
  debounceMs?: number
}) {
  const form = useAutoSaveForm<Values>({ defaults, onSave, isPaused, debounceMs })
  return (
    <form>
      <input aria-label="a" {...form.register("a")} />
      <input aria-label="b" {...form.register("b")} />
    </form>
  )
}

const input = (label: string) => screen.getByLabelText(label) as HTMLInputElement

beforeEach(() => {
  vi.clearAllMocks()
})

describe("useAutoSaveForm — resync without clobber", () => {
  it("resyncs a CLEAN field when the server defaults change", () => {
    const { rerender } = render(
      <Harness defaults={{ a: "1", b: "2" }} onSave={vi.fn()} />,
    )
    expect(input("a").value).toBe("1")

    rerender(<Harness defaults={{ a: "9", b: "2" }} onSave={vi.fn()} />)
    expect(input("a").value).toBe("9")
  })

  it("KEEPS a field the user is editing when the server defaults change (keepDirtyValues)", () => {
    // Huge debounce so the user's edit never auto-saves during the assertions —
    // this test is about resync, not save.
    const { rerender } = render(
      <Harness defaults={{ a: "1", b: "2" }} onSave={vi.fn()} debounceMs={1_000_000} />,
    )

    // User edits field a → a is now dirty.
    fireEvent.change(input("a"), { target: { value: "draft" } })

    // Server pushes a change to the sibling field b (realtime resync).
    rerender(
      <Harness defaults={{ a: "1", b: "99" }} onSave={vi.fn()} debounceMs={1_000_000} />,
    )

    // The dirty field survives; the clean field updates. Red if keepDirtyValues
    // is dropped (a would snap back to "1").
    expect(input("a").value).toBe("draft")
    expect(input("b").value).toBe("99")
  })
})

describe("useAutoSaveForm — reset gating (no churn)", () => {
  it("does not reset when a new defaults object has equal content", () => {
    const { result, rerender } = renderHook(
      ({ defaults }: { defaults: Values }) =>
        useAutoSaveForm<Values>({ defaults, onSave: vi.fn() }),
      { initialProps: { defaults: { a: "1", b: "2" } } },
    )
    // Spy after the initial mount-time reset; count only subsequent resets.
    const resetSpy = vi.spyOn(result.current, "reset")

    // New object, identical content → JSON signature unchanged → no reset.
    rerender({ defaults: { a: "1", b: "2" } })
    expect(resetSpy).not.toHaveBeenCalled()

    // Changed content → signature changes → reset runs exactly once. Red if the
    // effect dep were [defaults] instead of [signature].
    rerender({ defaults: { a: "9", b: "2" } })
    expect(resetSpy).toHaveBeenCalledTimes(1)
  })
})

describe("useAutoSaveForm — autosave", () => {
  it("saves only the changed field after the debounce", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<Harness defaults={{ a: "1", b: "2" }} onSave={onSave} debounceMs={0} />)

    fireEvent.change(input("a"), { target: { value: "edited" } })

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    expect(onSave).toHaveBeenCalledWith({ a: "edited" })
  })

  it("defers the save while isPaused() is true, then saves once it returns false", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    let paused = true
    render(
      <Harness
        defaults={{ a: "1", b: "2" }}
        onSave={onSave}
        isPaused={() => paused}
        debounceMs={0}
      />,
    )

    fireEvent.change(input("a"), { target: { value: "edited" } })

    // The flush sees isPaused() and reschedules (debounceMs || 150 = 150ms). 60ms
    // is above the 0ms debounce (so the first flush HAS run and chose to defer)
    // and below the 150ms reschedule (so a working guard hasn't saved yet). Sound
    // only while that reschedule stays comfortably above 60ms.
    await new Promise((r) => setTimeout(r, 60))
    expect(onSave).not.toHaveBeenCalled()

    // Unpause → the next reschedule tick fires the save.
    paused = false
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ a: "edited" }))
  })

  it("does NOT save a value that returns to the committed value (dirty-tracking)", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<Harness defaults={{ a: "1", b: "2" }} onSave={onSave} debounceMs={0} />)

    // Type away from the committed value, then back to it before the debounce.
    fireEvent.change(input("a"), { target: { value: "1x" } })
    fireEvent.change(input("a"), { target: { value: "1" } })

    // 40ms: past the 0ms debounce settle, under the 150ms isPaused reschedule —
    // a broken guard would have called onSave by now.
    await new Promise((r) => setTimeout(r, 40))
    expect(onSave).not.toHaveBeenCalled()
  })

  it("does NOT save when the change comes from a programmatic reset (realtime resync)", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { rerender } = render(
      <Harness defaults={{ a: "1", b: "2" }} onSave={onSave} debounceMs={0} />,
    )

    // Pure server resync, no user edit → must not trigger a save.
    rerender(<Harness defaults={{ a: "1", b: "77" }} onSave={onSave} debounceMs={0} />)

    // 40ms: past the 0ms debounce settle, under the 150ms isPaused reschedule —
    // a broken guard would have called onSave by now.
    await new Promise((r) => setTimeout(r, 40))
    expect(onSave).not.toHaveBeenCalled()
  })

  it("surfaces a toast.error when the save rejects", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("save fallito sul server"))
    render(<Harness defaults={{ a: "1", b: "2" }} onSave={onSave} debounceMs={0} />)

    fireEvent.change(input("a"), { target: { value: "edited" } })

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("save fallito sul server"),
    )

    // A failed save does not advance the committed snapshot: a follow-up edit is
    // still dirty and retries the save (the field isn't silently shown as saved).
    fireEvent.change(input("a"), { target: { value: "edited2" } })
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ a: "edited2" }))
  })
})
