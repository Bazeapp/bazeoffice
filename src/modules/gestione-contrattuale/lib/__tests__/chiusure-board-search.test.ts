import { describe, expect, it } from "vitest"

import {
  countChiusureBoardCards,
  filterChiusureBoardColumns,
} from "../chiusure-board-search"
import type { ChiusureBoardCardData, ChiusureBoardColumnData } from "../../types"

function makeCard(overrides: Partial<ChiusureBoardCardData> = {}): ChiusureBoardCardData {
  return {
    id: "chiusura-1",
    stage: "In lavorazione",
    record: {} as ChiusureBoardCardData["record"],
    rapporto: null,
    nomeCompleto: "Rossi Maria",
    email: "maria@example.com",
    motivazione: "Dimissioni",
    dataFineRapporto: "01/01/2026",
    tipoLabel: "Dimissioni con preavviso",
    tipoColor: null,
    hasAssunzioneDatore: true,
    hasAssunzioneLavoratore: false,
    ...overrides,
  }
}

function makeColumn(
  id: string,
  cards: ChiusureBoardCardData[],
): ChiusureBoardColumnData {
  return {
    id,
    label: id,
    color: "blue",
    cards,
  }
}

describe("filterChiusureBoardColumns", () => {
  const columns = [
    makeColumn("stage-a", [makeCard({ id: "chiusura-1", nomeCompleto: "Rossi Maria" })]),
    makeColumn("stage-b", [
      makeCard({
        id: "chiusura-2",
        nomeCompleto: "Verdi Luca",
        email: "luca@example.com",
        motivazione: "Licenziamento",
      }),
    ]),
  ]

  it("returns all cards when search is empty", () => {
    expect(filterChiusureBoardColumns(columns, "")).toEqual(columns)
    expect(countChiusureBoardCards(columns)).toBe(2)
  })

  it("filters cards by name, email, and motivazione", () => {
    const filtered = filterChiusureBoardColumns(columns, "rossi")
    expect(filtered[0]?.cards).toHaveLength(1)
    expect(filtered[0]?.cards[0]?.id).toBe("chiusura-1")
    expect(filtered[1]?.cards).toHaveLength(0)
    expect(countChiusureBoardCards(filtered)).toBe(1)
  })
})
