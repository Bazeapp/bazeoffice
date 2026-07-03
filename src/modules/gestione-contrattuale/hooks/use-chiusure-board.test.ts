import { describe, expect, it } from "vitest"

import {
  CHIUSURA_RAPPORTO_FIELD_BINDINGS,
  CHIUSURA_RECORD_FIELD_BINDINGS,
  mapChiusuraBoardCard,
  preserveMissingFields,
} from "./use-chiusure-board"
import type { ChiusureBoardCardData } from "../types"
import type { ChiusuraContrattoRecord, RapportoLavorativoRecord } from "@/types"

function makeRecord(
  overrides: Partial<ChiusuraContrattoRecord> = {},
): ChiusuraContrattoRecord {
  return {
    id: "chi-1",
    allegato_compilato: null,
    check_8_giorni_di_lavoro_svolti: null,
    check_chiusura_istantanea: null,
    cognome: "Rossi",
    data_creazione: null,
    data_fine_rapporto: "2026-04-01",
    data_per_riattivazione: null,
    documenti_chiusura_rapporto: null,
    email: "test@example.com",
    informazioni_aggiuntive: "PREV-info",
    motivazione_cessazione_rapporto: "PREV-motivazione",
    motivazione_lost: null,
    nome: "Mario",
    presenze_ultimo_mese: null,
    stato: "Chiusura elaborata",
    stato_riattivazione_famiglia: null,
    sconto_proposto_riattivazione: null,
    ticket_id: null,
    tipo_decesso: null,
    tipo_licenziamento: "Licenziamento",
    airtable_id: null,
    airtable_record_id: null,
    creato_il: null,
    aggiornato_il: null,
    metadati_migrazione: null,
    ...overrides,
  }
}

function makeRapporto(
  overrides: Partial<RapportoLavorativoRecord> = {},
): RapportoLavorativoRecord {
  return {
    id: "rap-1",
    assunzione_datore_id: "ass-d-1",
    assunzione_lavoratore_id: "ass-l-1",
    fine_rapporto_lavorativo_id: "chi-1",
    data_inizio_rapporto: "2024-01-01",
    data_fine_rapporto: "2026-04-01",
    stato_rapporto: "PREV-stato",
    ...(overrides as Partial<RapportoLavorativoRecord>),
  } as RapportoLavorativoRecord
}

function makePreviousCard(
  overrides: Partial<ChiusureBoardCardData> = {},
): ChiusureBoardCardData {
  return {
    id: "chi-1",
    stage: "Chiusura elaborata",
    record: makeRecord(),
    rapporto: makeRapporto(),
    nomeCompleto: "Prev Family / Prev Worker",
    email: "test@example.com",
    motivazione: "PREV-motivazione",
    dataFineRapporto: "01/04/2026",
    tipoLabel: "Licenziamento",
    tipoColor: "red",
    hasAssunzioneDatore: true,
    hasAssunzioneLavoratore: true,
    ...overrides,
  }
}

describe("preserveMissingFields (chiusure)", () => {
  it("does nothing when previousRow is undefined", () => {
    const target = { stato: "FRESH" } as Record<string, unknown>
    preserveMissingFields(target, undefined, { other: "x" }, ["stato"])
    expect(target.stato).toBe("FRESH")
  })

  it("restores all bound columns from previousRow when freshRow is undefined", () => {
    const target = { stato: "X", email: "X" } as Record<string, unknown>
    const previous = { stato: "OLD", email: "old@ex.com" } as Record<string, unknown>
    preserveMissingFields(target, previous, undefined, ["stato", "email"])
    expect(target.stato).toBe("OLD")
    expect(target.email).toBe("old@ex.com")
  })

  it("restores all bound columns from previousRow when freshRow is null", () => {
    const target = { stato: "X" } as Record<string, unknown>
    const previous = { stato: "OLD" } as Record<string, unknown>
    preserveMissingFields(target, previous, null, ["stato"])
    expect(target.stato).toBe("OLD")
  })

  it("keeps target value when freshRow contains the column with a value", () => {
    const target = { stato: "FRESH" } as Record<string, unknown>
    const previous = { stato: "OLD" } as Record<string, unknown>
    preserveMissingFields(target, previous, { stato: "FRESH-RAW" }, ["stato"])
    expect(target.stato).toBe("FRESH")
  })

  it("keeps target value when freshRow has the column with value null (DB clear propagates)", () => {
    const target = { stato: null } as Record<string, unknown>
    const previous = { stato: "OLD" } as Record<string, unknown>
    preserveMissingFields(target, previous, { stato: null }, ["stato"])
    expect(target.stato).toBeNull()
  })

  it("restores only columns absent from freshRow when columns are mixed", () => {
    const target = { stato: "FRESH", email: "FRESH-E", nome: "FRESH-N" } as Record<
      string,
      unknown
    >
    const previous = { stato: "OLD-S", email: "OLD-E", nome: "OLD-N" } as Record<
      string,
      unknown
    >
    preserveMissingFields(target, previous, { stato: "x", nome: null }, [
      "stato",
      "email",
      "nome",
    ])
    expect(target.stato).toBe("FRESH")
    expect(target.email).toBe("OLD-E")
    expect(target.nome).toBe("FRESH-N")
  })
})

