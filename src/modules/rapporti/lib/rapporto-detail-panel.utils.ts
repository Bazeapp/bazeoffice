import { formatItalianCurrency } from "@/lib/format-utils"
import type {
  ContributoInpsRecord,
  MeseCalendarioRecord,
  MeseLavoratoRecord,
  PresenzaMensileRecord,
} from "@/types"

import {
  CONTRIBUTI_LEGACY_STAGE_ALIASES,
  CONTRIBUTI_STAGE_OPTIONS,
} from "./rapporto-detail-panel.constants"

export function normalizeToken(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase().replaceAll("_", " ")
}

export function resolveContributoStage(value: string | null | undefined) {
  const token = normalizeToken(value)
  if (!token) return CONTRIBUTI_STAGE_OPTIONS[0].id

  const canonicalStage = CONTRIBUTI_STAGE_OPTIONS.find(
    (stage) => normalizeToken(stage.id) === token || normalizeToken(stage.label) === token,
  )

  return canonicalStage?.id ?? CONTRIBUTI_LEGACY_STAGE_ALIASES[token] ?? CONTRIBUTI_STAGE_OPTIONS[0].id
}

export function formatRapportoDetailDate(value: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

export function getListRowStatusColor(value: string | null | undefined) {
  const token = normalizeToken(value)
  if (!token) return "zinc"
  if (token.includes("attivo")) return "emerald"
  if (token.includes("attiv") || token.includes("in corso") || token.includes("presa in carico")) {
    return "amber"
  }
  if (token.includes("pagato") || token.includes("effettuata") || token.includes("inviato")) {
    return "emerald"
  }
  if (token.includes("todo") || token.includes("to do")) return "sky"
  if (token.includes("chius") || token.includes("annull") || token.includes("cess")) return "zinc"
  return "sky"
}

export function getDurationLabel(startDate: string | null, endDate: string | null = null) {
  if (!startDate) return "-"
  const start = new Date(startDate)
  const end = endDate ? new Date(endDate) : new Date()
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "-"
  const diffDays = Math.max(0, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
  return `${diffDays} giorni`
}

export function getMonthLabel(mese: MeseLavoratoRecord, meseCalendario: MeseCalendarioRecord | null) {
  if (meseCalendario?.mese_lavorativo_copy?.trim()) {
    return meseCalendario.mese_lavorativo_copy.trim()
  }

  if (meseCalendario?.data_inizio) {
    const date = new Date(meseCalendario.data_inizio)
    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat("it-IT", {
        timeZone: "Europe/Rome",
        month: "long",
        year: "numeric",
      }).format(date)
    }
  }

  return formatRapportoDetailDate(mese.creato_il)
}

function toNumericValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value !== "string" || !value.trim()) return null
  const parsed = Number(value.replace(",", "."))
  return Number.isFinite(parsed) ? parsed : null
}

function formatHoursLabel(value: number) {
  return new Intl.NumberFormat("it-IT", {
    maximumFractionDigits: 2,
  }).format(value)
}

function sumPresenceHours(value: PresenzaMensileRecord) {
  let total = 0
  let hasHours = false

  for (let day = 1; day <= 31; day += 1) {
    const hours = toNumericValue(value[`ore_day_${day}`])
    if (hours === null) continue
    hasHours = true
    total += hours
  }

  return hasHours ? total : null
}

function hasPresenceDayData(value: PresenzaMensileRecord) {
  for (let day = 1; day <= 31; day += 1) {
    if (
      value[`tipo_day_${day}`] ||
      value[`evento_day_${day}`] ||
      value[`note_day_${day}`] ||
      value[`codice_malattia_day_${day}`]
    ) {
      return true
    }
  }

  return false
}

export function getPresenceSummary(value: PresenzaMensileRecord | null) {
  if (!value) return "Presenze non disponibili"

  const monthlyPresenceValue = toNumericValue(value.presenze_mensili)
  const hoursValue = monthlyPresenceValue ?? sumPresenceHours(value)

  if (hoursValue !== null) {
    return `Presenze disponibili (${formatHoursLabel(hoursValue)} ore)`
  }

  if (hasPresenceDayData(value)) return "Presenze disponibili"

  return "Presenze non disponibili"
}

export function getContributoTitle(record: ContributoInpsRecord) {
  const metadata =
    record.metadati_migrazione && typeof record.metadati_migrazione === "object"
      ? record.metadati_migrazione
      : null
  const quarterLabel =
    typeof metadata?.trimestre_label === "string" && metadata.trimestre_label.trim()
      ? metadata.trimestre_label.trim()
      : typeof metadata?.trimestre === "string" && metadata.trimestre.trim()
        ? metadata.trimestre.trim()
        : null

  return quarterLabel ?? "Contributo INPS"
}

export function copyToClipboard(value: string | null | undefined) {
  if (!value) return
  void navigator.clipboard?.writeText(value)
}

export function firstAvailableText(...values: Array<string | null | undefined>) {
  return values.find((value) => value?.trim())?.trim() ?? null
}

export function formatCedolinoImporto(value: number | null | undefined) {
  return typeof value === "number" ? formatItalianCurrency(value) : "-"
}
