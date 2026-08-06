import { describe, expect, it } from "vitest"

import type { RealtimeRowEvent } from "@/hooks/use-realtime-rows"

import {
  shouldReloadRicercaOpenDetail,
  type RicercaDetailRealtimeScope,
} from "./ricerca-detail-realtime"

function event(partial: Partial<RealtimeRowEvent>): RealtimeRowEvent {
  return {
    table: "processi_matching",
    eventType: "UPDATE",
    newRow: null,
    oldRow: null,
    ...partial,
  }
}

const openScope: RicercaDetailRealtimeScope = {
  processId: "proc-1",
  famigliaId: "fam-1",
  indirizzoId: "addr-1",
}

describe("shouldReloadRicercaOpenDetail", () => {
  it("reloads for the open process row", () => {
    expect(
      shouldReloadRicercaOpenDetail(
        event({ newRow: { id: "proc-1" }, oldRow: { id: "proc-1" } }),
        openScope,
      ),
    ).toBe(true)
  })

  it("ignores another process id", () => {
    expect(
      shouldReloadRicercaOpenDetail(
        event({ newRow: { id: "proc-other" }, oldRow: { id: "proc-other" } }),
        openScope,
      ),
    ).toBe(false)
  })

  it("reloads for the open family row", () => {
    expect(
      shouldReloadRicercaOpenDetail(
        event({
          table: "famiglie",
          newRow: { id: "fam-1", telefono: "333" },
          oldRow: { id: "fam-1", telefono: "111" },
        }),
        openScope,
      ),
    ).toBe(true)
  })

  it("ignores another family id", () => {
    expect(
      shouldReloadRicercaOpenDetail(
        event({
          table: "famiglie",
          newRow: { id: "fam-other" },
          oldRow: { id: "fam-other" },
        }),
        openScope,
      ),
    ).toBe(false)
  })

  it("reloads for process-linked indirizzi", () => {
    expect(
      shouldReloadRicercaOpenDetail(
        event({
          table: "indirizzi",
          newRow: {
            id: "addr-9",
            entita_id: "proc-1",
            entita_tabella: "processi_matching",
            via: "Via Nuova",
          },
          oldRow: {
            id: "addr-9",
            entita_id: "proc-1",
            entita_tabella: "processi_matching",
            via: "Via Vecchia",
          },
        }),
        openScope,
      ),
    ).toBe(true)
  })

  it("ignores indirizzi for other entities", () => {
    expect(
      shouldReloadRicercaOpenDetail(
        event({
          table: "indirizzi",
          newRow: {
            id: "addr-x",
            entita_id: "worker-1",
            entita_tabella: "lavoratori",
          },
        }),
        openScope,
      ),
    ).toBe(false)
  })

  it("returns false when no process is open", () => {
    expect(
      shouldReloadRicercaOpenDetail(
        event({ newRow: { id: "proc-1" } }),
        { processId: null, famigliaId: "fam-1", indirizzoId: "addr-1" },
      ),
    ).toBe(false)
  })
})