describe("CHIUSURA field binding lists", () => {
  it("CHIUSURA_RECORD_FIELD_BINDINGS contains the expected detail-only columns", () => {
    expect(CHIUSURA_RECORD_FIELD_BINDINGS).toContain("motivazione_cessazione_rapporto")
    expect(CHIUSURA_RECORD_FIELD_BINDINGS).toContain("data_fine_rapporto")
    expect(CHIUSURA_RECORD_FIELD_BINDINGS).toContain("tipo_licenziamento")
    expect(CHIUSURA_RECORD_FIELD_BINDINGS).toContain("tipo_decesso")
    expect(CHIUSURA_RECORD_FIELD_BINDINGS).toContain("email")
    expect(CHIUSURA_RECORD_FIELD_BINDINGS).toContain("informazioni_aggiuntive")
    expect(CHIUSURA_RECORD_FIELD_BINDINGS).toContain("stato")
  })

  it("CHIUSURA_RAPPORTO_FIELD_BINDINGS contains the expected detail-only columns", () => {
    expect(CHIUSURA_RAPPORTO_FIELD_BINDINGS).toContain("assunzione_datore_id")
    expect(CHIUSURA_RAPPORTO_FIELD_BINDINGS).toContain("assunzione_lavoratore_id")
    expect(CHIUSURA_RAPPORTO_FIELD_BINDINGS).toContain("fine_rapporto_lavorativo_id")
    expect(CHIUSURA_RAPPORTO_FIELD_BINDINGS).toContain("data_inizio_rapporto")
  })

  it("binding lists are non-empty and have no duplicates", () => {
    expect(CHIUSURA_RECORD_FIELD_BINDINGS.length).toBeGreaterThan(0)
    expect(CHIUSURA_RAPPORTO_FIELD_BINDINGS.length).toBeGreaterThan(0)
    expect(new Set(CHIUSURA_RECORD_FIELD_BINDINGS).size).toBe(
      CHIUSURA_RECORD_FIELD_BINDINGS.length,
    )
    expect(new Set(CHIUSURA_RAPPORTO_FIELD_BINDINGS).size).toBe(
      CHIUSURA_RAPPORTO_FIELD_BINDINGS.length,
    )
  })
})

