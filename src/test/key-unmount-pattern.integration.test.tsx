/**
 * Pattern-level integration test.
 *
 * Guards against a class of bugs where a detail panel keeps stale local
 * draft state across record switches. When the wrapper is keyed by
 * `selectedId`, React unmounts/remounts on id change and local state
 * resets — preventing a debounced save from firing against the new id
 * with the previous record's draft.
 *
 * The fix pattern:
 *
 *   <DetailWrapper key={selectedId ?? "__empty__"}>
 *     <Form initialValue={...} />
 *   </DetailWrapper>
 */
import * as React from "react"
import { describe, it, expect, vi } from "vitest"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { renderWithProviders } from "./test-utils"

// ---- Inline fixture components --------------------------------------------

type DraftInputProps = {
  initialValue: string
  onSave: (draft: string) => void
}

/**
 * Mimics a "real" form input that holds its own local draft.
 * Reproduces the canonical React gotcha: a changed `initialValue` prop
 * does NOT reset the internal useState — useState only reads its
 * initializer on mount.
 */
function DraftInput({ initialValue, onSave }: DraftInputProps) {
  const [draft, setDraft] = React.useState(initialValue)
  return (
    <div>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
      />
      <button type="button" onClick={() => onSave(draft)}>
        save
      </button>
    </div>
  )
}

type DetailWrapperProps = {
  selectedId: string | null
  initialValue: string
  onSave: (draft: string) => void
  useKey?: "none" | "id" | "id-or-empty"
}

function DetailWrapper({
  selectedId,
  initialValue,
  onSave,
  useKey = "none",
}: DetailWrapperProps) {
  const inner = (
    <DraftInput initialValue={initialValue} onSave={onSave} />
  )

  if (useKey === "id") {
    // NOTE: when selectedId is null this collapses to key={undefined},
    // which is the same as no key — only used in test case 2 where
    // selectedId is always a string.
    return <div key={selectedId ?? undefined}>{inner}</div>
  }

  if (useKey === "id-or-empty") {
    return <div key={selectedId ?? "__empty__"}>{inner}</div>
  }

  return <div>{inner}</div>
}

// ---- Tests -----------------------------------------------------------------

describe("key= on a detail wrapper forces unmount on selectedId change", () => {
  it("WITHOUT key=: local draft leaks across record switches (the bug)", async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    const { rerender } = renderWithProviders(
      <DetailWrapper
        selectedId="A"
        initialValue="Alice"
        onSave={onSave}
        useKey="none"
      />
    )

    const input = screen.getByRole("textbox") as HTMLInputElement
    expect(input.value).toBe("Alice")

    await user.clear(input)
    await user.type(input, "Alice 2")
    expect(input.value).toBe("Alice 2")

    // Switch to record B. No key= → React reconciles the same DraftInput
    // instance, so its useState is NOT reinitialized.
    rerender(
      <DetailWrapper
        selectedId="B"
        initialValue="Bob"
        onSave={onSave}
        useKey="none"
      />
    )

    const inputAfter = screen.getByRole("textbox") as HTMLInputElement
    // BUG: the input still shows the previous record's draft.
    expect(inputAfter.value).toBe("Alice 2")

    await user.click(screen.getByRole("button", { name: /save/i }))
    // BUG: save would fire "Alice 2" against the new context (B).
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave).toHaveBeenCalledWith("Alice 2")
  })

  it("WITH key={selectedId}: switching records remounts and resets local state", async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    const { rerender } = renderWithProviders(
      <DetailWrapper
        selectedId="A"
        initialValue="Alice"
        onSave={onSave}
        useKey="id"
      />
    )

    const input = screen.getByRole("textbox") as HTMLInputElement
    await user.clear(input)
    await user.type(input, "Alice 2")
    expect(input.value).toBe("Alice 2")

    rerender(
      <DetailWrapper
        selectedId="B"
        initialValue="Bob"
        onSave={onSave}
        useKey="id"
      />
    )

    // Fresh mount — initialValue is read again from useState's initializer.
    const inputAfter = screen.getByRole("textbox") as HTMLInputElement
    expect(inputAfter.value).toBe("Bob")

    await user.click(screen.getByRole("button", { name: /save/i }))
    expect(onSave).toHaveBeenCalledWith("Bob")
  })

  it("WITH key={selectedId ?? '__empty__'}: null <-> id transitions also remount", async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    const { rerender } = renderWithProviders(
      <DetailWrapper
        selectedId={null}
        initialValue=""
        onSave={onSave}
        useKey="id-or-empty"
      />
    )

    const input = screen.getByRole("textbox") as HTMLInputElement
    expect(input.value).toBe("")
    await user.type(input, "leaked draft")
    expect(input.value).toBe("leaked draft")

    // null -> "A": key changes from "__empty__" to "A", remount.
    rerender(
      <DetailWrapper
        selectedId="A"
        initialValue="Alice"
        onSave={onSave}
        useKey="id-or-empty"
      />
    )

    let inputAfter = screen.getByRole("textbox") as HTMLInputElement
    expect(inputAfter.value).toBe("Alice")

    await user.clear(inputAfter)
    await user.type(inputAfter, "Alice edited")

    // "A" -> null: key changes from "A" to "__empty__", remount again.
    rerender(
      <DetailWrapper
        selectedId={null}
        initialValue=""
        onSave={onSave}
        useKey="id-or-empty"
      />
    )

    inputAfter = screen.getByRole("textbox") as HTMLInputElement
    expect(inputAfter.value).toBe("")
  })

  it("WITHOUT key= AND same selectedId: changed initialValue does NOT reset local draft (this is why the key pattern is needed)", async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    const { rerender } = renderWithProviders(
      <DetailWrapper
        selectedId="A"
        initialValue="Alice"
        onSave={onSave}
        useKey="none"
      />
    )

    const input = screen.getByRole("textbox") as HTMLInputElement
    await user.clear(input)
    await user.type(input, "Alice draft")
    expect(input.value).toBe("Alice draft")

    // Same id, but parent passes a new initialValue (e.g. a refetch
    // returned updated server data for the SAME record).
    rerender(
      <DetailWrapper
        selectedId="A"
        initialValue="Alice from server"
        onSave={onSave}
        useKey="none"
      />
    )

    const inputAfter = screen.getByRole("textbox") as HTMLInputElement
    // useState ignores the new initializer — draft is preserved.
    // This is the documented React behavior the key= pattern works around.
    expect(inputAfter.value).toBe("Alice draft")
  })
})
