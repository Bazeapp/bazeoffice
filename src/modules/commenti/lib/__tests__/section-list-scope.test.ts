import { describe, expect, it } from "vitest"

import { sectionListScopePage } from "../section-list-scope"

describe("sectionListScopePage", () => {
  it("uses the section entity as the list/count scope page", () => {
    const section = {
      entityType: "ricerca" as const,
      entityId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    }
    expect(sectionListScopePage(section)).toEqual(section)
  })
})
