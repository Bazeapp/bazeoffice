import type { CrmPipelineFilters } from "../types"
import { romaWallclockToUtcIso, utcIsoToRomaInput } from "@/lib/datetime"

export const CRM_PIPELINE_FILTERS_STORAGE_KEY =
  "bazeoffice.crmPipelineFamiglie.filters.v1"

export type BooleanFilterValue = "all" | "yes" | "no"

export type CrmPipelineToolbarFilters = {
  createdFrom: string
  createdTo: string
  tipoLavoro: string[]
  preventivoAccettato: BooleanFilterValue
  chiamataPrenotata: BooleanFilterValue
}

export const EMPTY_TOOLBAR_FILTERS: CrmPipelineToolbarFilters = {
  createdFrom: "",
  createdTo: "",
  tipoLavoro: [],
  preventivoAccettato: "all",
  chiamataPrenotata: "all",
}

export const DATE_PRESETS = [
  { id: "custom", label: "Da sempre" },
  { id: "24h", label: "Ultime 24h" },
  { id: "7d", label: "Ultimi 7 giorni" },
  { id: "30d", label: "Ultimo mese" },
  { id: "year", label: "Quest'anno" },
] as const

export type DatePresetValue = (typeof DATE_PRESETS)[number]["id"]

function toDateTimeLocalValue(date: Date) {
  return utcIsoToRomaInput(date.toISOString())
}

function dateTimeLocalToIso(value: string) {
  return romaWallclockToUtcIso(value)
}

function booleanFilterToValue(value: BooleanFilterValue) {
  if (value === "yes") return true
  if (value === "no") return false
  return null
}

export function sanitizeToolbarFilters(value: unknown): CrmPipelineToolbarFilters {
  if (!value || typeof value !== "object") return EMPTY_TOOLBAR_FILTERS
  const raw = value as Partial<CrmPipelineToolbarFilters>
  return {
    createdFrom: typeof raw.createdFrom === "string" ? raw.createdFrom : "",
    createdTo: typeof raw.createdTo === "string" ? raw.createdTo : "",
    tipoLavoro: Array.isArray(raw.tipoLavoro)
      ? raw.tipoLavoro.filter((item): item is string => typeof item === "string")
      : [],
    preventivoAccettato:
      raw.preventivoAccettato === "yes" || raw.preventivoAccettato === "no"
        ? raw.preventivoAccettato
        : "all",
    chiamataPrenotata:
      raw.chiamataPrenotata === "yes" || raw.chiamataPrenotata === "no"
        ? raw.chiamataPrenotata
        : "all",
  }
}

export function readStoredToolbarFilters() {
  if (typeof window === "undefined") return EMPTY_TOOLBAR_FILTERS
  try {
    const raw = window.localStorage.getItem(CRM_PIPELINE_FILTERS_STORAGE_KEY)
    return raw ? sanitizeToolbarFilters(JSON.parse(raw)) : EMPTY_TOOLBAR_FILTERS
  } catch {
    return EMPTY_TOOLBAR_FILTERS
  }
}

export function buildServerFilters(
  filters: CrmPipelineToolbarFilters,
): CrmPipelineFilters {
  return {
    createdFrom: dateTimeLocalToIso(filters.createdFrom),
    createdTo: dateTimeLocalToIso(filters.createdTo),
    tipoLavoro: filters.tipoLavoro,
    preventivoAccettato: booleanFilterToValue(filters.preventivoAccettato),
    chiamataPrenotata: booleanFilterToValue(filters.chiamataPrenotata),
  }
}

export function getDatePresetFilterPatch(
  preset: DatePresetValue,
  now: Date = new Date(),
): Pick<CrmPipelineToolbarFilters, "createdFrom" | "createdTo"> | null {
  if (preset === "custom") return null

  const from = new Date(now)

  if (preset === "24h") {
    from.setUTCHours(from.getUTCHours() - 24)
  } else if (preset === "7d") {
    from.setUTCDate(from.getUTCDate() - 7)
  } else if (preset === "30d") {
    from.setUTCMonth(from.getUTCMonth() - 1)
  } else {
    from.setUTCMonth(0, 1)
    from.setUTCHours(0, 0, 0, 0)
  }

  return {
    createdFrom: toDateTimeLocalValue(from),
    createdTo: toDateTimeLocalValue(now),
  }
}

export function toggleFilterValue(values: string[], value: string, checked: boolean) {
  if (checked) return values.includes(value) ? values : [...values, value]
  return values.filter((item) => item !== value)
}

export function hasActiveToolbarFilters(filters: CrmPipelineToolbarFilters) {
  return (
    Boolean(filters.createdFrom) ||
    Boolean(filters.createdTo) ||
    filters.tipoLavoro.length > 0 ||
    filters.preventivoAccettato !== "all" ||
    filters.chiamataPrenotata !== "all"
  )
}

export function serializeToolbarFilters(filters: CrmPipelineToolbarFilters) {
  return JSON.stringify({
    createdFrom: filters.createdFrom,
    createdTo: filters.createdTo,
    tipoLavoro: [...filters.tipoLavoro].sort(),
    preventivoAccettato: filters.preventivoAccettato,
    chiamataPrenotata: filters.chiamataPrenotata,
  })
}
