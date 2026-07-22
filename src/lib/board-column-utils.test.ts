import { describe, expect, it } from "vitest"

import {
  applyOptimisticCardMove,
  createBoardCardGetter,
  findCardInColumns,
  mergeCardDetailInColumns,
  mergePreservedMissingFields,
  preserveMissingFields,
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

describe("preserveMissingFields", () => {
  it("does nothing when previous is missing", () => {
    const target = { stato: "FRESH" }
    preserveMissingFields(target, undefined, { other: "x" }, ["stato"])
    expect(target.stato).toBe("FRESH")
  })

  it("restores plain-key columns absent from freshRow", () => {
    const target = { stato: "X", email: "X" }
    const previous = { stato: "OLD", email: "old@ex.com" }
    preserveMissingFields(target, previous, undefined, ["stato", "email"])
    expect(target).toEqual({ stato: "OLD", email: "old@ex.com" })
  })

  it("keeps target when freshRow has the column including null", () => {
    const target = { stato: null as string | null }
    const previous = { stato: "OLD" }
    preserveMissingFields(target, previous, { stato: null }, ["stato"])
    expect(target.stato).toBeNull()
  })

  it("maps source columns to different target fields via bindings", () => {
    const target = { statoRes: "X", fee: "X" }
    const previous = { statoRes: "OLD", fee: "10" }
    preserveMissingFields(target, previous, { other: "y" }, [
      ["stato_res", "statoRes"],
      ["fee_concordata", "fee"],
    ])
    expect(target).toEqual({ statoRes: "OLD", fee: "10" })
  })
})

describe("mergePreservedMissingFields", () => {
  it("returns fresh unchanged when previous is null", () => {
    const fresh: Record<string, unknown> = { a: 1, b: 2 }
    expect(mergePreservedMissingFields(fresh, null, ["a", "b", "c"])).toBe(fresh)
  })

  it("returns previous when fresh is null", () => {
    const previous: Record<string, unknown> = { a: 1, b: 2 }
    expect(mergePreservedMissingFields(null, previous, ["a", "b"])).toBe(previous)
  })

  it("merges absent columns without mutating fresh", () => {
    const fresh: Record<string, unknown> = { a: "FRESH", b: null }
    const previous: Record<string, unknown> = { a: "OLD", b: "OLD-B", c: "OLD-C" }
    const merged = mergePreservedMissingFields(fresh, previous, ["a", "b", "c"])
    expect(merged).toEqual({ a: "FRESH", b: null, c: "OLD-C" })
    expect(merged).not.toBe(fresh)
  })

  it("does not create own-undefined keys for columns absent from both objects", () => {
    const fresh: Record<string, unknown> = { a: "FRESH" }
    const previous: Record<string, unknown> = { a: "OLD" }
    const merged = mergePreservedMissingFields(fresh, previous, ["a", "ghost"])
    expect(merged).not.toBeNull()
    expect(Object.keys(merged as Record<string, unknown>)).toEqual(["a"])
    expect("ghost" in (merged as Record<string, unknown>)).toBe(false)
  })
})
