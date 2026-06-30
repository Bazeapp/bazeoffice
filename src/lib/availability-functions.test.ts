import { describe, it, expect } from "vitest"

import {
  isHardBlockingSelection,
  getSelectionAvailabilityWorkerIds,
} from "@/lib/availability-functions"

// Only the PURE functions here are unit-tested. The `invoke*` helpers call the
// edge gateway and are covered through the hooks that consume them.

describe("isHardBlockingSelection", () => {
  it("is true for hard-blocking statuses (normalizing case, accents, separators)", () => {
    expect(isHardBlockingSelection({ stato_selezione: "selezionato" })).toBe(true)
    expect(isHardBlockingSelection({ stato_selezione: "Inviato al Cliente" })).toBe(true)
    expect(isHardBlockingSelection({ stato_selezione: "colloquio_schedulato" })).toBe(true)
    expect(isHardBlockingSelection({ stato_selezione: "colloquio fàtto" })).toBe(true)
    expect(isHardBlockingSelection({ stato_selezione: "prova rimandata" })).toBe(true)
  })

  it("is false for non-blocking, empty, or missing statuses", () => {
    expect(isHardBlockingSelection({ stato_selezione: "scartato" })).toBe(false)
    expect(isHardBlockingSelection({ stato_selezione: "in attesa" })).toBe(false)
    expect(isHardBlockingSelection({})).toBe(false)
    expect(isHardBlockingSelection(null)).toBe(false)
    expect(isHardBlockingSelection(undefined)).toBe(false)
  })
})

describe("getSelectionAvailabilityWorkerIds", () => {
  it("returns [] when the patch touches no availability-relevant field", () => {
    const prev = { stato_selezione: "selezionato", lavoratore_id: "w1" }
    expect(getSelectionAvailabilityWorkerIds(prev, { note: "x" })).toEqual([])
  })

  it("returns [] when neither the previous nor the next selection is hard-blocking", () => {
    const prev = { stato_selezione: "scartato", lavoratore_id: "w1" }
    expect(getSelectionAvailabilityWorkerIds(prev, { stato_selezione: "in attesa" })).toEqual([])
  })

  it("returns the worker id when the selection transitions INTO hard-blocking", () => {
    const prev = { stato_selezione: "scartato", lavoratore_id: "w1" }
    expect(getSelectionAvailabilityWorkerIds(prev, { stato_selezione: "selezionato" })).toEqual([
      "w1",
    ])
  })

  it("returns both old and new worker ids when the worker changes while hard-blocking", () => {
    const prev = { stato_selezione: "selezionato", lavoratore_id: "w1" }
    expect(getSelectionAvailabilityWorkerIds(prev, { lavoratore_id: "w2" })).toEqual(["w1", "w2"])
  })
})
