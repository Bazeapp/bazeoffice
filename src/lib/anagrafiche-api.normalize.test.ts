/**
 * U1 — characterization of `normalizeTableResponse`, the data layer's only
 * genuinely-pure transform (src/lib/anagrafiche-api.ts). Pins the exact output
 * shape so the 1,736-line file can be reorganized without changing how every
 * fetcher's response is shaped.
 *
 * Pure unit test — no mocks, no DOM. Characterization-first: pins the CURRENT
 * (sometimes surprising) semantics — array-returned-by-reference, total may
 * disagree with rows.length, nullish-coalescing precedence — as the contract.
 */
import { describe, expect, it } from "vitest"

import {
  normalizeTableResponse,
  type TableColumnMeta,
  type TableGroupResult,
} from "@/lib/anagrafiche-api"

type Row = { id: number }

describe("normalizeTableResponse", () => {
  describe("array input (legacy shape)", () => {
    it("wraps an array into { rows, total, columns: [], groups: [] }", () => {
      const a: Row = { id: 1 }
      const b: Row = { id: 2 }
      expect(normalizeTableResponse([a, b])).toEqual({
        rows: [a, b],
        total: 2,
        columns: [],
        groups: [],
      })
    })

    it("returns the SAME array reference in rows (no copy)", () => {
      const arr: Row[] = [{ id: 1 }]
      expect(normalizeTableResponse(arr).rows).toBe(arr)
    })

    it("an empty array → total 0 and the empty shape", () => {
      expect(normalizeTableResponse([])).toEqual({
        rows: [],
        total: 0,
        columns: [],
        groups: [],
      })
    })

    it("an array can never carry column/group metadata", () => {
      const result = normalizeTableResponse([{ id: 1 }])
      expect(result.columns).toEqual([])
      expect(result.groups).toEqual([])
    })
  })

  describe("object input — rows resolution", () => {
    it("reads response.data", () => {
      const result = normalizeTableResponse({ data: [{ id: 1 }] })
      expect(result.rows).toEqual([{ id: 1 }])
      expect(result.total).toBe(1)
    })

    it("falls back to response.rows when data is absent", () => {
      expect(normalizeTableResponse({ rows: [{ id: 7 }] }).rows).toEqual([{ id: 7 }])
    })

    it("data takes precedence over rows when both are present", () => {
      const result = normalizeTableResponse({ data: [{ id: 1 }], rows: [{ id: 2 }] })
      expect(result.rows).toEqual([{ id: 1 }])
    })

    it("an explicit empty `data: []` is kept, not treated as absent", () => {
      // `[] ?? rows` → [] because an empty array is not nullish. (This holds for
      // `||` too since `[]` is truthy — the ??-vs-|| discriminator is the
      // `total: 0` case below, not this one.)
      expect(normalizeTableResponse({ data: [], rows: [{ id: 99 }] }).rows).toEqual([])
    })

    it("missing data and rows → empty array", () => {
      const result = normalizeTableResponse({})
      expect(result.rows).toEqual([])
      expect(result.total).toBe(0)
    })
  })

  describe("object input — total resolution", () => {
    it("response.total wins over count and rows.length (disagreement is not reconciled)", () => {
      const result = normalizeTableResponse({ data: [{ id: 1 }], total: 500, count: 3 })
      expect(result.total).toBe(500)
    })

    it("falls back to response.count when total is absent", () => {
      expect(normalizeTableResponse({ data: [{ id: 1 }], count: 7 }).total).toBe(7)
    })

    it("falls back to rows.length when total and count are both absent", () => {
      expect(normalizeTableResponse({ data: [{ id: 1 }, { id: 2 }] }).total).toBe(2)
    })

    it("preserves an explicit total of 0 — the ??-vs-|| discriminator (0 is not nullish)", () => {
      // With `??`: total stays 0. With `||`: 0 is falsy → would fall through to
      // count (absent) → rows.length (1). So this reds if `??`→`||`.
      expect(normalizeTableResponse({ data: [{ id: 1 }], total: 0 }).total).toBe(0)
    })
  })

  describe("object input — columns / groups", () => {
    it("default to fresh [] when absent", () => {
      const result = normalizeTableResponse({ data: [{ id: 1 }] })
      expect(result.columns).toEqual([])
      expect(result.groups).toEqual([])
    })

    it("keep supplied columns and groups (same reference)", () => {
      const columns: TableColumnMeta[] = [
        { name: "id", dataType: "int4", udtName: null, filterType: "number" },
      ]
      const groups: TableGroupResult[] = [
        { field: "stato", value: "x", label: "X", count: 3 },
      ]
      const result = normalizeTableResponse({ data: [{ id: 1 }], columns, groups })
      expect(result.columns).toBe(columns)
      expect(result.groups).toBe(groups)
    })
  })

  describe("empty-input shape", () => {
    // EMPTY_ROWS (anagrafiche-api.ts:1166) is the rpc short-circuit constant and
    // is intentionally structurally identical to what normalizeTableResponse
    // yields for empty input. EMPTY_ROWS is not exported, so the shape is pinned
    // here rather than asserting the constant directly.
    it("{} and [] both yield { rows: [], total: 0, columns: [], groups: [] }", () => {
      const expected = { rows: [], total: 0, columns: [], groups: [] }
      expect(normalizeTableResponse({})).toEqual(expected)
      expect(normalizeTableResponse([])).toEqual(expected)
    })

    it("the four keys are always present (never undefined)", () => {
      expect(Object.keys(normalizeTableResponse({})).sort()).toEqual([
        "columns",
        "groups",
        "rows",
        "total",
      ])
    })
  })
})
