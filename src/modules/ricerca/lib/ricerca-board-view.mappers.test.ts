import { describe, expect, it } from "vitest"

import type { RicercaBoardCardData, RicercaBoardColumnData } from "../types"
import {
  countRicercaBoardCards,
  filterRicercaBoardColumns,
  getDeferredColumnActionLabel,
  getRicercaCardSearchFields,
} from "./ricerca-board-view.mappers"

function makeCard(overrides: Partial<RicercaBoardCardData> = {}): RicercaBoardCardData {
  return {
    id: "proc-1",
    stage: "fare-ricerca",
    nomeFamiglia: "Rossi",
    cognomeFamiglia: "Mario",
    email: "rossi@example.com",
    telefono: "3331234567",
    operatorId: "op-1",
    oreSettimanali: "20",
    giorniSettimanali: "3",
    deadline: "01/01/2026",
    deadlineRaw: "2026-01-01",
    zona: "Milano",
    tipoLavoroBadge: "Badante",
    tipoLavoroColor: null,
    tipoRapportoBadge: null,
    tipoRapportoColor: null,
    ...overrides,
  }
}

function makeColumn(
  overrides: Partial<RicercaBoardColumnData> = {},
): RicercaBoardColumnData {
  return {
    id: "fare-ricerca",
    label: "Fare ricerca",
    color: null,
    totalCount: 1,
    cards: [makeCard()],
    ...overrides,
  }
}

describe("getRicercaCardSearchFields", () => {
  it("includes searchable card fields", () => {
    const fields = getRicercaCardSearchFields(
      makeCard({ cognomeFamiglia: "Bianchi", tipoLavoroBadges: ["Colf"] }),
    )

    expect(fields).toContain("proc-1")
    expect(fields).toContain("Bianchi")
    expect(fields).toContain("Colf")
  })
})

describe("filterRicercaBoardColumns", () => {
  it("filters cards by recruiter", () => {
    const columns = [
      makeColumn({
        cards: [
          makeCard({ id: "a", operatorId: "op-1" }),
          makeCard({ id: "b", operatorId: "op-2" }),
        ],
        totalCount: 2,
      }),
    ]

    const filtered = filterRicercaBoardColumns(columns, {
      searchQuery: "",
      selectedOperatorId: "op-1",
    })

    expect(filtered[0]?.cards).toHaveLength(1)
    expect(filtered[0]?.cards[0]?.id).toBe("a")
    expect(filtered[0]?.totalCount).toBe(1)
  })

  it("keeps deferred column total when unloaded and no active filters", () => {
    const columns = [
      makeColumn({
        deferred: true,
        isLoaded: false,
        totalCount: 42,
        cards: [],
      }),
    ]

    const filtered = filterRicercaBoardColumns(columns, {
      searchQuery: "",
      selectedOperatorId: "all",
    })

    expect(filtered[0]?.totalCount).toBe(42)
  })

  it("filters unassigned cards only", () => {
    const columns = [
      makeColumn({
        cards: [
          makeCard({ id: "a", operatorId: null }),
          makeCard({ id: "b", operatorId: "op-1" }),
        ],
        totalCount: 2,
      }),
    ]

    const filtered = filterRicercaBoardColumns(columns, {
      searchQuery: "",
      selectedOperatorId: "unassigned",
    })

    expect(filtered[0]?.cards.map((card) => card.id)).toEqual(["a"])
  })
})

describe("getDeferredColumnActionLabel", () => {
  it("uses stage-specific labels for match columns", () => {
    expect(
      getDeferredColumnActionLabel(makeColumn({ id: "match", label: "Match" })),
    ).toBe("Mostra Match")
    expect(
      getDeferredColumnActionLabel(makeColumn({ id: "no-match", label: "No Match" })),
    ).toBe("Mostra NoMatch")
  })
})

describe("countRicercaBoardCards", () => {
  it("sums visible cards across columns", () => {
    const total = countRicercaBoardCards([
      makeColumn({ cards: [makeCard(), makeCard({ id: "b" })], totalCount: 2 }),
      makeColumn({ id: "stand-by", cards: [makeCard({ id: "c" })], totalCount: 1 }),
    ])

    expect(total).toBe(3)
  })
})
