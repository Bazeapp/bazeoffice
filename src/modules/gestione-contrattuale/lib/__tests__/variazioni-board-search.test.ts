import { describe, expect, it } from "vitest"

import {
  countVariazioniBoardCards,
  filterVariazioniBoardColumns,
} from "../variazioni-board-search"
import type { VariazioniBoardCardData, VariazioniBoardColumnData } from "../../types"

function makeCard(overrides: Partial<VariazioniBoardCardData> = {}): VariazioniBoardCardData {
  return {
    id: "var-1",
    stage: "presa in carico",
    record: {
      id: "var-1",
      accordo_variazione_contrattuale: null,
      data_variazione: "2026-03-01",
      rapporto_lavorativo_id: "rapporto-1",
      ricevuta_inps_variazione_rapporto: null,
      stato: "presa in carico",
      ticket_id: null,
      variazione_da_applicare: "Aumento ore",
      airtable_id: null,
      airtable_record_id: null,
      creato_il: null,
      aggiornato_il: null,
      metadati_migrazione: null,
    },
    rapporto: null,
    famiglia: { nome: "Rossi", cognome: "Mario" },
    lavoratore: { nome: "Bianchi", cognome: "Anna" },
    nomeCompleto: "Mario Rossi - Anna Bianchi",
    dataVariazione: "01/03/2026",
    variazioneDaApplicare: "Aumento ore",
    ...overrides,
  }
}

function makeColumn(
  id: string,
  cards: VariazioniBoardCardData[],
): VariazioniBoardColumnData {
  return {
    id,
    label: id,
    color: "sky",
    cards,
  }
}

describe("filterVariazioniBoardColumns", () => {
  const columns = [
    makeColumn("stage-a", [makeCard({ id: "var-1", nomeCompleto: "Mario Rossi - Anna Bianchi" })]),
    makeColumn("stage-b", [
      makeCard({
        id: "var-2",
        nomeCompleto: "Luca Verdi - Sara Neri",
        variazioneDaApplicare: "Cambio paga",
        famiglia: { nome: "Verdi", cognome: "Luca" },
        lavoratore: { nome: "Neri", cognome: "Sara", email: "sara@example.com" },
      }),
    ]),
  ]

  it("returns all cards when search is empty", () => {
    expect(filterVariazioniBoardColumns(columns, "")).toEqual(columns)
    expect(countVariazioniBoardCards(columns)).toBe(2)
  })

  it("filters cards by family, worker, and variazione text", () => {
    const filtered = filterVariazioniBoardColumns(columns, "rossi")
    expect(filtered[0]?.cards).toHaveLength(1)
    expect(filtered[0]?.cards[0]?.id).toBe("var-1")
    expect(filtered[1]?.cards).toHaveLength(0)
    expect(countVariazioniBoardCards(filtered)).toBe(1)
  })
})
