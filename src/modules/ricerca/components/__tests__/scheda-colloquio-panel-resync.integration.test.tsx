/**
 * BAZ-187 — the scheda colloquio textareas (6× intervista_* + feedback Baze)
 * are the only panel fields on the DebouncedTextarea (300ms local-draft) path,
 * so they are the only ones that suffer the realtime cursor-jump: while the
 * caret is in the field, a selectionRow echo used to `form.reset` the (still
 * clean) field and swap the value under the cursor.
 *
 * These are regression tests for the panel end-to-end (real DebouncedTextarea,
 * real useAutoSaveForm). TRAP 1: drive the real textarea with fireEvent.change,
 * never form.setValue.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { SchedaColloquioPanel } from "../scheda-colloquio-panel"

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}))

type PanelProps = {
  selectionRow: Record<string, unknown>
  onPatchField: (field: string, value: unknown) => Promise<void> | void
  onGenerateFeedback?: () => Promise<string | null | undefined> | string | null | undefined
}

function panel({ selectionRow, onPatchField, onGenerateFeedback }: PanelProps) {
  return (
    <SchedaColloquioPanel
      selectionRow={selectionRow}
      nonSelezionatoOptions={[]}
      noMatchOptions={[]}
      onPatchField={onPatchField}
      onGenerateFeedback={onGenerateFeedback}
    />
  )
}

// The 6 intervista_* textareas render first (in order), then the feedback Baze
// textarea last — so index 0 is "1. Vanno bene i giorni?".
function textareas(container: HTMLElement) {
  return Array.from(container.querySelectorAll("textarea")) as HTMLTextAreaElement[]
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("SchedaColloquioPanel — realtime resync does not clobber a focused field (BAZ-187)", () => {
  it("keeps the focused intervista textarea while a selectionRow echo arrives, applies it on blur", async () => {
    const onPatchField = vi.fn().mockResolvedValue(undefined)
    const row = {
      id: "sel-1",
      stato_selezione: "da colloquiare",
      intervista_giorni_lavoro: "",
    }

    const { container, rerender } = render(panel({ selectionRow: row, onPatchField }))
    const giorni = textareas(container)[0]

    giorni.focus()
    fireEvent.focus(giorni)
    fireEvent.change(giorni, { target: { value: "sì, i giorni vanno bene" } })

    // Let the 300ms debounce fire so the field is CLEAN but still focused —
    // the exact window keepDirtyValues can't cover (RHF sees it clean).
    await waitFor(() =>
      expect(onPatchField).toHaveBeenCalledWith(
        "intervista_giorni_lavoro",
        "sì, i giorni vanno bene",
      ),
    )

    // Realtime echo: selectionRow arrives with a DIFFERENT giorni value (a peer
    // edit / stale echo) — form.reset would swap the focused field pre-fix.
    rerender(
      panel({
        selectionRow: { ...row, intervista_giorni_lavoro: "valore del server" },
        onPatchField,
      }),
    )

    // Focused → the draft under the caret is preserved.
    expect(textareas(container)[0].value).toBe("sì, i giorni vanno bene")

    // On blur the deferred server value lands.
    fireEvent.blur(textareas(container)[0])
    await waitFor(() =>
      expect(textareas(container)[0].value).toBe("valore del server"),
    )
  })

  it("applies a peer update to a textarea that is NOT focused (clean fields still resync)", () => {
    const row = {
      id: "sel-1",
      stato_selezione: "da colloquiare",
      intervista_distanza: "vicino",
    }
    const { container, rerender } = render(
      panel({ selectionRow: row, onPatchField: vi.fn() }),
    )
    // index 2 = "3. Quanto è distante?" — never focused.
    expect(textareas(container)[2].value).toBe("vicino")

    rerender(
      panel({
        selectionRow: { ...row, intervista_distanza: "lontano, 40 minuti" },
        onPatchField: vi.fn(),
      }),
    )
    expect(textareas(container)[2].value).toBe("lontano, 40 minuti")
  })

  it("still populates the feedback field when 'Genera feedback' returns text", async () => {
    const onGenerateFeedback = vi.fn().mockResolvedValue("Feedback generato dall'AI")
    const { container } = render(
      panel({
        selectionRow: { id: "sel-1", stato_selezione: "selezionato" },
        onPatchField: vi.fn(),
        onGenerateFeedback,
      }),
    )

    fireEvent.click(screen.getByRole("button", { name: /genera/i }))

    await waitFor(() => {
      const feedback = container.querySelector(
        'textarea[placeholder="Scrivi il feedback..."]',
      ) as HTMLTextAreaElement
      expect(feedback.value).toBe("Feedback generato dall'AI")
    })
  })
})
