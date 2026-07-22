/**
 * U2 — contract test for use-contributi-inps-board's quarter date-range
 * resolver. `getQuarterDateRange` is what drives `fetchContributiInpsByPeriod`'s
 * start/end args; pinning it pins the period-filter contract a data-layer
 * refactor must preserve.
 *
 * Pure unit test, deterministic (no Date.now). Characterization-first.
 */
import { describe, expect, it } from "vitest"

import {
  formatQuarterLabel,
  getQuarterDateRange,
  getQuarterValueFromDate,
  getYearFromDate,
  parseQuarterReference,
} from "../lib/contributi-quarter"

describe("use-contributi-inps-board getQuarterDateRange", () => {
  it("Q1 → Jan 1 00:00:00 .. Mar 31 23:59:59.999 (UTC)", () => {
    const r = getQuarterDateRange(2025, "Q1")
    expect(r).toEqual({
      start: "2025-01-01T00:00:00.000Z",
      end: "2025-03-31T23:59:59.999Z",
    })
  })

  it("Q2 → Apr 1 .. Jun 30", () => {
    expect(getQuarterDateRange(2025, "Q2")).toEqual({
      start: "2025-04-01T00:00:00.000Z",
      end: "2025-06-30T23:59:59.999Z",
    })
  })

  it("Q3 → Jul 1 .. Sep 30", () => {
    expect(getQuarterDateRange(2025, "Q3")).toEqual({
      start: "2025-07-01T00:00:00.000Z",
      end: "2025-09-30T23:59:59.999Z",
    })
  })

  it("Q4 → Oct 1 .. Dec 31", () => {
    expect(getQuarterDateRange(2025, "Q4")).toEqual({
      start: "2025-10-01T00:00:00.000Z",
      end: "2025-12-31T23:59:59.999Z",
    })
  })

  it("leap year: Q1 still ends Mar 31 (Feb 29 exists, quarter ends in March)", () => {
    expect(getQuarterDateRange(2024, "Q1")?.end).toBe("2024-03-31T23:59:59.999Z")
  })

  it("an unknown quarter → null (no range resolvable)", () => {
    expect(getQuarterDateRange(2025, "Q5" as never)).toBeNull()
  })
})

describe("contributi quarter helpers", () => {
  it("getQuarterValueFromDate maps months to quarters", () => {
    expect(getQuarterValueFromDate("2025-02-15T00:00:00.000Z")).toBe("Q1")
    expect(getQuarterValueFromDate("2025-05-15T00:00:00.000Z")).toBe("Q2")
    expect(getQuarterValueFromDate("2025-08-15T00:00:00.000Z")).toBe("Q3")
    expect(getQuarterValueFromDate("2025-11-15T00:00:00.000Z")).toBe("Q4")
  })

  it("getYearFromDate returns the UTC year", () => {
    expect(getYearFromDate("2025-11-15T00:00:00.000Z")).toBe(2025)
    expect(getYearFromDate(null)).toBeNull()
  })

  it("parseQuarterReference extracts quarter and year tokens", () => {
    expect(parseQuarterReference("Q2 2025")).toEqual({ quarter: "Q2", year: 2025 })
    expect(parseQuarterReference("trimestre 3 2024")).toEqual({ quarter: "Q3", year: 2024 })
    expect(parseQuarterReference("invalid")).toBeNull()
  })

  it("formatQuarterLabel prefers quarter/year over fallback", () => {
    expect(formatQuarterLabel("Q1", 2025, "fallback")).toBe("Q1 2025")
    expect(formatQuarterLabel(null, null, "fallback")).toBe("fallback")
    expect(formatQuarterLabel(null, null, null)).toBe("Trimestre non disponibile")
  })
})
