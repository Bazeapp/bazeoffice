import type { LookupValueRecord } from "@/types/entities/lookup-values"
import { getLookupBadgeSoftClassName } from "@/lib/lookup-color-styles"

export type LookupOption = {
  label: string
  value: string
}

export function normalizeLookupToken(value: unknown) {
  return String(value ?? "").trim().toLowerCase()
}

export function normalizeLookupComparableToken(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll("_", " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function getLookupDisplayOption(
  options: LookupOption[],
  value: string,
) {
  return options.find(
    (option) => option.label === value || option.value === value,
  )
}

export function findLookupOption(
  options: LookupOption[],
  value: string | null | undefined,
) {
  const token = normalizeLookupComparableToken(value)
  if (!token) return null

  return (
    options.find(
      (option) =>
        normalizeLookupComparableToken(option.value) === token ||
        normalizeLookupComparableToken(option.label) === token,
    ) ?? null
  )
}

export function resolveLookupSingleValueOptions(
  value: string | null | undefined,
  options: LookupOption[],
) {
  const normalizedValue = String(value ?? "").trim()
  if (!normalizedValue || findLookupOption(options, normalizedValue)) return options
  return [{ label: normalizedValue, value: normalizedValue }, ...options]
}

export function getLookupSelectValue(
  value: string | null | undefined,
  options: LookupOption[],
  emptyValue = "none",
) {
  const normalizedValue = String(value ?? "").trim()
  if (!normalizedValue) return emptyValue
  return findLookupOption(options, normalizedValue)?.value ?? normalizedValue
}

export function normalizeLookupOptionValue(
  value: string,
  options: LookupOption[],
) {
  return findLookupOption(options, value)?.value ?? value.trim()
}

export function normalizeLookupOptionValues(
  values: string[],
  options: LookupOption[],
) {
  const result: string[] = []
  const seen = new Set<string>()

  for (const value of values) {
    const normalized = normalizeLookupOptionValue(value, options)
    const token = normalizeLookupComparableToken(normalized)
    if (!normalized || seen.has(token)) continue
    result.push(normalized)
    seen.add(token)
  }

  return result
}

export function getLookupOptionLabel(options: LookupOption[], value: string) {
  return findLookupOption(options, value)?.label ?? value
}

export function getLookupLabelForSave(
  value: string | null | undefined,
  options: LookupOption[],
) {
  const normalizedValue = String(value ?? "").trim()
  if (!normalizedValue) return ""
  return findLookupOption(options, normalizedValue)?.label ?? normalizedValue
}

export function normalizeLookupDbLabels(
  values: string[],
  options: LookupOption[],
) {
  const result: string[] = []
  const seen = new Set<string>()

  for (const value of values) {
    const label = findLookupOption(options, value)?.label ?? value.trim()
    const token = normalizeLookupComparableToken(label)
    if (!label || seen.has(token)) continue
    result.push(label)
    seen.add(token)
  }

  return result
}

export function normalizeLookupOptions(rows: LookupValueRecord[]) {
  const grouped = new Map<
    string,
    Array<{ label: string; value: string; sort: number; createdAtIndex: number }>
  >()

  for (const [index, row] of rows.entries()) {
    if (!row.is_active) continue
    const domain = `${row.entity_table}.${row.entity_field}`
    const current = grouped.get(domain) ?? []
    current.push({
      label: row.value_label,
      value: row.value_key,
      sort: row.sort_order ?? Number.MAX_SAFE_INTEGER,
      createdAtIndex: index,
    })
    grouped.set(domain, current)
  }

  const options = new Map<string, LookupOption[]>()
  for (const [domain, values] of grouped.entries()) {
    const deduped = new Map<string, { label: string; value: string; sort: number; createdAtIndex: number }>()

    for (const item of values) {
      const token = normalizeLookupToken(item.label)
      const current = deduped.get(token)
      if (
        !current ||
        item.sort < current.sort ||
        (item.sort === current.sort && item.createdAtIndex < current.createdAtIndex)
      ) {
        deduped.set(token, item)
      }
    }

    options.set(
      domain,
      Array.from(deduped.values())
        .sort((a, b) => (a.sort - b.sort) || a.label.localeCompare(b.label))
        .map((item) => ({ label: item.label, value: item.value }))
    )
  }

  return options
}

function readLookupColor(metadata: LookupValueRecord["metadata"]) {
  if (!metadata || typeof metadata !== "object") return null
  const color = metadata.color
  return typeof color === "string" && color.trim() ? color.trim() : null
}

export function normalizeLookupColors(rows: LookupValueRecord[]) {
  const colorMap = new Map<string, string>()

  for (const row of rows) {
    if (!row.is_active) continue
    const color = readLookupColor(row.metadata)
    if (!color) continue

    const domain = `${row.entity_table}.${row.entity_field}`
    colorMap.set(`${domain}:${normalizeLookupToken(row.value_key)}`, color)
    colorMap.set(`${domain}:${normalizeLookupToken(row.value_label)}`, color)
  }

  return colorMap
}

export function resolveLookupColor(
  lookupColors: Map<string, string>,
  domain: string,
  value: string | null
) {
  if (!value) return null
  const token = normalizeLookupToken(value)
  return lookupColors.get(`${domain}:${token}`) ?? null
}

export function isBlacklistValue(value: unknown) {
  return normalizeLookupToken(value) === "blacklist"
}

export function getTagClassName(color: string | null | undefined) {
  return getLookupBadgeSoftClassName(color)
}
