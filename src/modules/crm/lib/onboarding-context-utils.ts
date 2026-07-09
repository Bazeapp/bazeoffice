import { utcIsoToRomaInput } from "@/lib/datetime"
import { normalizeLookupToken } from "@/lib/value-utils"

import type { CrmPipelineCardData, LookupOptionsByField } from "../types"

export type LookupOption = LookupOptionsByField[string][number]

export function splitStoredValues(value: string | null | undefined) {
  if (!value || value === "-") return []
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

export function toDateTimeLocalValue(value: string | null | undefined) {
  return utcIsoToRomaInput(value)
}

export function hasValue(value: string | null | undefined) {
  return Boolean(value && value.trim() && value.trim() !== "-")
}

export function cleanValue(value: string | null | undefined) {
  return value && value !== "-" ? value : ""
}

export function getStageOption(
  stage: string,
  options: LookupOptionsByField["stato_sales"],
) {
  const token = normalizeLookupToken(stage)
  return options.find(
    (option) =>
      normalizeLookupToken(option.valueKey) === token ||
      normalizeLookupToken(option.valueLabel) === token,
  )
}

export function resolveOptions(selected: string, options: LookupOption[]) {
  if (options.length > 0) return options
  if (!hasValue(selected)) return []
  return [
    {
      valueKey: selected,
      valueLabel: selected,
      color: null,
      sortOrder: null,
    },
  ]
}

export function selectedOptionValue(selected: string, options: LookupOption[]) {
  const token = normalizeLookupToken(selected)
  if (!token || token === "-") return ""

  const matched = options.find(
    (option) =>
      normalizeLookupToken(option.valueKey) === token ||
      normalizeLookupToken(option.valueLabel) === token,
  )
  return matched?.valueKey ?? selected
}

export function findLookupOption(value: string, options: LookupOption[]) {
  const token = normalizeLookupToken(value)
  if (!token || token === "-") return null

  return (
    options.find(
      (option) =>
        normalizeLookupToken(option.valueKey) === token ||
        normalizeLookupToken(option.valueLabel) === token,
    ) ?? null
  )
}

export function normalizeSelectedLookupKeys(values: string[], options: LookupOption[]) {
  const result: string[] = []
  const seen = new Set<string>()

  for (const value of values) {
    const key = findLookupOption(value, options)?.valueKey ?? value.trim()
    const token = normalizeLookupToken(key)
    if (!key || seen.has(token)) continue
    result.push(key)
    seen.add(token)
  }

  return result
}

export function buildContextDefaults(card: CrmPipelineCardData | null) {
  return {
    coldAttempts: splitStoredValues(card?.salesColdCallFollowup),
    noShowAttempts: splitStoredValues(card?.salesNoShowFollowup),
    dataRicontatto: card?.dataPerRicercaFuturaRaw
      ? card.dataPerRicercaFuturaRaw.slice(0, 10)
      : "",
    dataCall: toDateTimeLocalValue(card?.dataCallPrenotataRaw),
    noteStato: cleanValue(card?.appuntiChiamataSales),
    motivazioneLost: cleanValue(card?.motivazioneLost),
    motivazioneOot: cleanValue(card?.motivazioneOot),
    statoRes: cleanValue(card?.statoRes),
  }
}
