/**
 * Integration test for the Cedolini Controlli view (BAZ-98/99/100 U4).
 *
 * Renders the real `CedoliniControlliView` with `useCedoliniCheckRun` mocked
 * at the module boundary (same pattern as `payroll-overview-view.integration.test.tsx`
 * mocking `usePayrollBoard`) — the pure grouping logic itself is exhaustively
 * covered by `cedolini-check-warnings.test.ts`.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"
import { screen } from "@testing-library/react"

import { renderWithProviders } from "@/test/test-utils"
import type { PayrollBoardCardData, PayrollBoardColumnData } from "../../types"
import type {
  CedolinoCheckResultRecord,
  CedolinoCheckRunRecord,
} from "../../types/cedolino-check"

const { mockUseCedoliniCheckRun } = vi.hoisted(() => ({ mockUseCedoliniCheckRun: vi.fn() }))

vi.mock("../../hooks/use-cedolini-check-run", () => ({
  useCedoliniCheckRun: mockUseCedoliniCheckRun,
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

describe("CedoliniControlliView (U4)", () => {
  beforeEach(() => {
    mockUseCedoliniCheckRun.mockReset()
  })

  it("stato vuoto: nessuna analisi avviata mostra solo il CTA 'Avvia analisi'", () => {
    mockCheckRun()
    renderWithProviders(<CedoliniControlliView selectedMonth="2026-07" columns={[]} />)

    expect(screen.getByTestId("cedolini-controlli-avvia")).toBeTruthy()
    expect(screen.getByText("Nessuna analisi ancora avviata per questo mese.")).toBeTruthy()
    expect(screen.queryByTestId("cedolini-controlli-progress")).toBeNull()
  })

  it("happy path: run completata renderizza N pronti e i warning nelle categorie corrette", () => {
    const columns = makeColumns([
      makeBoardCard({ id: "m-1", nomeCompleto: "Rossi – Maria" }),
      makeBoardCard({ id: "m-2", nomeCompleto: "Bianchi – Luca" }),
      makeBoardCard({ id: "m-3", nomeCompleto: "Verdi – Anna" }),
    ])
    const results: CedolinoCheckResultRecord[] = [
      makeResult({ id: "res-1", mese_lavorativo_id: "m-1", status: "ok" }),
      makeResult({ id: "res-2", mese_lavorativo_id: "m-2", status: "ok" }),
      makeResult({
        id: "res-3",
        mese_lavorativo_id: "m-3",
        status: "warning",
        warnings: [{ category: "Paga oraria", message: "Paga oraria diversa dal rapporto." }],
      }),
    ]
    mockCheckRun({ run: makeRun({ total_count: 3, checked_count: 3 }), results })

    renderWithProviders(<CedoliniControlliView selectedMonth="2026-07" columns={columns} />)

    // Pronti: 2
    const prontiSection = screen.getByTestId("cedolini-controlli-pronti")
    expect(prontiSection.textContent).toContain("Rossi – Maria")
    expect(prontiSection.textContent).toContain("Bianchi – Luca")
    expect(prontiSection.textContent).not.toContain("Verdi – Anna")

    // Warning: 1, sotto "Paga oraria"
    const warningSection = screen.getByTestId("cedolini-controlli-warning")
    expect(warningSection.textContent).toContain("Verdi – Anna")
    expect(screen.getByTestId("cedolini-controlli-group-Paga oraria")).toBeTruthy()
    expect(warningSection.textContent).toContain("Paga oraria diversa dal rapporto.")
  })

  it("EDGE: una card con 2 categorie di warning appare in ENTRAMBI i gruppi", () => {
    const columns = makeColumns([makeBoardCard({ id: "m-1", nomeCompleto: "Rossi – Maria" })])
    const results: CedolinoCheckResultRecord[] = [
      makeResult({
        id: "res-1",
        mese_lavorativo_id: "m-1",
        status: "warning",
        warnings: [
          { category: "Paga oraria", message: "Paga oraria non coerente." },
          { category: "Ore non coerenti", message: "Ore non coerenti con le presenze." },
        ],
      }),
    ]
    mockCheckRun({ run: makeRun({ total_count: 1, checked_count: 1 }), results })

    renderWithProviders(<CedoliniControlliView selectedMonth="2026-07" columns={columns} />)

    const pagaOrariaGroup = screen.getByTestId("cedolini-controlli-group-Paga oraria")
    const oreGroup = screen.getByTestId("cedolini-controlli-group-Ore non coerenti")
    expect(pagaOrariaGroup.textContent).toContain("Paga oraria (1)")
    expect(oreGroup.textContent).toContain("Ore non coerenti (1)")

    // Entrambi i gruppi renderizzano la card di Rossi – Maria (multi-membership).
    const cards = screen.getAllByTestId("cedolini-check-card-res-1")
    expect(cards).toHaveLength(2)

    // Under each group, only that group's warning message is shown (PRD §7).
    // Fixed category order: Ore non coerenti before Paga oraria.
    const [oreCard, pagaCard] = cards
    expect(oreCard?.textContent).toContain("Ore non coerenti con le presenze.")
    expect(oreCard?.textContent).not.toContain("Paga oraria non coerente.")
    expect(pagaCard?.textContent).toContain("Paga oraria non coerente.")
    expect(pagaCard?.textContent).not.toContain("Ore non coerenti con le presenze.")
  })

  it("AE1: refresh a metà run mostra progresso parziale senza flash a zero", () => {
    const columns = makeColumns([makeBoardCard({ id: "m-1", nomeCompleto: "Rossi – Maria" })])
    const results: CedolinoCheckResultRecord[] = [
      makeResult({ id: "res-1", mese_lavorativo_id: "m-1", status: "ok" }),
    ]
    mockCheckRun({
      run: makeRun({ status: "in_corso", total_count: 5, checked_count: 1 }),
      results,
    })

    renderWithProviders(<CedoliniControlliView selectedMonth="2026-07" columns={columns} />)

    const progress = screen.getByTestId("cedolini-controlli-progress")
    expect(progress.textContent).toContain("1/5")
    expect(progress.textContent).toContain("In corso")
    // Rehydrated pronto result is visible immediately (no empty flash).
    expect(screen.getByTestId("cedolini-controlli-pronti").textContent).toContain("Rossi – Maria")
    // CTA disabled while a run is already in_corso.
    expect(screen.getByTestId("cedolini-controlli-avvia")).toHaveProperty("disabled", true)
  })
})
