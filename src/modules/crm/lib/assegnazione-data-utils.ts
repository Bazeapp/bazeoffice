import { toIsoDateValue } from "@/lib/format-utils"
import {
  formatItalianDate,
  getFirstArrayValue,
  getStringArrayValue,
  indexRowsByStringId,
  toNumberValue,
  toStringValue,
  uniqueNonEmptyStrings,
} from "@/lib/value-utils"

import { fetchFamiglieByIds } from "../queries/fetch-famiglie-by-ids"
import { fetchProcessiMatchingByStatoRes } from "../queries/fetch-processi-matching-by-stato-res"
import type { AssegnazioneCardData } from "../types"
import type { LookupColorMap } from "../types/crm-pipeline-preview"
import type { GenericRow, LookupOptionsByField } from "../types/pipeline"
import {
  buildLookupColorMap,
  buildLookupOptionsByField,
  resolveBadgeColor,
  resolveLookupLabel,
} from "./lookup-utils"
import { asRowArray, extractFirstNumberToken } from "./value-utils"
import { fetchLookupValues } from "@/lib/lookup-values"

export const ASSEGNAZIONE_STATO_RES_QUERY_VALUES = [
  "da assegnare",
  "fare ricerca",
  "da_assegnare",
  "fare_ricerca",
] as const

export type AssegnazioneStatoRes = AssegnazioneCardData["statoRes"]

export function toAssegnazioneStatus(
  rawStatus: string | null,
): AssegnazioneStatoRes | null {
  const normalizedStatus = rawStatus?.replace(/_/g, " ")
  if (normalizedStatus === "fare ricerca") return "fare_ricerca"
  if (normalizedStatus === "da assegnare") return "da_assegnare"
  return null
}

export function toReadableStatusLabel(status: AssegnazioneStatoRes) {
  return status === "fare_ricerca" ? "Fare ricerca" : "Da assegnare"
}

export function toAssegnazioneStatusPatch(status: AssegnazioneStatoRes) {
  return status === "fare_ricerca" ? "fare ricerca" : "da assegnare"
}

export function formatAssegnazioneZona(process: GenericRow) {
  const quartiere = toStringValue(process.indirizzo_prova_note)
  const comune = toStringValue(process.indirizzo_prova_comune)
  const cap = toStringValue(process.indirizzo_prova_cap)

  if (quartiere && comune) return `${comune} · ${quartiere}`
  if (quartiere) return quartiere
  if (comune && cap) return `${comune} · ${cap}`
  if (cap) return cap

  return "-"
}

