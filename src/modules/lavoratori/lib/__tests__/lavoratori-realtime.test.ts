import { describe, expect, it } from "vitest"

import type { RealtimeRowEvent } from "@/hooks/use-realtime-rows"

import {
  resolveLavoratoriRealtimeWorkerId,
  shouldReloadLavoratoriBoard,
  shouldReloadLavoratoriOpenDetail,
} from "../lavoratori-realtime"

function event(partial: Partial<RealtimeRowEvent>): RealtimeRowEvent {
  return {
    table: "lavoratori",
    eventType: "UPDATE",
    newRow: null,
    oldRow: null,
    ...partial,
  }
}

describe("resolveLavoratoriRealtimeWorkerId", () => {
  it("reads lavoratori row id", () => {
    expect(
      resolveLavoratoriRealtimeWorkerId(
        event({ newRow: { id: "w1" }, oldRow: { id: "w1" } })
      )
    ).toBe("w1")
  })

  it("reads indirizzi entita_id for lavoratori entities", () => {
    expect(
      resolveLavoratoriRealtimeWorkerId(
        event({
          table: "indirizzi",
          newRow: {
            id: "addr-1",
            entita_id: "w1",
            entita_tabella: "lavoratori",
          },
        })
      )
    ).toBe("w1")
  })

  it("ignores indirizzi for non-lavoratori entities", () => {
    expect(
      resolveLavoratoriRealtimeWorkerId(
        event({
          table: "indirizzi",
          newRow: {
            id: "addr-1",
            entita_id: "fam-1",
            entita_tabella: "famiglie",
          },
        })
      )
    ).toBeNull()
  })

  it("reads lavoratore_id from related tables", () => {
    expect(
      resolveLavoratoriRealtimeWorkerId(
        event({
          table: "esperienze_lavoratori",
          newRow: { id: "exp-1", lavoratore_id: "w1" },
        })
      )
    ).toBe("w1")
    expect(
      resolveLavoratoriRealtimeWorkerId(
        event({
          table: "selezioni_lavoratori",
          oldRow: { id: "sel-1", lavoratore_id: "w2" },
          newRow: null,
          eventType: "DELETE",
        })
      )
    ).toBe("w2")
  })
})

describe("shouldReloadLavoratoriBoard", () => {
  const visible = ["w1", "w2"]

  it("reloads on lavoratori insert/delete", () => {
    expect(
      shouldReloadLavoratoriBoard(
        event({ eventType: "INSERT", newRow: { id: "w-new" } }),
        { selectedWorkerId: null, visibleWorkerIds: visible }
      )
    ).toBe(true)
  })

  it("reloads on update for visible or selected worker", () => {
    expect(
      shouldReloadLavoratoriBoard(event({ newRow: { id: "w1" } }), {
        selectedWorkerId: null,
        visibleWorkerIds: visible,
      })
    ).toBe(true)
    expect(
      shouldReloadLavoratoriBoard(event({ newRow: { id: "w-offpage" } }), {
        selectedWorkerId: "w-offpage",
        visibleWorkerIds: visible,
      })
    ).toBe(true)
  })

  it("skips update for workers not on the page", () => {
    expect(
      shouldReloadLavoratoriBoard(event({ newRow: { id: "w-other" } }), {
        selectedWorkerId: "w1",
        visibleWorkerIds: visible,
      })
    ).toBe(false)
  })

  it("never reloads the board for related-table CDC", () => {
    expect(
      shouldReloadLavoratoriBoard(
        event({
          table: "esperienze_lavoratori",
          eventType: "INSERT",
          newRow: { id: "exp-1", lavoratore_id: "w1" },
        }),
        { selectedWorkerId: "w1", visibleWorkerIds: visible }
      )
    ).toBe(false)
    expect(
      shouldReloadLavoratoriBoard(
        event({
          table: "indirizzi",
          newRow: {
            id: "addr-1",
            entita_id: "w1",
            entita_tabella: "lavoratori",
          },
        }),
        { selectedWorkerId: "w1", visibleWorkerIds: visible }
      )
    ).toBe(false)
  })
})

describe("shouldReloadLavoratoriOpenDetail", () => {
  it("reloads when the event targets the selected worker", () => {
    expect(
      shouldReloadLavoratoriOpenDetail(
        event({
          table: "indirizzi",
          newRow: {
            id: "addr-1",
            entita_id: "w1",
            entita_tabella: "lavoratori",
          },
        }),
        "w1"
      )
    ).toBe(true)
    expect(
      shouldReloadLavoratoriOpenDetail(
        event({
          table: "documenti_lavoratori",
          newRow: { id: "doc-1", lavoratore_id: "w1" },
        }),
        "w1"
      )
    ).toBe(true)
  })

  it("does not reload for a different worker id", () => {
    expect(
      shouldReloadLavoratoriOpenDetail(
        event({
          table: "esperienze_lavoratori",
          newRow: { id: "exp-1", lavoratore_id: "w-other" },
        }),
        "w1"
      )
    ).toBe(false)
  })

  it("does not reload when nothing is selected", () => {
    expect(
      shouldReloadLavoratoriOpenDetail(
        event({ newRow: { id: "w1" } }),
        null
      )
    ).toBe(false)
  })
})
