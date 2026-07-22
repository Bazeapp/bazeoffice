import { describe, expect, it } from "vitest"

import {
  ADDRESS_FIELD_BINDINGS,
  FAMILY_FIELD_BINDINGS,
  PROCESS_FIELD_BINDINGS,
  RICHIESTA_ATTIVAZIONE_FIELD_BINDINGS,
  preserveMissingFields,
} from "../lib/field-bindings"
import { mapCardData } from "../lib/card-mapper"
import type { CrmPipelineCardData, GenericRow } from "../types"
import type { RichiestaAttivazioneRecord } from "@/types"

/**
 * Build a CrmPipelineCardData with all required fields populated with
 * sentinel values that make it obvious in assertions when a value came
 * from the "previous" card vs. a freshly mapped one.
 */
function makePreviousCard(
  overrides: Partial<CrmPipelineCardData> = {},
): CrmPipelineCardData {
  return {
    id: "prev-id",
    famigliaId: "prev-fam-id",
    numeroRicercaAttivata: "PREV-RA",
    stage: "prev-stage",
    nomeFamiglia: "Prev Family",
    email: "prev@example.com",
    telefono: "prev-phone",
    dataLead: "01/01/2020",
    tipoLavoroBadges: ["PrevBadge"],
    tipoLavoroColors: { PrevBadge: "red" },
    tipoLavoroBadge: "PrevBadge",
    tipoLavoroColor: "red",
    tipoRapportoBadge: "PrevRapporto",
    tipoRapportoColor: "blue",
    statoRes: "PrevStatoRes",
    qualificazioneLead: "PrevQual",
    motivoNoMatch: "PrevMotivo",
    modelloSmartmatching: "PrevModello",
    oreSettimana: "10",
    giorniSettimana: "3",
    giornatePreferite: ["Lunedi"],
    salesColdCallFollowup: "PrevCold",
    salesNoShowFollowup: "PrevNoShow",
    motivazioneLost: "PrevLost",
    motivazioneOot: "PrevOot",
    appuntiChiamataSales: "PrevAppunti",
    dataPerRicercaFutura: "02/02/2021",
    dataCallPrenotata: "03/03/2022",
    dataLeadRaw: "2020-01-01T00:00:00Z",
    dataPerRicercaFuturaRaw: "2021-02-02T00:00:00Z",
    dataCallPrenotataRaw: "2022-03-03T00:00:00Z",
    tentativiChiamataCount: 7,
    preventivoAccettato: true,
    richiestaAttivazioneId: "prev-ra-id",
    preventivoUrl: "https://prev.example.com/preventivo",
    preventivoTitolo: "Prev Titolo",
    preventivoSessionId: "prev-session",
    preventivoAcceptanceUrl: "https://prev.example.com/acceptance",
    feeConcordata: 99.5,
    origineUrl: "https://prev.example.com/origin",
    scontoApplicatoRaw: "10%",
    scontoApplicato: "10%",
    orarioDiLavoro: "PrevOrario",
    nucleoFamigliare: "PrevNucleo",
    descrizioneCasa: "PrevCasa",
    metraturaCasa: "100",
    descrizioneAnimaliInCasa: "PrevAnimali",
    mansioniRichieste: "PrevMansioni",
    informazioniExtraRiservate: "PrevExtra",
    etaMinima: "20",
    etaMassima: "60",
    indirizzoProvincia: "PrevProv",
    indirizzoProvinciaSigla: "PrevProv",
    indirizzoCap: "00100",
    indirizzoNote: "PrevNote",
    indirizzoId: "prev-indirizzo-id",
    indirizzoCompleto: "PrevCompleto",
    indirizzoVia: "PrevVia",
    indirizzoCivico: "1",
    indirizzoComune: "PrevComune",
    indirizzoCitofono: "PrevCitofono",
    srcEmbedMapsAnnucio: "PrevSrc",
    deadlineMobile: "04/04/2023",
    disponibilitaColloquiInPresenza: "PrevDispo",
    familyAvailabilityJson: "{\"prev\":true}",
    tipoIncontroFamigliaLavoratore: "PrevIncontro",
    richiestaPatente: true,
    richiestaTrasferte: true,
    richiestaFerie: true,
    descrizioneRichiestaTrasferte: "PrevTrasferte",
    descrizioneRichiestaFerie: "PrevFerie",
    patenteDettaglio: "B",
    sesso: "F",
    nazionalitaEscluse: ["IT"],
    nazionalitaObbligatorie: ["FR"],
    famigliaMoltoEsigente: true,
    richiestaAutonomia: true,
    datoreSpessoPresente: true,
    richiestaDiscrezione: true,
    comunicareBeneItaliano: true,
    comunicareBeneInglese: true,
    presenzaNeonati: true,
    piuBambini: true,
    famiglia4Persone: true,
    caniPiccoli: true,
    caniGrandi: true,
    gatti: true,
    pulireRipianiAlti: true,
    stirare: true,
    stirareAbitiDifficili: true,
    cucinare: true,
    cucinareElaborato: true,
    curaPiante: true,
    testoAnnuncioWhatsapp: "PrevTesto",
    ...overrides,
  }
}

