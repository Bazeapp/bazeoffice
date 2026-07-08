import type { CrmPipelineCardData, GenericRow } from "../types"

/**
 * Bindings between source DB columns and the card fields they populate.
 *
 * These let `mapCardData` rebuild a card while preserving any field whose
 * source column is *not present* in the fresh payload — which happens when
 * the board RPC returns a narrower SELECT than the detail RPC. Without
 * preservation, a board refetch would blank every field the board does not
 * fetch (the open detail panel would visibly empty out).
 *
 * Treatment: if `column in row` is false for a fresh payload, we keep the
 * previousCard's value for the corresponding card field. If the column is
 * present (even if null), the fresh value wins — clearing in DB still
 * propagates correctly.
 */
export const PROCESS_FIELD_BINDINGS: Array<readonly [string, keyof CrmPipelineCardData]> = [
  ["stato_res", "statoRes"],
  ["qualificazione_lead", "qualificazioneLead"],
  ["motivo_no_match", "motivoNoMatch"],
  ["modello_smartmatching", "modelloSmartmatching"],
  ["ore_settimanale", "oreSettimana"],
  ["preferenza_giorno", "giornatePreferite"],
  ["sales_cold_call_followup", "salesColdCallFollowup"],
  ["sales_no_show_followup", "salesNoShowFollowup"],
  ["motivazione_lost", "motivazioneLost"],
  ["motivazione_oot", "motivazioneOot"],
  ["appunti_chiamata_sales", "appuntiChiamataSales"],
  ["data_per_ricerca_futura", "dataPerRicercaFutura"],
  ["data_per_ricerca_futura", "dataPerRicercaFuturaRaw"],
  ["creato_il", "dataLead"],
  ["creato_il", "dataLeadRaw"],
  ["sales_cold_call_followup", "tentativiChiamataCount"],
  ["preventivo_firmato", "preventivoAccettato"],
  ["source_url", "origineUrl"],
  ["offerta", "scontoApplicato"],
  ["offerta", "scontoApplicatoRaw"],
  ["orario_di_lavoro", "orarioDiLavoro"],
  ["nucleo_famigliare", "nucleoFamigliare"],
  ["descrizione_casa", "descrizioneCasa"],
  ["metratura_casa", "metraturaCasa"],
  ["descrizione_animali_in_casa", "descrizioneAnimaliInCasa"],
  ["mansioni_richieste", "mansioniRichieste"],
  ["informazioni_extra_riservate", "informazioniExtraRiservate"],
  ["eta_minima", "etaMinima"],
  ["eta_massima", "etaMassima"],
  ["src_embed_maps_annucio", "srcEmbedMapsAnnucio"],
  ["deadline_mobile", "deadlineMobile"],
  ["disponibilita_colloqui_in_presenza", "disponibilitaColloquiInPresenza"],
  ["family_availability_json", "familyAvailabilityJson"],
  ["tipo_incontro_famiglia_lavoratore", "tipoIncontroFamigliaLavoratore"],
  ["richiesta_patente", "richiestaPatente"],
  ["richiesta_trasferte", "richiestaTrasferte"],
  ["richiesta_ferie", "richiestaFerie"],
  ["descrizione_richiesta_trasferte", "descrizioneRichiestaTrasferte"],
  ["descrizione_richiesta_ferie", "descrizioneRichiestaFerie"],
  ["patente", "patenteDettaglio"],
  ["sesso", "sesso"],
  ["nazionalita_escluse", "nazionalitaEscluse"],
  ["nazionalita_obbligatorie", "nazionalitaObbligatorie"],
  ["famiglia_molto_esigente", "famigliaMoltoEsigente"],
  ["richiesta_autonomia", "richiestaAutonomia"],
  ["datore_spesso_presente", "datoreSpessoPresente"],
  ["richiesta_discrezione", "richiestaDiscrezione"],
  ["comunicare_bene_italiano", "comunicareBeneItaliano"],
  ["comunicare_bene_inglese", "comunicareBeneInglese"],
  ["presenza_neonati", "presenzaNeonati"],
  ["piu_bambini", "piuBambini"],
  ["famiglia_4_persone", "famiglia4Persone"],
  ["cani_piccoli", "caniPiccoli"],
  ["cani_grandi", "caniGrandi"],
  ["gatti", "gatti"],
  ["pulire_ripiani_alti", "pulireRipianiAlti"],
  ["stirare", "stirare"],
  ["stirare_abiti_difficili", "stirareAbitiDifficili"],
  ["cucinare", "cucinare"],
  ["cucinare_elaborato", "cucinareElaborato"],
  ["cura_piante", "curaPiante"],
  ["testo_annuncio_whatsapp", "testoAnnuncioWhatsapp"],
  ["tipo_lavoro", "tipoLavoroBadges"],
  ["tipo_lavoro", "tipoLavoroBadge"],
  ["tipo_lavoro", "tipoLavoroColor"],
  ["tipo_lavoro", "tipoLavoroColors"],
  ["tipo_rapporto", "tipoRapportoBadge"],
  ["tipo_rapporto", "tipoRapportoColor"],
  ["numero_giorni_settimanali", "giorniSettimana"],
  ["numero_ricerca_attivata", "numeroRicercaAttivata"],
  ["frequenza_rapporto", "giorniSettimana"],
]

export const FAMILY_FIELD_BINDINGS: Array<readonly [string, keyof CrmPipelineCardData]> = [
  ["email", "email"],
  ["telefono", "telefono"],
  ["data_call_prenotata", "dataCallPrenotata"],
  ["data_call_prenotata", "dataCallPrenotataRaw"],
  ["nome", "nomeFamiglia"],
  ["cognome", "nomeFamiglia"],
]

export const ADDRESS_FIELD_BINDINGS: Array<readonly [string, keyof CrmPipelineCardData]> = [
  ["provincia", "indirizzoProvincia"],
  ["provincia_sigla", "indirizzoProvinciaSigla"],
  ["cap", "indirizzoCap"],
  ["note", "indirizzoNote"],
  ["via", "indirizzoVia"],
  ["civico", "indirizzoCivico"],
  ["citta", "indirizzoComune"],
  ["citofono", "indirizzoCitofono"],
  ["id", "indirizzoId"],
]

// Fourth data source: richiesta_attivazione attached to the process. Without
// these bindings, fee_concordata + preventivo fields visibly disappear from
// the open detail panel right after a remote realtime change, even if the
// values are intact in DB (the board fetch may not return them).
export const RICHIESTA_ATTIVAZIONE_FIELD_BINDINGS: Array<
  readonly [string, keyof CrmPipelineCardData]
> = [
  ["id", "richiestaAttivazioneId"],
  ["signed_document_url", "preventivoUrl"],
  ["signed_document_title", "preventivoTitolo"],
  ["fee_concordata", "feeConcordata"],
]

/**
 * For each binding, if the source column is NOT present in `row`, restore
 * the previous card's value. Mutates `card` in place. Pass nullable `row`:
 * if `row` is missing entirely, every bound field falls back to previous.
 */
export function preserveMissingFields(
  card: CrmPipelineCardData,
  previousCard: CrmPipelineCardData,
  row: GenericRow | undefined | null,
  bindings: Array<readonly [string, keyof CrmPipelineCardData]>,
) {
  for (const [column, field] of bindings) {
    if (row && column in row) continue
    ;(card as Record<string, unknown>)[field as string] = previousCard[field]
  }
}
