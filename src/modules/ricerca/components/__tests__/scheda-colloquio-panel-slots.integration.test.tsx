/**
 * Slot disponibilità colloquio: date+time are split fields that compose into
 * one timestamp. An incomplete half must stay dirty across selectionRow resync
 * (realtime), then persist when the sibling arrives.
 */
import { fireEvent, render, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { SchedaColloquioPanel } from "../scheda-colloquio-panel"

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}))

function renderPanel(
  selectionRow: Record<string, unknown>,
  onPatchField: (field: string, value: unknown) => Promise<void> | void,
) {
  return render(
    <SchedaColloquioPanel
      selectionRow={selectionRow}
      nonSelezionatoOptions={[]}
      noMatchOptions={[]}
      onPatchField={onPatchField}
    />,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("SchedaColloquioPanel — slot disponibilità save", () => {
  it("keeps an incomplete date half across selectionRow resync, then saves when time is set", async () => {
    const onPatchField = vi.fn().mockResolvedValue(undefined)
    const emptyRow = { id: "sel-1", stato_selezione: "da colloquiare" }

    const { container, rerender } = renderPanel(emptyRow, onPatchField)

    const inizioDate = container.querySelector(
      'input[type="date"]',
    ) as HTMLInputElement
    const inizioTime = container.querySelector(
      'input[type="time"]',
    ) as HTMLInputElement
    expect(inizioDate).toBeTruthy()
    expect(inizioTime).toBeTruthy()

    fireEvent.change(inizioDate, { target: { value: "2026-07-30" } })

    // Incomplete half must not hit the DB.
    await new Promise((r) => setTimeout(r, 40))
    expect(onPatchField).not.toHaveBeenCalled()

    // Peer/realtime selectionRow echo with still-empty slots.
    rerender(
      <SchedaColloquioPanel
        selectionRow={{ ...emptyRow, motivo_no_match: null }}
        nonSelezionatoOptions={[]}
        noMatchOptions={[]}
        onPatchField={onPatchField}
      />,
    )

    const dateAfterResync = container.querySelector(
      'input[type="date"]',
    ) as HTMLInputElement
    const timeAfterResync = container.querySelector(
      'input[type="time"]',
    ) as HTMLInputElement
    expect(dateAfterResync.value).toBe("2026-07-30")

    fireEvent.change(timeAfterResync, { target: { value: "16:30" } })

    await waitFor(() => {
      expect(onPatchField).toHaveBeenCalledWith(
        "disponibilita_colloquio_lavoratore_slot1_inizio",
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      )
    })
  })
})
