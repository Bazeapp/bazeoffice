import { describe, expect, it } from "vitest"

import {
  countAssunzioniBoardProcesses,
  filterAssunzioniBoardColumns,
} from "../assunzioni-board-search"
import type { AssunzioniBoardCardData, AssunzioniBoardColumnData } from "../../types"

function makeCard(overrides: Partial<AssunzioniBoardCardData> = {}): AssunzioniBoardCardData {
  return {
    id: "rapporto-1",
    processId: "proc-1",
    stage: "Avviare pratica",
    process: null,
    assunzione: null,
    lavoratoreAssunzione: null,
    richiestaAttivazione: null,
    rapporto: null,
    lavoratore: null,
    famiglia: null,
    famigliaId: null,
    nomeFamiglia: "Rossi",
    nomeLavoratore: "Maria Bianchi",
    email: "maria@example.com",
    telefono: "+3900000000",
    titoloAnnuncio: "Badante",
    tipoRapporto: "Assunzione",
    deadline: "01/01/2026",
    ...overrides,
  }
}

function makeColumn(
  id: string,
  cards: AssunzioniBoardCardData[],
): AssunzioniBoardColumnData {
  return {
    id,
    label: id,
    color: "blue",
    cards,
    deferred: false,
    loadError: null,
    loaded: true,
    loading: false,
  }
}

describe("filterAssunzioniBoardColumns", () => {
  const columns = [
    makeColumn("stage-a", [makeCard({ id: "rapporto-1", nomeFamiglia: "Rossi" })]),
    makeColumn("stage-b", [
      makeCard({
        id: "rapporto-2",
        processId: "proc-2",
        nomeFamiglia: "Verdi",
        nomeLavoratore: "Luca Neri",
        email: "luca@example.com",
      }),
    ]),
  ]

  it("returns all cards when search is empty", () => {
    expect(filterAssunzioniBoardColumns(columns, "")).toEqual(columns)
    expect(countAssunzioniBoardProcesses(columns)).toBe(2)
  })

  it("filters cards by family, worker, and email", () => {
    const filtered = filterAssunzioniBoardColumns(columns, "rossi")
    expect(filtered[0]?.cards).toHaveLength(1)
    expect(filtered[0]?.cards[0]?.id).toBe("rapporto-1")
    expect(filtered[1]?.cards).toHaveLength(0)
    expect(countAssunzioniBoardProcesses(filtered)).toBe(1)
  })
})
