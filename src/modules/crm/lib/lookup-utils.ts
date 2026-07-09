import type { LookupValueRecord } from "@/types"
import type { CrmPipelineCardData, LookupOptionsByField } from "../types"
import type { CrmPipelineStageDefinition, LookupColorMap } from "../types/crm-pipeline-preview"
import {
  FALLBACK_STATO_SALES_STAGES,
  STATO_SALES_COLUMN_ORDER,
} from "./constants"
import { normalizeLookupToken, toStringValue } from "@/lib/value-utils"
import { parseIsoTime } from "./value-utils"

export function resolveLookupOptionColor(
  lookupOptionsByField: LookupOptionsByField,
  field: string,
  value: string | null
) {
  if (!value) return null
  const token = normalizeLookupToken(value)
  const options = lookupOptionsByField[field] ?? []
  const matched = options.find(
    (option) =>
      normalizeLookupToken(option.valueKey) === token ||
      normalizeLookupToken(option.valueLabel) === token
  )
  return matched?.color ?? null
}

export function resolveLookupLabel(
  lookupOptionsByField: LookupOptionsByField,
  field: string,
  value: string
) {
  const token = normalizeLookupToken(value)
  if (!token) return value

  const matched = lookupOptionsByField[field]?.find(
    (option) =>
      normalizeLookupToken(option.valueKey) === token ||
      normalizeLookupToken(option.valueLabel) === token
  )

  return matched?.valueLabel ?? value
}

export function normalizeLookupPatchValue(
  lookupOptionsByField: LookupOptionsByField,
  field: string,
  value: unknown
) {
  if (!lookupOptionsByField[field]?.length || value == null) return value

  if (Array.isArray(value)) {
    return value.map((item) =>
      typeof item === "string"
        ? resolveLookupLabel(lookupOptionsByField, field, item)
        : item
    )
  }

  if (typeof value !== "string") return value

  const directLabel = resolveLookupLabel(lookupOptionsByField, field, value)
  if (directLabel !== value || !value.includes(",")) return directLabel

  return value
    .split(",")
    .map((item) => resolveLookupLabel(lookupOptionsByField, field, item.trim()))
    .filter(Boolean)
    .join(", ")
}

export function normalizeLookupPatchLabels(
  patch: Record<string, unknown>,
  lookupOptionsByField: LookupOptionsByField
) {
  return Object.fromEntries(
    Object.entries(patch).map(([field, value]) => [
      field,
      normalizeLookupPatchValue(lookupOptionsByField, field, value),
    ])
  )
}
export function compareNullableDates(left: string | null, right: string | null, ascending: boolean) {
  const leftTime = parseIsoTime(left)
  const rightTime = parseIsoTime(right)

  if (leftTime === null && rightTime === null) return 0
  if (leftTime === null) return -1
  if (rightTime === null) return 1
  return ascending ? leftTime - rightTime : rightTime - leftTime
}

export function sortCardsForStage(cards: CrmPipelineCardData[], stageId: string) {
  const sorted = [...cards]

  sorted.sort((left, right) => {
    if (stageId === "hot_call_attivazione_prenotata") {
      const byCall = compareNullableDates(left.dataCallPrenotataRaw, right.dataCallPrenotataRaw, true)
      if (byCall !== 0) return byCall
    } else if (stageId === "cold_ricerca_futura") {
      const byCallback = compareNullableDates(
        left.dataPerRicercaFuturaRaw,
        right.dataPerRicercaFuturaRaw,
        true
      )
      if (byCallback !== 0) return byCallback
    }

    return compareNullableDates(left.dataLeadRaw, right.dataLeadRaw, false)
  })

  return sorted
}
export function getProcessAddressTypePriority(value: unknown) {
  const type = normalizeLookupToken(toStringValue(value))
  if (type === "luogo") return 0
  if (type === "prova") return 1
  if (!type) return 2
  return null
}

export function normalizeStatoSalesStageId(value: string | null | undefined) {
  const token = normalizeLookupToken(value)
  if (token === "won - in attesa di conferma") {
    return "won_in_attesa_di_conferma"
  }
  return token
}

export function canonicalizeLookupValue(
  field: string | null | undefined,
  value: string | null | undefined
) {
  const token = normalizeLookupToken(value)
  if (!token) return null

  if (field === "tipo_lavoro") {
    if (["colf/pulizia", "colf / pulizia"].includes(token)) {
      return "Colf / Pulizie"
    }
    if (
      [
        "assistenza domestica / badante",
        "assistenza domiciliare / badante",
      ].includes(token)
    ) {
      return "Assistenza domiciliare / Badante"
    }
    if (["tata colf", "tata - colf", "babysitter / tata-colf"].includes(token)) {
      return "Tata - Colf"
    }
  }

  if (field === "tipo_rapporto") {
    if (
      [
        "*non* convivente full time",
        "non convivente full time",
        "non convivente full-time",
        "full time",
      ].includes(token)
    ) {
      return "Non convivente Full-time"
    }
    if (["part-time", "part time"].includes(token)) {
      return "Part time"
    }
    if (token === "lavoro ad ore") {
      return "Lavoro ad ore"
    }
    if (token === "convivente") {
      return "Convivente"
    }
  }

  return value?.trim() ?? null
}

export function readLookupColor(metadata: LookupValueRecord["metadata"]) {
  if (!metadata || typeof metadata !== "object") return null

  const color = metadata.color
  return typeof color === "string" && color.trim() ? color.trim() : null
}

