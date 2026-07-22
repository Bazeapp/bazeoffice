import type { LookupValueRecord } from "@/types"

import {
  normalizeComparableToken,
  normalizeLookupToken,
  readLookupColor,
  toStringValue,
} from "@/lib/value-utils"

export type StageDefinition = { id: string; label: string; color: string }
export type StageMetadata = { definitions: StageDefinition[]; aliases: Map<string, string> }

type BuildFromDefaultsOptions = {
  defaultStages: StageDefinition[]
  lookupRows: LookupValueRecord[]
  entityTable: string
  entityField: string
  legacyAliases?: Record<string, string>
}

export function buildStageMetadataFromDefaults({
  defaultStages,
  lookupRows,
  entityTable,
  entityField,
  legacyAliases = {},
}: BuildFromDefaultsOptions): StageMetadata {
  const aliases = new Map<string, string>()
  const colorByStage = new Map<string, string>()
  const labelByStage = new Map<string, string>()

  for (const stage of defaultStages) {
    aliases.set(normalizeComparableToken(stage.id), stage.id)
    aliases.set(normalizeComparableToken(stage.label), stage.id)
    colorByStage.set(stage.id, stage.color)
    labelByStage.set(stage.id, stage.label)
  }

  for (const [legacyAlias, stageId] of Object.entries(legacyAliases)) {
    aliases.set(normalizeComparableToken(legacyAlias), stageId)
  }

  const filtered = lookupRows.filter(
    (row) =>
      row.is_active &&
      row.entity_table === entityTable &&
      row.entity_field === entityField,
  )

  for (const row of filtered) {
    const valueKey = toStringValue(row.value_key)
    const valueLabel = toStringValue(row.value_label)
    const resolvedId =
      aliases.get(normalizeComparableToken(valueKey)) ??
      aliases.get(normalizeComparableToken(valueLabel)) ??
      null

    if (!resolvedId) continue

    if (valueKey) aliases.set(normalizeComparableToken(valueKey), resolvedId)
    if (valueLabel) aliases.set(normalizeComparableToken(valueLabel), resolvedId)

    const color = readLookupColor(row.metadata)
    if (color) colorByStage.set(resolvedId, color)
    if (valueLabel) labelByStage.set(resolvedId, valueLabel)
  }

  return {
    definitions: defaultStages.map((stage) => ({
      id: stage.id,
      label: labelByStage.get(stage.id) ?? stage.label,
      color: colorByStage.get(stage.id) ?? stage.color,
    })),
    aliases,
  }
}

type BuildFromLookupOptions = {
  lookupRows: LookupValueRecord[]
  entityTable: string
  entityField: string
}

export function buildStageMetadataFromLookupRows({
  lookupRows,
  entityTable,
  entityField,
}: BuildFromLookupOptions): StageMetadata {
  const stageRows = lookupRows
    .filter(
      (row) =>
        row.is_active &&
        row.entity_table === entityTable &&
        row.entity_field === entityField &&
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
      color: readLookupColor(row.metadata) ?? "zinc",
    })
    aliases.set(normalizeLookupToken(id), id)
    aliases.set(normalizeLookupToken(label), id)
  }

  return { definitions, aliases }
}
