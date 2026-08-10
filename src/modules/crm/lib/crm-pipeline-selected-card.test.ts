import { describe, expect, it } from "vitest"

import type { CrmPipelineCardData, CrmPipelineColumnData } from "../types"
import {
  findCardInPipelineColumns,
  resolveSelectedPipelineCard,
} from "./crm-pipeline-selected-card"

function makeCard(
  overrides: Partial<CrmPipelineCardData> & Pick<CrmPipelineCardData, "id">,
): CrmPipelineCardData {
  return {
    famigliaId: "fam-1",
    numeroRicercaAttivata: null,
    stage: "hot_ingresso",
    nomeFamiglia: "Test",
    email: "",
    telefono: "",
    dataLead: "",
    tipoLavoroBadge: null,
    tipoLavoroColor: null,
    tipoRapportoBadge: null,
    tipoRapportoColor: null,
    statoRes: "",
    qualificazioneLead: "",
    motivoNoMatch: "",
    modelloSmartmatching: "",
    oreSettimana: "",
    giorniSettimana: "",
    giornatePreferite: [],
    salesColdCallFollowup: "",
    salesNoShowFollowup: "",
    motivazioneLost: "",
    motivazioneOot: "",
    appuntiChiamataSales: "",
    dataPerRicercaFutura: "",
    dataCallPrenotata: "",
    dataLeadRaw: null,
    dataPerRicercaFuturaRaw: null,
    dataCallPrenotataRaw: null,
    tentativiChiamataCount: 0,
    preventivoAccettato: false,
    richiestaAttivazioneId: null,
    preventivoUrl: null,
    preventivoTitolo: null,
    preventivoSessionId: null,
    preventivoAcceptanceUrl: null,
    feeConcordata: null,
    origineUrl: null,
    scontoApplicatoRaw: null,
    scontoApplicato: "",
    orarioDiLavoro: "",
    nucleoFamigliare: "",
    descrizioneCasa: "",
    metraturaCasa: "",
    descrizioneAnimaliInCasa: "",
    mansioniRichieste: "",
    informazioniExtraRiservate: "",
    etaMinima: "",
    etaMassima: "",
    indirizzoProvincia: "",
    indirizzoProvinciaSigla: "",
    indirizzoCap: "",
    indirizzoNote: "",
    indirizzoId: null,
    indirizzoCompleto: "",
    indirizzoVia: "",
    indirizzoCivico: "",
    indirizzoComune: "",
    indirizzoCitofono: "",
    deadlineMobile: "",
    disponibilitaColloquiInPresenza: "",
    tipoIncontroFamigliaLavoratore: "",
    richiestaPatente: false,
    richiestaTrasferte: false,
    richiestaFerie: false,
    descrizioneRichiestaTrasferte: "",
    descrizioneRichiestaFerie: "",
    patenteDettaglio: "",
    sesso: null,
    nazionalitaEscluse: [],
    nazionalitaObbligatorie: [],
    famigliaMoltoEsigente: false,
    richiestaAutonomia: false,
    datoreSpessoPresente: false,
    richiestaDiscrezione: false,
    comunicareBeneItaliano: false,
    comunicareBeneInglese: false,
    presenzaNeonati: false,
    piuBambini: false,
    famiglia4Persone: false,
    caniPiccoli: false,
    caniGrandi: false,
    gatti: false,
    pulireRipianiAlti: false,
    stirare: false,
    stirareAbitiDifficili: false,
    cucinare: false,
    cucinareElaborato: false,
    curaPiante: false,
    testoAnnuncioWhatsapp: "",
    salesOperatorId: null,
    ...overrides,
  }
}

describe("findCardInPipelineColumns", () => {
  it("returns the card when present", () => {
    const card = makeCard({ id: "p1", salesOperatorId: "sales-a" })
    const columns: CrmPipelineColumnData[] = [
      { id: "hot_ingresso", label: "HOT", color: null, totalCount: 1, cards: [card] },
    ]
    expect(findCardInPipelineColumns(columns, "p1")).toBe(card)
  })

  it("returns null when missing", () => {
    expect(findCardInPipelineColumns([], "p1")).toBeNull()
  })
})

describe("resolveSelectedPipelineCard", () => {
  it("prefers the live board card over the retained snapshot", () => {
    const retained = makeCard({ id: "p1", salesOperatorId: "sales-old" })
    const live = makeCard({ id: "p1", salesOperatorId: "sales-new" })
    const columns: CrmPipelineColumnData[] = [
      { id: "hot_ingresso", label: "HOT", color: null, totalCount: 1, cards: [live] },
    ]

    expect(resolveSelectedPipelineCard("p1", columns, retained)).toBe(live)
  })

  it("falls back to the retained card when the board no longer contains it", () => {
    const retained = makeCard({ id: "p1", salesOperatorId: "sales-new" })
    const columns: CrmPipelineColumnData[] = [
      { id: "hot_ingresso", label: "HOT", color: null, totalCount: 0, cards: [] },
    ]

    expect(resolveSelectedPipelineCard("p1", columns, retained)).toBe(retained)
  })

  it("returns null when nothing is selected or retained id mismatches", () => {
    const retained = makeCard({ id: "other" })
    expect(resolveSelectedPipelineCard(null, [], retained)).toBeNull()
    expect(resolveSelectedPipelineCard("p1", [], retained)).toBeNull()
  })
})
