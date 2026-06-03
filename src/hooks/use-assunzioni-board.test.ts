import { describe, expect, it } from "vitest"

import {
  ASSUNZIONE_FIELD_BINDINGS,
  LAVORATORE_ASSUNZIONE_FIELD_BINDINGS,
  RAPPORTO_FIELD_BINDINGS,
  RICHIESTA_ATTIVAZIONE_FIELD_BINDINGS,
  mapAssunzioniBoardCard,
  preserveMissingFields,
  type AssunzioneRecord,
  type AssunzioniBoardCardData,
} from "@/hooks/use-assunzioni-board"
import type { AssunzioniBoardRpcRow } from "@/lib/anagrafiche-api"
import type {
  FamigliaRecord,
  LavoratoreRecord,
  ProcessoMatchingRecord,
  RapportoLavorativoRecord,
  RichiestaAttivazioneRecord,
} from "@/types"

function makeRapporto(
  overrides: Partial<RapportoLavorativoRecord> = {},
): RapportoLavorativoRecord {
  return {
    id: "rap-1",
    stato_assunzione: "Avviare pratica",
    tipo_rapporto: "Convivente",
    tipo_contratto: "TempoIndeterminato",
    ...overrides,
  } as RapportoLavorativoRecord
}

function makeAssunzione(
  overrides: Partial<AssunzioneRecord> = {},
): AssunzioneRecord {
  return {
    id: "ass-1",
    creato_il: "2025-01-01T00:00:00Z",
    delega_inps_allegati: null,
    civico_se_diverso_residenza: null,
    codice_fiscale_allegati: null,
    comune_se_diverso_residenza: null,
    dati_bancari_lavoratore: null,
    documento_identita_allegati: null,
    documento_identita_numero: null,
    documento_identita_scadenza: null,
    documento_identita_tipo: null,
    famiglia_id: null,
    cittadino_extracomunitario: null,
    info_anagrafiche_cap: null,
    info_anagrafiche_cittadidanza: null,
    info_anagrafiche_civico: null,
    info_anagrafiche_codice_fiscale: null,
    info_anagrafiche_cognome: null,
    info_anagrafiche_data_di_nascita: null,
    info_anagrafiche_email: null,
    info_anagrafiche_indirizzo: null,
    info_anagrafiche_localita: null,
    info_anagrafiche_luogo_di_nascita: null,
    info_anagrafiche_nome: null,
    info_anagrafiche_numero_fisso: null,
    info_anagrafiche_numero_mobile: null,
    luogo_lavoro_se_diverso_da_residenza: null,
    mansione_lavoratore: null,
    mezza_giornata_di_riposo: null,
    ore_di_lavoro: null,
    ore_giovedi: null,
    ore_lunedi: null,
    ore_martedi: null,
    ore_mercoledi: null,
    ore_sabato: null,
    ore_venerdi: null,
    provincia: null,
    permesso_di_soggiorno_allegati: null,
    rapporto_di_lavoro_residenza: null,
    rapporto_lavorativo_datore_lavoro_id: null,
    rapporto_lavorativo_lavoratore_id: null,
    lavoratore_id: null,
    regime_convivenza: null,
    ricevuta_rinnovo_permesso_allegati: null,
    telecamere_posto_lavoro: null,
    tredicesima_rateizzata_mensile: null,
    note_aggiuntive: null,
    data_assunzione: null,
    type_of_compilazione_form: null,
    ...overrides,
  }
}

function makeRichiestaAttivazione(
  overrides: Partial<RichiestaAttivazioneRecord> = {},
): RichiestaAttivazioneRecord {
  return {
    id: "ra-1",
    data_submission: null,
    document_id: null,
    email: null,
    fee_concordata: 100,
    firmatario: null,
    processo_res_id: null,
    signed_document_id: null,
    signed_document_title: "Preventivo X",
    signed_document_url: "https://example.com/pdf",
    airtable_id: null,
    airtable_record_id: null,
    creato_il: null,
    aggiornato_il: null,
    metadati_migrazione: null,
    ...overrides,
  }
}

