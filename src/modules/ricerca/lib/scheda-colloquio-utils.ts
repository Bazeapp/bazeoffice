import {
  asString,
  readArrayStrings,
} from "@/modules/lavoratori/lib"
import {
  utcIsoToRomaInput,
  utcIsoToRomaParts,
} from "@/lib/datetime"

import { normalizeStatusToken } from "./pipeline-status-utils"

export type ScoreCardValue = "Basso" | "Medio" | "Alto"

export type SelectionRow = Record<string, unknown>

export const SCORE_OPTIONS: ScoreCardValue[] = ["Basso", "Medio", "Alto"]

export const SLOT_INDEXES = [0, 1, 2] as const

export const COLLOQUIO_EFFETTUATO_OPTIONS = [
  "Effettuato",
  "No show",
  "Annullato dalla famiglia",
  "Annullato dal lavoratore",
] as const

export function slotDataKey(slotIndex: number, boundary: "inizio" | "fine") {
  return `slot_${slotIndex + 1}_${boundary}_data` as const
}

export function slotOraKey(slotIndex: number, boundary: "inizio" | "fine") {
  return `slot_${slotIndex + 1}_${boundary}_ora` as const
}

export function slotTimestampColumn(slotIndex: number, boundary: "inizio" | "fine") {
  return `disponibilita_colloquio_lavoratore_slot${slotIndex + 1}_${boundary}` as const
}

export function buildSchedaColloquioDefaults(selectionRow: SelectionRow) {
  const defaults: Record<string, unknown> = {
    intervista_giorni_lavoro: asString(selectionRow.intervista_giorni_lavoro),
    intervista_orario_e_giorni: asString(selectionRow.intervista_orario_e_giorni),
    intervista_distanza: asString(selectionRow.intervista_distanza),
    intervista_stipendio: asString(selectionRow.intervista_stipendio),
    intervista_punti_forza: asString(selectionRow.intervista_punti_forza),
    intervista_punti_debolezza: asString(selectionRow.intervista_punti_debolezza),
    messaggio_famiglia_selezione_lavoratore: asString(
      selectionRow.messaggio_famiglia_selezione_lavoratore,
    ),
    score_orario_e_giorni:
      (asString(selectionRow.score_orario_e_giorni) as ScoreCardValue | "") || "",
    score_esperienze_simili:
      (asString(selectionRow.score_esperienze_simili) as ScoreCardValue | "") || "",
    score_stipendio:
      (asString(selectionRow.score_stipendio) as ScoreCardValue | "") || "",
    score_job_fit:
      (asString(selectionRow.score_job_fit) as ScoreCardValue | "") || "",
    colloquio_effettuato: asString(selectionRow.colloquio_effettuato),
    motivo_non_selezionato: readArrayStrings(selectionRow.motivo_non_selezionato),
    motivo_no_match: asString(selectionRow.motivo_no_match),
    data_ora_colloquio_famiglia_lavoratore: utcIsoToRomaInput(
      asString(selectionRow.data_ora_colloquio_famiglia_lavoratore),
    ),
  }

  for (const slotIndex of SLOT_INDEXES) {
    const inizio = utcIsoToRomaParts(
      asString(selectionRow[slotTimestampColumn(slotIndex, "inizio")]),
    )
    const fine = utcIsoToRomaParts(
      asString(selectionRow[slotTimestampColumn(slotIndex, "fine")]),
    )
    defaults[slotDataKey(slotIndex, "inizio")] = inizio.date
    defaults[slotOraKey(slotIndex, "inizio")] = inizio.time
    defaults[slotDataKey(slotIndex, "fine")] = fine.date
    defaults[slotOraKey(slotIndex, "fine")] = fine.time
  }

  return defaults
}

export const SCHEDA_COLLOQUIO_SLOT_FORM_KEYS = new Set<string>(
  SLOT_INDEXES.flatMap((slotIndex) => [
    slotDataKey(slotIndex, "inizio"),
    slotOraKey(slotIndex, "inizio"),
    slotDataKey(slotIndex, "fine"),
    slotOraKey(slotIndex, "fine"),
  ]),
)

export const SCHEDA_COLLOQUIO_TEXT_FIELD_KEYS = new Set([
  "intervista_giorni_lavoro",
  "intervista_orario_e_giorni",
  "intervista_distanza",
  "intervista_stipendio",
  "intervista_punti_forza",
  "intervista_punti_debolezza",
  "messaggio_famiglia_selezione_lavoratore",
])

export function getSchedaColloquioFieldVisibility(statoSelezione: unknown) {
  const normalizedStatus = normalizeStatusToken(asString(statoSelezione))
  const isCandidatoPoorFit =
    normalizedStatus.includes("candidato") &&
    normalizedStatus.includes("poor") &&
    normalizedStatus.includes("fit")

  return {
    showMotivazioneNonSelezionato:
      normalizedStatus === "non selezionato" ||
      normalizedStatus === "nascosto oot" ||
      isCandidatoPoorFit,
    showMotivazioneNoMatch: normalizedStatus === "no match",
    showColloquioFamigliaFields:
      normalizedStatus.includes("colloquio") ||
      normalizedStatus.includes("prova") ||
      normalizedStatus === "match" ||
      normalizedStatus === "inviato al cliente",
  }
}
