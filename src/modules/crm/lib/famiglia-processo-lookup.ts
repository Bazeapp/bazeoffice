import { normalizeLookupToken } from "@/lib/value-utils"

import type { LookupOptionsByField } from "../types"

export function getSelectedLookupValue(
  selected: string | null | undefined,
  options: LookupOptionsByField[string]
) {
  const token = normalizeLookupToken(selected)
  if (!token) return ""

  const matched = options.find(
    (option) =>
      normalizeLookupToken(option.valueKey) === token ||
      normalizeLookupToken(option.valueLabel) === token
  )
  return matched?.valueKey ?? selected ?? ""
}

export function getLookupOptionLabel(
  options: LookupOptionsByField[string],
  value: string
) {
  const token = normalizeLookupToken(value)
  const matched = options.find(
    (option) =>
      normalizeLookupToken(option.valueKey) === token ||
      normalizeLookupToken(option.valueLabel) === token
  )
  return matched?.valueLabel ?? value
}

export function normalizeLookupMultiValues(
  values: string[],
  options: LookupOptionsByField[string]
) {
  const result: string[] = []
  const seen = new Set<string>()

  for (const value of values) {
    const label = getLookupOptionLabel(options, value).trim()
    const token = normalizeLookupToken(label)
    if (!label || seen.has(token)) continue
    result.push(label)
    seen.add(token)
  }

  return result
}
