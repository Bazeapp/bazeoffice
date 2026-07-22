import type { LookupOptionsByField } from "@/modules/crm/types"
import { fetchFamiglieByIds } from "@/modules/crm/queries"
import { fetchProcessiMatchingByIds } from "../queries/fetch-processi-matching-by-ids"
import { fetchIndirizziByEntity } from "@/lib/indirizzi-api"
import { fetchLookupValues } from "@/lib/lookup-values"
import { getRicercaCenter } from "./center-coords"
import type { RicercaDetailCardData } from "./ricerca-detail-view.types"
import {
  buildAddressLine,
  buildLookupOptionsByField,
  displayBooleanValue,
  displayItalianRequirementValue,
  displayListValue,
  displayValue,
  formatItalianDate,
  getCallAttemptCount,
  getFirstArrayValue,
  getFirstPresentValue,
  getStringArrayValue,
  normalizeLookupToken,
  toBooleanValue,
  toStringValue,
} from "./ricerca-detail-view.utils"

export function applyProcessPatchToCard(
  card: RicercaDetailCardData,
  patch: Record<string, unknown>,
): RicercaDetailCardData {
  const nextCard = { ...card };

  if ("stato_res" in patch) {
    nextCard.statoRes = displayValue(patch.stato_res);
  }
  if ("tipo_incontro_famiglia_lavoratore" in patch) {
    nextCard.tipoIncontroFamigliaLavoratore = displayValue(
      patch.tipo_incontro_famiglia_lavoratore,
    );
  }
  if ("motivo_no_match" in patch) {
    nextCard.motivoNoMatch = displayValue(patch.motivo_no_match);
  }
  if ("orario_di_lavoro" in patch) {
    nextCard.orarioDiLavoro = displayValue(patch.orario_di_lavoro);
  }
  if ("ore_settimanale" in patch) {
    nextCard.oreSettimana = displayValue(patch.ore_settimanale);
  }
  if ("numero_giorni_settimanali" in patch) {
    nextCard.giorniSettimana = displayValue(patch.numero_giorni_settimanali);
  }
  if ("preferenza_giorno" in patch) {
    nextCard.giornatePreferite = getStringArrayValue(patch.preferenza_giorno);
  }
  if ("mansioni_richieste" in patch) {
    nextCard.mansioniRichieste = displayValue(patch.mansioni_richieste);
  }
  if ("deadline_mobile" in patch) {
    nextCard.deadlineMobile = formatItalianDate(patch.deadline_mobile);
    nextCard.deadlineMobileRaw = toStringValue(patch.deadline_mobile) ?? "";
  }
  if ("data_assegnazione" in patch) {
    nextCard.dataAssegnazione = formatItalianDate(patch.data_assegnazione);
    nextCard.dataAssegnazioneRaw = toStringValue(patch.data_assegnazione) ?? "";
  }
  if ("disponibilita_colloqui_in_presenza" in patch) {
    nextCard.disponibilitaColloquiInPresenza = displayValue(
      patch.disponibilita_colloqui_in_presenza,
    );
  }
  if ("indirizzo_prova_provincia" in patch) {
    nextCard.indirizzoProvaProvincia = displayValue(patch.indirizzo_prova_provincia);
  }
  if ("indirizzo_prova_cap" in patch) {
    nextCard.indirizzoProvaCap = displayValue(patch.indirizzo_prova_cap);
  }
  if ("indirizzo_prova_note" in patch) {
    nextCard.indirizzoProvaNote = displayValue(patch.indirizzo_prova_note);
  }
  if ("indirizzo_prova_via" in patch) {
    nextCard.indirizzoProvaVia = displayValue(patch.indirizzo_prova_via);
  }
  if ("indirizzo_prova_civico" in patch) {
    nextCard.indirizzoProvaCivico = displayValue(patch.indirizzo_prova_civico);
  }
  if ("indirizzo_prova_comune" in patch) {
    nextCard.indirizzoProvaComune = displayValue(patch.indirizzo_prova_comune);
  }
  if ("indirizzo_prova_citofono" in patch) {
    nextCard.indirizzoProvaCitofono = displayValue(patch.indirizzo_prova_citofono);
  }
  if ("recruiter_ricerca_e_selezione_id" in patch) {
    nextCard.recruiterId =
      toStringValue(patch.recruiter_ricerca_e_selezione_id) ?? "";
  }
  if ("nucleo_famigliare" in patch) {
    nextCard.nucleoFamigliare = displayValue(patch.nucleo_famigliare);
  }
  if ("descrizione_casa" in patch) {
    nextCard.descrizioneCasa = displayValue(patch.descrizione_casa);
  }
  if ("metratura_casa" in patch) {
    nextCard.metraturaCasa = displayValue(patch.metratura_casa);
  }
  if ("descrizione_animali_in_casa" in patch) {
    nextCard.descrizioneAnimaliInCasa = displayValue(patch.descrizione_animali_in_casa);
  }
  if ("richiesta_patente" in patch) {
    nextCard.richiestaPatente = Boolean(patch.richiesta_patente);
  }
  if ("richiesta_trasferte" in patch) {
    nextCard.richiestaTrasferte = Boolean(patch.richiesta_trasferte);
  }
  if ("richiesta_ferie" in patch) {
    nextCard.richiestaFerie = Boolean(patch.richiesta_ferie);
  }
  if ("eta_minima" in patch) {
    nextCard.etaMinima = displayValue(patch.eta_minima);
  }
  if ("eta_massima" in patch) {
    nextCard.etaMassima = displayValue(patch.eta_massima);
  }
  if ("sesso" in patch) {
    nextCard.sesso = toStringValue(patch.sesso);
  }
  if ("comunicare_bene_italiano" in patch) {
    nextCard.comunicareBeneItaliano = Boolean(patch.comunicare_bene_italiano);
    nextCard.comunicaItaliano = displayBooleanValue(patch.comunicare_bene_italiano);
  }
  if ("comunicare_bene_inglese" in patch) {
    nextCard.comunicareBeneInglese = Boolean(patch.comunicare_bene_inglese);
    nextCard.comunicaInglese = displayBooleanValue(patch.comunicare_bene_inglese);
  }
  if ("famiglia_molto_esigente" in patch) {
    nextCard.famigliaMoltoEsigente = Boolean(patch.famiglia_molto_esigente);
    nextCard.famigliaMoltoEsigenteLabel = displayBooleanValue(patch.famiglia_molto_esigente);
  }
  if ("richiesta_autonomia" in patch) {
    nextCard.richiestaAutonomia = Boolean(patch.richiesta_autonomia);
    nextCard.richiestaAutonomiaLabel = displayBooleanValue(patch.richiesta_autonomia);
  }
  if ("datore_spesso_presente" in patch) {
    nextCard.datoreSpessoPresente = Boolean(patch.datore_spesso_presente);
    nextCard.datoreSpessoPresenteLabel = displayBooleanValue(patch.datore_spesso_presente);
  }
  if ("richiesta_discrezione" in patch) {
    nextCard.richiestaDiscrezione = Boolean(patch.richiesta_discrezione);
    nextCard.richiestaDiscrezioneLabel = displayBooleanValue(patch.richiesta_discrezione);
  }
  if ("nazionalita_escluse" in patch) {
    nextCard.nazionalitaEscluse = getStringArrayValue(patch.nazionalita_escluse);
    nextCard.nazionalitaEscluseLabel = displayListValue(patch.nazionalita_escluse);
  }
  if ("nazionalita_obbligatorie" in patch) {
    nextCard.nazionalitaObbligatorie = getStringArrayValue(patch.nazionalita_obbligatorie);
    nextCard.nazionalitaObbligatorieLabel = displayListValue(patch.nazionalita_obbligatorie);
  }
  if ("descrizione_richiesta_trasferte" in patch) {
    nextCard.descrizioneRichiestaTrasferte = displayValue(patch.descrizione_richiesta_trasferte);
  }
  if ("descrizione_richiesta_ferie" in patch) {
    nextCard.descrizioneRichiestaFerie = displayValue(patch.descrizione_richiesta_ferie);
  }
  if ("informazioni_extra_riservate" in patch) {
    nextCard.informazioniExtraRiservate = displayValue(patch.informazioni_extra_riservate);
  }
  if ("testo_annuncio_whatsapp" in patch) {
    nextCard.testoAnnuncioWhatsapp = displayValue(patch.testo_annuncio_whatsapp);
  }

  return nextCard;
}

