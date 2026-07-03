import { describe, expect, it } from "vitest"

import {
  VARIAZIONE_RAPPORTO_FIELD_BINDINGS,
  VARIAZIONE_RECORD_FIELD_BINDINGS,
  mapVariazioneBoardCard,
  preserveMissingFields,
} from "./use-variazioni-board"
import type { VariazioniBoardCardData } from "../types"
import type {
  RapportoLavorativoRecord,
  VariazioneContrattualeRecord,
} from "@/types"

function makeRecord(
  overrides: Partial<VariazioneContrattualeRecord> = {},
): VariazioneContrattualeRecord {
  return {
    id: "var-1",
    accordo_variazione_contrattuale: null,
    data_variazione: "2026-04-01",
    rapporto_lavorativo_id: "rap-1",
    ricevuta_inps_variazione_rapporto: null,
    stato: "presa in carico",
    ticket_id: "PREV-ticket",
    variazione_da_applicare: "PREV-variazione",
    airtable_id: "PREV-airtable",
    airtable_record_id: "PREV-airtable-rec",
    creato_il: "2024-01-01T00:00:00Z",
    aggiornato_il: "2024-01-02T00:00:00Z",
    metadati_migrazione: null,
    ...overrides,
  }
}

function makeRapporto(
  overrides: Partial<RapportoLavorativoRecord> = {},
): RapportoLavorativoRecord {
  return {
    id: "rap-1",
    stato_assunzione: "PREV-assunzione",
    stato_servizio: "PREV-servizio",
    fine_rapporto_lavorativo_id: null,
    tipo_rapporto: "PREV-tipo",
    tipo_contratto: "PREV-contratto",
    ore_a_settimana: 40,
    paga_oraria_lorda: 10,
    data_inizio_rapporto: "2024-01-01",
    cognome_nome_datore_proper: "PREV Datore",
    famiglia_id: "fam-1",
    lavoratore_id: "lav-1",
    nome_lavoratore_per_url: "prev-lav",
    aggiornato_il: "2024-01-02T00:00:00Z",
    ...overrides,
  } as RapportoLavorativoRecord
}

function makePreviousCard(
  overrides: Partial<VariazioniBoardCardData> = {},
): VariazioniBoardCardData {
  return {
    id: "var-1",
    stage: "presa in carico",
    record: makeRecord(),
    rapporto: makeRapporto(),
    famiglia: { id: "fam-1", nome: "Prev", cognome: "Family" },
    lavoratore: { id: "lav-1", nome: "Prev", cognome: "Worker" },
    nomeCompleto: "Prev Family / Prev Worker",
    dataVariazione: "01/04/2026",
    variazioneDaApplicare: "PREV-variazione",
    ...overrides,
  }
}

describe("preserveMissingFields (variazioni)", () => {
  it("does nothing when previousRow is undefined", () => {
    const target = { stato: "FRESH" } as Record<string, unknown>
    preserveMissingFields(target, undefined, { other: "x" }, ["stato"])
    expect(target.stato).toBe("FRESH")
  })

  it("restores all bound columns from previousRow when freshRow is undefined", () => {
    const target = { stato: "X", ticket_id: "X" } as Record<string, unknown>
    const previous = { stato: "OLD", ticket_id: "OLD-T" } as Record<
      string,
      unknown
    >
    preserveMissingFields(target, previous, undefined, ["stato", "ticket_id"])
    expect(target.stato).toBe("OLD")
    expect(target.ticket_id).toBe("OLD-T")
  })

  it("restores all bound columns from previousRow when freshRow is null", () => {
    const target = { stato: "X" } as Record<string, unknown>
    const previous = { stato: "OLD" } as Record<string, unknown>
    preserveMissingFields(target, previous, null, ["stato"])
    expect(target.stato).toBe("OLD")
  })

  it("keeps target value when freshRow contains the column", () => {
    const target = { stato: "FRESH" } as Record<string, unknown>
    const previous = { stato: "OLD" } as Record<string, unknown>
    preserveMissingFields(target, previous, { stato: "FRESH-RAW" }, ["stato"])
    expect(target.stato).toBe("FRESH")
  })

  it("keeps target value when freshRow has the column with null (DB clear propagates)", () => {
    const target = { stato: null } as Record<string, unknown>
    const previous = { stato: "OLD" } as Record<string, unknown>
    preserveMissingFields(target, previous, { stato: null }, ["stato"])
    expect(target.stato).toBeNull()
  })

  it("restores only columns absent from freshRow when columns are mixed", () => {
    const target = {
      stato: "FRESH",
      ticket_id: "FRESH-T",
      airtable_id: "FRESH-A",
    } as Record<string, unknown>
    const previous = {
      stato: "OLD-S",
      ticket_id: "OLD-T",
      airtable_id: "OLD-A",
    } as Record<string, unknown>
    preserveMissingFields(
      target,
      previous,
      { stato: "x", airtable_id: null },
      ["stato", "ticket_id", "airtable_id"],
    )
    expect(target.stato).toBe("FRESH")
    expect(target.ticket_id).toBe("OLD-T")
    expect(target.airtable_id).toBe("FRESH-A")
  })
})

