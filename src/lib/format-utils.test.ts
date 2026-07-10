import { describe, expect, it } from "vitest"

import {
  formatBadgeLabel,
  formatItalianCurrency,
  formatItalianCurrencyOrNull,
  formatItalianCurrencyLabelFromPatch,
  formatItalianDateLabelFromPatch,
  formatItalianDateOrNull,
  formatItalianDateTimeOr,
} from "@/lib/format-utils"

describe("formatBadgeLabel", () => {
  it("humanizes lookup tokens", () => {
    expect(formatBadgeLabel("part_time-badante/colf")).toBe("part time badante / colf")
  })
})

describe("formatItalianCurrency", () => {
  it("formats valid amounts in EUR", () => {
    expect(formatItalianCurrency(1234.5)).toContain("1234,50")
    expect(formatItalianCurrency(1234.5)).toContain("€")
  })

  it("uses the configured empty label", () => {
    expect(formatItalianCurrency(null, { emptyLabel: "Non disponibile" })).toBe("Non disponibile")
  })
})

describe("formatItalianCurrencyOrNull", () => {
  it("returns null for empty values", () => {
    expect(formatItalianCurrencyOrNull(null)).toBeNull()
    expect(formatItalianCurrencyOrNull(Number.NaN)).toBeNull()
  })

  it("formats valid amounts", () => {
    expect(formatItalianCurrencyOrNull(1234.5)).toContain("1234,50")
  })

  it("supports custom minimum fraction digits", () => {
    const formatted = formatItalianCurrencyOrNull(1234.5, { minimumFractionDigits: 0 })
    expect(formatted).toContain("1234,5")
    expect(formatted).not.toContain(",50")
  })
})

describe("formatItalianCurrencyLabelFromPatch", () => {
  it("formats numeric patches and clears null patches", () => {
    expect(formatItalianCurrencyLabelFromPatch(10, "old")).toContain("10")
    expect(formatItalianCurrencyLabelFromPatch(null, "old")).toBeNull()
    expect(formatItalianCurrencyLabelFromPatch(undefined, "old")).toBe("old")
  })
})

describe("formatItalianDateLabelFromPatch", () => {
  it("formats string patches and keeps previous label otherwise", () => {
    expect(formatItalianDateLabelFromPatch("2026-01-15T12:00:00.000Z", null)).toMatch(
      /\d{2}\/\d{2}\/\d{4}/,
    )
    expect(formatItalianDateLabelFromPatch(undefined, "old")).toBe("old")
  })
})

describe("formatItalianDateOrNull", () => {
  it("returns null for empty values", () => {
    expect(formatItalianDateOrNull(null)).toBeNull()
    expect(formatItalianDateOrNull("not-a-date")).toBeNull()
  })

  it("formats valid ISO dates", () => {
    expect(formatItalianDateOrNull("2026-01-15T12:00:00.000Z")).toMatch(/\d{2}\/\d{2}\/\d{4}/)
  })
})

describe("formatItalianDateTimeOr", () => {
  it("returns the fallback for empty values", () => {
    expect(formatItalianDateTimeOr(null, "-")).toBe("-")
  })
})
