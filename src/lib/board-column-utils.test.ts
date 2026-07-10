import { describe, expect, it } from "vitest"

import {
  applyOptimisticCardMove,
  createBoardCardGetter,
  findCardInColumns,
  mergeCardDetailInColumns,
  updateCardAndRehome,
  updateCardInColumns,
  updateCardInList,
  updateMatchingCardInColumns,
} from "@/lib/board-column-utils"

type Card = { id: string; stage: string; title: string }

const columns = [
  { id: "a", cards: [{ id: "1", stage: "a", title: "one" }] },
  { id: "b", cards: [] as Card[] },
]

describe("findCardInColumns", () => {
  it("returns the matching card across columns", () => {
    expect(findCardInColumns(columns, "1")?.title).toBe("one")
    expect(findCardInColumns(columns, "missing")).toBeUndefined()
  })
})

describe("createBoardCardGetter", () => {
  it("reads the latest columns snapshot lazily", () => {
    let snapshot = columns
    const getCard = createBoardCardGetter(() => snapshot)
    expect(getCard("1")?.title).toBe("one")

    snapshot = [
      { id: "a", cards: [{ id: "1", stage: "a", title: "updated" }] },
      { id: "b", cards: [] },
    ]
    expect(getCard("1")?.title).toBe("updated")
  })
})

describe("mergeCardDetailInColumns", () => {
  it("merges detail into the matching card", () => {
    const { columns: next, mergedCard } = mergeCardDetailInColumns(columns, "1", {
      title: "merged",
    } as Partial<Card>)
    expect(mergedCard?.title).toBe("merged")
    expect(next[0]?.cards[0]?.title).toBe("merged")
  })
})

describe("updateMatchingCardInColumns", () => {
  it("updates cards matched by a custom predicate", () => {
    const next = updateMatchingCardInColumns<Card, (typeof columns)[number]>(
      columns,
      (card) => card.id === "1",
      (card) => ({ ...card, title: "matched" }),
    )
    expect(next[0]?.cards[0]?.title).toBe("matched")
  })
})

describe("updateCardInList", () => {
  it("updates a card in a flat list", () => {
    const cards = [{ id: "1", stage: "a", title: "one" }]
    const next = updateCardInList(cards, "1", (card) => ({ ...card, title: "updated" }))
    expect(next[0]?.title).toBe("updated")
  })
})

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
