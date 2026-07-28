import { waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderHookWithQueryClient } from "@/test/test-utils"
import { makeWorkerRow } from "../../components/__tests__/gate1-view-test-fixtures"
import { useLavoratoriData } from "../use-lavoratori-data"

const {
  mockFetchLavoratoriBoard,
  mockFetchLookupValues,
  mockFetchLavoratoreScheda,
  mockFetchIndirizziByEntity,
  mockUseRealtimeBoardSync,
} = vi.hoisted(() => ({
  mockFetchLavoratoriBoard: vi.fn(),
  mockFetchLookupValues: vi.fn(),
  mockFetchLavoratoreScheda: vi.fn(),
  mockFetchIndirizziByEntity: vi.fn(),
  mockUseRealtimeBoardSync: vi.fn(),
}))

vi.mock("../../queries/fetch-lavoratori-board", () => ({
  fetchLavoratoriBoard: (...args: unknown[]) => mockFetchLavoratoriBoard(...args),
}))

vi.mock("@/lib/lookup-values", () => ({
  fetchLookupValues: (...args: unknown[]) => mockFetchLookupValues(...args),
}))

vi.mock("../../queries/fetch-lavoratore-scheda", () => ({
  fetchLavoratoreScheda: (...args: unknown[]) => mockFetchLavoratoreScheda(...args),
}))

vi.mock("@/lib/indirizzi-api", () => ({
  fetchIndirizziByEntity: (...args: unknown[]) => mockFetchIndirizziByEntity(...args),
}))

vi.mock("@/hooks/use-realtime-board-sync", () => ({
  useRealtimeBoardSync: (...args: unknown[]) => mockUseRealtimeBoardSync(...args),
}))

vi.mock("@/hooks/use-operatori-options", () => ({
  useOperatoriOptions: () => ({ options: [], loading: false }),
}))

function makeBoardResponse(workerId = "worker-1") {
  const row = makeWorkerRow({ id: workerId })
  return {
    rows: [row],
    total: 1,
    indirizzi: [],
    selezioniCorrelate: [],
  }
}

describe("useLavoratoriData facade", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchLookupValues.mockResolvedValue({ rows: [] })
    mockFetchLavoratoreScheda.mockResolvedValue({
      worker: makeWorkerRow({ id: "worker-1" }),
      documenti: [],
      esperienze: [],
      referenze: [],
      relatedSearches: [],
    })
    mockFetchIndirizziByEntity.mockResolvedValue({ rows: [] })
    mockUseRealtimeBoardSync.mockImplementation(() => undefined)
    mockFetchLavoratoriBoard.mockResolvedValue(makeBoardResponse())
  })

  it("returns the expected public API shape", async () => {
    const { result } = renderHookWithQueryClient(() => useLavoratoriData())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.workers).toHaveLength(1)
    })

    expect(result.current.selectedWorkerId).toBe("worker-1")
    expect(result.current.filterFields.length).toBeGreaterThan(0)
    expect(result.current.pageCount).toBeGreaterThanOrEqual(1)
    expect(result.current.table).toBeDefined()
    expect(result.current.loadWorkersSchema).toEqual(expect.any(Function))
    expect(result.current.reloadSelectedWorkerScheda).toEqual(expect.any(Function))
    expect(mockUseRealtimeBoardSync).toHaveBeenCalled()
    expect(mockFetchLookupValues).toHaveBeenCalled()
  })

  it("passes gate1 options through to fetchLavoratoriBoard", async () => {
    renderHookWithQueryClient(() =>
      useLavoratoriData({
        applyGate1BaseFilters: true,
        gate1ProvinciaFilter: "MI",
        gate1FollowupFilter: "Da richiamare",
      })
    )

    await waitFor(() => {
      expect(mockFetchLavoratoriBoard).toHaveBeenCalled()
    })

    const [gate, query] = mockFetchLavoratoriBoard.mock.calls[0] ?? []
    expect(gate).toBe("gate1")
    expect(query).toEqual(
      expect.objectContaining({
        limit: 50,
        offset: 0,
        includeRelated: true,
      })
    )

    const filters = query?.filters
    expect(Array.isArray(filters) ? filters : filters?.nodes).toBeTruthy()
    if (Array.isArray(filters)) {
      expect(filters).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: "provincia_sigla",
            operator: "is",
            value: "MI",
          }),
          expect.objectContaining({
            field: "followup_chiamata_idoneita",
            operator: "is",
            value: "Da richiamare",
          }),
        ])
      )
    }
  })
})