describe("preserveMissingFields", () => {
  it("does nothing when bindings list is empty", () => {
    const card = makePreviousCard({ statoRes: "NEW" })
    const previous = makePreviousCard({ statoRes: "OLD" })
    const snapshot = { ...card }

    preserveMissingFields(card, previous, { stato_res: "NEW" }, [])

    expect(card).toEqual(snapshot)
  })

  it("restores all bound fields from previousCard when row is undefined", () => {
    const card = makePreviousCard({
      statoRes: "FRESH",
      qualificazioneLead: "FRESH-Q",
    })
    const previous = makePreviousCard({
      statoRes: "OLD",
      qualificazioneLead: "OLD-Q",
    })

    preserveMissingFields(card, previous, undefined, [
      ["stato_res", "statoRes"],
      ["qualificazione_lead", "qualificazioneLead"],
    ])

    expect(card.statoRes).toBe("OLD")
    expect(card.qualificazioneLead).toBe("OLD-Q")
  })

  it("restores all bound fields from previousCard when row is null", () => {
    const card = makePreviousCard({ statoRes: "FRESH" })
    const previous = makePreviousCard({ statoRes: "OLD" })

    preserveMissingFields(card, previous, null, [["stato_res", "statoRes"]])

    expect(card.statoRes).toBe("OLD")
  })

  it("keeps card field when row contains the column with a truthy value", () => {
    const card = makePreviousCard({ statoRes: "FRESH" })
    const previous = makePreviousCard({ statoRes: "OLD" })

    preserveMissingFields(
      card,
      previous,
      { stato_res: "FRESH-DB-VALUE" },
      [["stato_res", "statoRes"]],
    )

    expect(card.statoRes).toBe("FRESH")
  })

  it("keeps card field when row contains the column with value null (clearing in DB propagates)", () => {
    const card = makePreviousCard({ statoRes: "-" })
    const previous = makePreviousCard({ statoRes: "OLD" })

    preserveMissingFields(card, previous, { stato_res: null }, [
      ["stato_res", "statoRes"],
    ])

    expect(card.statoRes).toBe("-")
  })

  it("restores card field when row is missing the column", () => {
    const card = makePreviousCard({ statoRes: "FRESH" })
    const previous = makePreviousCard({ statoRes: "OLD" })

    preserveMissingFields(card, previous, { other_col: "x" }, [
      ["stato_res", "statoRes"],
    ])

    expect(card.statoRes).toBe("OLD")
  })

  it("restores only missing-column fields when bindings are mixed", () => {
    const card = makePreviousCard({
      statoRes: "FRESH-S",
      qualificazioneLead: "FRESH-Q",
      motivoNoMatch: "FRESH-M",
    })
    const previous = makePreviousCard({
      statoRes: "OLD-S",
      qualificazioneLead: "OLD-Q",
      motivoNoMatch: "OLD-M",
    })

    preserveMissingFields(
      card,
      previous,
      { stato_res: "x", motivo_no_match: null },
      [
        ["stato_res", "statoRes"],
        ["qualificazione_lead", "qualificazioneLead"],
        ["motivo_no_match", "motivoNoMatch"],
      ],
    )

    expect(card.statoRes).toBe("FRESH-S")
    expect(card.qualificazioneLead).toBe("OLD-Q")
    expect(card.motivoNoMatch).toBe("FRESH-M")
  })
})

