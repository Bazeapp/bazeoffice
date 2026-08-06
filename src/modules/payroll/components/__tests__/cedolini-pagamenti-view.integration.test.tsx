/**
 * Integration test for the Cedolini Pagamenti view (BAZ-98/99/100 U6).
 *
 * Renders the real `CedoliniPagamentiView` with `useCedoliniPagamenti` and
 * `useCedoliniBulkReminder` mocked at the module boundary — same pattern as
 * `cedolini-controlli-send.integration.test.tsx` — so this file exercises
 * the date-filter → bulk-id binding (AE6) and dialog wiring; the pure
 * eligibility/split/date-filter logic itself is exhaustively covered by
 * `cedolini-pagamenti-filters.test.ts`.
 */
import * as React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, screen, waitFor } from "@testing-library/react"

import { Confirmer } from "@/components/ui/confirmer"
import { renderWithProviders } from "@/test/test-utils"
import type { PayrollBoardCardData } from "../../types"
import type { CedolinoBulkJobDryRunOutcome, CedolinoBulkJobRecord } from "../../types/cedolino-bulk-job"
import type { UseCedoliniBulkReminderState } from "../../hooks/use-cedolini-bulk-reminder"
import type { UseCedoliniPagamentiState } from "../../hooks/use-cedolini-pagamenti"

const { mockUseCedoliniPagamenti, mockUseCedoliniBulkReminder } = vi.hoisted(() => ({
  mockUseCedoliniPagamenti: vi.fn(),
  mockUseCedoliniBulkReminder: vi.fn(),
}))

vi.mock("../../hooks/use-cedolini-pagamenti", () => ({
  useCedoliniPagamenti: mockUseCedoliniPagamenti,
}))
vi.mock("../../hooks/use-cedolini-bulk-reminder", () => ({
  useCedoliniBulkReminder: mockUseCedoliniBulkReminder,
}))

import { CedoliniPagamentiView } from "../cedolini-pagamenti-view"

function renderPagamenti(ui: React.ReactElement) {
  return renderWithProviders(
    <>
      {ui}
      <Confirmer />
    </>,
  )
}

/** Idle → confirmer “Promemoria di prova” → dry run. */
async function clickInviaAndConfirmDryRun() {
  fireEvent.click(screen.getByTestId("cedolini-pagamenti-reminder-invia"))
  fireEvent.click(screen.getByRole("button", { name: "Avvia promemoria di prova" }))
}

function makeCard(overrides: Partial<PayrollBoardCardData> = {}): PayrollBoardCardData {
  return {
    id: "m-1",
    stage: "Inviato cedolino",
    record: { id: "m-1", caso_particolare: null, data_invio_famiglia: null } as PayrollBoardCardData["record"],
    famiglia: null,
    pagamento: null,
    transazione: { id: "t-1", mese_lavorativo_id: "m-1" } as PayrollBoardCardData["transazione"],
    presenze: null,
    presenzeRegolari: null,
    rapporto: { id: "r-1" } as PayrollBoardCardData["rapporto"],
    mese: null,
    richiestaAttivazione: { id: "ra-1", fee_concordata: null },
    presenzeIrregolari: false,
    nomeCompleto: "Rossi – Maria",
    importoLabel: "€1.000",
    dataInvioLabel: null,
    ...overrides,
  }
}

function basePagamentiState(): UseCedoliniPagamentiState {
  return {
    daFare: [],
    fatti: [],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    sendSingleReminder: vi.fn(),
    sendingSingleId: null,
    singleError: null,
  }
}

function mockPagamenti(overrides: Partial<UseCedoliniPagamentiState> = {}) {
  const state = { ...basePagamentiState(), ...overrides }
  mockUseCedoliniPagamenti.mockReturnValue(state)
  return state
}

function baseBulkReminderState(): UseCedoliniBulkReminderState {
  return {
    phase: "idle",
    job: null,
    dryRunOutcome: null,
    remainingCount: 0,
    progressPercent: 0,
    isStartingDryRun: false,
    isConfirming: false,
    isStopping: false,
    error: null,
    startDryRun: vi.fn(),
    confirmSend: vi.fn(),
    stop: vi.fn(),
    reset: vi.fn(),
  }
}

function mockBulkReminder(overrides: Partial<UseCedoliniBulkReminderState> = {}) {
  const state = { ...baseBulkReminderState(), ...overrides }
  mockUseCedoliniBulkReminder.mockReturnValue(state)
  return state
}

function makeJob(overrides: Partial<CedolinoBulkJobRecord> = {}): CedolinoBulkJobRecord {
  return {
    id: "job-1",
    kind: "reminder",
    year_month: "2026-07",
    status: "in_corso",
    stop_requested: false,
    started_at: null,
    completed_at: null,
    total_count: 3,
    processed_count: 1,
    success_count: 1,
    skipped_count: 0,
    error_count: 0,
    ...overrides,
  }
}