describe("mapChiusuraBoardCard", () => {
  const tipoMetadata = {
    labels: new Map<string, string>([["licenziamento", "Licenziamento"]]),
    colors: new Map<string, string>([["licenziamento", "red"]]),
    tipoLicenziamentoOptions: [],
  }

  it("returns a card from a fresh row when no previousCard is provided", () => {
    const record = makeRecord({ motivazione_cessazione_rapporto: "NEW-mot" })
    const rapporto = makeRapporto()
    const card = mapChiusuraBoardCard(
      { record, rapporto },
      "Chiusura elaborata",
      tipoMetadata,
    )
    expect(card.id).toBe("chi-1")
    expect(card.stage).toBe("Chiusura elaborata")
    expect(card.motivazione).toBe("NEW-mot")
    expect(card.hasAssunzioneDatore).toBe(true)
  })

  it("preserves record columns absent from a narrow board payload", () => {
    const previous = makePreviousCard({
      record: makeRecord({
        motivazione_cessazione_rapporto: "OLD-motivazione",
        informazioni_aggiuntive: "OLD-info",
        tipo_licenziamento: "OLD-tipo",
        email: "old@ex.com",
      }),
    })

    // Narrow board fetch returns only a few columns of the record.
    const narrowRecord = {
      id: "chi-1",
      stato: "Chiusura elaborata",
      nome: "Mario",
      cognome: "Rossi",
      data_fine_rapporto: "2026-04-01",
    } as unknown as ChiusuraContrattoRecord

    const card = mapChiusuraBoardCard(
      { record: narrowRecord, rapporto: null },
      "Chiusura elaborata",
      tipoMetadata,
      previous,
    )

    // Absent columns → previous preserved.
    expect(card.record.motivazione_cessazione_rapporto).toBe("OLD-motivazione")
    expect(card.record.informazioni_aggiuntive).toBe("OLD-info")
    expect(card.record.tipo_licenziamento).toBe("OLD-tipo")
    expect(card.record.email).toBe("old@ex.com")
    // Present columns → fresh wins.
    expect(card.record.data_fine_rapporto).toBe("2026-04-01")
    expect(card.record.stato).toBe("Chiusura elaborata")
  })

  it("preserves rapporto columns absent from a narrow board payload", () => {
    const previous = makePreviousCard({
      rapporto: makeRapporto({
        assunzione_datore_id: "OLD-ass-d",
        assunzione_lavoratore_id: "OLD-ass-l",
        stato_rapporto: "OLD-stato-r",
      }),
    })

    const narrowRapporto = {
      id: "rap-1",
      data_inizio_rapporto: "2024-01-01",
    } as unknown as RapportoLavorativoRecord

    const card = mapChiusuraBoardCard(
      { record: makeRecord(), rapporto: narrowRapporto },
      "Chiusura elaborata",
      tipoMetadata,
      previous,
    )

    expect(card.rapporto?.assunzione_datore_id).toBe("OLD-ass-d")
    expect(card.rapporto?.assunzione_lavoratore_id).toBe("OLD-ass-l")
    expect(card.rapporto?.stato_rapporto).toBe("OLD-stato-r")
    expect(card.rapporto?.data_inizio_rapporto).toBe("2024-01-01")
  })

  it("keeps previous rapporto if the board fetch drops it entirely", () => {
    const previous = makePreviousCard({ rapporto: makeRapporto({ id: "rap-1" }) })
    const card = mapChiusuraBoardCard(
      { record: makeRecord(), rapporto: null },
      "Chiusura elaborata",
      tipoMetadata,
      previous,
    )
    expect(card.rapporto?.id).toBe("rap-1")
  })

  it("propagates DB clears when a column is present in fresh payload with null", () => {
    const previous = makePreviousCard({
      record: makeRecord({ informazioni_aggiuntive: "OLD-info" }),
    })

    const freshRecord = {
      id: "chi-1",
      stato: "Chiusura elaborata",
      nome: null,
      cognome: null,
      informazioni_aggiuntive: null,
      data_fine_rapporto: null,
    } as unknown as ChiusuraContrattoRecord

    const card = mapChiusuraBoardCard(
      { record: freshRecord, rapporto: null },
      "Chiusura elaborata",
      tipoMetadata,
      previous,
    )

    expect(card.record.informazioni_aggiuntive).toBeNull()
  })

  it("does not mutate the previousCard or its sub-rows", () => {
    const previousRecord = makeRecord({ motivazione_cessazione_rapporto: "OLD" })
    const previous = makePreviousCard({ record: previousRecord })

    const narrowRecord = { id: "chi-1", stato: "Chiusura elaborata" } as unknown as ChiusuraContrattoRecord

    mapChiusuraBoardCard(
      { record: narrowRecord, rapporto: null },
      "Chiusura elaborata",
      tipoMetadata,
      previous,
    )

    expect(previousRecord.motivazione_cessazione_rapporto).toBe("OLD")
    expect(previous.record).toBe(previousRecord)
  })
})
