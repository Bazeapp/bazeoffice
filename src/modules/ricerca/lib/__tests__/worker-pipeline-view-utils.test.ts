import { describe, expect, it } from "vitest"

import type { RicercaWorkerSelectionColumn } from "../../types"
import {
  buildVisibleGroupedColumnSections,
  filterPipelineColumnsBySearch,
  getCardOperationalTiming,
  scoreWorkerSearchResult,
  workerMatchesCombinedQuery,
} from "../worker-pipeline-view-utils"
import {
  makeGroupedCandidatiColumn,
  makePipelineWorker,
  makeSelectionCard,
} from "../../components/__tests__/ricerca-workers-pipeline-view-test-fixtures"

describe("worker-pipeline-view-utils", () => {
  it("filterPipelineColumnsBySearch narrows cards by worker name", () => {
    const columns: RicercaWorkerSelectionColumn[] = [
      {
        id: "col-1",
        label: "Candidati",
        color: null,
        cards: [
          makeSelectionCard({
            id: "sel-a",
            worker: makePipelineWorker({ id: "w-a", nomeCompleto: "Anna Bianchi" }),
          }),
          makeSelectionCard({
            id: "sel-b",
            worker: makePipelineWorker({ id: "w-b", nomeCompleto: "Luca Verdi" }),
          }),
        ],
      },
    ]

    const filtered = filterPipelineColumnsBySearch(columns, "anna")

    expect(filtered[0]?.cards).toHaveLength(1)
    expect(filtered[0]?.cards[0]?.worker.nomeCompleto).toBe("Anna Bianchi")
  })

  it("buildVisibleGroupedColumnSections hides empty groups in grouped columns", () => {
    const column = makeGroupedCandidatiColumn([
      makeSelectionCard({
        status: "Candidato - Good fit",
        worker: makePipelineWorker({ nomeCompleto: "Good Fit Worker" }),
      }),
    ])

    const visible = buildVisibleGroupedColumnSections(column)

    expect(visible).toHaveLength(1)
    expect(visible[0]?.group.label).toBe("Good fit")
    expect(visible[0]?.groupCards).toHaveLength(1)
  })

  it("workerMatchesCombinedQuery requires every token to match", () => {
    const row = { nome: "Maria", cognome: "Rossi", email: "maria@example.com" }

    expect(workerMatchesCombinedQuery(row, ["maria", "rossi"])).toBe(true)
    expect(workerMatchesCombinedQuery(row, ["maria", "verdi"])).toBe(false)
  })

  it("scoreWorkerSearchResult ranks exact full-name matches first", () => {
    const row = { nome: "Maria", cognome: "Rossi", email: "maria@example.com" }

    expect(scoreWorkerSearchResult(row, "maria rossi")).toBe(0)
    expect(scoreWorkerSearchResult(row, "maria")).toBeLessThan(
      scoreWorkerSearchResult(row, "example"),
    )
  })

  it("getCardOperationalTiming formats interview scheduling labels", () => {
    const timing = getCardOperationalTiming(
      makeSelectionCard({
        status: "Colloquio schedulato",
        scheduledAt: "2026-07-08T10:00:00.000Z",
      }),
    )

    expect(timing?.label).toMatch(/^Colloquio:/)
  })
})