describe("mapCardData", () => {
  const minimalFamily: GenericRow = {
    id: "fam-1",
    nome: "Test",
    cognome: "User",
  }

  const minimalProcess: GenericRow = {
    id: "proc-1",
    famiglia_id: "fam-1",
    stato_res: "Lead",
  }

  it("returns an object with expected shape from minimal inputs (no previousCard)", () => {
    const card = mapCardData(minimalFamily, minimalProcess, "warm_lead", {})

    expect(card.id).toBe("proc-1")
    expect(card.famigliaId).toBe("fam-1")
    expect(card.stage).toBe("warm_lead")
    expect(card.nomeFamiglia).toBe("Test User")
    expect(card.statoRes).toBe("Lead")
    expect(card.feeConcordata).toBeNull()
    expect(card.preventivoUrl).toBeNull()
    expect(card.preventivoTitolo).toBeNull()
    expect(card.richiestaAttivazioneId).toBeNull()
    expect(card.preventivoAcceptanceUrl).toContain("session_id=proc-1")
  })

  it("preserves fields whose columns are absent from a narrow board process row", () => {
    const previous = makePreviousCard({
      id: "proc-1",
      famigliaId: "fam-1",
      statoRes: "OLD-STATO",
      qualificazioneLead: "OLD-QUAL",
      motivoNoMatch: "OLD-MOTIVO",
      orarioDiLavoro: "OLD-ORARIO",
      nucleoFamigliare: "OLD-NUCLEO",
      mansioniRichieste: "OLD-MANSIONI",
    })

    // Narrow board-style row: only a few columns are present.
    const narrowProcess: GenericRow = {
      id: "proc-1",
      famiglia_id: "fam-1",
      stato_res: "NEW-STATO",
      qualificazione_lead: "NEW-QUAL",
    }

    const card = mapCardData(
      minimalFamily,
      narrowProcess,
      "warm_lead",
      {},
      undefined,
      null,
      previous,
    )

    // Present columns -> fresh value wins.
    expect(card.statoRes).toBe("NEW-STATO")
    expect(card.qualificazioneLead).toBe("NEW-QUAL")

    // Absent columns -> previous value preserved.
    expect(card.motivoNoMatch).toBe("OLD-MOTIVO")
    expect(card.orarioDiLavoro).toBe("OLD-ORARIO")
    expect(card.nucleoFamigliare).toBe("OLD-NUCLEO")
    expect(card.mansioniRichieste).toBe("OLD-MANSIONI")

    // Spot-check: every PROCESS binding whose column is absent from narrowProcess
    // must equal previous (excluding when the binding column maps to fields we
    // explicitly set fresh values for above).
    const presentColumns = new Set(Object.keys(narrowProcess))
    for (const [column, field] of PROCESS_FIELD_BINDINGS) {
      if (presentColumns.has(column)) continue
      expect(card[field]).toEqual(previous[field])
    }
  })

  it("REGRESSION: restores feeConcordata + preventivo fields from previousCard when richiestaAttivazione is null", () => {
    const previous = makePreviousCard({
      id: "proc-1",
      famigliaId: "fam-1",
      feeConcordata: 123.45,
      preventivoUrl: "https://prev/preventivo.pdf",
      preventivoTitolo: "Preventivo Vecchio",
      richiestaAttivazioneId: "ra-prev-id",
    })

    const card = mapCardData(
      minimalFamily,
      minimalProcess,
      "warm_lead",
      {},
      undefined,
      null,
      previous,
    )

    expect(card.feeConcordata).toBe(123.45)
    expect(card.preventivoUrl).toBe("https://prev/preventivo.pdf")
    expect(card.preventivoTitolo).toBe("Preventivo Vecchio")
    expect(card.richiestaAttivazioneId).toBe("ra-prev-id")
  })

  it("only restores absent richiesta_attivazione columns from previous (fresh present columns win)", () => {
    const previous = makePreviousCard({
      id: "proc-1",
      famigliaId: "fam-1",
      feeConcordata: 123.45,
      preventivoUrl: "https://prev/preventivo.pdf",
      preventivoTitolo: "Preventivo Vecchio",
      richiestaAttivazioneId: "ra-prev-id",
    })

    // Partial richiestaAttivazione: has `id` + `signed_document_url` + `signed_document_title`
    // but NOT `fee_concordata`. We cast through a partial shape — preserveMissingFields
    // only checks `column in row`, so we deliberately omit fee_concordata.
    const partialRichiesta = {
      id: "ra-new-id",
      signed_document_url: "https://new/preventivo.pdf",
      signed_document_title: "Preventivo Nuovo",
    } as unknown as RichiestaAttivazioneRecord

    const card = mapCardData(
      minimalFamily,
      minimalProcess,
      "warm_lead",
      {},
      undefined,
      partialRichiesta,
      previous,
    )

    // Fee concordata: column absent → previous preserved.
    expect(card.feeConcordata).toBe(123.45)
    // Present columns → fresh values win.
    expect(card.preventivoUrl).toBe("https://new/preventivo.pdf")
    expect(card.preventivoTitolo).toBe("Preventivo Nuovo")
    expect(card.richiestaAttivazioneId).toBe("ra-new-id")
  })
})

