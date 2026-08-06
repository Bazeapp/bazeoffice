import { describe, expect, it } from "vitest"

import type { RealtimeRowEvent } from "@/hooks/use-realtime-rows"

import {
  eventMatchesOpenDetailId,
  eventMatchesOpenDetailIds,
  shouldReloadBoardForVisibleRow,
} from "../realtime-open-detail"

function event(
  overrides: Partial<RealtimeRowEvent> &
    Pick<RealtimeRowEvent, "table" | "eventType">,
): RealtimeRowEvent {
  return {
    newRow: null,
    oldRow: null,
    ...overrides,
  }
}

describe("eventMatchesOpenDetailId", () => {
  it("returns false when nothing is open", () => {
    expect(
      eventMatchesOpenDetailId(
        event({
          table: "rapporti_lavorativi",
          eventType: "UPDATE",
          newRow: { id: "r1" },
        }),
        null,
      ),
    ).toBe(false)
  })

  it("matches the primary row id", () => {
    expect(
      eventMatchesOpenDetailId(
        event({
          table: "rapporti_lavorativi",
          eventType: "UPDATE",
          newRow: { id: "r1" },
        }),
        "r1",
      ),
    ).toBe(true)
  })

  it("does not match an unrelated row id", () => {
    expect(
      eventMatchesOpenDetailId(
        event({
          table: "rapporti_lavorativi",
          eventType: "UPDATE",
          newRow: { id: "r-other" },
        }),
        "r1",
      ),
    ).toBe(false)
  })

  it("matches a configured FK", () => {
    expect(
      eventMatchesOpenDetailId(
        event({
          table: "contributi_inps",
          eventType: "UPDATE",
          newRow: { id: "c1", rapporto_lavorativo_id: "r1" },
        }),
        "r1",
        ["rapporto_lavorativo_id"],
      ),
    ).toBe(true)
  })

  it("matches any id in an open-detail set", () => {
    expect(
      eventMatchesOpenDetailIds(
        event({
          table: "rapporti_lavorativi",
          eventType: "UPDATE",
          newRow: { id: "r1" },
        }),
        new Set(["chi-1", "r1"]),
      ),
    ).toBe(true)
  })
})

describe("shouldReloadBoardForVisibleRow", () => {
  const visible = new Set(["r1", "r2"])

  it("always reloads for non-target tables", () => {
    expect(
      shouldReloadBoardForVisibleRow(
        event({
          table: "selezioni_lavoratori",
          eventType: "UPDATE",
          newRow: { id: "s1" },
        }),
        { table: "rapporti_lavorativi", visibleIds: visible },
      ),
    ).toBe(true)
  })

  it("reloads INSERT/DELETE on the target table", () => {
    expect(
      shouldReloadBoardForVisibleRow(
        event({
          table: "rapporti_lavorativi",
          eventType: "INSERT",
          newRow: { id: "r-new" },
        }),
        { table: "rapporti_lavorativi", visibleIds: visible },
      ),
    ).toBe(true)
  })

  it("reloads UPDATE only for visible rows", () => {
    expect(
      shouldReloadBoardForVisibleRow(
        event({
          table: "rapporti_lavorativi",
          eventType: "UPDATE",
          newRow: { id: "r1" },
        }),
        { table: "rapporti_lavorativi", visibleIds: visible },
      ),
    ).toBe(true)
    expect(
      shouldReloadBoardForVisibleRow(
        event({
          table: "rapporti_lavorativi",
          eventType: "UPDATE",
          newRow: { id: "r-other" },
        }),
        { table: "rapporti_lavorativi", visibleIds: visible },
      ),
    ).toBe(false)
  })
})
