/**
 * Pattern B: open lavoratore scheda + address refresh when realtimeTick bumps
 * (reloadOpenDetail), and related-table CDC filters keep the board quiet.
 */
import * as React from "react"
import { act, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { RealtimeRowEvent } from "@/hooks/use-realtime-rows"
import { renderHookWithQueryClient } from "@/test/test-utils"

import { makeWorkerRow } from "../../components/__tests__/gate1-view-test-fixtures"
import { LAVORATORI_REALTIME_TABLES } from "../../lib/list-constants"
import { useLavoratoriData } from "../use-lavoratori-data"
import { useSelectedLavoratoreDetail } from "../use-selected-lavoratore-detail"

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
  return {
    rows: [makeWorkerRow({ id: workerId })],
    total: 1,
    indirizzi: [
      {
        id: "addr-board",
        entita_id: workerId,
        entita_tabella: "lavoratori",
        tipo_indirizzo: "residenza",
        via: "Via Board",
        citta: "Milano",
      },
    ],
    selezioniCorrelate: [],
  }
}

describe("useSelectedLavoratoreDetail — Pattern B address + scheda", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchLavoratoreScheda.mockResolvedValue({
      worker: makeWorkerRow({ id: "worker-1" }),
      documenti: [{ id: "doc-1", lavoratore_id: "worker-1" }],
      esperienze: [{ id: "exp-1", lavoratore_id: "worker-1" }],
      referenze: [],
      relatedSearches: [{ id: "proc-1", lavoratore_id: "worker-1" }],
    })
    mockFetchIndirizziByEntity.mockResolvedValue({
      rows: [
        {
          id: "addr-remote",
          entita_id: "worker-1",
          entita_tabella: "lavoratori",
          tipo_indirizzo: "residenza",
          via: "Via Remota",
          citta: "Torino",
        },
      ],
      total: 1,
      columns: [],
      groups: [],
    })
  })

  it("re-fetches scheda sections and address when reloadSelectedWorkerScheda ticks", async () => {
    const workerRowsRef = { current: [makeWorkerRow({ id: "worker-1" })] }
    const initialAddresses = new Map<string, Record<string, unknown>[]>([
      [
        "worker-1",
        [
          {
            id: "addr-local",
            entita_id: "worker-1",
            tipo_indirizzo: "residenza",
            via: "Via Locale",
            citta: "Milano",
          },
        ],
      ],
    ])

    const { result } = renderHookWithQueryClient(() => {
      const [addresses, setAddresses] = React.useState(initialAddresses)
      const [rows, setRows] = React.useState(workerRowsRef.current)
      workerRowsRef.current = rows
      return useSelectedLavoratoreDetail({
        selectedWorkerId: "worker-1",
        workerAddressesById: addresses,
        workerRowsRef,
        setWorkerAddressesById: setAddresses,
        setWorkerRows: setRows,
      })
    })

    await waitFor(() => {
      expect(mockFetchLavoratoreScheda).toHaveBeenCalledTimes(1)
      expect(result.current.selectedWorkerExperiences).toHaveLength(1)
      expect(result.current.selectedWorkerAddress?.via).toBe("Via Locale")
    })

    // Board already had an address — bootstrap must not hit the network.
    expect(mockFetchIndirizziByEntity).not.toHaveBeenCalled()

    mockFetchLavoratoreScheda.mockResolvedValue({
      worker: makeWorkerRow({ id: "worker-1", nome: "Updated" }),
      documenti: [
        { id: "doc-1", lavoratore_id: "worker-1" },
        { id: "doc-2", lavoratore_id: "worker-1" },
      ],
      esperienze: [
        { id: "exp-1", lavoratore_id: "worker-1" },
        { id: "exp-2", lavoratore_id: "worker-1" },
      ],
      referenze: [{ id: "ref-1", lavoratore_id: "worker-1" }],
      relatedSearches: [
        { id: "proc-1", lavoratore_id: "worker-1" },
        { id: "proc-2", lavoratore_id: "worker-1" },
      ],
    })

    await act(async () => {
      result.current.reloadSelectedWorkerScheda()
    })

    await waitFor(() => {
      expect(mockFetchLavoratoreScheda).toHaveBeenCalledTimes(2)
      expect(mockFetchIndirizziByEntity).toHaveBeenCalled()
      expect(result.current.selectedWorkerDocuments).toHaveLength(2)
      expect(result.current.selectedWorkerExperiences).toHaveLength(2)
      expect(result.current.selectedWorkerReferences).toHaveLength(1)
      expect(result.current.selectedWorkerRelatedSearches).toHaveLength(2)
      expect(result.current.selectedWorkerAddress?.via).toBe("Via Remota")
      expect(result.current.selectedWorkerAddress?.citta).toBe("Torino")
    })
  })
})

