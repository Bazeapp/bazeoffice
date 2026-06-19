import { describe, it, expect } from "vitest"

import {
  normalizeSearchText,
  getSearchTokens,
  matchesSearchQuery,
  hideEmptyKanbanGroups,
} from "@/lib/search-utils"

describe("normalizeSearchText", () => {
  it("strips accents, lowercases, and collapses whitespace", () => {
    expect(normalizeSearchText("  Café   Niño  ")).toBe("cafe nino")
  })

  it("keeps letters, numbers, and @ . + - but drops other punctuation", () => {
    expect(normalizeSearchText("a@b.com")).toBe("a@b.com")
    expect(normalizeSearchText("ABC-123")).toBe("abc-123")
    expect(normalizeSearchText("Test#1!")).toBe("test 1")
  })

  it("maps nullish input to an empty string", () => {
    expect(normalizeSearchText(null)).toBe("")
    expect(normalizeSearchText(undefined)).toBe("")
  })
})

describe("getSearchTokens", () => {
  it("splits a normalized query into non-empty tokens", () => {
    expect(getSearchTokens("Café   Niño")).toEqual(["cafe", "nino"])
  })

  it("returns an empty array for a blank query", () => {
    expect(getSearchTokens("   ")).toEqual([])
  })
})

describe("matchesSearchQuery", () => {
  it("matches when every token is present across the fields (accent-insensitive)", () => {
    expect(matchesSearchQuery(["Café Roma", "x@y.com"], "cafe")).toBe(true)
  })

  it("requires ALL tokens to be present", () => {
    expect(matchesSearchQuery(["Mario Rossi"], "rossi milano")).toBe(false)
  })

  it("treats an empty query as a match-all", () => {
    expect(matchesSearchQuery(["anything"], "   ")).toBe(true)
  })

  it("ignores nullish fields", () => {
    expect(matchesSearchQuery([null, "Mario", undefined], "mario")).toBe(true)
  })
})

describe("hideEmptyKanbanGroups", () => {
  it("keeps groups that have cards", () => {
    const groups = [{ cards: [1] }, { cards: [] }]
    expect(hideEmptyKanbanGroups(groups)).toEqual([{ cards: [1] }])
  })

  it("keeps an empty group only while it is a deferred-but-not-yet-loaded column", () => {
    const groups = [
      { cards: [], deferred: true, loaded: false }, // kept: still loading
      { cards: [], deferred: true, isLoaded: false }, // kept: still loading
      { cards: [], deferred: true, loaded: true }, // dropped: loaded + empty
      { cards: [] }, // dropped: plain empty
    ]
    expect(hideEmptyKanbanGroups(groups)).toEqual([
      { cards: [], deferred: true, loaded: false },
      { cards: [], deferred: true, isLoaded: false },
    ])
  })
})
