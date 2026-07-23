import { describe, expect, it } from "vitest"

import { dateGroupLabelFor, groupNotificheByDate } from "../date-groups"

describe("dateGroupLabelFor", () => {
  const now = new Date("2026-07-17T15:00:00.000Z")

  it("buckets today / yesterday / this week / earlier", () => {
    expect(dateGroupLabelFor("2026-07-17T08:00:00.000Z", now)).toBe("OGGI")
    expect(dateGroupLabelFor("2026-07-16T08:00:00.000Z", now)).toBe("IERI")
    expect(dateGroupLabelFor("2026-07-14T08:00:00.000Z", now)).toBe(
      "QUESTA SETTIMANA",
    )
    expect(dateGroupLabelFor("2026-07-01T08:00:00.000Z", now)).toBe("PRIMA")
  })
})

describe("groupNotificheByDate", () => {
  it("returns only non-empty groups in order", () => {
    const now = new Date("2026-07-17T15:00:00.000Z")
    const groups = groupNotificheByDate(
      [
        { id: "1", createdAt: "2026-07-17T10:00:00.000Z" },
        { id: "2", createdAt: "2026-07-01T10:00:00.000Z" },
        { id: "3", createdAt: "2026-07-17T11:00:00.000Z" },
      ],
      now,
    )

    expect(groups.map((g) => g.label)).toEqual(["OGGI", "PRIMA"])
    expect(groups[0]?.items.map((i) => i.id)).toEqual(["1", "3"])
  })
})