export function applyAddressPatchToCard(
  card: RicercaDetailCardData,
  patch: Record<string, unknown>,
  addressId?: string | null,
): RicercaDetailCardData {
  const nextCard = { ...card };
  if (addressId) {
    nextCard.indirizzoId = addressId;
  }
  if ("provincia" in patch) {
    nextCard.indirizzoProvincia = displayValue(patch.provincia);
  }
  if ("provincia_sigla" in patch) {
    nextCard.indirizzoProvincia = displayValue(patch.provincia_sigla);
  }
  if ("cap" in patch) {
    nextCard.indirizzoCap = displayValue(patch.cap);
  }
  if ("note" in patch) {
    nextCard.indirizzoNote = displayValue(patch.note);
  }
  if ("via" in patch) {
    nextCard.indirizzoVia = displayValue(patch.via);
  }
  if ("civico" in patch) {
    nextCard.indirizzoCivico = displayValue(patch.civico);
  }
  if ("citta" in patch) {
    nextCard.indirizzoComune = displayValue(patch.citta);
  }
  if ("citofono" in patch) {
    nextCard.indirizzoCitofono = displayValue(patch.citofono);
  }
  nextCard.indirizzoCompleto = displayValue(
    buildAddressLine({
      via: "via" in patch ? patch.via : nextCard.indirizzoVia,
      civico: "civico" in patch ? patch.civico : nextCard.indirizzoCivico,
      citta: "citta" in patch ? patch.citta : nextCard.indirizzoComune,
      cap: "cap" in patch ? patch.cap : nextCard.indirizzoCap,
    }),
  );
  return nextCard;
}

