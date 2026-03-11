import type { LookupValueRecord } from "@/types/entities/lookup-values"

export type LookupOption = {
  label: string
  value: string
}

export function normalizeLookupToken(value: unknown) {
  return String(value ?? "").trim().toLowerCase()
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
  switch ((color ?? "").toLowerCase()) {
    case "red":
      return "border-red-200 bg-red-100 text-red-700"
    case "rose":
      return "border-rose-200 bg-rose-100 text-rose-700"
    case "orange":
      return "border-orange-200 bg-orange-100 text-orange-700"
    case "amber":
      return "border-amber-200 bg-amber-100 text-amber-700"
    case "yellow":
      return "border-yellow-200 bg-yellow-100 text-yellow-700"
    case "lime":
      return "border-lime-200 bg-lime-100 text-lime-700"
    case "green":
      return "border-green-200 bg-green-100 text-green-700"
    case "emerald":
      return "border-emerald-200 bg-emerald-100 text-emerald-700"
    case "teal":
      return "border-teal-200 bg-teal-100 text-teal-700"
    case "cyan":
      return "border-cyan-200 bg-cyan-100 text-cyan-700"
    case "sky":
      return "border-sky-200 bg-sky-100 text-sky-700"
    case "blue":
      return "border-blue-200 bg-blue-100 text-blue-700"
    case "indigo":
      return "border-indigo-200 bg-indigo-100 text-indigo-700"
    case "violet":
      return "border-violet-200 bg-violet-100 text-violet-700"
    case "purple":
      return "border-purple-200 bg-purple-100 text-purple-700"
    case "fuchsia":
      return "border-fuchsia-200 bg-fuchsia-100 text-fuchsia-700"
    case "pink":
      return "border-pink-200 bg-pink-100 text-pink-700"
    case "slate":
      return "border-slate-200 bg-slate-100 text-slate-700"
    case "gray":
      return "border-gray-200 bg-gray-100 text-gray-700"
    case "zinc":
      return "border-zinc-200 bg-zinc-100 text-zinc-700"
    case "neutral":
      return "border-neutral-200 bg-neutral-100 text-neutral-700"
    case "stone":
      return "border-stone-200 bg-stone-100 text-stone-700"
    case "white":
      return "border-border bg-white text-foreground"
    default:
      return "border-border bg-muted text-foreground"
  }
}
