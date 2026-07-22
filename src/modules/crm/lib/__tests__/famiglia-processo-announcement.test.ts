import { describe, expect, it } from "vitest"

import {
  getMissingAnnouncementFields,
  formatMissingAnnouncementFieldLabels,
} from "../famiglia-processo-announcement"
import type { CrmPipelineCardData } from "../../types"

function createCard(
  overrides: Partial<CrmPipelineCardData> = {}
): CrmPipelineCardData {
  return {
    id: "process-1",
    famigliaId: "family-1",
    nomeFamiglia: "Rossi Mario",
    email: "mario@example.com",
    telefono: "+393331234567",
    stage: "warm_nuovo_lead",
    orarioDiLavoro: "Mattina",
    oreSettimana: "20",
    giorniSettimana: "5",
    giornatePreferite: "Lun-Ven",
    srcEmbedMapsAnnucio: "https://maps.example.com",
    indirizzoProvincia: "MI",
    indirizzoCap: "20100",
    indirizzoVia: "Via Roma 1",
    indirizzoNote: "Centro",
    nucleoFamigliare: "2 adulti",
    descrizioneCasa: "Appartamento",
    metraturaCasa: "90mq",
    mansioniRichieste: "Pulizie",
    sesso: "F",
    ...overrides,
  } as CrmPipelineCardData
}

describe("getMissingAnnouncementFields", () => {
  it("returns all required fields when card is null", () => {
    expect(getMissingAnnouncementFields(null)).toHaveLength(14)
  })

  it("returns empty list when all required fields are present", () => {
    expect(getMissingAnnouncementFields(createCard())).toEqual([])
  })

  it("flags missing fields", () => {
    const missing = getMissingAnnouncementFields(
      createCard({ indirizzoVia: undefined, sesso: "  " })
    )

    expect(missing).toContain("indirizzoVia")
    expect(missing).toContain("sesso")
  })
})

describe("formatMissingAnnouncementFieldLabels", () => {
  it("joins human-readable labels", () => {
    expect(formatMissingAnnouncementFieldLabels(["indirizzoVia", "sesso"])).toBe(
      "Via, Genere"
    )
  })
})