export function applyFamilyPatchToCard(
  card: RicercaDetailCardData,
  patch: Record<string, unknown>,
): RicercaDetailCardData {
  const nextCard = { ...card };
  if ("telefono" in patch) {
    nextCard.telefono = displayValue(patch.telefono);
  }
  if ("email" in patch) {
    nextCard.email = displayValue(patch.email);
  }
  return nextCard;
}

export async function loadRicercaDetailCard(processId: string): Promise<{
  card: RicercaDetailCardData | null
  lookupOptionsByField: LookupOptionsByField
}> {
  const [processResult, lookupResult] = await Promise.all([
    fetchProcessiMatchingByIds({ ids: [processId] }),
    fetchLookupValues(),
  ])

  const lookupOptionsByField = buildLookupOptionsByField(lookupResult.rows)

  const processRow = Array.isArray(processResult.rows)
    ? (processResult.rows[0] as Record<string, unknown> | undefined)
    : undefined

  if (!processRow) {
    return { card: null, lookupOptionsByField }
  }

  const famigliaId = toStringValue(processRow.famiglia_id)
  let familyRow: Record<string, unknown> | null = null

  if (famigliaId) {
    const familyResult = await fetchFamiglieByIds([famigliaId])
    familyRow =
      (familyResult.rows?.[0] as Record<string, unknown> | undefined) ?? null
  }

  const addressResult = await fetchIndirizziByEntity(
    "processi_matching",
    [processId],
    ["luogo", "prova"],
  )
  const addressRows = Array.isArray(addressResult.rows)
    ? (addressResult.rows as Record<string, unknown>[])
    : []
  const processAddress =
    addressRows.find(
      (row) =>
        normalizeLookupToken(toStringValue(row.tipo_indirizzo)) === "luogo",
    ) ??
    addressRows.find(
      (row) =>
        normalizeLookupToken(toStringValue(row.tipo_indirizzo)) === "prova",
    ) ??
    addressRows[0] ??
    null
  const ricercaCenter = getRicercaCenter(
    {
      tipo_incontro_famiglia_lavoratore: toStringValue(
        processRow.tipo_incontro_famiglia_lavoratore,
      ),
      indirizzo_prova_via: toStringValue(processRow.indirizzo_prova_via),
    },
    addressRows,
  )

  const familyName = [toStringValue(familyRow?.nome), toStringValue(familyRow?.cognome)]
    .filter((value): value is string => Boolean(value))
    .join(" ")
  const giorniSettimanaValue = toStringValue(processRow.numero_giorni_settimanali) ?? "-"
  const tipoLavoroBadges = getStringArrayValue(processRow.tipo_lavoro)

  const mapped: RicercaDetailCardData = {
          id: displayValue(processRow.id),
          famigliaId: famigliaId ?? "-",
          numeroRicercaAttivata: toStringValue(
            processRow.numero_ricerca_attivata,
          ),
          stage: displayValue(processRow.stato_sales),
          nomeFamiglia: familyName || "-",
          email: displayValue(familyRow?.email),
          telefono: displayValue(familyRow?.telefono),
          dataLead: formatItalianDate(familyRow?.creato_il),
          tipoLavoroBadges,
          tipoLavoroBadge: tipoLavoroBadges[0] ?? null,
          tipoLavoroColor: null,
          tipoRapportoBadge: getFirstArrayValue(processRow.tipo_rapporto),
          tipoRapportoColor: null,
          statoRes: displayValue(processRow.stato_res),
          recruiterId: toStringValue(processRow.recruiter_ricerca_e_selezione_id) ?? "",
          qualificazioneLead: displayValue(processRow.qualificazione_lead),
          motivoNoMatch: displayValue(processRow.motivo_no_match),
          modelloSmartmatching: displayValue(processRow.modello_smartmatching),
          oreSettimana: displayValue(processRow.ore_settimanale),
          giorniSettimana: giorniSettimanaValue,
          giornatePreferite: getStringArrayValue(processRow.preferenza_giorno),
          salesColdCallFollowup: displayValue(
            processRow.sales_cold_call_followup,
          ),
          salesNoShowFollowup: displayValue(processRow.sales_no_show_followup),
          motivazioneLost: displayValue(processRow.motivazione_lost),
          motivazioneOot: displayValue(processRow.motivazione_oot),
          appuntiChiamataSales: displayValue(processRow.appunti_chiamata_sales),
          dataPerRicercaFutura: formatItalianDate(
            processRow.data_per_ricerca_futura,
          ),
          dataCallPrenotata: formatItalianDate(familyRow?.data_call_prenotata),
          dataLeadRaw: toStringValue(familyRow?.creato_il),
          dataPerRicercaFuturaRaw: toStringValue(
            processRow.data_per_ricerca_futura,
          ),
          dataCallPrenotataRaw: toStringValue(familyRow?.data_call_prenotata),
          tentativiChiamataCount: getCallAttemptCount(
            processRow.sales_cold_call_followup,
          ),
          preventivoAccettato:
            toBooleanValue(processRow.preventivo_firmato) ?? false,
          richiestaAttivazioneId: null,
          preventivoUrl: null,
          preventivoTitolo: null,
          preventivoSessionId: null,
          preventivoAcceptanceUrl: null,
          feeConcordata: null,
          origineUrl: null,
          scontoApplicatoRaw: null,
          scontoApplicato: "-",
          orarioDiLavoro: displayValue(processRow.orario_di_lavoro),
          nucleoFamigliare: displayValue(processRow.nucleo_famigliare),
          descrizioneCasa: displayValue(processRow.descrizione_casa),
          metraturaCasa: displayValue(processRow.metratura_casa),
          descrizioneAnimaliInCasa: displayValue(
            processRow.descrizione_animali_in_casa,
          ),
          mansioniRichieste: displayValue(processRow.mansioni_richieste),
          informazioniExtraRiservate: displayValue(
            processRow.informazioni_extra_riservate,
          ),
          etaMinima: displayValue(processRow.eta_minima),
          etaMassima: displayValue(processRow.eta_massima),
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
          indirizzoProvaProvincia: displayValue(processRow.indirizzo_prova_provincia),
          indirizzoProvaCap: displayValue(processRow.indirizzo_prova_cap),
          indirizzoProvaNote: displayValue(processRow.indirizzo_prova_note),
          indirizzoProvaVia: displayValue(processRow.indirizzo_prova_via),
          indirizzoProvaCivico: displayValue(processRow.indirizzo_prova_civico),
          indirizzoProvaComune: displayValue(processRow.indirizzo_prova_comune),
          indirizzoProvaCitofono: displayValue(processRow.indirizzo_prova_citofono),
          geocode: displayValue(processRow.geocode),
          srcEmbedMapsAnnucio: displayValue(processRow.src_embed_maps_annucio),
          indirizzoProvaLatitudine: ricercaCenter?.lat ?? null,
          indirizzoProvaLongitudine: ricercaCenter?.lng ?? null,
          deadlineMobile: formatItalianDate(processRow.deadline_mobile),
          deadlineMobileRaw: toStringValue(processRow.deadline_mobile) ?? "",
          dataAssegnazione: formatItalianDate(processRow.data_assegnazione),
          dataAssegnazioneRaw: toStringValue(processRow.data_assegnazione) ?? "",
          disponibilitaColloquiInPresenza: displayValue(
            processRow.disponibilita_colloqui_in_presenza,
          ),
          familyAvailabilityJson: toStringValue(processRow.family_availability_json),
          tipoIncontroFamigliaLavoratore: displayValue(
            processRow.tipo_incontro_famiglia_lavoratore,
          ),
          richiestaPatente:
            toBooleanValue(processRow.richiesta_patente) ?? false,
          richiestaTrasferte:
            toBooleanValue(processRow.richiesta_trasferte) ?? false,
          richiestaFerie: toBooleanValue(processRow.richiesta_ferie) ?? false,
          comunicaItaliano: displayItalianRequirementValue(
            getFirstPresentValue(processRow, [
              "comunica_in_italiano",
              "comunicare_bene_italiano",
              "comunicare_in_italiano",
              "richiesta_italiano",
            ]),
          ),
          comunicaInglese: displayBooleanValue(
            getFirstPresentValue(processRow, [
              "comunica_in_inglese",
              "comunicare_bene_inglese",
              "comunicare_in_inglese",
              "richiesta_inglese",
            ]),
          ),
          nazionalitaEscluse: getStringArrayValue(processRow.nazionalita_escluse),
          nazionalitaObbligatorie: getStringArrayValue(
            processRow.nazionalita_obbligatorie,
          ),
          famigliaMoltoEsigente:
            toBooleanValue(processRow.famiglia_molto_esigente) ?? false,
          richiestaAutonomia:
            toBooleanValue(processRow.richiesta_autonomia) ?? false,
          datoreSpessoPresente:
            toBooleanValue(processRow.datore_spesso_presente) ?? false,
          richiestaDiscrezione:
            toBooleanValue(processRow.richiesta_discrezione) ?? false,
          comunicareBeneItaliano:
            toBooleanValue(processRow.comunicare_bene_italiano) ?? false,
          comunicareBeneInglese:
            toBooleanValue(processRow.comunicare_bene_inglese) ?? false,
          presenzaNeonati: toBooleanValue(processRow.presenza_neonati) ?? false,
          piuBambini: toBooleanValue(processRow.piu_bambini) ?? false,
          famiglia4Persone: toBooleanValue(processRow.famiglia_4_persone) ?? false,
          caniPiccoli: toBooleanValue(processRow.cani_piccoli) ?? false,
          caniGrandi: toBooleanValue(processRow.cani_grandi) ?? false,
          gatti: toBooleanValue(processRow.gatti) ?? false,
          pulireRipianiAlti:
            toBooleanValue(processRow.pulire_ripiani_alti) ?? false,
          stirare: toBooleanValue(processRow.stirare) ?? false,
          stirareAbitiDifficili:
            toBooleanValue(processRow.stirare_abiti_difficili) ?? false,
          cucinare: toBooleanValue(processRow.cucinare) ?? false,
          cucinareElaborato: toBooleanValue(processRow.cucinare_elaborato) ?? false,
          curaPiante: toBooleanValue(processRow.cura_piante) ?? false,
          famigliaMoltoEsigenteLabel: displayBooleanValue(
            getFirstPresentValue(processRow, [
              "famiglia_molto_esigente",
              "molto_esigente",
              "cliente_molto_esigente",
            ]),
          ),
          nazionalitaEscluseLabel: displayListValue(
            getFirstPresentValue(processRow, [
              "nazionalita_escluse",
              "nazionalita_esclusa",
              "nazionalita_non_accettate",
            ]),
          ),
          nazionalitaObbligatorieLabel: displayListValue(
            getFirstPresentValue(processRow, [
              "nazionalita_obbligatorie",
              "nazionalita_richieste",
              "nazionalita_preferite",
            ]),
          ),
          richiestaAutonomiaLabel: displayBooleanValue(
            getFirstPresentValue(processRow, [
              "richiesta_autonomia",
              "richiesta_elevata_autonomia",
              "elevata_autonomia_richiesta",
            ]),
          ),
          datoreSpessoPresenteLabel: displayBooleanValue(
            getFirstPresentValue(processRow, [
              "datore_spesso_presente",
              "datore_presente",
              "cliente_spesso_presente",
            ]),
          ),
          richiestaDiscrezioneLabel: displayBooleanValue(
            getFirstPresentValue(processRow, [
              "richiesta_discrezione",
              "discrezione_richiesta",
            ]),
          ),
          descrizioneRichiestaTrasferte: displayValue(
            processRow.descrizione_richiesta_trasferte,
          ),
          descrizioneRichiestaFerie: displayValue(
            processRow.descrizione_richiesta_ferie,
          ),
          patenteDettaglio:
            getFirstArrayValue(processRow.patente) ??
            displayValue(processRow.patente),
          sesso: toStringValue(processRow.sesso),
          testoAnnuncioWhatsapp: displayValue(
            processRow.testo_annuncio_whatsapp,
          ),
  }

  return { card: mapped, lookupOptionsByField }
}
