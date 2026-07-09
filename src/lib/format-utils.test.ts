import { describe, expect, it } from "vitest"

import {
  formatBadgeLabel,
  formatItalianCurrency,
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

describe("formatItalianDateTimeOr", () => {
  it("returns the fallback for empty values", () => {
    expect(formatItalianDateTimeOr(null, "-")).toBe("-")
  })
})
