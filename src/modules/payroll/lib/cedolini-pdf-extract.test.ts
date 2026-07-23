import { describe, expect, it } from "vitest"

import { extractCedolinoFieldsFromText, normalizeNumber } from "./cedolini-pdf-extract"

describe("extractCedolinoFieldsFromText", () => {
  it("extracts a typical Italian cedolino layout", () => {
    const text = [
      "Paga oraria: 10,50 EUR",
      "Ore ordinarie: 160",
      "Ore straordinarie: 4,5",
      "Permesso retribuito: 2",
    ].join("\n")

    const fields = extractCedolinoFieldsFromText(text)
    expect(fields.paga_oraria).toBe(10.5)
    expect(fields.ore_ordinarie).toBe(160)
    expect(fields.ore_straordinarie).toBe(4.5)
    expect(fields.permessi_retribuiti).toBe(2)
    expect(fields.totale_ore).toBe(166.5)
  })

  it("Base Oraria / Retribuzione Totale labels", () => {
    expect(extractCedolinoFieldsFromText("Base Oraria 9,50").paga_oraria).toBe(9.5)
    expect(extractCedolinoFieldsFromText("Retribuzione Totale 11,00").paga_oraria).toBe(11)
  })

  it("sums ore components when present", () => {
    const fields = extractCedolinoFieldsFromText(
      "Ore Ordinarie 100 Straordinari 8 Permessi retribuiti 4 junk Totale ore 999",
    )
    expect(fields.ore_ordinarie).toBe(100)
    expect(fields.ore_straordinarie).toBe(8)
    expect(fields.permessi_retribuiti).toBe(4)
    expect(fields.totale_ore).toBe(112)
  })

  it("fallback H. Lavorate / Ore lavorate when no components", () => {
    expect(extractCedolinoFieldsFromText("H. Lavorate 176").totale_ore).toBe(176)
    expect(extractCedolinoFieldsFromText("Ore lavorate: 40,5").totale_ore).toBe(40.5)
  })

  it("unmatched text -> all null, never throws", () => {
    const fields = extractCedolinoFieldsFromText("documento illeggibile senza campi noti")
    expect(fields.paga_oraria).toBeNull()
    expect(fields.ore_ordinarie).toBeNull()
    expect(fields.ore_straordinarie).toBeNull()
    expect(fields.permessi_retribuiti).toBeNull()
    expect(fields.totale_ore).toBeNull()
  })

  it("empty string -> all null, never throws", () => {
    const fields = extractCedolinoFieldsFromText("")
    expect(fields.paga_oraria).toBeNull()
    expect(fields.totale_ore).toBeNull()
  })

  it("number capture matches previous tool (no thousands in token)", () => {
    const fields = extractCedolinoFieldsFromText("Ore lavorate 40,5")
    expect(fields.totale_ore).toBe(40.5)
  })
})

describe("normalizeNumber", () => {
  it("Italian thousands / decimal formats", () => {
    expect(normalizeNumber("9,50")).toBe(9.5)
    expect(normalizeNumber("1.234,56")).toBe(1234.56)
    expect(normalizeNumber(null)).toBeNull()
  })
})