describe("VARIAZIONE field binding lists", () => {
  it("VARIAZIONE_RECORD_FIELD_BINDINGS contains the expected detail-only columns", () => {
    expect(VARIAZIONE_RECORD_FIELD_BINDINGS).toContain("ticket_id")
    expect(VARIAZIONE_RECORD_FIELD_BINDINGS).toContain("airtable_id")
    expect(VARIAZIONE_RECORD_FIELD_BINDINGS).toContain("airtable_record_id")
    expect(VARIAZIONE_RECORD_FIELD_BINDINGS).toContain("creato_il")
    expect(VARIAZIONE_RECORD_FIELD_BINDINGS).toContain("aggiornato_il")
    expect(VARIAZIONE_RECORD_FIELD_BINDINGS).toContain("metadati_migrazione")
    expect(VARIAZIONE_RECORD_FIELD_BINDINGS).toContain("variazione_da_applicare")
    expect(VARIAZIONE_RECORD_FIELD_BINDINGS).toContain("data_variazione")
    expect(VARIAZIONE_RECORD_FIELD_BINDINGS).toContain("stato")
  })

  it("VARIAZIONE_RAPPORTO_FIELD_BINDINGS contains the expected detail-only columns", () => {
    expect(VARIAZIONE_RAPPORTO_FIELD_BINDINGS).toContain("stato_assunzione")
    expect(VARIAZIONE_RAPPORTO_FIELD_BINDINGS).toContain("stato_servizio")
    expect(VARIAZIONE_RAPPORTO_FIELD_BINDINGS).toContain(
      "fine_rapporto_lavorativo_id",
    )
    expect(VARIAZIONE_RAPPORTO_FIELD_BINDINGS).toContain("data_inizio_rapporto")
    expect(VARIAZIONE_RAPPORTO_FIELD_BINDINGS).toContain("tipo_rapporto")
    expect(VARIAZIONE_RAPPORTO_FIELD_BINDINGS).toContain("tipo_contratto")
  })

  it("binding lists are non-empty and have no duplicates", () => {
    expect(VARIAZIONE_RECORD_FIELD_BINDINGS.length).toBeGreaterThan(0)
    expect(VARIAZIONE_RAPPORTO_FIELD_BINDINGS.length).toBeGreaterThan(0)
    expect(new Set(VARIAZIONE_RECORD_FIELD_BINDINGS).size).toBe(
      VARIAZIONE_RECORD_FIELD_BINDINGS.length,
    )
    expect(new Set(VARIAZIONE_RAPPORTO_FIELD_BINDINGS).size).toBe(
      VARIAZIONE_RAPPORTO_FIELD_BINDINGS.length,
    )
  })
})

