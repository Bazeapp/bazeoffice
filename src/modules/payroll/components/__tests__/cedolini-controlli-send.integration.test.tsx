/**
 * Integration test for the Cedolini Controlli bulk-send + URL-recovery UI
 * (BAZ-98/99/100 U5). Renders the real `CedoliniControlliView` with
 * `useCedoliniCheckRun`, `useCedoliniBulkSend`, and `useCedoliniRecoverUrl`
 * mocked at the module boundary — same pattern as
 * `cedolini-controlli-view.integration.test.tsx` — so this file only
 * exercises the dialog/button wiring; the dry-run/confirm/stop state
 * machine itself is covered by `cedolini-bulk-send.test.ts`.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, screen } from "@testing-library/react"

import { renderWithProviders } from "@/test/test-utils"
import type { PayrollBoardCardData, PayrollBoardColumnData } from "../../types"
import type {
  CedolinoBulkJobDryRunOutcome,
  CedolinoBulkJobRecord,
} from "../../types/cedolino-bulk-job"
import type {
  CedolinoCheckResultRecord,
  CedolinoCheckRunRecord,
} from "../../types/cedolino-check"
import type { UseCedoliniBulkSendState } from "../../hooks/use-cedolini-bulk-send"
import type { UseCedoliniRecoverUrlState } from "../../hooks/use-cedolini-recover-url"

const { mockUseCedoliniCheckRun, mockUseCedoliniBulkSend, mockUseCedoliniRecoverUrl } = vi.hoisted(
  () => ({
    mockUseCedoliniCheckRun: vi.fn(),
    mockUseCedoliniBulkSend: vi.fn(),
    mockUseCedoliniRecoverUrl: vi.fn(),
  }),
)

vi.mock("../../hooks/use-cedolini-check-run", () => ({
  useCedoliniCheckRun: mockUseCedoliniCheckRun,
}))
vi.mock("../../hooks/use-cedolini-bulk-send", () => ({
  useCedoliniBulkSend: mockUseCedoliniBulkSend,
}))
vi.mock("../../hooks/use-cedolini-recover-url", () => ({
  useCedoliniRecoverUrl: mockUseCedoliniRecoverUrl,
}))

import { CedoliniControlliView } from "../cedolini-controlli-view"

function makeBoardCard(overrides: Partial<PayrollBoardCardData> = {}): PayrollBoardCardData {
  return {
    id: "m-1",
    stage: "Cedolino da controllare",
    record: { id: "m-1", caso_particolare: "no" } as PayrollBoardCardData["record"],
    famiglia: null,
    pagamento: null,
    transazione: null,
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

function makeColumns(cards: PayrollBoardCardData[]): PayrollBoardColumnData[] {
  return [{ id: "Cedolino da controllare", label: "Cedolino da controllare", color: "yellow", cards }]
}

function makeRun(overrides: Partial<CedolinoCheckRunRecord> = {}): CedolinoCheckRunRecord {
  return {
    id: "run-1",
    year_month: "2026-07",
    status: "completata",
    total_count: 2,
    checked_count: 2,
    started_at: null,
    completed_at: null,
    ...overrides,
  }
}

function makeResult(overrides: Partial<CedolinoCheckResultRecord> = {}): CedolinoCheckResultRecord {
  return {
    id: "res-1",
    run_id: "run-1",
    mese_lavorativo_id: "m-1",
    status: "ok",
    warnings: [],
    details: null,
    ...overrides,
  }
}

function mockCheckRun(overrides: Partial<ReturnType<typeof baseCheckRunState>> = {}) {
  mockUseCedoliniCheckRun.mockReturnValue({ ...baseCheckRunState(), ...overrides })
}

function baseCheckRunState() {
  return {
    run: null as CedolinoCheckRunRecord | null,
    results: [] as CedolinoCheckResultRecord[],
    isLoading: false,
    error: null as string | null,
    isStarting: false,
    startError: null as string | null,
    startMessage: null as string | null,
    startAnalysis: vi.fn(),
  }
}

function baseBulkSendState(): UseCedoliniBulkSendState {
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

function mockBulkSend(overrides: Partial<UseCedoliniBulkSendState> = {}) {
  const state = { ...baseBulkSendState(), ...overrides }
  mockUseCedoliniBulkSend.mockReturnValue(state)
  return state
}

function baseRecoverUrlState(): UseCedoliniRecoverUrlState {
  return {
    recoverSingle: vi.fn(),
    recoveringSingleId: null,
    singleError: null,
    recoverBulk: vi.fn(),
    bulkJob: null,
    isBulkRecovering: false,
    bulkError: null,
  }
}

function mockRecoverUrl(overrides: Partial<UseCedoliniRecoverUrlState> = {}) {
  const state = { ...baseRecoverUrlState(), ...overrides }
  mockUseCedoliniRecoverUrl.mockReturnValue(state)
  return state
}

function makeJob(overrides: Partial<CedolinoBulkJobRecord> = {}): CedolinoBulkJobRecord {
  return {
    id: "job-1",
    kind: "send",
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

describe("CedoliniControlliView — bulk send + recupero URL (U5)", () => {
  beforeEach(() => {
    mockUseCedoliniCheckRun.mockReset()
    mockUseCedoliniBulkSend.mockReset()
    mockUseCedoliniRecoverUrl.mockReset()
  })

  it("disabilita 'Invia cedolini' quando non ci sono Pronti eleggibili", () => {
    mockCheckRun()
    mockBulkSend()
    mockRecoverUrl()
    renderWithProviders(<CedoliniControlliView selectedMonth="2026-07" columns={[]} />)

    expect(screen.getByTestId("cedolini-controlli-invia")).toHaveProperty("disabled", true)
  })

  it("click su 'Invia cedolini' avvia il dry run con gli id Pronti eleggibili", () => {
    const columns = makeColumns([
      makeBoardCard({ id: "m-1", stage: "Cedolino da controllare" }),
      makeBoardCard({ id: "m-2", stage: "Cedolino da controllare" }),
    ])
    const results = [
      makeResult({ id: "res-1", mese_lavorativo_id: "m-1", status: "ok" }),
      makeResult({ id: "res-2", mese_lavorativo_id: "m-2", status: "ok" }),
    ]
    mockCheckRun({ run: makeRun({ total_count: 2, checked_count: 2 }), results })
    const bulkSend = mockBulkSend()
    mockRecoverUrl()

    renderWithProviders(<CedoliniControlliView selectedMonth="2026-07" columns={columns} />)

    const invia = screen.getByTestId("cedolini-controlli-invia")
    expect(invia).toHaveProperty("disabled", false)
    fireEvent.click(invia)

    expect(bulkSend.startDryRun).toHaveBeenCalledWith(["m-1", "m-2"], "2026-07")
    expect(screen.getByTestId("cedolini-controlli-send-dialog")).toBeTruthy()
  })

  it("EDGE: esclude dagli id d'invio una card Pronta spostata via drag su un'altra colonna board (KTD/AE)", () => {
    const columns = makeColumns([
      makeBoardCard({ id: "m-1", stage: "Cedolino da controllare" }),
      makeBoardCard({ id: "m-2", stage: "Inviato cedolino" }),
    ])
    const results = [
      makeResult({ id: "res-1", mese_lavorativo_id: "m-1", status: "ok" }),
      makeResult({ id: "res-2", mese_lavorativo_id: "m-2", status: "ok" }),
    ]
    mockCheckRun({ run: makeRun({ total_count: 2, checked_count: 2 }), results })
    const bulkSend = mockBulkSend()
    mockRecoverUrl()

    renderWithProviders(<CedoliniControlliView selectedMonth="2026-07" columns={columns} />)
    fireEvent.click(screen.getByTestId("cedolini-controlli-invia"))

    expect(bulkSend.startDryRun).toHaveBeenCalledWith(["m-1"], "2026-07")
  })

  it("dry run fallito (AE2): mostra l'errore e NON offre la conferma di invio del resto", () => {
    const columns = makeColumns([makeBoardCard({ id: "m-1" })])
    mockCheckRun({
      run: makeRun({ total_count: 1, checked_count: 1 }),
      results: [makeResult({ id: "res-1", mese_lavorativo_id: "m-1", status: "ok" })],
    })
    const dryRunOutcome: CedolinoBulkJobDryRunOutcome = {
      mese_lavorativo_id: "m-1",
      status: "skipped",
      error: "missing_cedolino",
      details: { message: "Nessun cedolino allegato." },
    }
    mockBulkSend({ phase: "dry_run_failed", dryRunOutcome })
    mockRecoverUrl()

    renderWithProviders(<CedoliniControlliView selectedMonth="2026-07" columns={columns} />)
    fireEvent.click(screen.getByTestId("cedolini-controlli-invia"))

    expect(screen.getByTestId("cedolini-controlli-send-dry-run-failed").textContent).toContain(
      "Nessun cedolino allegato.",
    )
    expect(screen.queryByTestId("cedolini-controlli-send-confirm")).toBeNull()
  })

  it("dry run riuscito: mostra il conteggio dei restanti e la conferma", () => {
    const columns = makeColumns([makeBoardCard({ id: "m-1" })])
    mockCheckRun({
      run: makeRun({ total_count: 1, checked_count: 1 }),
      results: [makeResult({ id: "res-1", mese_lavorativo_id: "m-1", status: "ok" })],
    })
    const bulkSend = mockBulkSend({ phase: "confirm_pending", remainingCount: 4 })
    mockRecoverUrl()

    renderWithProviders(<CedoliniControlliView selectedMonth="2026-07" columns={columns} />)
    fireEvent.click(screen.getByTestId("cedolini-controlli-invia"))

    expect(screen.getByTestId("cedolini-controlli-send-confirm-copy").textContent).toContain("4")
    fireEvent.click(screen.getByTestId("cedolini-controlli-send-confirm"))
    expect(bulkSend.confirmSend).toHaveBeenCalledTimes(1)
  })

  it("invio in corso (sequenziale/stoppabile): mostra il progresso e permette di interrompere (AE3)", () => {
    const columns = makeColumns([makeBoardCard({ id: "m-1" })])
    mockCheckRun({
      run: makeRun({ total_count: 1, checked_count: 1 }),
      results: [makeResult({ id: "res-1", mese_lavorativo_id: "m-1", status: "ok" })],
    })
    const bulkSend = mockBulkSend({
      phase: "processing",
      job: makeJob({ processed_count: 1, total_count: 3 }),
      progressPercent: 33,
    })
    mockRecoverUrl()

    renderWithProviders(<CedoliniControlliView selectedMonth="2026-07" columns={columns} />)
    fireEvent.click(screen.getByTestId("cedolini-controlli-invia"))

    expect(screen.getByTestId("cedolini-controlli-send-progress").textContent).toContain("1/3")
    const stopButton = screen.getByTestId("cedolini-controlli-send-stop")
    expect(stopButton).toHaveProperty("disabled", false)
    fireEvent.click(stopButton)
    expect(bulkSend.stop).toHaveBeenCalledTimes(1)
  })

  it("EDGE: il pulsante di interruzione è disabilitato quando l'arresto è già stato richiesto", () => {
    const columns = makeColumns([makeBoardCard({ id: "m-1" })])
    mockCheckRun({
      run: makeRun({ total_count: 1, checked_count: 1 }),
      results: [makeResult({ id: "res-1", mese_lavorativo_id: "m-1", status: "ok" })],
    })
    mockBulkSend({
      phase: "processing",
      job: makeJob({ processed_count: 1, total_count: 3, stop_requested: true }),
    })
    mockRecoverUrl()

    renderWithProviders(<CedoliniControlliView selectedMonth="2026-07" columns={columns} />)
    fireEvent.click(screen.getByTestId("cedolini-controlli-invia"))

    expect(screen.getByTestId("cedolini-controlli-send-stop")).toHaveProperty("disabled", true)
  })

  it("completato: mostra il riepilogo con i conteggi finali", () => {
    const columns = makeColumns([makeBoardCard({ id: "m-1" })])
    mockCheckRun({
      run: makeRun({ total_count: 1, checked_count: 1 }),
      results: [makeResult({ id: "res-1", mese_lavorativo_id: "m-1", status: "ok" })],
    })
    mockBulkSend({
      phase: "completata",
      job: makeJob({ status: "completata", processed_count: 3, total_count: 3, success_count: 2, skipped_count: 1 }),
    })
    mockRecoverUrl()

    renderWithProviders(<CedoliniControlliView selectedMonth="2026-07" columns={columns} />)
    fireEvent.click(screen.getByTestId("cedolini-controlli-invia"))

    const summary = screen.getByTestId("cedolini-controlli-send-summary")
    expect(summary.textContent).toContain("2 inviati")
    expect(summary.textContent).toContain("1 saltati")
  })

  it("mostra il bottone di recupero URL in blocco solo sul gruppo 'Cedolino o PDF' e lo invoca con i suoi id", () => {
    const columns = makeColumns([
      makeBoardCard({ id: "m-1", nomeCompleto: "Rossi – Maria" }),
      makeBoardCard({ id: "m-2", nomeCompleto: "Bianchi – Luca" }),
    ])
    const results: CedolinoCheckResultRecord[] = [
      makeResult({
        id: "res-1",
        mese_lavorativo_id: "m-1",
        status: "warning",
        warnings: [{ category: "Cedolino o PDF", message: "PDF illeggibile." }],
      }),
      makeResult({
        id: "res-2",
        mese_lavorativo_id: "m-2",
        status: "warning",
        warnings: [{ category: "Paga oraria", message: "Paga diversa." }],
      }),
    ]
    mockCheckRun({ run: makeRun({ total_count: 2, checked_count: 2 }), results })
    mockBulkSend()
    const recoverUrl = mockRecoverUrl()

    renderWithProviders(<CedoliniControlliView selectedMonth="2026-07" columns={columns} />)

    // Solo il gruppo "Cedolino o PDF" ha il bottone di recupero in blocco.
    expect(screen.getByTestId("cedolini-controlli-recover-bulk")).toBeTruthy()

    fireEvent.click(screen.getByTestId("cedolini-controlli-recover-bulk"))
    expect(recoverUrl.recoverBulk).toHaveBeenCalledWith(["m-1"], "2026-07")

    // Il bottone di recupero singolo appare per la card nel gruppo "Cedolino o PDF"...
    fireEvent.click(screen.getByTestId("cedolini-controlli-recover-m-1"))
    expect(recoverUrl.recoverSingle).toHaveBeenCalledWith("m-1")

    // ...ma non per la stessa card renderizzata sotto "Paga oraria".
    expect(screen.queryByTestId("cedolini-controlli-recover-m-2")).toBeNull()
  })

  it("EDGE: recupero in blocco disabilitato mentre è in corso", () => {
    const columns = makeColumns([makeBoardCard({ id: "m-1" })])
    mockCheckRun({
      run: makeRun({ total_count: 1, checked_count: 1 }),
      results: [
        makeResult({
          id: "res-1",
          mese_lavorativo_id: "m-1",
          status: "warning",
          warnings: [{ category: "Cedolino o PDF", message: "PDF illeggibile." }],
        }),
      ],
    })
    mockBulkSend()
    mockRecoverUrl({ isBulkRecovering: true })

    renderWithProviders(<CedoliniControlliView selectedMonth="2026-07" columns={columns} />)

    expect(screen.getByTestId("cedolini-controlli-recover-bulk")).toHaveProperty("disabled", true)
  })

  it("EDGE: nessun gruppo 'Cedolino o PDF' con warning → nessun bottone di recupero in blocco", () => {
    const columns = makeColumns([makeBoardCard({ id: "m-1" })])
    mockCheckRun({
      run: makeRun({ total_count: 1, checked_count: 1 }),
      results: [
        makeResult({
          id: "res-1",
          mese_lavorativo_id: "m-1",
          status: "warning",
          warnings: [{ category: "Paga oraria", message: "Paga diversa." }],
        }),
      ],
    })
    mockBulkSend()
    mockRecoverUrl()

    renderWithProviders(<CedoliniControlliView selectedMonth="2026-07" columns={columns} />)

    expect(screen.queryByTestId("cedolini-controlli-recover-bulk")).toBeNull()
  })
})
