/**
 * U2 — contract test for use-riattivazioni-board's mapping essence: the stage
 * resolver, the inclusion filter, and the tipo label. These are the exported
 * pure helpers the board's inline async orchestrator composes; pinning them
 * pins the card-mapping contract a data-layer refactor must preserve.
 *
 * Pure unit test. Characterization-first.
 */
import { describe, expect, it } from "vitest"

import { resolveStage, hasRiattivazioneStatus, shouldShowUnclassifiedChiusura, getChiusuraTipoLabel } from "@/modules/support/hooks"
import type { ChiusuraContrattoRecord, RapportoLavorativoRecord } from "@/types"

const rapporto = (stato: string | null): RapportoLavorativoRecord =>
  ({ stato_servizio: stato }) as unknown as RapportoLavorativoRecord

const chiusura = (overrides: Partial<ChiusuraContrattoRecord>): ChiusuraContrattoRecord =>
  overrides as unknown as ChiusuraContrattoRecord

describe("use-riattivazioni-board resolveStage", () => {
  it("matches by canonical id", () => {
    expect(resolveStage("riattivato")).toBe("riattivato")
    expect(resolveStage("non riattiva")).toBe("non riattiva")
    expect(resolveStage("in attesa")).toBe("in attesa")
  })

  it("matches by label, case- and punctuation-insensitive (accents are preserved, not folded)", () => {
    expect(resolveStage("In Attesa")).toBe("in attesa")
    expect(resolveStage("Da sentire")).toBe("da sentire")
    expect(resolveStage("RIATTIVATO")).toBe("riattivato")
  })

  it("defaults to 'da sentire' on unknown / empty / null / undefined", () => {
    expect(resolveStage("qualcosa di ignoto")).toBe("da sentire")
    expect(resolveStage("")).toBe("da sentire")
    expect(resolveStage(null)).toBe("da sentire")
    expect(resolveStage(undefined)).toBe("da sentire")
  })
})

describe("use-riattivazioni-board inclusion filter", () => {
  // A chiusura card is kept iff:
  //   hasRiattivazioneStatus(record.stato_riattivazione_famiglia)
  //   || shouldShowUnclassifiedChiusura(rapporto)
  it("hasRiattivazioneStatus is true only for a non-empty normalized status", () => {
    expect(hasRiattivazioneStatus("riattivato")).toBe(true)
    expect(hasRiattivazioneStatus("")).toBe(false)
    expect(hasRiattivazioneStatus("   ")).toBe(false)
    expect(hasRiattivazioneStatus(null)).toBe(false)
    expect(hasRiattivazioneStatus(undefined)).toBe(false)
  })

  it("shouldShowUnclassifiedChiusura is true only when rapporto.stato_servizio normalizes to 'non attivo'", () => {
    expect(shouldShowUnclassifiedChiusura(rapporto("non attivo"))).toBe(true)
    expect(shouldShowUnclassifiedChiusura(rapporto("Non Attivo"))).toBe(true)
    expect(shouldShowUnclassifiedChiusura(rapporto("attivo"))).toBe(false)
    expect(shouldShowUnclassifiedChiusura(rapporto(null))).toBe(false)
    expect(shouldShowUnclassifiedChiusura(null)).toBe(false)
  })

  it("composes: status OR non-attivo rapporto → kept; no status AND active rapporto → dropped", () => {
    const keep = (stato: string, rap: RapportoLavorativoRecord | null) =>
      hasRiattivazioneStatus(stato) || shouldShowUnclassifiedChiusura(rap)

    expect(keep("riattivato", rapporto("attivo"))).toBe(true) // has explicit status
    expect(keep("", rapporto("non attivo"))).toBe(true) // no status but rapporto non attivo
    expect(keep("", rapporto("attivo"))).toBe(false) // dropped
    expect(keep("", null)).toBe(false) // dropped
  })
})

describe("use-riattivazioni-board getChiusuraTipoLabel", () => {
  it("prefers tipo_licenziamento, then tipo_decesso, then '-'", () => {
    expect(getChiusuraTipoLabel(chiusura({ tipo_licenziamento: "dimissioni", tipo_decesso: "x" }))).toBe(
      "dimissioni",
    )
    expect(getChiusuraTipoLabel(chiusura({ tipo_licenziamento: null, tipo_decesso: "decesso" }))).toBe(
      "decesso",
    )
    expect(getChiusuraTipoLabel(chiusura({ tipo_licenziamento: null, tipo_decesso: null }))).toBe("-")
  })
})
