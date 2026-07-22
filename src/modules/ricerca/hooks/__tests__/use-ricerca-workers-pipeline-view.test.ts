import { act } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderHookWithQueryClient } from "@/test/test-utils"
import {
  makePipelineColumn,
  makeSelectionCard,
} from "../../components/__tests__/ricerca-workers-pipeline-view-test-fixtures"

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}))

vi.mock("@/lib/smart-matching-forward", () => ({
  runSmartMatchingForwardPreview: vi.fn(),
}))

vi.mock("@/lib/record-crud", () => ({
  createRecord: vi.fn(),
}))

vi.mock("@/lib/availability-functions", () => ({
  getSelectionAvailabilityWorkerIds: vi.fn(() => []),
  invokeWorkerAvailabilityForIds: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("../../queries/fetch-lavoratori-search", () => ({
  fetchLavoratoriSearch: vi.fn().mockResolvedValue({ rows: [] }),
}))

vi.mock("../../queries/fetch-selezioni-lookup", () => ({
  fetchSelezioniLookup: vi.fn().mockResolvedValue({ rows: [] }),
}))

import { useRicercaWorkersPipelineView } from "../use-ricerca-workers-pipeline-view"

describe("useRicercaWorkersPipelineView", () => {
  const moveCard = vi.fn().mockResolvedValue(undefined)
  const refresh = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("filters columns when searchQuery changes", () => {
    const columns = [
      makePipelineColumn({
        cards: [
          makeSelectionCard({
            id: "sel-a",
            worker: {
              ...makeSelectionCard().worker,
              id: "w-a",
              nomeCompleto: "Anna Bianchi",
            },
          }),
          makeSelectionCard({
            id: "sel-b",
            worker: {
              ...makeSelectionCard().worker,
              id: "w-b",
              nomeCompleto: "Luca Verdi",
            },
          }),
        ],
      }),
    ]

    const { result } = renderHookWithQueryClient(() =>
      useRicercaWorkersPipelineView({
        processId: "process-1",
        columns,
        moveCard,
        refresh,
      }),
    )

    expect(result.current.filteredColumns[0]?.cards).toHaveLength(2)

    act(() => {
      result.current.setSearchQuery("anna")
    })

    expect(result.current.filteredColumns[0]?.cards).toHaveLength(1)
    expect(result.current.filteredColumns[0]?.cards[0]?.worker.nomeCompleto).toBe(
      "Anna Bianchi",
    )
  })

  it("routes card drops through moveCard and clears drag state", () => {
    const { result } = renderHookWithQueryClient(() =>
      useRicercaWorkersPipelineView({
        processId: "process-1",
        columns: [makePipelineColumn()],
        moveCard,
        refresh,
      }),
    )

    act(() => {
      result.current.onDragStartCard("sel-1", "col-1")
    })

    act(() => {
      void result.current.handleDropToColumn("Candidato - Good fit", "sel-1")
    })

    expect(moveCard).toHaveBeenCalledWith("sel-1", "Candidato - Good fit")
    expect(result.current.draggingSelectionId).toBeNull()
    expect(result.current.dropTargetColumnId).toBeNull()
  })
})
