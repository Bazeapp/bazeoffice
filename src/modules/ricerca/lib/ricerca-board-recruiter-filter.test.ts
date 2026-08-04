import { afterEach, describe, expect, it } from "vitest"

import {
  RICERCA_BOARD_RECRUITER_FILTER_ALL,
  RICERCA_BOARD_RECRUITER_FILTER_STORAGE_KEY,
  RICERCA_BOARD_RECRUITER_FILTER_UNASSIGNED,
  readStoredRecruiterFilter,
  resolveRecruiterFilter,
  sanitizeRecruiterFilter,
  writeStoredRecruiterFilter,
} from "./ricerca-board-recruiter-filter"

const SELECTABLE = ["op-self", "op-other"] as const

describe("sanitizeRecruiterFilter", () => {
  it("accepts non-empty strings and rejects everything else", () => {
    expect(sanitizeRecruiterFilter("op-1")).toBe("op-1")
    expect(sanitizeRecruiterFilter("  all  ")).toBe("all")
    expect(sanitizeRecruiterFilter("")).toBeNull()
    expect(sanitizeRecruiterFilter("   ")).toBeNull()
    expect(sanitizeRecruiterFilter(null)).toBeNull()
    expect(sanitizeRecruiterFilter(3)).toBeNull()
  })
})

describe("resolveRecruiterFilter", () => {
  it("defaults to the logged-in recruiter when nothing is stored", () => {
    expect(
      resolveRecruiterFilter({
        stored: null,
        currentOperatorId: "op-self",
        selectableOperatorIds: SELECTABLE,
      }),
    ).toBe("op-self")
  })

  it("keeps a persisted special filter", () => {
    expect(
      resolveRecruiterFilter({
        stored: RICERCA_BOARD_RECRUITER_FILTER_ALL,
        currentOperatorId: "op-self",
        selectableOperatorIds: SELECTABLE,
      }),
    ).toBe(RICERCA_BOARD_RECRUITER_FILTER_ALL)

    expect(
      resolveRecruiterFilter({
        stored: RICERCA_BOARD_RECRUITER_FILTER_UNASSIGNED,
        currentOperatorId: "op-self",
        selectableOperatorIds: SELECTABLE,
      }),
    ).toBe(RICERCA_BOARD_RECRUITER_FILTER_UNASSIGNED)
  })

  it("keeps a persisted selectable operator even when it is not the current user", () => {
    expect(
      resolveRecruiterFilter({
        stored: "op-other",
        currentOperatorId: "op-self",
        selectableOperatorIds: SELECTABLE,
      }),
    ).toBe("op-other")
  })

  it("falls back to the current recruiter when the stored operator left the list", () => {
    expect(
      resolveRecruiterFilter({
        stored: "op-gone",
        currentOperatorId: "op-self",
        selectableOperatorIds: SELECTABLE,
      }),
    ).toBe("op-self")
  })

  it("falls back to all when the current user is not a selectable recruiter", () => {
    expect(
      resolveRecruiterFilter({
        stored: null,
        currentOperatorId: "op-admin",
        selectableOperatorIds: SELECTABLE,
      }),
    ).toBe(RICERCA_BOARD_RECRUITER_FILTER_ALL)

    expect(
      resolveRecruiterFilter({
        stored: null,
        currentOperatorId: null,
        selectableOperatorIds: SELECTABLE,
      }),
    ).toBe(RICERCA_BOARD_RECRUITER_FILTER_ALL)
  })
})

describe("readStoredRecruiterFilter / writeStoredRecruiterFilter", () => {
  afterEach(() => {
    window.localStorage.removeItem(RICERCA_BOARD_RECRUITER_FILTER_STORAGE_KEY)
  })

  it("returns null when nothing is stored", () => {
    expect(readStoredRecruiterFilter()).toBeNull()
  })

  it("round-trips a persisted value", () => {
    writeStoredRecruiterFilter("op-self")
    expect(readStoredRecruiterFilter()).toBe("op-self")
  })
})