function makePreviousCard(
  overrides: Partial<AssunzioniBoardCardData> = {},
): AssunzioniBoardCardData {
  return {
    id: "rap-1",
    processId: "proc-1",
    stage: "Avviare pratica",
    process: { id: "proc-1", famiglia_id: "fam-1" } as ProcessoMatchingRecord,
    assunzione: makeAssunzione({
      info_anagrafiche_nome: "Mario",
      info_anagrafiche_cognome: "Rossi",
      note_aggiuntive: "PREV-NOTE",
    }),
    lavoratoreAssunzione: makeAssunzione({
      id: "ass-lav",
      info_anagrafiche_nome: "Anna",
      info_anagrafiche_cognome: "Bianchi",
      ore_di_lavoro: 40,
    }),
    richiestaAttivazione: makeRichiestaAttivazione(),
    rapporto: makeRapporto({ codice_datore_webcolf: 123 }),
    lavoratore: { id: "lav-1" } as LavoratoreRecord,
    famiglia: { id: "fam-1", nome: "F", cognome: "G" } as FamigliaRecord,
    famigliaId: "fam-1",
    nomeFamiglia: "Mario Rossi",
    nomeLavoratore: "Anna Bianchi",
    email: "a@b.it",
    telefono: "12345",
    titoloAnnuncio: "Annuncio Vecchio",
    tipoRapporto: "Convivente",
    deadline: "01/01/2025",
    ...overrides,
  }
}

describe("preserveMissingFields", () => {
  it("returns fresh unchanged when previous is null", () => {
    const fresh = { a: 1, b: 2 }
    expect(preserveMissingFields(fresh, null, ["a", "b", "c"])).toBe(fresh)
  })

  it("returns previous when fresh is null (sub-object entirely absent)", () => {
    const previous = { a: 1, b: 2 }
    expect(preserveMissingFields(null, previous, ["a", "b"])).toBe(previous)
  })

  it("returns null when both are null", () => {
    expect(preserveMissingFields(null, null, ["a"])).toBeNull()
  })

  it("restores columns absent from fresh, keeps fresh columns (including null)", () => {
    const fresh: Record<string, unknown> = { a: "FRESH", b: null }
    const previous: Record<string, unknown> = { a: "OLD", b: "OLD-B", c: "OLD-C" }
    const merged = preserveMissingFields(fresh, previous, ["a", "b", "c"])
    // Present columns win (even null)
    expect(merged).toEqual({ a: "FRESH", b: null, c: "OLD-C" })
    // Should be a new object, not the same reference as fresh
    expect(merged).not.toBe(fresh)
  })

  it("ignores columns not declared in bindings even if missing from fresh", () => {
    const fresh: Record<string, unknown> = { a: "FRESH" }
    const previous: Record<string, unknown> = { a: "OLD", undeclared: "X" }
    const merged = preserveMissingFields(fresh, previous, ["a"])
    expect(merged).toEqual({ a: "FRESH" })
    expect((merged as Record<string, unknown>).undeclared).toBeUndefined()
  })
})