export function buildLookupColorMap(rows: LookupValueRecord[]): LookupColorMap {
  return rows.reduce<LookupColorMap>((acc, current) => {
    if (!current.is_active) return acc
    const color = readLookupColor(current.metadata)
    if (!color) return acc

    const domain = `${current.entity_table}.${current.entity_field}`
    if (!acc[domain]) acc[domain] = {}

    const canonicalValueKey = canonicalizeLookupValue(
      current.entity_field,
      current.value_key
    )
    const canonicalValueLabel = canonicalizeLookupValue(
      current.entity_field,
      current.value_label
    )

    acc[domain][normalizeLookupToken(current.value_key)] = color
    acc[domain][normalizeLookupToken(current.value_label)] = color
    if (canonicalValueKey) {
      acc[domain][normalizeLookupToken(canonicalValueKey)] = color
    }
    if (canonicalValueLabel) {
      acc[domain][normalizeLookupToken(canonicalValueLabel)] = color
    }
    return acc
  }, {})
}

export function buildLookupOptionsByField(rows: LookupValueRecord[]): LookupOptionsByField {
  const entries = rows
    .filter(
      (row) =>
        row.is_active &&
        (row.entity_table === "processi_matching" ||
          (row.entity_table === "lavoratori" && row.entity_field === "provincia")) &&
        Boolean(toStringValue(row.value_key)) &&
        Boolean(toStringValue(row.value_label))
    )
    .sort((a, b) => {
      const left = a.sort_order ?? Number.MAX_SAFE_INTEGER
      const right = b.sort_order ?? Number.MAX_SAFE_INTEGER
      if (left !== right) return left - right
      return a.value_label.localeCompare(b.value_label, "it")
    })

  const map: LookupOptionsByField = {}
  const seenByField = new Map<string, Set<string>>()
  for (const row of entries) {
    const field = toStringValue(row.entity_field)
    const valueKey = canonicalizeLookupValue(field, toStringValue(row.value_key))
    const valueLabel = canonicalizeLookupValue(field, toStringValue(row.value_label))
    if (!field || !valueKey || !valueLabel) continue

    if (!map[field]) map[field] = []
    if (!seenByField.has(field)) {
      seenByField.set(field, new Set<string>())
    }

    const normalizedValueKey = normalizeLookupToken(valueKey)
    const normalizedValueLabel = normalizeLookupToken(valueLabel)
    const dedupeToken = `${normalizedValueKey}::${normalizedValueLabel}`
    if (seenByField.get(field)?.has(dedupeToken)) {
      continue
    }

    seenByField.get(field)?.add(dedupeToken)

    map[field].push({
      valueKey,
      valueLabel,
      color: readLookupColor(row.metadata),
      sortOrder: row.sort_order,
    })
  }

  for (const fallbackStage of FALLBACK_STATO_SALES_STAGES) {
    const options = map.stato_sales ?? []
    const alreadyPresent = options.some(
      (option) =>
        normalizeStatoSalesStageId(option.valueKey) === fallbackStage.id ||
        normalizeStatoSalesStageId(option.valueLabel) === fallbackStage.id
    )

    if (!alreadyPresent) {
      map.stato_sales = [
        ...options,
        {
          valueKey: fallbackStage.id,
          valueLabel: fallbackStage.label,
          color: fallbackStage.color,
          sortOrder: fallbackStage.sortOrder,
        },
      ]
    }
  }

  return map
}

export function resolveBadgeColor(
  lookupColors: LookupColorMap,
  entityTable: string,
  entityField: string,
  value: string | null
) {
  if (!value) return null
  const domain = `${entityTable}.${entityField}`
  return lookupColors[domain]?.[normalizeLookupToken(value)] ?? null
}

export function buildStageDefinitions(lookupRows: LookupValueRecord[]) {
  const stageRows = lookupRows.filter(
    (row) =>
      row.is_active &&
      row.entity_table === "processi_matching" &&
      row.entity_field === "stato_sales"
  )

  const byId = new Map<string, CrmPipelineStageDefinition>()
  const tokenToStageId = new Map<string, string>()

  for (const row of stageRows) {
    const id = normalizeStatoSalesStageId(row.value_key)
    if (!id) continue

    const label = toStringValue(row.value_label) ?? id
    const color = readLookupColor(row.metadata)
    const stage = {
      id,
      label,
      color,
      sortOrder: row.sort_order,
    }

    byId.set(id, stage)
    tokenToStageId.set(normalizeLookupToken(row.value_key), id)
    tokenToStageId.set(normalizeLookupToken(row.value_label), id)
  }

  for (const fallbackStage of FALLBACK_STATO_SALES_STAGES) {
    if (!byId.has(fallbackStage.id)) {
      byId.set(fallbackStage.id, fallbackStage)
    }
    tokenToStageId.set(normalizeLookupToken(fallbackStage.id), fallbackStage.id)
    tokenToStageId.set(normalizeLookupToken(fallbackStage.label), fallbackStage.id)
  }

  const orderedIds: string[] = []
  for (const rawId of STATO_SALES_COLUMN_ORDER) {
    const normalizedId = normalizeStatoSalesStageId(rawId)
    if (byId.has(normalizedId)) {
      orderedIds.push(normalizedId)
    }
  }

  const orderedIdSet = new Set(orderedIds)
  const orderedStages = orderedIds
    .map((id) => byId.get(id))
    .filter((item): item is CrmPipelineStageDefinition => Boolean(item))
  const unorderedStages = Array.from(byId.values())
    .filter((stage) => !orderedIdSet.has(stage.id))
    .sort((left, right) => {
      const leftOrder = left.sortOrder ?? Number.MAX_SAFE_INTEGER
      const rightOrder = right.sortOrder ?? Number.MAX_SAFE_INTEGER
      if (leftOrder !== rightOrder) return leftOrder - rightOrder
      return left.label.localeCompare(right.label, "it")
    })
  const stages = [...orderedStages, ...unorderedStages]

  return { stages, tokenToStageId }
}
