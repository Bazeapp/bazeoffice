import { describe, expect, it } from "vitest"

import type { MeseLavorativoPreflightInput } from "./cedolini-mark-ready-preflight"
import {
  describeMarkReadyUpdateFilter,
  EXCLUDED_CASO_PARTICOLARE,
  hasCedolinoAttachment,
  isExcludedCasoParticolare,
  MARK_READY_FROM_STATO,
  MARK_READY_TABLE,
  MARK_READY_TO_STATO,
  preflightMarkReady,
} from "./cedolini-mark-ready-preflight"

function eligibleMese(overrides: Partial<MeseLavorativoPreflightInput> = {}): MeseLavorativoPreflightInput {
  return {
    cedolino: [{ name: "cedolino.pdf", path: "baze-bucket/mesi_lavorati/cedolino.pdf" }],
    mese_id: "b1f2a3c4-0000-0000-0000-000000000000",
    caso_particolare: null,
    ...overrides,
  }
}

describe("hasCedolinoAttachment", () => {
  it("array with a truthy first item -> true", () => {
    expect(hasCedolinoAttachment([{ name: "a.pdf", path: "x" }])).toBe(true)
  })

  it("null/undefined/empty array/[null] -> false", () => {
    expect(hasCedolinoAttachment(null)).toBe(false)
    expect(hasCedolinoAttachment(undefined)).toBe(false)
    expect(hasCedolinoAttachment([])).toBe(false)
    expect(hasCedolinoAttachment([null])).toBe(false)
  })

  it("non-array value -> false", () => {
    expect(hasCedolinoAttachment("not-an-array")).toBe(false)
    expect(hasCedolinoAttachment({})).toBe(false)
  })
})

describe("isExcludedCasoParticolare", () => {
  it("exact 'Tredicesima' -> true", () => {
    expect(isExcludedCasoParticolare("Tredicesima")).toBe(true)
  })

  it("exact 'Chiusura rapporto' -> true", () => {
    expect(isExcludedCasoParticolare("Chiusura rapporto")).toBe(true)
  })

  it("free-text casing/whitespace tolerant", () => {
    expect(isExcludedCasoParticolare("  TREDICESIMA ")).toBe(true)
    expect(isExcludedCasoParticolare("chiusura RAPPORTO")).toBe(true)
  })

  it("null/empty/other values -> false", () => {
    expect(isExcludedCasoParticolare(null)).toBe(false)
    expect(isExcludedCasoParticolare(undefined)).toBe(false)
    expect(isExcludedCasoParticolare("")).toBe(false)
    expect(isExcludedCasoParticolare("no")).toBe(false)
    expect(isExcludedCasoParticolare("Caso particolare")).toBe(false)
  })

  it("matches exactly the trigger's excluded set", () => {
    expect(EXCLUDED_CASO_PARTICOLARE).toHaveLength(2)
    expect(EXCLUDED_CASO_PARTICOLARE.includes("Tredicesima")).toBe(true)
    expect(EXCLUDED_CASO_PARTICOLARE.includes("Chiusura rapporto")).toBe(true)
  })
})

describe("preflightMarkReady", () => {
  it("missing cedolino -> ok:false, reason missing_cedolino", () => {
    const result = preflightMarkReady(eligibleMese({ cedolino: null }))
    expect(result.ok).toBe(false)
    expect(result.reason).toBe("missing_cedolino")
  })

  it("empty cedolino array -> ok:false, reason missing_cedolino", () => {
    const result = preflightMarkReady(eligibleMese({ cedolino: [] }))
    expect(result.ok).toBe(false)
    expect(result.reason).toBe("missing_cedolino")
  })

  it("missing mese_id -> ok:false, reason missing_mese_id", () => {
    const result = preflightMarkReady(eligibleMese({ mese_id: null }))
    expect(result.ok).toBe(false)
    expect(result.reason).toBe("missing_mese_id")
  })

  it("caso_particolare Tredicesima -> ok:false, reason excluded_caso_particolare", () => {
    const result = preflightMarkReady(eligibleMese({ caso_particolare: "Tredicesima" }))
    expect(result.ok).toBe(false)
    expect(result.reason).toBe("excluded_caso_particolare")
  })

  it("caso_particolare Chiusura rapporto -> ok:false, reason excluded_caso_particolare", () => {
    const result = preflightMarkReady(eligibleMese({ caso_particolare: "Chiusura rapporto" }))
    expect(result.ok).toBe(false)
    expect(result.reason).toBe("excluded_caso_particolare")
  })

  it("eligible (cedolino + mese_id + not excluded caso) -> ok:true", () => {
    const result = preflightMarkReady(eligibleMese())
    expect(result.ok).toBe(true)
    expect(result.reason).toBeUndefined()
  })

  it("eligible with a regular (non-excluded) caso_particolare -> ok:true", () => {
    const result = preflightMarkReady(eligibleMese({ caso_particolare: "Caso particolare" }))
    expect(result.ok).toBe(true)
  })

  it("checks cedolino before mese_id/caso when multiple fail", () => {
    const result = preflightMarkReady({ cedolino: null, mese_id: null, caso_particolare: "Tredicesima" })
    expect(result.ok).toBe(false)
    expect(result.reason).toBe("missing_cedolino")
  })
})

describe("describeMarkReadyUpdateFilter", () => {
  it("matches the KTD3 conditional UPDATE shape", () => {
    const filter = describeMarkReadyUpdateFilter()
    expect(filter.table).toBe(MARK_READY_TABLE)
    expect(filter.table).toBe("mesi_lavorati")
    expect(filter.idColumn).toBe("id")
    expect(filter.setColumn).toBe("stato_mese_lavorativo")
    expect(filter.toValue).toBe(MARK_READY_TO_STATO)
    expect(filter.toValue).toBe("Cedolino Pronto")
    expect(filter.whereColumn).toBe("stato_mese_lavorativo")
    expect(filter.whereValue).toBe(MARK_READY_FROM_STATO)
    expect(filter.whereValue).toBe("Cedolino da controllare")
  })
})
