import { describe, expect, it } from "vitest"

import {
  applyOptimisticCardMove,
  updateCardAndRehome,
  updateCardInColumns,
} from "@/lib/board-column-utils"

type Card = { id: string; stage: string; title: string }

const columns = [
  { id: "a", cards: [{ id: "1", stage: "a", title: "one" }] },
  { id: "b", cards: [] as Card[] },
]

describe("updateCardInColumns", () => {
  it("updates card in place", () => {
    const next = updateCardInColumns(columns, "1", (card) => ({ ...card, title: "updated" }))
    expect(next[0]?.cards[0]?.title).toBe("updated")
  })
})

describe("updateCardAndRehome", () => {
  it("moves card to column matching new stage", () => {
    const next = updateCardAndRehome(columns, "1", (card) => ({ ...card, stage: "b", title: "moved" }))
    expect(next[0]?.cards).toHaveLength(0)
    expect(next[1]?.cards[0]?.stage).toBe("b")
  })
})

describe("applyOptimisticCardMove", () => {
  it("removes from source and prepends to target", () => {
    const next = applyOptimisticCardMove(columns, "1", "b")
    expect(next?.[0]?.cards).toHaveLength(0)
    expect(next?.[1]?.cards[0]?.stage).toBe("b")
  })

  it("returns undefined when card not found", () => {
    expect(applyOptimisticCardMove(columns, "missing", "b")).toBeUndefined()
  })
})
