/**
 * U2 — contract test for use-payroll-board's Pattern-A detail-field
 * preservation. This is the headline of the A1 "verify the Supabase-call
 * contract at the hook level" work: `preserveDetailFields` is the realtime
 * stale-detail guard a data-layer refactor is most likely to break.
 *
 * Pure unit test of the exported helper (the card mapping lives inline in the
 * non-exported async orchestrator; the realtime-bug-class behavior is the
 * helper, so it is pinned directly here). Characterization-first.
 */
import { describe, expect, it } from "vitest"

import {
  preserveDetailFields,
  PRESERVED_DETAIL_FIELDS,
} from "./use-payroll-board"
import type { PayrollBoardCardData } from "../types"

function makeCard(overrides: Partial<PayrollBoardCardData> = {}): PayrollBoardCardData {
  return {
    id: "m-1",
    stage: "todo",
    record: { id: "m-1" } as PayrollBoardCardData["record"],
    famiglia: null,
    pagamento: null,
    transazione: null,
    presenze: null,
    presenzeRegolari: null,
    rapporto: null,
    mese: null,
    richiestaAttivazione: null,
    presenzeIrregolari: false,
    nomeCompleto: "Rossi – Mario",
    importoLabel: null,
    dataInvioLabel: null,
    ...overrides,
  }
}

describe("use-payroll-board preserveDetailFields (Pattern A)", () => {
  it("PRESERVED_DETAIL_FIELDS pins exactly the detail-only fields", () => {
    expect([...PRESERVED_DETAIL_FIELDS]).toEqual(["presenze", "presenzeRegolari"])
  })

  it("no previousCard → returns the fresh card unchanged (passthrough, same reference)", () => {
    const fresh = makeCard({ presenze: null })
    expect(preserveDetailFields(fresh, undefined)).toBe(fresh)
  })

  it("restores presenze / presenzeRegolari from previous when the fresh card has them null", () => {
    const presenze = { id: "p-1" } as PayrollBoardCardData["presenze"]
    const presenzeRegolari = { id: "p-2" } as PayrollBoardCardData["presenzeRegolari"]
    const previous = makeCard({ presenze, presenzeRegolari })
    const fresh = makeCard({ presenze: null, presenzeRegolari: null })

    const merged = preserveDetailFields(fresh, previous)

    expect(merged.presenze).toBe(presenze)
    expect(merged.presenzeRegolari).toBe(presenzeRegolari)
  })

  it("keeps a non-null fresh value (fresh wins when present)", () => {
    const freshPresenze = { id: "fresh" } as PayrollBoardCardData["presenze"]
    const prevPresenze = { id: "prev" } as PayrollBoardCardData["presenze"]
    const merged = preserveDetailFields(
      makeCard({ presenze: freshPresenze }),
      makeCard({ presenze: prevPresenze }),
    )
    expect(merged.presenze).toBe(freshPresenze)
  })

  it("when previous is also null, the field stays null — there is no 'fresh-null wins / DB-clear' case", () => {
    const merged = preserveDetailFields(makeCard({ presenze: null }), makeCard({ presenze: null }))
    expect(merged.presenze).toBeNull()
  })

  it("only the preserved fields are restored — a null field NOT in the list is left as the fresh card has it", () => {
    const previous = makeCard({
      famiglia: { id: "fam" } as PayrollBoardCardData["famiglia"],
      presenze: { id: "p" } as PayrollBoardCardData["presenze"],
    })
    const merged = preserveDetailFields(makeCard({ famiglia: null, presenze: null }), previous)

    expect(merged.famiglia).toBeNull() // famiglia is not in PRESERVED_DETAIL_FIELDS
    expect(merged.presenze).toEqual({ id: "p" })
  })

  it("does not mutate the fresh or the previous card", () => {
    const prevPresenze = { id: "prev" } as PayrollBoardCardData["presenze"]
    const previous = makeCard({ presenze: prevPresenze })
    const fresh = makeCard({ presenze: null })

    const merged = preserveDetailFields(fresh, previous)

    expect(merged).not.toBe(fresh)
    expect(merged).not.toBe(previous)
    expect(fresh.presenze).toBeNull()
    expect(previous.presenze).toBe(prevPresenze)
  })
})
