/**
 * BAZ-192 — the ricerca detail sidebar family telefono/email fields autosave on
 * every ~300ms typing pause. A mid-typing invalid intermediate used to be sent,
 * rejected 400, and then destructively rolled back (card reverted + edit lost +
 * the whole view flipped to the shared "Errore caricamento…" banner).
 *
 * These are end-to-end regression tests through the REAL autosave path
 * (FieldInput → DebouncedInput 300ms → useAutoSaveForm → onSave → updateRecord)
 * plus the real inline-error wiring. TRAP 1: drive the real input with
 * fireEvent.change, never form.setValue (a hook-level setValue skips the
 * DebouncedInput layer and gives a false green — see BAZ-187).
 * TRAP 5: real timers + waitFor (the 300ms debounce is wall-clock).
 */
import { act, fireEvent, render, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { Form } from "@/components/ui/form"
import type { RealtimeRowEvent } from "@/hooks/use-realtime-rows"

import type { RicercaDetailCardData } from "../../lib/ricerca-detail-view.types"
import { useRicercaDetailView } from "../../hooks/use-ricerca-detail-view"
import { RicercaDetailEditableTextField } from "../ricerca-detail-view-shared"

const {
  mockLoadRicercaDetailCard,
  mockUseRealtimeBoardSync,
  mockUseRicercaWorkersPipeline,
  mockUpdateRecord,
  mockCreateRecord,
} = vi.hoisted(() => ({
  mockLoadRicercaDetailCard: vi.fn(),
  mockUseRealtimeBoardSync: vi.fn(),
  mockUseRicercaWorkersPipeline: vi.fn(),
  mockUpdateRecord: vi.fn(),
  mockCreateRecord: vi.fn(),
}))

vi.mock("../../lib/ricerca-detail-view.mappers", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../lib/ricerca-detail-view.mappers")>()
  return {
    ...actual,
    loadRicercaDetailCard: (...args: unknown[]) => mockLoadRicercaDetailCard(...args),
  }
})

vi.mock("@/lib/record-crud", () => ({
  updateRecord: (...args: unknown[]) => mockUpdateRecord(...args),
  createRecord: (...args: unknown[]) => mockCreateRecord(...args),
}))

vi.mock("@/hooks/use-realtime-board-sync", () => ({
  useRealtimeBoardSync: (...args: unknown[]) => mockUseRealtimeBoardSync(...args),
}))

vi.mock("../../hooks/use-ricerca-workers-pipeline", () => ({
  useRicercaWorkersPipeline: (...args: unknown[]) =>
    mockUseRicercaWorkersPipeline(...args),
}))

vi.mock("@/hooks/use-operatori-options", () => ({
  useOperatoriOptions: () => ({ options: [], loading: false }),
}))

vi.mock("@/hooks/use-provincie", () => ({
  useProvincieOptions: () => [],
}))

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), loading: vi.fn(), dismiss: vi.fn() },
}))

function makeCard(
  overrides: Partial<RicercaDetailCardData> = {},
): RicercaDetailCardData {
  return {
    id: "proc-1",
    famigliaId: "fam-1",
    nomeFamiglia: "Rossi",
    telefono: "+393331112233",
    email: "old@example.com",
    statoRes: "in_corso",
    indirizzoId: "addr-1",
    indirizzoVia: "Via Locale",
    ...overrides,
  } as RicercaDetailCardData
}

// Light harness: the real hook + real Form provider + the two family fields in
// editing mode, wired exactly as the sidebar summary wires them (error prop from
// summary.familyFieldErrors). A stand-in for the shared "Errore caricamento…"
// banner reads the same asyncState.error the real view renders.
function Harness({ processId = "proc-1" }: { processId?: string }) {
  const detail = useRicercaDetailView({ processId, onBack: vi.fn() })
  return (
    <Form {...detail.form}>
      {detail.asyncState.error ? (
        <div data-testid="view-error">{detail.asyncState.error}</div>
      ) : null}
      <div data-testid="telefono-field">
        <RicercaDetailEditableTextField
          label="Telefono"
          name="telefono"
          value={detail.card?.telefono}
          editing
          error={detail.summary.familyFieldErrors?.telefono}
        />
      </div>
      <div data-testid="email-field">
        <RicercaDetailEditableTextField
          label="Email"
          name="email"
          value={detail.card?.email}
          editing
          error={detail.summary.familyFieldErrors?.email}
        />
      </div>
    </Form>
  )
}