function mapProcessToAssegnazioneCard(
  process: GenericRow,
  family: GenericRow,
  lookupColors: LookupColorMap,
  lookupOptionsByField: LookupOptionsByField,
): AssegnazioneCardData | null {
  const famigliaId = toStringValue(process.famiglia_id)
  const id = toStringValue(process.id)
  if (!famigliaId || !id) return null

  const statoRes = toAssegnazioneStatus(toStringValue(process.stato_res))
  if (!statoRes) return null

  const nomeFamiglia = [toStringValue(family.nome), toStringValue(family.cognome)]
    .filter((value): value is string => Boolean(value))
    .join(" ")

  const rawTipoLavori = getStringArrayValue(process.tipo_lavoro)
  const rawTipoLavoro = rawTipoLavori[0] ?? null
  const rawTipoRapporto = getFirstArrayValue(process.tipo_rapporto)
  const tipoLavoroBadges = rawTipoLavori
    .map((value) => resolveLookupLabel(lookupOptionsByField, "tipo_lavoro", value))
    .filter((value): value is string => Boolean(value))
  const tipoLavoroBadge = resolveLookupLabel(
    lookupOptionsByField,
    "tipo_lavoro",
    rawTipoLavoro ?? "",
  )
  const tipoRapportoBadge = rawTipoRapporto
    ? resolveLookupLabel(lookupOptionsByField, "tipo_rapporto", rawTipoRapporto)
    : null

  const numeroRicercaAttivata = toNumberValue(process.numero_ricerca_attivata)
  const tipoRicerca: AssegnazioneCardData["tipoRicerca"] =
    (numeroRicercaAttivata ?? 1) > 1 ? "sostituzione" : "nuova"

  return {
    id,
    famigliaId,
    nomeFamiglia: nomeFamiglia || "-",
    email: toStringValue(family.email) ?? "-",
    telefono: toStringValue(family.telefono) ?? "-",
    dataLead: formatItalianDate(family.creato_il),
    deadlineMobile: formatItalianDate(
      process.deadline_mobile ?? process.data_limite_invio_selezione,
    ),
    deadlineSales: formatItalianDate(
      process.deadline_mobile ?? process.data_limite_invio_selezione,
    ),
    zona: formatAssegnazioneZona(process),
    zonaQuartiere: toStringValue(process.indirizzo_prova_note),
    zonaCap: toStringValue(process.indirizzo_prova_cap),
    zonaComune: toStringValue(process.indirizzo_prova_comune),
    tipoLavoroBadges,
    tipoLavoroColors: Object.fromEntries(
      rawTipoLavori.map((rawValue, index) => [
        tipoLavoroBadges[index] ?? rawValue,
        resolveBadgeColor(
          lookupColors,
          "processi_matching",
          "tipo_lavoro",
          rawValue,
        ),
      ]),
    ),
    tipoLavoroBadge,
    tipoLavoroColor: resolveBadgeColor(
      lookupColors,
      "processi_matching",
      "tipo_lavoro",
      rawTipoLavoro,
    ),
    tipoRapportoBadge,
    tipoRapportoColor: resolveBadgeColor(
      lookupColors,
      "processi_matching",
      "tipo_rapporto",
      rawTipoRapporto,
    ),
    dataAssegnazione: toIsoDateValue(process.data_assegnazione),
    recruiterId: toStringValue(process.recruiter_ricerca_e_selezione_id),
    statoRes,
    statoResLabel: toReadableStatusLabel(statoRes),
    oreSettimanali: toStringValue(process.ore_settimanale) ?? "-",
    giorniSettimanali:
      toStringValue(process.numero_giorni_settimanali) ??
      extractFirstNumberToken(process.frequenza_rapporto) ??
      "-",
    orarioDiLavoro: toStringValue(process.orario_di_lavoro) ?? "-",
    disponibilitaColloquiInPresenza:
      toStringValue(process.disponibilita_colloqui_in_presenza) ?? "-",
    tipoRicerca,
    overview:
      toStringValue(process.mansioni_richieste) ??
      toStringValue(process.descrizione_lavoratore_ideale) ??
      "-",
  }
}

export async function fetchAssegnazioneCards(): Promise<AssegnazioneCardData[]> {
  const [processesResult, lookupResult] = await Promise.all([
    fetchProcessiMatchingByStatoRes([...ASSEGNAZIONE_STATO_RES_QUERY_VALUES]),
    fetchLookupValues(),
  ])

  const processRows = asRowArray(processesResult.rows)
  const famigliaIds = uniqueNonEmptyStrings(
    processRows.map((process) => toStringValue(process.famiglia_id)),
  )
  const familiesResult =
    famigliaIds.length > 0
      ? await fetchFamiglieByIds(famigliaIds)
      : { rows: [] }
  const familyById = indexRowsByStringId(asRowArray(familiesResult.rows))
  const lookupRows = lookupResult.rows

  const lookupColors = buildLookupColorMap(lookupRows)
  const lookupOptionsByField = buildLookupOptionsByField(lookupRows)

  const cards: AssegnazioneCardData[] = []

  for (const process of processRows) {
    const famigliaId = toStringValue(process.famiglia_id)
    if (!famigliaId) continue

    const family = familyById.get(famigliaId)
    if (!family) continue

    const card = mapProcessToAssegnazioneCard(
      process,
      family,
      lookupColors,
      lookupOptionsByField,
    )
    if (card) cards.push(card)
  }

  return cards
}

