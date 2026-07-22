import type { RichiestaAttivazioneRecord } from "@/types"
import type { CrmPipelineCardData, GenericRow } from "../types"
import type { BoardRecordEntry, LookupColorMap } from "../types/crm-pipeline-preview"
import {
  ADDRESS_FIELD_BINDINGS,
  FAMILY_FIELD_BINDINGS,
  PROCESS_FIELD_BINDINGS,
  RICHIESTA_ATTIVAZIONE_FIELD_BINDINGS,
  preserveMissingFields,
} from "./field-bindings"
import {
  canonicalizeLookupValue,
  resolveBadgeColor,
} from "./lookup-utils"
import {
  formatItalianDate,
  formatItalianDateTime,
  getFirstArrayValue,
  getStringArrayValue,
  toBooleanValue,
  toStringValue,
} from "@/lib/value-utils"
import {
  buildAddressLine,
  buildPreventivoAcceptanceUrl,
  displayValue,
  extractFirstNumberToken,
  getCallAttemptCount,
} from "./value-utils"

export function mapCardData(
  family: GenericRow,
  process: GenericRow,
  stageId: string,
  lookupColors: LookupColorMap,
  processAddress?: GenericRow,
  richiestaAttivazione?: RichiestaAttivazioneRecord | null,
  previousCard?: CrmPipelineCardData,
): CrmPipelineCardData {
  const familyName = [toStringValue(family.nome), toStringValue(family.cognome)]
    .filter((value): value is string => Boolean(value))
    .join(" ")

  const processId = displayValue(process.id)
  const famigliaId = displayValue(process.famiglia_id)
  const preventivoSessionId = toStringValue(process.id)
  const tipoLavoroBadges = getStringArrayValue(process.tipo_lavoro)
    .map((value) => canonicalizeLookupValue("tipo_lavoro", value))
    .filter((value): value is string => Boolean(value))
  const tipoLavoroBadge = canonicalizeLookupValue(
    "tipo_lavoro",
    getFirstArrayValue(process.tipo_lavoro)
  )
  const tipoRapportoBadge = canonicalizeLookupValue(
    "tipo_rapporto",
    getFirstArrayValue(process.tipo_rapporto)
  )
  const giorniSettimanaValue =
    toStringValue(process.numero_giorni_settimanali) ??
    extractFirstNumberToken(process.frequenza_rapporto) ??
    "-"

  const card: CrmPipelineCardData = {
    id: processId,
    famigliaId,
    numeroRicercaAttivata: toStringValue(process.numero_ricerca_attivata),
    stage: stageId,
    nomeFamiglia: familyName || "-",
    email: displayValue(family.email),
    telefono: displayValue(family.telefono),
    dataLead: formatItalianDate(process.creato_il),
    tipoLavoroBadges,
    tipoLavoroColors: Object.fromEntries(
      tipoLavoroBadges.map((value) => [
        value,
        resolveBadgeColor(
          lookupColors,
          "processi_matching",
          "tipo_lavoro",
          value
        ),
      ])
    ),
    tipoLavoroBadge,
    tipoLavoroColor: resolveBadgeColor(
      lookupColors,
      "processi_matching",
      "tipo_lavoro",
      tipoLavoroBadge
    ),
    tipoRapportoBadge,
    tipoRapportoColor: resolveBadgeColor(
      lookupColors,
      "processi_matching",
      "tipo_rapporto",
      tipoRapportoBadge
    ),
    statoRes: displayValue(process.stato_res),
    qualificazioneLead: displayValue(process.qualificazione_lead),
    motivoNoMatch: displayValue(process.motivo_no_match),
    modelloSmartmatching: displayValue(process.modello_smartmatching),
    oreSettimana: displayValue(process.ore_settimanale),
    giorniSettimana: giorniSettimanaValue,
    giornatePreferite: getStringArrayValue(process.preferenza_giorno),
    salesColdCallFollowup: displayValue(process.sales_cold_call_followup),
    salesNoShowFollowup: displayValue(process.sales_no_show_followup),
    motivazioneLost: displayValue(process.motivazione_lost),
    motivazioneOot: displayValue(process.motivazione_oot),
    appuntiChiamataSales: displayValue(process.appunti_chiamata_sales),
    dataPerRicercaFutura: formatItalianDate(process.data_per_ricerca_futura),
    dataCallPrenotata: formatItalianDateTime(family.data_call_prenotata),
    dataLeadRaw: toStringValue(process.creato_il),
    dataPerRicercaFuturaRaw: toStringValue(process.data_per_ricerca_futura),
    dataCallPrenotataRaw: toStringValue(family.data_call_prenotata),
    tentativiChiamataCount: getCallAttemptCount(process.sales_cold_call_followup),
    preventivoAccettato: toBooleanValue(process.preventivo_firmato) ?? false,
    richiestaAttivazioneId: richiestaAttivazione?.id ?? null,
    preventivoUrl: richiestaAttivazione?.signed_document_url ?? null,
    preventivoTitolo: richiestaAttivazione?.signed_document_title ?? null,
    preventivoSessionId,
    preventivoAcceptanceUrl: buildPreventivoAcceptanceUrl(preventivoSessionId),
    feeConcordata: richiestaAttivazione?.fee_concordata ?? null,
    origineUrl: toStringValue(process.source_url),
    scontoApplicatoRaw: toStringValue(process.offerta),
    scontoApplicato: displayValue(process.offerta),
    orarioDiLavoro: displayValue(process.orario_di_lavoro),
    nucleoFamigliare: displayValue(process.nucleo_famigliare),
    descrizioneCasa: displayValue(process.descrizione_casa),
    metraturaCasa: displayValue(process.metratura_casa),
    descrizioneAnimaliInCasa: displayValue(process.descrizione_animali_in_casa),
    mansioniRichieste: displayValue(process.mansioni_richieste),
    informazioniExtraRiservate: displayValue(process.informazioni_extra_riservate),
    etaMinima: displayValue(process.eta_minima),
    etaMassima: displayValue(process.eta_massima),
    indirizzoProvincia: displayValue(
      processAddress?.provincia_sigla ?? processAddress?.provincia,
    ),
    indirizzoProvinciaSigla: displayValue(
      processAddress?.provincia_sigla ?? processAddress?.provincia,
    ),
    indirizzoCap: displayValue(processAddress?.cap),
    indirizzoNote: displayValue(processAddress?.note),
    indirizzoId: toStringValue(processAddress?.id),
    indirizzoCompleto: displayValue(buildAddressLine(processAddress)),
    indirizzoVia: displayValue(processAddress?.via),
    indirizzoCivico: displayValue(processAddress?.civico),
    indirizzoComune: displayValue(processAddress?.citta),
    indirizzoCitofono: displayValue(processAddress?.citofono),
    srcEmbedMapsAnnucio: displayValue(process.src_embed_maps_annucio),
    deadlineMobile: formatItalianDate(process.deadline_mobile),
    disponibilitaColloquiInPresenza: displayValue(
      process.disponibilita_colloqui_in_presenza
    ),
    familyAvailabilityJson: toStringValue(process.family_availability_json),
    tipoIncontroFamigliaLavoratore: displayValue(
      process.tipo_incontro_famiglia_lavoratore
    ),
    richiestaPatente: toBooleanValue(process.richiesta_patente) ?? false,
    richiestaTrasferte: toBooleanValue(process.richiesta_trasferte) ?? false,
    richiestaFerie: toBooleanValue(process.richiesta_ferie) ?? false,
    descrizioneRichiestaTrasferte: displayValue(process.descrizione_richiesta_trasferte),
    descrizioneRichiestaFerie: displayValue(process.descrizione_richiesta_ferie),
    patenteDettaglio: getFirstArrayValue(process.patente) ?? displayValue(process.patente),
    sesso: toStringValue(process.sesso),
    nazionalitaEscluse: getStringArrayValue(process.nazionalita_escluse),
    nazionalitaObbligatorie: getStringArrayValue(process.nazionalita_obbligatorie),
    famigliaMoltoEsigente: toBooleanValue(process.famiglia_molto_esigente) ?? false,
    richiestaAutonomia: toBooleanValue(process.richiesta_autonomia) ?? false,
    datoreSpessoPresente: toBooleanValue(process.datore_spesso_presente) ?? false,
    richiestaDiscrezione: toBooleanValue(process.richiesta_discrezione) ?? false,
    comunicareBeneItaliano: toBooleanValue(process.comunicare_bene_italiano) ?? false,
    comunicareBeneInglese: toBooleanValue(process.comunicare_bene_inglese) ?? false,
    presenzaNeonati: toBooleanValue(process.presenza_neonati) ?? false,
    piuBambini: toBooleanValue(process.piu_bambini) ?? false,
    famiglia4Persone: toBooleanValue(process.famiglia_4_persone) ?? false,
    caniPiccoli: toBooleanValue(process.cani_piccoli) ?? false,
    caniGrandi: toBooleanValue(process.cani_grandi) ?? false,
    gatti: toBooleanValue(process.gatti) ?? false,
    pulireRipianiAlti: toBooleanValue(process.pulire_ripiani_alti) ?? false,
    stirare: toBooleanValue(process.stirare) ?? false,
    stirareAbitiDifficili: toBooleanValue(process.stirare_abiti_difficili) ?? false,
    cucinare: toBooleanValue(process.cucinare) ?? false,
    cucinareElaborato: toBooleanValue(process.cucinare_elaborato) ?? false,
    curaPiante: toBooleanValue(process.cura_piante) ?? false,
    testoAnnuncioWhatsapp: displayValue(process.testo_annuncio_whatsapp),
  }

  if (previousCard) {
    preserveMissingFields(card, previousCard, process, PROCESS_FIELD_BINDINGS)
    preserveMissingFields(card, previousCard, family, FAMILY_FIELD_BINDINGS)
    preserveMissingFields(card, previousCard, processAddress, ADDRESS_FIELD_BINDINGS)
    preserveMissingFields(
      card,
      previousCard,
      (richiestaAttivazione ?? undefined) as GenericRow | undefined,
      RICHIESTA_ATTIVAZIONE_FIELD_BINDINGS,
    )
  }

  return card
}

export function mapBoardEntryToCard(
  entry: BoardRecordEntry,
  stageId: string,
  lookupColors: LookupColorMap,
  previousCard?: CrmPipelineCardData,
) {
  if (!entry.family) return null

  return mapCardData(
    entry.family,
    entry.process,
    stageId,
    lookupColors,
    entry.address ?? undefined,
    entry.richiestaAttivazione,
    previousCard,
  )
}