function getSyncOptions() {
  return mockUseRealtimeBoardSync.mock.calls.at(-1)?.[0] as {
    reloadOpenDetail: () => void
    shouldReloadOpenDetail: (event: RealtimeRowEvent) => boolean
  }
}

async function renderHarness() {
  const utils = render(<Harness />)
  const telefono = () =>
    within(utils.getByTestId("telefono-field")).getByRole("textbox") as HTMLInputElement
  const email = () =>
    within(utils.getByTestId("email-field")).getByRole("textbox") as HTMLInputElement
  await waitFor(() => expect(telefono().value).toBe("+393331112233"))
  return { ...utils, telefono, email }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUseRealtimeBoardSync.mockImplementation(() => undefined)
  mockUseRicercaWorkersPipeline.mockReturnValue({
    columns: [],
    loading: false,
    error: null,
    refresh: vi.fn(),
    moveCard: vi.fn(),
  })
  mockLoadRicercaDetailCard.mockResolvedValue({
    card: makeCard(),
    lookupOptionsByField: {},
  })
  mockUpdateRecord.mockResolvedValue({ table: "famiglie", id: "fam-1", row: {} })
  mockCreateRecord.mockResolvedValue({ row: { id: "addr-1" } })
})

describe("ricerca detail sidebar — family telefono/email non-destructive autosave (BAZ-192)", () => {
  it("does not send an invalid intermediate, shows an inline error, keeps the draft, no view banner", async () => {
    // The backend would 400 an invalid telefono; prove we never even reach it.
    mockUpdateRecord.mockRejectedValue(new Error("Invalid famiglia telefono"))

    const { telefono, queryByTestId, getByText } = await renderHarness()

    fireEvent.focus(telefono())
    fireEvent.change(telefono(), { target: { value: "+3938" } })

    // Wait for the autosave flush to run and mark the field invalid inline.
    await waitFor(() => expect(getByText(/telefono non valido/i)).toBeTruthy())

    // Never sent the invalid intermediate.
    expect(mockUpdateRecord).not.toHaveBeenCalled()
    // The typed draft is preserved (not reverted), even after blur.
    fireEvent.blur(telefono())
    await waitFor(() => expect(telefono().value).toBe("+3938"))
    // No full-view "Errore caricamento…" banner for a single-field issue.
    expect(queryByTestId("view-error")).toBeNull()
  })

  it("sends a corrected valid number and clears the inline error", async () => {
    const { telefono, queryByText } = await renderHarness()

    fireEvent.focus(telefono())
    fireEvent.change(telefono(), { target: { value: "+393401234567" } })

    await waitFor(() =>
      expect(mockUpdateRecord).toHaveBeenCalledWith(
        "famiglie",
        "fam-1",
        expect.objectContaining({ telefono: "+393401234567" }),
      ),
    )
    expect(queryByText(/telefono non valido/i)).toBeNull()
  })

  it("treats a malformed email as invalid: not sent, inline error", async () => {
    const { email, getByText } = await renderHarness()

    fireEvent.focus(email())
    fireEvent.change(email(), { target: { value: "broken@nope" } })

    await waitFor(() => expect(getByText(/email non valida/i)).toBeTruthy())
    expect(mockUpdateRecord).not.toHaveBeenCalled()
  })

  it("treats an emptied telefono as invalid (mirrors backend), not sent", async () => {
    const { telefono, getByText } = await renderHarness()

    fireEvent.focus(telefono())
    fireEvent.change(telefono(), { target: { value: "" } })

    await waitFor(() => expect(getByText(/telefono è obbligatorio/i)).toBeTruthy())
    expect(mockUpdateRecord).not.toHaveBeenCalled()
  })

  it("on a server 400 for a client-valid value, keeps the text + inline error, no banner", async () => {
    mockUpdateRecord.mockRejectedValue(new Error("Invalid famiglia telefono"))

    const { telefono, queryByTestId, getByText } = await renderHarness()

    fireEvent.focus(telefono())
    fireEvent.change(telefono(), { target: { value: "+393401234567" } })

    await waitFor(() =>
      expect(mockUpdateRecord).toHaveBeenCalledWith(
        "famiglie",
        "fam-1",
        expect.objectContaining({ telefono: "+393401234567" }),
      ),
    )
    // Text preserved, an inline error is shown, no full-view banner.
    await waitFor(() => expect(getByText(/impossibile salvare|non valido/i)).toBeTruthy())
    fireEvent.blur(telefono())
    await waitFor(() => expect(telefono().value).toBe("+393401234567"))
    expect(queryByTestId("view-error")).toBeNull()
  })

  it("preserves the invalid draft across a defaults resync (skippedKeys keeps it dirty)", async () => {
    const { telefono, getByText } = await renderHarness()

    fireEvent.focus(telefono())
    fireEvent.change(telefono(), { target: { value: "+3938" } })
    await waitFor(() => expect(getByText(/telefono non valido/i)).toBeTruthy())
    // Blur FIRST: with the caret gone, the BAZ-187 focus guard is out of the
    // picture, so only skippedKeys (keepDirtyValues) can protect the draft here.
    fireEvent.blur(telefono())

    // A silent realtime reload brings a different server value for the card.
    mockLoadRicercaDetailCard.mockResolvedValue({
      card: makeCard({ telefono: "+390000000000", indirizzoVia: "Via Remota" }),
      lookupOptionsByField: {},
    })
    await act(async () => {
      getSyncOptions().reloadOpenDetail()
    })

    // The in-progress invalid draft is NOT clobbered by the resync.
    await waitFor(() => expect(telefono().value).toBe("+3938"))
    // And it stays put (no late resync flip once microtasks settle).
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(telefono().value).toBe("+3938")
  })

  it("clears the inline error once an invalid value is corrected to a valid one", async () => {
    const { telefono, getByText, queryByText } = await renderHarness()

    fireEvent.focus(telefono())
    fireEvent.change(telefono(), { target: { value: "+3938" } })
    await waitFor(() => expect(getByText(/telefono non valido/i)).toBeTruthy())

    fireEvent.change(telefono(), { target: { value: "+393401234567" } })
    await waitFor(() =>
      expect(mockUpdateRecord).toHaveBeenCalledWith(
        "famiglie",
        "fam-1",
        expect.objectContaining({ telefono: "+393401234567" }),
      ),
    )
    expect(queryByText(/telefono non valido/i)).toBeNull()
  })

  it("clears the inline error when the field is reverted to its committed value (no flush)", async () => {
    // Regression for the review finding: reverting to the exact committed value
    // does not trigger an autosave flush (valuesEqual short-circuits), so the
    // error must be cleared live, not only inside onSave.
    const { telefono, getByText, queryByText } = await renderHarness()

    fireEvent.focus(telefono())
    fireEvent.change(telefono(), { target: { value: "+3938" } })
    await waitFor(() => expect(getByText(/telefono non valido/i)).toBeTruthy())

    // Revert to the original committed value — no flush happens here.
    fireEvent.change(telefono(), { target: { value: "+393331112233" } })
    await waitFor(() => expect(queryByText(/telefono non valido/i)).toBeNull())
    // Nothing was persisted (the invalid intermediate was never sent, and the
    // revert equals the committed value so no save fires).
    expect(mockUpdateRecord).not.toHaveBeenCalled()
  })

  it("does not carry a family error across a ricerca switch (processId change)", async () => {
    const utils = render(<Harness processId="proc-1" />)
    const telefono = () =>
      within(utils.getByTestId("telefono-field")).getByRole(
        "textbox",
      ) as HTMLInputElement
    await waitFor(() => expect(telefono().value).toBe("+393331112233"))

    fireEvent.focus(telefono())
    fireEvent.change(telefono(), { target: { value: "+3938" } })
    await waitFor(() => expect(utils.getByText(/telefono non valido/i)).toBeTruthy())

    // Navigate to a different ricerca in place (BAZ-19 flow, no remount).
    utils.rerender(<Harness processId="proc-2" />)
    await waitFor(() =>
      expect(utils.queryByText(/telefono non valido/i)).toBeNull(),
    )
  })

  it("still shows the view banner on an initial LOAD failure (no regression)", async () => {
    mockLoadRicercaDetailCard.mockReset()
    mockLoadRicercaDetailCard.mockRejectedValue(new Error("boom di caricamento"))

    const { getByTestId } = render(<Harness />)

    await waitFor(() =>
      expect(getByTestId("view-error").textContent).toMatch(/boom di caricamento/i),
    )
  })
})
