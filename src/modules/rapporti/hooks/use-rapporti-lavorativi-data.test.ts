import { describe, expect, it } from "vitest"

import {
  RAPPORTO_FIELD_BINDINGS,
  mapRapportoBoardRow,
  preserveMissingFields,
} from "./use-rapporti-lavorativi-data"
import type { RapportoLavorativoRecord } from "@/types"

/**
 * Build a RapportoLavorativoRecord with all required fields populated with
 * sentinel values that make it obvious in assertions when a value came
 * from the "previous" record vs. a freshly mapped one.
 */
function makePreviousRapporto(
  overrides: Partial<RapportoLavorativoRecord> = {},
): RapportoLavorativoRecord {
  return {
    id: "prev-id",
    accordo_di_lavoro_allegati: null,
    codice_datore_webcolf: null,
    codice_dipendente_webcolf: null,
    cognome_nome_datore_proper: "Prev Datore",
    creata: null,
    data_inizio_rapporto: null,
    data_fine_rapporto: "2020-01-01",
    dichiarazione_ospitalita_allegati: null,
    distribuzione_ore_settimana: null,
    famiglia_id: "prev-fam",
    fine_rapporto_lavorativo_id: null,
    id_rapporto: "prev-id-rapp",
    lavoratore_id: "prev-lav",
    nome_lavoratore_per_url: "Prev Lavoratore",
    ore_a_settimana: null,
    paga_mensile_lorda: null,
    paga_oraria_lorda: null,
    processi_matching_id: null,
    assunzione_datore_id: null,
    assunzione_lavoratore_id: null,
    processo_res: null,
    prova_data_checkin: null,
    prova_feedback_famiglia: null,
    prova_feedback_lavoratore: null,
    prova_note_cs_famiglia: null,
    prova_note_cs_lavoratore: null,
    prova_priorita_famiglia: null,
    prova_ramo_d2: null,
    prova_stato_cs: null,
    registrazione_chiamate_famiglia: null,
    registrazione_chiamate_lavoratori: null,
    relazione_lavorativa: null,
    ricevuta_inps_allegati: null,
    richiesta_attivazione_id: null,
    stato_assunzione: null,
    stato_rapporto: "Attivo",
    stato_riattivazione: null,
    stato_servizio: null,
    ticket_id: null,
    tipo_contratto: null,
    tipo_contratto_durata: null,
    tipo_rapporto: null,
    airtable_id: null,
    creato_il: null,
    aggiornato_il: null,
    metadati_migrazione: null,
    ...overrides,
  }
}

describe("preserveMissingFields (rapporti)", () => {
  it("does nothing when bindings list is empty", () => {
    const card = makePreviousRapporto({ stato_rapporto: "NEW" })
    const previous = makePreviousRapporto({ stato_rapporto: "OLD" })
    const snapshot = { ...card }

    preserveMissingFields(
      card as unknown as Record<string, unknown>,
      previous as unknown as Record<string, unknown>,
      { stato_rapporto: "NEW" },
      [],
    )

    expect(card).toEqual(snapshot)
  })

  it("restores all bound fields from previous when row is undefined", () => {
    const card = makePreviousRapporto({
      stato_rapporto: "FRESH",
      cognome_nome_datore_proper: "FRESH-D",
    })
    const previous = makePreviousRapporto({
      stato_rapporto: "OLD",
      cognome_nome_datore_proper: "OLD-D",
    })

    preserveMissingFields(
      card as unknown as Record<string, unknown>,
      previous as unknown as Record<string, unknown>,
      undefined,
      RAPPORTO_FIELD_BINDINGS as unknown as Array<
        readonly [string, keyof Record<string, unknown>]
      >,
    )

    expect(card.stato_rapporto).toBe("OLD")
    expect(card.cognome_nome_datore_proper).toBe("OLD-D")
  })

  it("restores all bound fields from previous when row is null", () => {
    const card = makePreviousRapporto({ stato_rapporto: "FRESH" })
    const previous = makePreviousRapporto({ stato_rapporto: "OLD" })

    preserveMissingFields(
      card as unknown as Record<string, unknown>,
      previous as unknown as Record<string, unknown>,
      null,
      [["stato_rapporto", "stato_rapporto"]],
    )

    expect(card.stato_rapporto).toBe("OLD")
  })

  it("keeps card field when row contains the column with a truthy value", () => {
    const card = makePreviousRapporto({ stato_rapporto: "FRESH" })
    const previous = makePreviousRapporto({ stato_rapporto: "OLD" })

    preserveMissingFields(
      card as unknown as Record<string, unknown>,
      previous as unknown as Record<string, unknown>,
      { stato_rapporto: "FRESH-DB" },
      [["stato_rapporto", "stato_rapporto"]],
    )

    expect(card.stato_rapporto).toBe("FRESH")
  })

  it("keeps card field when row contains the column with value null (clearing propagates)", () => {
    const card = makePreviousRapporto({ stato_rapporto: null })
    const previous = makePreviousRapporto({ stato_rapporto: "OLD" })

    preserveMissingFields(
      card as unknown as Record<string, unknown>,
      previous as unknown as Record<string, unknown>,
      { stato_rapporto: null },
      [["stato_rapporto", "stato_rapporto"]],
    )

    expect(card.stato_rapporto).toBeNull()
  })

  it("restores only missing-column fields when bindings are mixed", () => {
    const card = makePreviousRapporto({
      stato_rapporto: "FRESH-S",
      cognome_nome_datore_proper: "FRESH-D",
      nome_lavoratore_per_url: "FRESH-L",
    })
    const previous = makePreviousRapporto({
      stato_rapporto: "OLD-S",
      cognome_nome_datore_proper: "OLD-D",
      nome_lavoratore_per_url: "OLD-L",
    })

    preserveMissingFields(
      card as unknown as Record<string, unknown>,
      previous as unknown as Record<string, unknown>,
      { stato_rapporto: "x", nome_lavoratore_per_url: null },
      [
        ["stato_rapporto", "stato_rapporto"],
        ["cognome_nome_datore_proper", "cognome_nome_datore_proper"],
        ["nome_lavoratore_per_url", "nome_lavoratore_per_url"],
      ],
    )

    expect(card.stato_rapporto).toBe("FRESH-S")
    expect(card.cognome_nome_datore_proper).toBe("OLD-D")
    expect(card.nome_lavoratore_per_url).toBe("FRESH-L")
  })
})

