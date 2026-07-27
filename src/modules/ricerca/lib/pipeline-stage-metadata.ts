import type { LookupValueRecord } from "@/types"
import { resolveLookupColor } from "@/lib/lookup-utils"

import type { StageDefinition, StageMetadata } from "../types/workers-pipeline"
import { normalizeStatusToken } from "./pipeline-status-utils"
import { normalizeLookupToken, toStringValue } from "./pipeline-value-utils"

export function readLookupColor(metadata: LookupValueRecord["metadata"]) {
  if (!metadata || typeof metadata !== "object") return null
  const color = metadata.color
  return typeof color === "string" && color.trim() ? color.trim() : null
}

export function resolveLookupColorByStatusToken(
  lookupColors: Map<string, string>,
  domain: string,
  value: string | null | undefined,
) {
  const direct = resolveLookupColor(lookupColors, domain, value ?? null)
  if (direct) return direct

  const normalizedValue = normalizeStatusToken(value)
  if (!normalizedValue) return null

  for (const [key, color] of lookupColors.entries()) {
    if (!key.startsWith(`${domain}:`)) continue
    const rawValue = key.slice(domain.length + 1)
    if (normalizeStatusToken(rawValue) === normalizedValue) {
      return color
    }
  }

  return null
}

export function buildStageMetadata(rows: LookupValueRecord[]): StageMetadata {
  const stageRows = rows
    .filter(
      (row) =>
        row.is_active &&
        row.entity_table === "selezioni_lavoratori" &&
        row.entity_field === "stato_selezione" &&
        Boolean(toStringValue(row.value_key)) &&
        Boolean(toStringValue(row.value_label)),
    )
    .sort((a, b) => {
      const left = a.sort_order ?? Number.MAX_SAFE_INTEGER
      const right = b.sort_order ?? Number.MAX_SAFE_INTEGER
      if (left !== right) return left - right
      return a.value_label.localeCompare(b.value_label, "it")
    })

  const definitions: StageDefinition[] = []
  const aliases = new Map<string, string>()

  for (const row of stageRows) {
    const id = toStringValue(row.value_key)
    const label = toStringValue(row.value_label)
    if (!id || !label) continue

    definitions.push({
      id,
      label,
      color: readLookupColor(row.metadata),
    })
    aliases.set(normalizeLookupToken(id), id)
    aliases.set(normalizeLookupToken(label), id)
  }

  return {
    definitions,
    aliases,
  }
}
