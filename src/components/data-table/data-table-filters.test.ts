import { describe, expect, it } from "vitest"

// serializeFilterList / splitFilterList own the wire format of the multi-select
// value control. This contract test pins the JSON format that the backend helper
// `parse_filter_value_list` depends on (commas/slashes inside labels must survive
// the round-trip).
import {
  serializeFilterList,
  splitFilterList,
} from "./data-table-filters"

describe("serializeFilterList wire-format contract", () => {
  const labels = ["Colf / Pulizie", "Assistenza Domestica / Badante"]

  it("serializes to JSON that round-trips back to the exact same array", () => {
    const serialized = serializeFilterList(labels)
    expect(JSON.parse(serialized)).toEqual(labels)
  })

  it("preserves commas and slashes inside labels through JSON encoding", () => {
    const serialized = serializeFilterList(labels)
    const parsed: unknown = JSON.parse(serialized)
    expect(parsed).toEqual([
      "Colf / Pulizie",
      "Assistenza Domestica / Badante",
    ])
  })

  it("round-trips through splitFilterList (reader side)", () => {
    const serialized = serializeFilterList(labels)
    expect(splitFilterList(serialized)).toEqual(labels)
  })
})

describe("splitFilterList fallback branches", () => {
  it("splits the legacy comma-separated format", () => {
    // Not wrapped in [...], so it never hits the JSON path.
    expect(splitFilterList("a, b")).toEqual(["a", "b"])
  })

  it("does not throw on malformed JSON and returns a defined array", () => {
    // "[bad json" starts with "[" but does not end with "]", so the JSON branch
    // is skipped entirely and the raw string comma-splits to a single token.
    const result = splitFilterList("[bad json")
    expect(Array.isArray(result)).toBe(true)
    expect(result).toEqual(["[bad json"])
  })

  it("falls back to comma-split for non-array JSON without throwing", () => {
    // '{"x":1}' is valid JSON but not [...]-wrapped, so it comma-splits as-is.
    expect(splitFilterList('{"x":1}')).toEqual(['{"x":1}'])
  })
})