describe("field binding lists", () => {
  it("RICHIESTA_ATTIVAZIONE_FIELD_BINDINGS contains the 4 expected pairs", () => {
    const pairs = RICHIESTA_ATTIVAZIONE_FIELD_BINDINGS.map(
      ([col, field]) => [col, field] as [string, string],
    )

    expect(pairs).toContainEqual(["fee_concordata", "feeConcordata"])
    expect(pairs).toContainEqual(["signed_document_url", "preventivoUrl"])
    expect(pairs).toContainEqual(["signed_document_title", "preventivoTitolo"])
    expect(pairs).toContainEqual(["id", "richiestaAttivazioneId"])
  })

  it("all 4 binding arrays are non-empty", () => {
    expect(PROCESS_FIELD_BINDINGS.length).toBeGreaterThan(0)
    expect(FAMILY_FIELD_BINDINGS.length).toBeGreaterThan(0)
    expect(ADDRESS_FIELD_BINDINGS.length).toBeGreaterThan(0)
    expect(RICHIESTA_ATTIVAZIONE_FIELD_BINDINGS.length).toBeGreaterThan(0)
  })

  it("no duplicate column->field pairs within each binding list", () => {
    const checkUnique = (
      name: string,
      list: Array<readonly [string, keyof CrmPipelineCardData]>,
    ) => {
      const tokens = list.map(([c, f]) => `${c}::${String(f)}`)
      const unique = new Set(tokens)
      expect(unique.size, `duplicate pair found in ${name}`).toBe(tokens.length)
    }

    checkUnique("PROCESS_FIELD_BINDINGS", PROCESS_FIELD_BINDINGS)
    checkUnique("FAMILY_FIELD_BINDINGS", FAMILY_FIELD_BINDINGS)
    checkUnique("ADDRESS_FIELD_BINDINGS", ADDRESS_FIELD_BINDINGS)
    checkUnique(
      "RICHIESTA_ATTIVAZIONE_FIELD_BINDINGS",
      RICHIESTA_ATTIVAZIONE_FIELD_BINDINGS,
    )
  })
})
