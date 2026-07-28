import { describe, expect, it } from "vitest"

import { dateGroupLabelFor, groupNotificheByDate } from "../date-groups"

// Bucketing is based on LOCAL calendar days (see startOfLocalDay in
// date-groups.ts). Building fixtures from fixed UTC instants makes the buckets
// shift by a day in timezones far from UTC (e.g. UTC+10 turns "today" into
// "yesterday"). Construct both `now` and the timestamps from local calendar
// components instead, so the local-day deltas are deterministic everywhere.
function localIso(
  year: number,
  monthIndex: number,
  day: number,
  hour = 12,
): string {
  return new Date(year, monthIndex, day, hour, 0, 0).toISOString()
}

describe("dateGroupLabelFor", () => {
  const now = new Date(2026, 6, 17, 15, 0, 0)

  it("buckets today / yesterday / this week / earlier", () => {
    expect(dateGroupLabelFor(localIso(2026, 6, 17, 8), now)).toBe("OGGI")
    expect(dateGroupLabelFor(localIso(2026, 6, 16, 8), now)).toBe("IERI")
    expect(dateGroupLabelFor(localIso(2026, 6, 14, 8), now)).toBe(
      "QUESTA SETTIMANA",
    )
    expect(dateGroupLabelFor(localIso(2026, 6, 1, 8), now)).toBe("PRIMA")
  })
})

describe("groupNotificheByDate", () => {
  it("returns only non-empty groups in order", () => {
    const now = new Date(2026, 6, 17, 15, 0, 0)
    const groups = groupNotificheByDate(
      [
        { id: "1", createdAt: localIso(2026, 6, 17, 10) },
        { id: "2", createdAt: localIso(2026, 6, 1, 10) },
        { id: "3", createdAt: localIso(2026, 6, 17, 11) },
      ],
      now,
    )

    expect(groups.map((g) => g.label)).toEqual(["OGGI", "PRIMA"])
    expect(groups[0]?.items.map((i) => i.id)).toEqual(["1", "3"])
  })
})
