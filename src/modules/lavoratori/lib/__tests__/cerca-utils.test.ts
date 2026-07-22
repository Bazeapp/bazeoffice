import { describe, expect, it } from "vitest"

import {
  formatRelatedFamilyName,
  formatRelatedSearchLabel,
  formatSearchProcessResult,
  sanitizeFileName,
} from "../cerca-utils"

describe("cerca-utils", () => {
  it("formats related family and search labels", () => {
    expect(formatRelatedFamilyName({ nome: "Anna", cognome: "Bianchi" })).toBe(
      "Anna Bianchi",
    )
    expect(formatRelatedFamilyName(null)).toBe("Famiglia senza nome")

    expect(
      formatRelatedSearchLabel({ numero_ricerca_attivata: 42, id: "process-1" }),
    ).toBe("Ricerca #42")
  })

  it("builds search process result with zona and lookup arrays", () => {
    const result = formatSearchProcessResult(
      {
        id: "process-1",
        famiglia_id: "family-1",
        stato_res: "Attiva",
        tipo_lavoro: ["colf"],
        tipo_rapporto: ["fisso"],
        orario_di_lavoro: "Mattina",
        indirizzo_prova_comune: "Milano",
        indirizzo_prova_provincia: "MI",
      },
      { nome: "Luca", cognome: "Verdi", email: "luca@example.com" },
    )

    expect(result).toMatchObject({
      processId: "process-1",
      familyName: "Luca Verdi",
      familyEmail: "luca@example.com",
      statoRicerca: "Attiva",
      tipoLavoro: "colf",
      tipoRapporto: "fisso",
      orarioDiLavoro: "Mattina",
    })
    expect(result?.zona).toBe("Milano • MI")
  })

  it("sanitizes upload file names", () => {
    expect(sanitizeFileName(" My Photo (1).JPG ")).toBe("my-photo-1-.jpg")
  })
})