describe("binding lists", () => {
  it("RAPPORTO_FIELD_BINDINGS is non-empty and includes the four enrichment columns the audit flagged", () => {
    expect(RAPPORTO_FIELD_BINDINGS.length).toBeGreaterThan(0)
    // From the audit: rapporti_lavorativi_board enrichment columns.
    expect(RAPPORTO_FIELD_BINDINGS).toContain("cognome_nome_datore_proper")
    expect(RAPPORTO_FIELD_BINDINGS).toContain("nome_lavoratore_per_url")
    expect(RAPPORTO_FIELD_BINDINGS).toContain("data_fine_rapporto")
    expect(RAPPORTO_FIELD_BINDINGS).toContain("stato_assunzione")
  })

  it("ASSUNZIONE_FIELD_BINDINGS contains the AssunzioneRecord shape", () => {
    expect(ASSUNZIONE_FIELD_BINDINGS).toContain("info_anagrafiche_nome")
    expect(ASSUNZIONE_FIELD_BINDINGS).toContain("info_anagrafiche_cognome")
    expect(ASSUNZIONE_FIELD_BINDINGS).toContain("documento_identita_numero")
    expect(ASSUNZIONE_FIELD_BINDINGS).toContain("delega_inps_allegati")
    expect(ASSUNZIONE_FIELD_BINDINGS.length).toBeGreaterThan(20)
  })

  it("LAVORATORE_ASSUNZIONE_FIELD_BINDINGS mirrors ASSUNZIONE_FIELD_BINDINGS", () => {
    expect(LAVORATORE_ASSUNZIONE_FIELD_BINDINGS).toEqual(ASSUNZIONE_FIELD_BINDINGS)
  })

  it("RICHIESTA_ATTIVAZIONE_FIELD_BINDINGS contains the key detail columns", () => {
    expect(RICHIESTA_ATTIVAZIONE_FIELD_BINDINGS).toContain("id")
    expect(RICHIESTA_ATTIVAZIONE_FIELD_BINDINGS).toContain("fee_concordata")
    expect(RICHIESTA_ATTIVAZIONE_FIELD_BINDINGS).toContain("signed_document_url")
    expect(RICHIESTA_ATTIVAZIONE_FIELD_BINDINGS).toContain("signed_document_title")
  })

  it("no duplicates inside any binding list", () => {
    const lists = {
      RAPPORTO_FIELD_BINDINGS,
      ASSUNZIONE_FIELD_BINDINGS,
      LAVORATORE_ASSUNZIONE_FIELD_BINDINGS,
      RICHIESTA_ATTIVAZIONE_FIELD_BINDINGS,
    }
    for (const [name, list] of Object.entries(lists)) {
      expect(new Set(list).size, `duplicates in ${name}`).toBe(list.length)
    }
  })
})

