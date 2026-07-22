import { describe, expect, it } from "vitest"

import { serializeCrmPipelineFilters } from "../../lib/board-fetch"
import type { CrmPipelineFilters, GenericRow } from "../../types"
import { mapCardData } from "../../lib/card-mapper"

describe("serializeCrmPipelineFilters", () => {
  it("serializes filters with stable tipoLavoro ordering for query keys", () => {
    const filters: CrmPipelineFilters = {
      createdFrom: "2026-01-01",
      createdTo: "2026-02-01",
      tipoLavoro: ["Badante", "Colf"],
      preventivoAccettato: true,
      chiamataPrenotata: false,
    }

    const key = serializeCrmPipelineFilters(filters)
    const parsed = JSON.parse(key) as CrmPipelineFilters & {
      tipoLavoro: string[]
    }

    expect(parsed.createdFrom).toBe("2026-01-01")
    expect(parsed.createdTo).toBe("2026-02-01")
    expect(parsed.preventivoAccettato).toBe(true)
    expect(parsed.chiamataPrenotata).toBe(false)
    expect(parsed.tipoLavoro).toEqual(["Badante", "Colf"])
  })

  it("round-trips equivalent filters regardless of tipoLavoro input order", () => {
    const base: CrmPipelineFilters = {
      createdFrom: null,
      createdTo: null,
      tipoLavoro: ["Colf", "Badante"],
      preventivoAccettato: null,
      chiamataPrenotata: null,
    }

    const reordered: CrmPipelineFilters = {
      ...base,
      tipoLavoro: ["Badante", "Colf"],
    }

    expect(serializeCrmPipelineFilters(base)).toBe(
      serializeCrmPipelineFilters(reordered),
    )

    const revived = JSON.parse(
      serializeCrmPipelineFilters(base),
    ) as CrmPipelineFilters
    expect(revived.tipoLavoro).toEqual(["Badante", "Colf"])
  })
})

describe("mapCardData hook integration", () => {
  const family: GenericRow = {
    id: "fam-1",
    nome: "Giulia",
    cognome: "Verdi",
    email: "giulia@example.com",
    telefono: "3331234567",
  }

  const process: GenericRow = {
    id: "proc-42",
    famiglia_id: "fam-1",
    stato_res: "Lead caldo",
    tipo_lavoro: ["Colf / Pulizie"],
    tipo_rapporto: ["Convivente"],
    creato_il: "2026-03-01T10:00:00Z",
    numero_ricerca_attivata: "RA-99",
  }

  it("maps a fixture row to the expected card shape", () => {
    const card = mapCardData(family, process, "hot_ingresso", {})

    expect(card).toMatchObject({
      id: "proc-42",
      famigliaId: "fam-1",
      stage: "hot_ingresso",
      nomeFamiglia: "Giulia Verdi",
      email: "giulia@example.com",
      telefono: "3331234567",
      statoRes: "Lead caldo",
      numeroRicercaAttivata: "RA-99",
    })
    expect(card.tipoLavoroBadges).toContain("Colf / Pulizie")
    expect(card.tipoRapportoBadge).toBe("Convivente")
    expect(card.dataLead).toMatch(/\d{2}\/\d{2}\/\d{4}/)
    expect(card.preventivoAcceptanceUrl).toContain("session_id=proc-42")
  })
})