describe("useLavoratoriData — related-table realtime filters", () => {
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
    mockFetchIndirizziByEntity.mockResolvedValue({
      rows: [],
      total: 0,
      columns: [],
      groups: [],
    })
    mockUseRealtimeBoardSync.mockImplementation(() => undefined)
    mockFetchLavoratoriBoard.mockResolvedValue(makeBoardResponse())
  })

  it("subscribes to related CDC tables and scopes board vs open-detail reloads", async () => {
    const { result } = renderHookWithQueryClient(() => useLavoratoriData())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(mockUseRealtimeBoardSync).toHaveBeenCalled()
    })

    const syncOptions = mockUseRealtimeBoardSync.mock.calls.at(-1)?.[0] as {
      tables: string[]
      shouldReloadBoard: (event: RealtimeRowEvent) => boolean
      shouldReloadOpenDetail: (event: RealtimeRowEvent) => boolean
      reloadOpenDetail: () => void
    }

    expect(syncOptions.tables).toEqual([...LAVORATORI_REALTIME_TABLES])

    const selectedExperience: RealtimeRowEvent = {
      table: "esperienze_lavoratori",
      eventType: "UPDATE",
      newRow: { id: "exp-1", lavoratore_id: "worker-1" },
      oldRow: { id: "exp-1", lavoratore_id: "worker-1" },
    }
    const otherWorkerExperience: RealtimeRowEvent = {
      table: "esperienze_lavoratori",
      eventType: "INSERT",
      newRow: { id: "exp-9", lavoratore_id: "worker-other" },
      oldRow: null,
    }
    const selectedAddress: RealtimeRowEvent = {
      table: "indirizzi",
      eventType: "UPDATE",
      newRow: {
        id: "addr-1",
        entita_id: "worker-1",
        entita_tabella: "lavoratori",
        via: "Via Nuova",
      },
      oldRow: {
        id: "addr-1",
        entita_id: "worker-1",
        entita_tabella: "lavoratori",
        via: "Via Vecchia",
      },
    }

    expect(syncOptions.shouldReloadBoard(selectedExperience)).toBe(false)
    expect(syncOptions.shouldReloadOpenDetail(selectedExperience)).toBe(true)

    expect(syncOptions.shouldReloadBoard(otherWorkerExperience)).toBe(false)
    expect(syncOptions.shouldReloadOpenDetail(otherWorkerExperience)).toBe(false)

    expect(syncOptions.shouldReloadBoard(selectedAddress)).toBe(false)
    expect(syncOptions.shouldReloadOpenDetail(selectedAddress)).toBe(true)

    // Visible lavoratori UPDATE still reloads the board (membership contract).
    expect(
      syncOptions.shouldReloadBoard({
        table: "lavoratori",
        eventType: "UPDATE",
        newRow: { id: "worker-1" },
        oldRow: { id: "worker-1" },
      })
    ).toBe(true)

    const schedaCallsBefore = mockFetchLavoratoreScheda.mock.calls.length
    await act(async () => {
      syncOptions.reloadOpenDetail()
    })
    await waitFor(() => {
      expect(mockFetchLavoratoreScheda.mock.calls.length).toBeGreaterThan(
        schedaCallsBefore
      )
    })
  })
})
