/**
 * Integration test for the BAZ-36 cedolini pipeline filters.
 *
 * Renders the real CedoliniPayrollView (via PayrollOverviewView) with
 * `usePayrollBoard` mocked, to prove the toolbar wiring: chips render with the
 * default "tutti flagged" state and deselecting one narrows the visible cards.
 * The filter LOGIC itself is exhaustively covered by cedolini-filters.test.ts.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, screen } from "@testing-library/react"

import { renderWithProviders } from "@/test/test-utils"
import type { PayrollBoardCardData, PayrollBoardColumnData } from "../../types"

const { mockUsePayrollBoard } = vi.hoisted(() => ({ mockUsePayrollBoard: vi.fn() }))

vi.mock("../../hooks/use-payroll-board", () => ({
  usePayrollBoard: mockUsePayrollBoard,
  TERMINAL_STAGE_IDS: new Set<string>(),
}))

import { PayrollOverviewView } from "../payroll-overview-view"

function makeCard(overrides: Partial<PayrollBoardCardData> = {}): PayrollBoardCardData {
  return {
    id: "m-1",
    stage: "Inviato cedolino",
    record: {
      id: "m-1",
      caso_particolare: "no",
      presenze_id: "p-1",
      rating_feedback_famiglia: 0,
    } as PayrollBoardCardData["record"],
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
    importoLabel: null,
    dataInvioLabel: null,
    ...overrides,
  }
}

function mockBoard(columns: PayrollBoardColumnData[]) {
  mockUsePayrollBoard.mockReturnValue({
    loading: false,
    error: null,
    columns,
    moveCard: vi.fn(),
    patchCard: vi.fn(),
    patchPresence: vi.fn(),
    enrichCardFromDetail: vi.fn(),
    detailRefreshTick: 0,
  })
}

describe("CedoliniPayrollView — filtri toolbar (BAZ-36)", () => {
  beforeEach(() => {
    mockUsePayrollBoard.mockReset()
  })

  it("mostra i 4 gruppi di filtro nella toolbar", () => {
    mockBoard([{ id: "Inviato cedolino", label: "Inviato cedolino", color: "green", cards: [makeCard()] }])
    renderWithProviders(<PayrollOverviewView defaultTab="cedolini" />)

    // NB: "Caso particolare" non si asserisce con getByText — l'etichetta del
    // gruppo collide con la chip omonima dello stesso gruppo (2 match → throw).
    expect(screen.getByText("Stato pagamento")).toBeTruthy()
    expect(screen.getByText("Tipo utente")).toBeTruthy()
    expect(screen.getByText("Presenze")).toBeTruthy()
    // chip selezionate di default
    expect(screen.getByRole("checkbox", { name: "Irregolari" }).getAttribute("data-state")).toBe("checked")
  })

  it("default tutti flagged → tutte le card; deselezionando 'Irregolari' nasconde le card irregolari", () => {
    const regolare = makeCard({ id: "m-1", nomeCompleto: "Rossi – Maria", presenzeIrregolari: false })
    const irregolare = makeCard({ id: "m-2", nomeCompleto: "Bianchi – Luca", presenzeIrregolari: true })
    mockBoard([
      { id: "Inviato cedolino", label: "Inviato cedolino", color: "green", cards: [regolare, irregolare] },
    ])

    renderWithProviders(<PayrollOverviewView defaultTab="cedolini" />)

    // default: entrambe visibili
    expect(screen.getByText("Rossi")).toBeTruthy()
    expect(screen.getByText("Bianchi")).toBeTruthy()

    // deseleziona "Irregolari"
    fireEvent.click(screen.getByRole("checkbox", { name: "Irregolari" }))

    expect(screen.getByText("Rossi")).toBeTruthy()
    expect(screen.queryByText("Bianchi")).toBeNull()
    // la chip riflette lo stato deselezionato
    expect(screen.getByRole("checkbox", { name: "Irregolari" }).getAttribute("data-state")).toBe("unchecked")
  })

  it("combina ricerca testuale E filtri (AND): mostra solo l'intersezione", () => {
    // 3 card: due "Rossi" (una regolare, una irregolare) + una "Bianchi".
    // Asserzioni sul nome lavoratore (univoco); la famiglia "Rossi" comparirebbe 2 volte.
    const rossiReg = makeCard({ id: "m-1", nomeCompleto: "Rossi – Maria", presenzeIrregolari: false })
    const rossiIrr = makeCard({ id: "m-2", nomeCompleto: "Rossi – Luca", presenzeIrregolari: true })
    const bianchi = makeCard({ id: "m-3", nomeCompleto: "Bianchi – Anna", presenzeIrregolari: false })
    mockBoard([
      { id: "Inviato cedolino", label: "Inviato cedolino", color: "green", cards: [rossiReg, rossiIrr, bianchi] },
    ])

    renderWithProviders(<PayrollOverviewView defaultTab="cedolini" />)

    // default: tutte e tre visibili
    expect(screen.getByText("Maria")).toBeTruthy()
    expect(screen.getByText("Luca")).toBeTruthy()
    expect(screen.getByText("Anna")).toBeTruthy()

    // ricerca "Rossi" → restano solo le due card Rossi
    fireEvent.change(screen.getByPlaceholderText("Cerca per famiglia, lavoratore, email..."), {
      target: { value: "Rossi" },
    })
    expect(screen.getByText("Maria")).toBeTruthy()
    expect(screen.getByText("Luca")).toBeTruthy()
    expect(screen.queryByText("Anna")).toBeNull()

    // + deseleziona "Irregolari" → resta solo Rossi–Maria (intersezione ricerca AND filtro)
    fireEvent.click(screen.getByRole("checkbox", { name: "Irregolari" }))
    expect(screen.getByText("Maria")).toBeTruthy()
    expect(screen.queryByText("Luca")).toBeNull()
    expect(screen.queryByText("Anna")).toBeNull()
  })
})