describe("mapAssunzioniBoardCard", () => {
  const baseRow: AssunzioniBoardRpcRow = {
    rapporto: makeRapporto(),
    process: { id: "proc-1", famiglia_id: "fam-1" } as ProcessoMatchingRecord,
    famiglia: { id: "fam-1", nome: "F", cognome: "G" } as FamigliaRecord,
    lavoratore: { id: "lav-1" } as LavoratoreRecord,
    assunzione: makeAssunzione({
      info_anagrafiche_nome: "Mario",
      info_anagrafiche_cognome: "Rossi",
    }) as unknown as Record<string, unknown>,
    lavoratoreAssunzione: makeAssunzione({
      id: "ass-lav",
      info_anagrafiche_nome: "Anna",
      info_anagrafiche_cognome: "Bianchi",
    }) as unknown as Record<string, unknown>,
  }

  it("returns null when rapporto is null", () => {
    const card = mapAssunzioniBoardCard({ ...baseRow, rapporto: null }, "Avviare pratica")
    expect(card).toBeNull()
  })

  it("maps a board row without previousCard", () => {
    const card = mapAssunzioniBoardCard(baseRow, "Avviare pratica")
    expect(card).not.toBeNull()
    expect(card!.id).toBe("rap-1")
    expect(card!.stage).toBe("Avviare pratica")
    // No previousCard → board RPC omits richiestaAttivazione → null
    expect(card!.richiestaAttivazione).toBeNull()
    expect(card!.assunzione?.info_anagrafiche_nome).toBe("Mario")
  })

  it("REGRESSION: preserves richiestaAttivazione across board refetch (board never returns it)", () => {
    const previous = makePreviousCard({
      richiestaAttivazione: makeRichiestaAttivazione({
        id: "ra-prev",
        fee_concordata: 999,
        signed_document_url: "https://prev.example.com/preventivo.pdf",
      }),
    })

    const card = mapAssunzioniBoardCard(baseRow, "Avviare pratica", previous)

    expect(card).not.toBeNull()
    expect(card!.richiestaAttivazione).not.toBeNull()
    expect(card!.richiestaAttivazione!.id).toBe("ra-prev")
    expect(card!.richiestaAttivazione!.fee_concordata).toBe(999)
    expect(card!.richiestaAttivazione!.signed_document_url).toBe(
      "https://prev.example.com/preventivo.pdf",
    )
  })

  it("preserves assunzione columns absent from a narrow board sub-row", () => {
    // Narrow assunzione: only id + info_anagrafiche_nome present. The
    // detail-only `note_aggiuntive` and `documento_identita_numero` columns
    // are absent.
    const narrowAssunzione = {
      id: "ass-1",
      info_anagrafiche_nome: "Mario",
    } as unknown as Record<string, unknown>

    const previous = makePreviousCard({
      assunzione: makeAssunzione({
        id: "ass-1",
        info_anagrafiche_nome: "PREV",
        note_aggiuntive: "PREV-NOTE",
        documento_identita_numero: "PREV-DOC",
      }),
    })

    const card = mapAssunzioniBoardCard(
      { ...baseRow, assunzione: narrowAssunzione },
      "Avviare pratica",
      previous,
    )

    expect(card).not.toBeNull()
    // Present column → fresh wins
    expect(card!.assunzione!.info_anagrafiche_nome).toBe("Mario")
    // Absent columns → previous restored
    expect(card!.assunzione!.note_aggiuntive).toBe("PREV-NOTE")
    expect(card!.assunzione!.documento_identita_numero).toBe("PREV-DOC")
  })

  it("present columns (even null) win over previous (clearing in DB propagates)", () => {
    const freshAssunzione = {
      id: "ass-1",
      note_aggiuntive: null,
    } as unknown as Record<string, unknown>

    const previous = makePreviousCard({
      assunzione: makeAssunzione({
        id: "ass-1",
        note_aggiuntive: "PREV-NOTE",
      }),
    })

    const card = mapAssunzioniBoardCard(
      { ...baseRow, assunzione: freshAssunzione },
      "Avviare pratica",
      previous,
    )

    expect(card!.assunzione!.note_aggiuntive).toBeNull()
  })

  it("preserves rapporto enrichment columns absent from a narrow board rapporto", () => {
    const narrowRapporto = {
      id: "rap-1",
      stato_assunzione: "Avviare pratica",
    } as unknown as RapportoLavorativoRecord

    const previous = makePreviousCard({
      rapporto: makeRapporto({
        codice_datore_webcolf: 1001,
        codice_dipendente_webcolf: 1002,
      }),
    })

    const card = mapAssunzioniBoardCard(
      { ...baseRow, rapporto: narrowRapporto },
      "Avviare pratica",
      previous,
    )

    expect(card!.rapporto!.codice_datore_webcolf).toBe(1001)
    expect(card!.rapporto!.codice_dipendente_webcolf).toBe(1002)
  })

  it("preserves lavoratoreAssunzione columns absent from a narrow board sub-row", () => {
    const narrowLavAss = {
      id: "ass-lav",
    } as unknown as Record<string, unknown>

    const previous = makePreviousCard({
      lavoratoreAssunzione: makeAssunzione({
        id: "ass-lav",
        ore_di_lavoro: 40,
        info_anagrafiche_codice_fiscale: "RSSMRA80A01H501Z",
      }),
    })

    const card = mapAssunzioniBoardCard(
      { ...baseRow, lavoratoreAssunzione: narrowLavAss },
      "Avviare pratica",
      previous,
    )

    expect(card!.lavoratoreAssunzione!.ore_di_lavoro).toBe(40)
    expect(card!.lavoratoreAssunzione!.info_anagrafiche_codice_fiscale).toBe(
      "RSSMRA80A01H501Z",
    )
  })
})
