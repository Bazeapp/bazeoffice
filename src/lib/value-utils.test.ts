import { describe, expect, it } from "vitest"

import {
  formatItalianDate,
  getFirstArrayValue,
  getSortableTimestamp,
  getStringArrayValue,
  isUuidValue,
  normalizeComparableToken,
  normalizeLookupToken,
  readLookupColor,
  toBooleanValue,
  toStringValue,
} from "@/lib/value-utils"

describe("isUuidValue", () => {
  it("accepts a valid UUID v4", () => {
    expect(isUuidValue("550e8400-e29b-41d4-a716-446655440000")).toBe(true)
  })

  it("accepts seed ids that are uuid-shaped but not RFC 4122", () => {
    expect(isUuidValue("00000000-0000-0000-0000-000000000a11")).toBe(true)
  })

  it("rejects empty, non-string, and malformed values", () => {
    expect(isUuidValue("")).toBe(false)
    expect(isUuidValue(null)).toBe(false)
    expect(isUuidValue("not-a-uuid")).toBe(false)
    expect(isUuidValue("550e8400-e29b-41d4-a716")).toBe(false)
  })
})

describe("getSortableTimestamp", () => {
  it("returns epoch ms for a valid ISO string", () => {
    expect(getSortableTimestamp("2026-01-15T12:00:00.000Z")).toBe(
      new Date("2026-01-15T12:00:00.000Z").getTime(),
    )
  })

  it("returns NEGATIVE_INFINITY for nullish and invalid input", () => {
    expect(getSortableTimestamp(null)).toBe(Number.NEGATIVE_INFINITY)
    expect(getSortableTimestamp(undefined)).toBe(Number.NEGATIVE_INFINITY)
    expect(getSortableTimestamp("")).toBe(Number.NEGATIVE_INFINITY)
    expect(getSortableTimestamp("not-a-date")).toBe(Number.NEGATIVE_INFINITY)
  })
})

describe("toStringValue", () => {
  it("trims strings and rejects empty", () => {
    expect(toStringValue("  hello  ")).toBe("hello")
    expect(toStringValue("   ")).toBeNull()
    expect(toStringValue(null)).toBeNull()
  })

  it("coerces number and boolean", () => {
    expect(toStringValue(42)).toBe("42")
    expect(toStringValue(true)).toBe("true")
  })
})

describe("normalizeLookupToken", () => {
  it("lowercases and trims", () => {
    expect(normalizeLookupToken("  Foo  ")).toBe("foo")
  })
})

describe("normalizeComparableToken", () => {
  it("strips punctuation and collapses whitespace", () => {
    expect(normalizeComparableToken("Cedolino-Pronto!")).toBe("cedolino pronto")
  })
})

describe("readLookupColor", () => {
  it("reads metadata.color when present", () => {
    expect(readLookupColor({ color: " sky " })).toBe("sky")
    expect(readLookupColor({})).toBeNull()
  })
})

describe("formatItalianDate", () => {
  it("formats valid ISO dates", () => {
    expect(formatItalianDate("2026-01-15T12:00:00.000Z")).toMatch(/\d{2}\/\d{2}\/\d{4}/)
    expect(formatItalianDate(null)).toBe("-")
  })
})

describe("getFirstArrayValue", () => {
  it("returns first non-empty array element", () => {
    expect(getFirstArrayValue(["", "b", "c"])).toBe("b")
    expect(getFirstArrayValue("solo")).toBe("solo")
  })
})

describe("getStringArrayValue", () => {
  it("maps array or wraps single value", () => {
    expect(getStringArrayValue(["a", "b"])).toEqual(["a", "b"])
    expect(getStringArrayValue("x")).toEqual(["x"])
  })
})

describe("toBooleanValue", () => {
  it("parses Italian yes/no tokens", () => {
    expect(toBooleanValue("sì")).toBe(true)
    expect(toBooleanValue("no")).toBe(false)
  })
})
