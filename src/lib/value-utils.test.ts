import { describe, expect, it } from "vitest"

import { getSortableTimestamp, isUuidValue } from "@/lib/value-utils"

describe("isUuidValue", () => {
  it("accepts a valid UUID v4", () => {
    expect(isUuidValue("550e8400-e29b-41d4-a716-446655440000")).toBe(true)
  })

  it("rejects empty and malformed values", () => {
    expect(isUuidValue("")).toBe(false)
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