describe("mapVariazioneBoardCard", () => {
  it("returns a card from a fresh row when no previousCard is provided", () => {
    const record = makeRecord({ variazione_da_applicare: "NEW-applicare" })
    const rapporto = makeRapporto()
    const card = mapVariazioneBoardCard(
      {
        record,
        rapporto,
        famiglia: { id: "fam-1", nome: "Anna", cognome: "Bianchi" },
        lavoratore: { id: "lav-1", nome: "Mario", cognome: "Rossi" },
      },
      "presa in carico",
    )
    expect(card.id).toBe("var-1")
    expect(card.stage).toBe("presa in carico")
    expect(card.variazioneDaApplicare).toBe("NEW-applicare")
    expect(card.dataVariazione).toBe("01/04/2026")
    expect(card.record).toEqual(record)
  })

  it("returns 'Rapporto non disponibile' when rapporto is null and no previous", () => {
    const card = mapVariazioneBoardCard(
      { record: makeRecord(), rapporto: null },
      "presa in carico",
    )
    expect(card.nomeCompleto).toBe("Rapporto non disponibile")
  })

  it("preserves record columns absent from a narrow board payload", () => {
    const previous = makePreviousCard({
      record: makeRecord({
        ticket_id: "OLD-ticket",
        airtable_id: "OLD-airtable",
        metadati_migrazione: { source: "old" },
        creato_il: "2023-01-01T00:00:00Z",
      }),
    })

    // Narrow board fetch returns only the 7 record columns the board RPC ships.
    const narrowRecord = {
      id: "var-1",
      accordo_variazione_contrattuale: null,
      rapporto_lavorativo_id: "rap-1",
      ricevuta_inps_variazione_rapporto: null,
      stato: "presa in carico",
      data_variazione: "2026-05-01",
      variazione_da_applicare: "NEW-applicare",
    } as unknown as VariazioneContrattualeRecord

    const card = mapVariazioneBoardCard(
      { record: narrowRecord, rapporto: null },
      "presa in carico",
      previous,
    )

    // Absent columns -> previous preserved.
    expect(card.record.ticket_id).toBe("OLD-ticket")
    expect(card.record.airtable_id).toBe("OLD-airtable")
    expect(card.record.metadati_migrazione).toEqual({ source: "old" })
    expect(card.record.creato_il).toBe("2023-01-01T00:00:00Z")
    // Present columns -> fresh wins.
    expect(card.record.stato).toBe("presa in carico")
    expect(card.record.variazione_da_applicare).toBe("NEW-applicare")
    expect(card.record.data_variazione).toBe("2026-05-01")
    // Derived card fields use the merged record.
    expect(card.variazioneDaApplicare).toBe("NEW-applicare")
  })

  it("preserves rapporto columns absent from a narrow board payload", () => {
    const previous = makePreviousCard({
      rapporto: makeRapporto({
        stato_assunzione: "OLD-assunzione",
        stato_servizio: "OLD-servizio",
        tipo_rapporto: "OLD-tipo",
      }),
    })

    const narrowRapporto = {
      id: "rap-1",
      data_inizio_rapporto: "2024-01-01",
    } as unknown as RapportoLavorativoRecord

    const card = mapVariazioneBoardCard(
      { record: makeRecord(), rapporto: narrowRapporto },
      "presa in carico",
      previous,
    )

    expect(card.rapporto?.stato_assunzione).toBe("OLD-assunzione")
    expect(card.rapporto?.stato_servizio).toBe("OLD-servizio")
    expect(card.rapporto?.tipo_rapporto).toBe("OLD-tipo")
    expect(card.rapporto?.data_inizio_rapporto).toBe("2024-01-01")
  })

  it("keeps previous rapporto if the board fetch drops it entirely", () => {
    const previous = makePreviousCard({ rapporto: makeRapporto({ id: "rap-1" }) })
    const card = mapVariazioneBoardCard(
      { record: makeRecord(), rapporto: null },
      "presa in carico",
      previous,
    )
    expect(card.rapporto?.id).toBe("rap-1")
  })

  it("propagates DB clears when a record column is present in fresh payload with null", () => {
    const previous = makePreviousCard({
      record: makeRecord({ ticket_id: "OLD-ticket" }),
    })

    const freshRecord = {
      id: "var-1",
      stato: "presa in carico",
      ticket_id: null,
      data_variazione: null,
      variazione_da_applicare: null,
    } as unknown as VariazioneContrattualeRecord

    const card = mapVariazioneBoardCard(
      { record: freshRecord, rapporto: null },
      "presa in carico",
      previous,
    )

    expect(card.record.ticket_id).toBeNull()
  })

  it("does not mutate the previousCard or its sub-rows", () => {
    const previousRecord = makeRecord({ ticket_id: "OLD-ticket" })
    const previousRapporto = makeRapporto({ stato_assunzione: "OLD-stato" })
    const previous = makePreviousCard({
      record: previousRecord,
      rapporto: previousRapporto,
    })

    const narrowRecord = {
      id: "var-1",
      stato: "presa in carico",
    } as unknown as VariazioneContrattualeRecord
    const narrowRapporto = {
      id: "rap-1",
    } as unknown as RapportoLavorativoRecord

    mapVariazioneBoardCard(
      { record: narrowRecord, rapporto: narrowRapporto },
      "presa in carico",
      previous,
    )

    expect(previousRecord.ticket_id).toBe("OLD-ticket")
    expect(previousRapporto.stato_assunzione).toBe("OLD-stato")
    expect(previous.record).toBe(previousRecord)
    expect(previous.rapporto).toBe(previousRapporto)
  })
})