describe("CedoliniPagamentiView — reminder da fare/fatti + bulk (U6)", () => {
  beforeEach(() => {
    mockUseCedoliniPagamenti.mockReset()
    mockUseCedoliniBulkReminder.mockReset()
  })

  it("disabilita 'Invia reminder' quando non ci sono da fare eleggibili", () => {
    mockPagamenti()
    mockBulkReminder()
    renderWithProviders(<CedoliniPagamentiView selectedMonth="2026-07" columns={[]} />)

    expect(screen.getByTestId("cedolini-pagamenti-reminder-invia")).toHaveProperty("disabled", true)
  })

  it("mostra le card 'da fare' e 'fatti' con i rispettivi conteggi", () => {
    mockPagamenti({
      daFare: [makeCard({ id: "m-1" }), makeCard({ id: "m-2" })],
      fatti: [makeCard({ id: "m-3" })],
    })
    mockBulkReminder()
    renderWithProviders(<CedoliniPagamentiView selectedMonth="2026-07" columns={[]} />)

    expect(screen.getByTestId("cedolini-pagamenti-da-fare").textContent).toContain("2")
    expect(screen.getByTestId("cedolini-pagamenti-fatti").textContent).toContain("1")
    expect(screen.getByTestId("cedolini-pagamenti-card-m-1")).toBeTruthy()
    expect(screen.getByTestId("cedolini-pagamenti-card-m-3")).toBeTruthy()
  })

  it("click su 'Invia reminder' avvia il dry run con TUTTI gli id 'da fare' quando non c'è filtro data (AE6)", async () => {
    mockPagamenti({ daFare: [makeCard({ id: "m-1" }), makeCard({ id: "m-2" })] })
    const bulkReminder = mockBulkReminder()
    renderPagamenti(<CedoliniPagamentiView selectedMonth="2026-07" columns={[]} />)

    expect(screen.getByTestId("cedolini-pagamenti-selection-summary").textContent).toContain(
      "Inclusi 2",
    )

    await clickInviaAndConfirmDryRun()

    await waitFor(() => {
      expect(bulkReminder.startDryRun).toHaveBeenCalledWith(["m-1", "m-2"], "2026-07")
    })
    expect(screen.getByTestId("cedolini-pagamenti-reminder-dialog")).toBeTruthy()
  })

  it("BAZ-180: deselezionare una famiglia la esclude dal bulk; Seleziona tutti la ripristina", async () => {
    mockPagamenti({ daFare: [makeCard({ id: "m-1" }), makeCard({ id: "m-2" })] })
    const bulkReminder = mockBulkReminder()
    renderPagamenti(<CedoliniPagamentiView selectedMonth="2026-07" columns={[]} />)

    fireEvent.click(screen.getByTestId("cedolini-pagamenti-include-m-2"))
    expect(screen.getByTestId("cedolini-pagamenti-selection-summary").textContent).toContain(
      "Inclusi 1",
    )
    expect(screen.getByTestId("cedolini-pagamenti-selection-summary").textContent).toContain(
      "Esclusi 1",
    )

    await clickInviaAndConfirmDryRun()
    await waitFor(() => {
      expect(bulkReminder.startDryRun).toHaveBeenCalledWith(["m-1"], "2026-07")
    })

    fireEvent.click(screen.getByTestId("cedolini-pagamenti-select-all"))
    expect(screen.getByTestId("cedolini-pagamenti-selection-summary").textContent).toContain(
      "Inclusi 2 · Esclusi 0",
    )
  })

  it("BAZ-180: Deseleziona tutti svuota il bulk e disabilita Invia reminder", () => {
    mockPagamenti({ daFare: [makeCard({ id: "m-1" }), makeCard({ id: "m-2" })] })
    mockBulkReminder()
    renderWithProviders(<CedoliniPagamentiView selectedMonth="2026-07" columns={[]} />)

    fireEvent.click(screen.getByTestId("cedolini-pagamenti-deselect-all"))
    expect(screen.getByTestId("cedolini-pagamenti-selection-summary").textContent).toContain(
      "Inclusi 0",
    )
    expect(screen.getByTestId("cedolini-pagamenti-reminder-invia")).toHaveProperty("disabled", true)
  })

  it("EDGE (AE6/OQ6): il filtro data riduce sia la lista visibile che gli id del bulk, escludendo i NULL", async () => {
    mockPagamenti({
      daFare: [
        makeCard({
          id: "m-1",
          record: { ...makeCard().record, data_invio_famiglia: "2026-07-01" } as PayrollBoardCardData["record"],
        }),
        makeCard({
          id: "m-2",
          record: { ...makeCard().record, data_invio_famiglia: "2026-07-20" } as PayrollBoardCardData["record"],
        }),
        makeCard({
          id: "m-3",
          record: { ...makeCard().record, data_invio_famiglia: null } as PayrollBoardCardData["record"],
        }),
      ],
    })
    const bulkReminder = mockBulkReminder()
    renderPagamenti(<CedoliniPagamentiView selectedMonth="2026-07" columns={[]} />)

    fireEvent.change(screen.getByTestId("cedolini-pagamenti-date-filter"), {
      target: { value: "2026-07-15" },
    })

    expect(screen.getByTestId("cedolini-pagamenti-da-fare").textContent).toContain("1")
    expect(screen.queryByTestId("cedolini-pagamenti-card-m-2")).toBeNull()
    expect(screen.queryByTestId("cedolini-pagamenti-card-m-3")).toBeNull()
    expect(screen.getByTestId("cedolini-pagamenti-card-m-1")).toBeTruthy()

    await clickInviaAndConfirmDryRun()

    await waitFor(() => {
      expect(bulkReminder.startDryRun).toHaveBeenCalledWith(["m-1"], "2026-07")
    })
  })

  it("il pulsante di invio singolo su una card 'da fare' chiama sendSingleReminder con il suo id", () => {
    const pagamenti = mockPagamenti({ daFare: [makeCard({ id: "m-1" })] })
    mockBulkReminder()
    renderWithProviders(<CedoliniPagamentiView selectedMonth="2026-07" columns={[]} />)

    fireEvent.click(screen.getByTestId("cedolini-pagamenti-reminder-single-m-1"))
    expect(pagamenti.sendSingleReminder).toHaveBeenCalledWith("m-1")
  })

  it("EDGE: nessun pulsante di invio singolo sulle card 'fatti'", () => {
    mockPagamenti({ fatti: [makeCard({ id: "m-1" })] })
    mockBulkReminder()
    renderWithProviders(<CedoliniPagamentiView selectedMonth="2026-07" columns={[]} />)

    expect(screen.queryByTestId("cedolini-pagamenti-reminder-single-m-1")).toBeNull()
  })

  it("dry run fallito: mostra l'errore e NON offre la conferma di invio del resto", () => {
    mockPagamenti({ daFare: [makeCard({ id: "m-1" })] })
    const dryRunOutcome: CedolinoBulkJobDryRunOutcome = {
      mese_lavorativo_id: "m-1",
      status: "skipped",
      error: "already_sent",
      details: { message: "Il reminder di pagamento è già stato inviato." },
    }
    mockBulkReminder({ phase: "dry_run_failed", dryRunOutcome })
    renderWithProviders(<CedoliniPagamentiView selectedMonth="2026-07" columns={[]} />)

    fireEvent.click(screen.getByTestId("cedolini-pagamenti-reminder-invia"))

    expect(screen.getByTestId("cedolini-pagamenti-reminder-dry-run-failed").textContent).toContain(
      "già stato inviato",
    )
    expect(screen.queryByTestId("cedolini-pagamenti-reminder-confirm")).toBeNull()
  })

  it("dry run riuscito: mostra il conteggio dei restanti e la conferma", () => {
    mockPagamenti({ daFare: [makeCard({ id: "m-1" })] })
    const bulkReminder = mockBulkReminder({ phase: "confirm_pending", remainingCount: 4 })
    renderWithProviders(<CedoliniPagamentiView selectedMonth="2026-07" columns={[]} />)

    fireEvent.click(screen.getByTestId("cedolini-pagamenti-reminder-invia"))
    expect(screen.getByTestId("cedolini-pagamenti-reminder-confirm-copy").textContent).toContain("4")
    fireEvent.click(screen.getByTestId("cedolini-pagamenti-reminder-confirm"))
    expect(bulkReminder.confirmSend).toHaveBeenCalledTimes(1)
  })

  it("invio in corso (sequenziale/stoppabile): mostra il progresso e permette di interrompere (AE3-style)", () => {
    mockPagamenti({ daFare: [makeCard({ id: "m-1" })] })
    const bulkReminder = mockBulkReminder({
      phase: "processing",
      job: makeJob({ processed_count: 1, total_count: 3 }),
      progressPercent: 33,
    })
    renderWithProviders(<CedoliniPagamentiView selectedMonth="2026-07" columns={[]} />)

    fireEvent.click(screen.getByTestId("cedolini-pagamenti-reminder-invia"))
    expect(screen.getByTestId("cedolini-pagamenti-reminder-progress").textContent).toContain("1/3")
    fireEvent.click(screen.getByTestId("cedolini-pagamenti-reminder-stop"))
    expect(bulkReminder.stop).toHaveBeenCalledTimes(1)
  })

  it("completato: mostra il riepilogo con i conteggi finali", () => {
    mockPagamenti({ daFare: [makeCard({ id: "m-1" })] })
    mockBulkReminder({
      phase: "completata",
      job: makeJob({ status: "completata", processed_count: 3, total_count: 3, success_count: 2, skipped_count: 1 }),
    })
    renderWithProviders(<CedoliniPagamentiView selectedMonth="2026-07" columns={[]} />)

    fireEvent.click(screen.getByTestId("cedolini-pagamenti-reminder-invia"))
    const summary = screen.getByTestId("cedolini-pagamenti-reminder-summary")
    expect(summary.textContent).toContain("2 inviati")
    expect(summary.textContent).toContain("1 saltati")
  })
})