export function applyAssegnazioneOptimisticPatch(
  previous: AssegnazioneCardData[],
  processId: string,
  patch: Record<string, unknown>,
): AssegnazioneCardData[] {
  let patchedStatus: AssegnazioneStatoRes | null = null
  if ("stato_res" in patch) {
    patchedStatus = toAssegnazioneStatus(toStringValue(patch.stato_res))
    if (!patchedStatus) {
      throw new Error("Stato assegnazione non valido")
    }
  }

  return previous.map((card) => {
    if (card.id !== processId) return card

    const nextCard = { ...card }

    if (patchedStatus) {
      nextCard.statoRes = patchedStatus
      nextCard.statoResLabel = toReadableStatusLabel(patchedStatus)
    }
    if ("data_assegnazione" in patch) {
      nextCard.dataAssegnazione = toIsoDateValue(patch.data_assegnazione)
    }
    if ("recruiter_ricerca_e_selezione_id" in patch) {
      nextCard.recruiterId = toStringValue(patch.recruiter_ricerca_e_selezione_id)
    }
    if ("deadline_mobile" in patch) {
      const nextDeadline = patch.deadline_mobile ?? patch.data_limite_invio_selezione
      nextCard.deadlineMobile = formatItalianDate(nextDeadline)
      nextCard.deadlineSales = formatItalianDate(nextDeadline)
    }
    if ("data_limite_invio_selezione" in patch && !("deadline_mobile" in patch)) {
      nextCard.deadlineMobile = formatItalianDate(patch.data_limite_invio_selezione)
      nextCard.deadlineSales = formatItalianDate(patch.data_limite_invio_selezione)
    }
    if ("ore_settimanale" in patch) {
      nextCard.oreSettimanali = toStringValue(patch.ore_settimanale) ?? "-"
    }
    if ("numero_giorni_settimanali" in patch) {
      nextCard.giorniSettimanali =
        toStringValue(patch.numero_giorni_settimanali) ??
        extractFirstNumberToken(patch.frequenza_rapporto) ??
        "-"
    }
    if ("frequenza_rapporto" in patch && nextCard.giorniSettimanali === "-") {
      nextCard.giorniSettimanali =
        extractFirstNumberToken(patch.frequenza_rapporto) ?? "-"
    }
    if ("orario_di_lavoro" in patch) {
      nextCard.orarioDiLavoro = toStringValue(patch.orario_di_lavoro) ?? "-"
    }
    if ("luogo_id" in patch) {
      nextCard.zona = toStringValue(patch.luogo_id) ?? "-"
    }
    if (
      "indirizzo_prova_note" in patch ||
      "indirizzo_prova_cap" in patch ||
      "indirizzo_prova_comune" in patch
    ) {
      if ("indirizzo_prova_note" in patch) {
        nextCard.zonaQuartiere = toStringValue(patch.indirizzo_prova_note)
      }
      if ("indirizzo_prova_cap" in patch) {
        nextCard.zonaCap = toStringValue(patch.indirizzo_prova_cap)
      }
      if ("indirizzo_prova_comune" in patch) {
        nextCard.zonaComune = toStringValue(patch.indirizzo_prova_comune)
      }
      nextCard.zona = formatAssegnazioneZona({
        indirizzo_prova_note: nextCard.zonaQuartiere,
        indirizzo_prova_cap: nextCard.zonaCap,
        indirizzo_prova_comune: nextCard.zonaComune,
      })
    }
    if ("mansioni_richieste" in patch) {
      nextCard.overview = toStringValue(patch.mansioni_richieste) ?? "-"
    } else if ("descrizione_lavoratore_ideale" in patch) {
      nextCard.overview =
        toStringValue(patch.descrizione_lavoratore_ideale) ?? "-"
    }

    return nextCard
  })
}