describe("mapRapportoBoardRow", () => {
  it("returns the row as-is when no previousCard is provided", () => {
    const row = makePreviousRapporto({
      id: "r-1",
      stato_rapporto: "Attivo",
      cognome_nome_datore_proper: "Rossi Mario",
    })

    const card = mapRapportoBoardRow(row)

    expect(card.id).toBe("r-1")
    expect(card.stato_rapporto).toBe("Attivo")
    expect(card.cognome_nome_datore_proper).toBe("Rossi Mario")
    // Returned value is a copy, not the same reference.
    expect(card).not.toBe(row)
  })

  it("preserves the 4 enrichment fields when absent from a narrow board row", () => {
    const previous = makePreviousRapporto({
      id: "r-1",
      cognome_nome_datore_proper: "OLD Datore",
      nome_lavoratore_per_url: "OLD Lavoratore",
      data_fine_rapporto: "2020-12-31",
      stato_rapporto: "Attivo",
      tipo_contratto: "OLD-Contratto",
    })

    // Narrow row: lacks all four enrichment columns. Simulates a degraded
    // board RPC that returns only base columns.
    const narrowRow = {
      id: "r-1",
      famiglia_id: "fam-1",
      tipo_contratto: "NEW-Contratto",
    } as unknown as RapportoLavorativoRecord

    const card = mapRapportoBoardRow(narrowRow, previous)

    // Absent columns -> previous value preserved.
    expect(card.cognome_nome_datore_proper).toBe("OLD Datore")
    expect(card.nome_lavoratore_per_url).toBe("OLD Lavoratore")
    expect(card.data_fine_rapporto).toBe("2020-12-31")
    expect(card.stato_rapporto).toBe("Attivo")

    // Present columns -> fresh value wins.
    expect(card.tipo_contratto).toBe("NEW-Contratto")
    expect(card.famiglia_id).toBe("fam-1")
  })

  it("REGRESSION: fresh enrichment values from board win over previous", () => {
    const previous = makePreviousRapporto({
      id: "r-1",
      stato_rapporto: "Attivo",
      data_fine_rapporto: null,
    })

    const fresh = makePreviousRapporto({
      id: "r-1",
      stato_rapporto: "Terminato",
      data_fine_rapporto: "2026-01-15",
    })

    const card = mapRapportoBoardRow(fresh, previous)

    expect(card.stato_rapporto).toBe("Terminato")
    expect(card.data_fine_rapporto).toBe("2026-01-15")
  })

  it("preserves all bindings from previous when the row omits every bound column", () => {
    const previous = makePreviousRapporto({
      id: "r-1",
      cognome_nome_datore_proper: "OLD-D",
      nome_lavoratore_per_url: "OLD-L",
      data_fine_rapporto: "2020-12-31",
      stato_rapporto: "OLD-S",
    })

    const minimalRow = {
      id: "r-1",
    } as unknown as RapportoLavorativoRecord

    const card = mapRapportoBoardRow(minimalRow, previous)

    for (const [column, field] of RAPPORTO_FIELD_BINDINGS) {
      if (column in minimalRow) continue
      expect(card[field]).toEqual(previous[field])
    }
  })
})

describe("RAPPORTO_FIELD_BINDINGS", () => {
  it("contains the 4 expected enrichment pairs", () => {
    const pairs = RAPPORTO_FIELD_BINDINGS.map(
      ([col, field]) => [col, field] as [string, string],
    )

    expect(pairs).toContainEqual([
      "cognome_nome_datore_proper",
      "cognome_nome_datore_proper",
    ])
    expect(pairs).toContainEqual([
      "nome_lavoratore_per_url",
      "nome_lavoratore_per_url",
    ])
    expect(pairs).toContainEqual(["data_fine_rapporto", "data_fine_rapporto"])
    expect(pairs).toContainEqual(["stato_rapporto", "stato_rapporto"])
  })

  it("has no duplicate column->field pairs", () => {
    const tokens = RAPPORTO_FIELD_BINDINGS.map(
      ([c, f]) => `${c}::${String(f)}`,
    )
    const unique = new Set(tokens)
    expect(unique.size).toBe(tokens.length)
  })
})
