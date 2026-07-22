import { act, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderHookWithQueryClient } from "@/test/test-utils"
import {
  makePipelineWorker,
  makeSelectionCard,
} from "../../components/__tests__/ricerca-workers-pipeline-view-test-fixtures"
import type { RicercaWorkerSelectionColumn } from "../../types"

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}))

vi.mock("@/hooks/use-realtime-board-sync", () => ({
  useRealtimeBoardSync: vi.fn(),
}))

vi.mock("@/lib/record-crud", () => ({
  updateRecord: vi.fn().mockResolvedValue({ ok: true }),
}))

vi.mock("@/lib/availability-functions", () => ({
  getSelectionAvailabilityWorkerIds: vi.fn(() => ["worker-1"]),
  invokeWorkerAvailabilityForIds: vi.fn().mockResolvedValue(undefined),
}))

const mockFetchWorkersPipelineData = vi.fn()

vi.mock("../../lib/pipeline-fetch", () => ({
  fetchWorkersPipelineData: (...args: unknown[]) =>
    mockFetchWorkersPipelineData(...args),
}))

import { updateRecord } from "@/lib/record-crud"
import { applyRicercaWorkersPipelineMoveOptimistic } from "../../lib/pipeline-mutations"
import { mergeGroupedPipelineColumns } from "../../lib/pipeline-column-utils"
import { useRicercaWorkersPipeline } from "../use-ricerca-workers-pipeline"

describe("mergeGroupedPipelineColumns", () => {
  it("merges candidati stages into a single grouped column", () => {
    const card = makeSelectionCard({ id: "sel-1" })
    const merged = mergeGroupedPipelineColumns([
      {
        id: "Prospetto",
        label: "Prospetto",
        color: "sky",
        cards: [card],
      },
      {
        id: "Candidato - Good fit",
        label: "Candidato - Good fit",
        color: "green",
        cards: [],
      },
      {
        id: "Da colloquiare",
        label: "Da colloquiare",
        color: "indigo",
        cards: [],
      },
    ])

    expect(merged.map((column) => column.id)).toEqual([
      "__candidati__",
      "__da_colloquiare__",
    ])
    expect(merged[0]).toMatchObject({
      id: "__candidati__",
      label: "Candidati",
      dropStatusId: "Prospetto",
      cards: [card],
    })
  })

  it("appends archivio stages as a trailing grouped column", () => {
    const archivedCard = makeSelectionCard({ id: "sel-archived" })
    const merged = mergeGroupedPipelineColumns([
      {
        id: "Archivio",
        label: "Archivio",
        color: "muted",
        cards: [archivedCard],
      },
      {
        id: "No match",
        label: "No match",
        color: "red",
        cards: [],
      },
    ])

    expect(merged.map((column) => column.id)).toEqual(["__archivio__"])
    expect(merged[0]?.cards).toEqual([archivedCard])
  })
})

describe("applyRicercaWorkersPipelineMoveOptimistic", () => {
  it("moves a card into a grouped candidati column when target status is candidati", () => {
    const card = makeSelectionCard({
      id: "sel-1",
      status: "Prospetto",
      worker: makePipelineWorker({ id: "worker-1", nomeCompleto: "Anna Bianchi" }),
    })
    const columns: RicercaWorkerSelectionColumn[] = [
      {
        id: "__candidati__",
        label: "Candidati",
        color: "sky",
        cards: [card],
      },
      {
        id: "Da colloquiare",
        label: "Da colloquiare",
        color: "indigo",
        cards: [],
      },
    ]

    const next = applyRicercaWorkersPipelineMoveOptimistic(columns, {
      selectionId: "sel-1",
      targetStatusId: "Da colloquiare",
    })

    expect(next?.find((column) => column.id === "__candidati__")?.cards).toEqual([])
    expect(next?.find((column) => column.id === "Da colloquiare")?.cards).toEqual([
      { ...card, status: "Da colloquiare" },
    ])
  })
})

describe("useRicercaWorkersPipeline", () => {
  const processId = "process-42"
  const boardQueryKey = ["ricerca-workers-pipeline", processId] as const

  const seedColumns: RicercaWorkerSelectionColumn[] = [
    {
      id: "__candidati__",
      label: "Candidati",
      color: "sky",
      cards: [
        makeSelectionCard({
          id: "sel-1",
          status: "Prospetto",
          worker: makePipelineWorker({ id: "worker-1" }),
        }),
      ],
    },
    {
      id: "Da colloquiare",
      label: "Da colloquiare",
      color: "indigo",
      cards: [],
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchWorkersPipelineData.mockResolvedValue(seedColumns)
  })

  it("loads pipeline columns from fetchWorkersPipelineData", async () => {
    const { result } = renderHookWithQueryClient(() =>
      useRicercaWorkersPipeline(processId),
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(mockFetchWorkersPipelineData).toHaveBeenCalledWith(processId)
    expect(result.current.columns).toEqual(seedColumns)
  })

  it("moveCard persists the selection status and invalidates the board query", async () => {
    const movedColumns: RicercaWorkerSelectionColumn[] = [
      {
        id: "__candidati__",
        label: "Candidati",
        color: "sky",
        cards: [],
      },
      {
        id: "Da colloquiare",
        label: "Da colloquiare",
        color: "indigo",
        cards: [
          makeSelectionCard({
            id: "sel-1",
            status: "Da colloquiare",
            worker: makePipelineWorker({ id: "worker-1" }),
          }),
        ],
      },
    ]

    const { result, queryClient } = renderHookWithQueryClient(() =>
      useRicercaWorkersPipeline(processId),
    )
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    mockFetchWorkersPipelineData.mockResolvedValue(movedColumns)

    await act(async () => {
      await result.current.moveCard("sel-1", "Da colloquiare")
    })

    expect(updateRecord).toHaveBeenCalledWith("selezioni_lavoratori", "sel-1", {
      stato_selezione: "Da colloquiare",
    })

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: boardQueryKey })
    })

    await waitFor(() => {
      expect(result.current.columns).toEqual(movedColumns)
    })
  })
})
