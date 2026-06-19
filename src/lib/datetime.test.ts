import { describe, it, expect } from "vitest"

import {
  romaWallclockToUtcIso,
  romaDateTimeToUtcIso,
  utcIsoToRomaInput,
  utcIsoToRomaParts,
} from "@/lib/datetime"

// The whole point of these helpers is the Europe/Rome <-> UTC conversion with
// correct DST. Every case tests BOTH a winter date (CET, UTC+1) and a summer
// date (CEST, UTC+2) — that pair is what a refactor is most likely to break.

describe("romaWallclockToUtcIso", () => {
  it("converts a winter Rome wall-clock time (UTC+1)", () => {
    expect(romaWallclockToUtcIso("2026-01-15T12:00")).toBe("2026-01-15T11:00:00.000Z")
  })

  it("converts a summer Rome wall-clock time (UTC+2, DST)", () => {
    expect(romaWallclockToUtcIso("2026-07-15T12:00")).toBe("2026-07-15T10:00:00.000Z")
  })

  it("returns null for empty/nullish input", () => {
    expect(romaWallclockToUtcIso(null)).toBeNull()
    expect(romaWallclockToUtcIso(undefined)).toBeNull()
    expect(romaWallclockToUtcIso("")).toBeNull()
  })

  it("returns null for an unparseable string", () => {
    expect(romaWallclockToUtcIso("not-a-date")).toBeNull()
  })
})

describe("romaDateTimeToUtcIso", () => {
  it("joins date + time then converts (summer)", () => {
    expect(romaDateTimeToUtcIso("2026-07-15", "12:00")).toBe("2026-07-15T10:00:00.000Z")
  })

  it("returns null when either part is missing", () => {
    expect(romaDateTimeToUtcIso(null, "12:00")).toBeNull()
    expect(romaDateTimeToUtcIso("2026-07-15", null)).toBeNull()
  })
})

describe("utcIsoToRomaInput", () => {
  it("formats a stored UTC instant as a Rome datetime-local string (winter)", () => {
    expect(utcIsoToRomaInput("2026-01-15T11:00:00.000Z")).toBe("2026-01-15T12:00")
  })

  it("formats a stored UTC instant as a Rome datetime-local string (summer)", () => {
    expect(utcIsoToRomaInput("2026-07-15T10:00:00.000Z")).toBe("2026-07-15T12:00")
  })

  it("returns an empty string for empty/invalid input", () => {
    expect(utcIsoToRomaInput(null)).toBe("")
    expect(utcIsoToRomaInput("")).toBe("")
    expect(utcIsoToRomaInput("garbage")).toBe("")
  })
})

describe("utcIsoToRomaParts", () => {
  it("splits a stored UTC instant into Rome date + time parts (summer)", () => {
    expect(utcIsoToRomaParts("2026-07-15T10:00:00.000Z")).toEqual({
      date: "2026-07-15",
      time: "12:00",
    })
  })

  it("returns empty parts for empty/invalid input", () => {
    expect(utcIsoToRomaParts(null)).toEqual({ date: "", time: "" })
    expect(utcIsoToRomaParts("garbage")).toEqual({ date: "", time: "" })
  })
})
