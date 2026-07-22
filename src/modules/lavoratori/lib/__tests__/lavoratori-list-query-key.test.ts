import { describe, expect, it } from "vitest"

import {
  buildLavoratoriListQueryKey,
  shouldSkipLavoratoriListFetch,
} from "../lavoratori-list-query-key"

const baseInput = {
  applyGate1BaseFilters: true,
  debouncedQuery: {
    searchValue: "  anna  ",
    filters: undefined,
    sorting: [{ id: "cognome", desc: false }],
  },
  forcedWorkerStatus: undefined as string | undefined,
  gate1FollowupFilter: "",
  gate1ProvinciaFilter: "MI",
  includeRelatedSelectionDetails: false,
  pageIndex: 0,
  pageSize: 50,
}

describe("buildLavoratoriListQueryKey", () => {
  it("is stable for equal content even when debouncedQuery is a new object", () => {
    const a = buildLavoratoriListQueryKey(baseInput)
    const b = buildLavoratoriListQueryKey({
      ...baseInput,
      debouncedQuery: {
        searchValue: "  anna  ",
        filters: undefined,
        sorting: [{ id: "cognome", desc: false }],
      },
    })
    expect(a).toBe(b)
  })

  it("trims search and changes when search content differs", () => {
    const withAnna = buildLavoratoriListQueryKey(baseInput)
    const withMaria = buildLavoratoriListQueryKey({
      ...baseInput,
      debouncedQuery: { ...baseInput.debouncedQuery, searchValue: "maria" },
    })
    expect(withAnna).not.toBe(withMaria)
  })
})

describe("shouldSkipLavoratoriListFetch", () => {
  it("skips non-silent fetch when the key matches the last loaded key", () => {
    const key = buildLavoratoriListQueryKey(baseInput)
    expect(shouldSkipLavoratoriListFetch(key, key, false)).toBe(true)
  })

  it("does not skip when silent (reloadSilently path)", () => {
    const key = buildLavoratoriListQueryKey(baseInput)
    expect(shouldSkipLavoratoriListFetch(key, key, true)).toBe(false)
  })

  it("does not skip when last loaded key was cleared (reloadSilently clears it)", () => {
    const key = buildLavoratoriListQueryKey(baseInput)
    expect(shouldSkipLavoratoriListFetch(null, key, false)).toBe(false)
  })
})
