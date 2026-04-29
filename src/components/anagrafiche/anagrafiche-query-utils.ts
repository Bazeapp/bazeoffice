import type { RuleGroupType } from "react-querybuilder"

import {
  createEmptyGroup,
  type FilterFieldType,
} from "@/components/data-table/data-table-filters"
import type { QueryFilterCondition, QueryFilterGroup } from "@/lib/anagrafiche-api"

import { toReadableColumnLabel } from "./anagrafiche-formatters"

export type AnagraficheQueryBuilderField = {
  name: string
  label: string
  type: FilterFieldType
  values?: Array<{ name: string; label: string }>
}

type QueryBuilderRule = RuleGroupType["rules"][number]

export function makeEmptyRuleGroup(): RuleGroupType {
  return {
    combinator: "and",
    rules: [],
  }
}

function createFilterId() {
  return Math.random().toString(36).slice(2, 10)
}

function isRuleGroup(rule: QueryBuilderRule): rule is RuleGroupType {
  return Boolean(rule && typeof rule === "object" && "rules" in rule)
}

function needsNoValue(operator: string) {
  return operator === "is_true" || operator === "is_false" || operator === "is_empty" || operator === "is_not_empty"
}

function readBetweenValue(value: unknown) {
  if (Array.isArray(value)) {
    return {
      from: String(value[0] ?? ""),
      to: String(value[1] ?? ""),
    }
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    return {
      from: String(record.from ?? ""),
      to: String(record.to ?? ""),
    }
  }

  const [from = "", to = ""] = String(value ?? "").split(",")
  return { from, to }
}

function translateRuleToCondition(
  rule: QueryBuilderRule,
  fieldsByName: Map<string, AnagraficheQueryBuilderField>
): QueryFilterCondition | null {
  if (!rule || typeof rule !== "object" || isRuleGroup(rule)) return null

  const ruleRecord = rule as unknown as Record<string, unknown>
  const field = String(ruleRecord.field ?? "").trim()
  const operator = String(ruleRecord.operator ?? "").trim()
  const fieldMeta = fieldsByName.get(field)
  if (!field || !operator || !fieldMeta) return null

  const rawValue = ruleRecord.value
  const normalizedValue = Array.isArray(rawValue) ? rawValue.join(",") : String(rawValue ?? "")
  const betweenValue = operator === "between" ? readBetweenValue(rawValue) : null

  return {
    kind: "condition",
    id: createFilterId(),
    field,
    operator: operator as QueryFilterCondition["operator"],
    value: needsNoValue(operator) ? "" : betweenValue ? betweenValue.from : normalizedValue,
    valueTo: betweenValue ? betweenValue.to : "",
  }
}

export function queryBuilderToFilterGroup(
  query: RuleGroupType,
  fieldsByName: Map<string, AnagraficheQueryBuilderField>
): QueryFilterGroup {
  return {
    kind: "group",
    id: createFilterId(),
    logic: query.combinator === "or" ? "or" : "and",
    nodes: query.rules
      .map((rule) => {
        if (isRuleGroup(rule)) {
          return queryBuilderToFilterGroup(rule, fieldsByName)
        }
        return translateRuleToCondition(rule, fieldsByName)
      })
      .filter((node): node is QueryFilterGroup | QueryFilterCondition => node !== null),
  }
}

type ToQueryBuilderFieldParams = {
  keys: string[]
  columnsByName: Map<string, { filterType: FilterFieldType }>
  entityTable:
    | "famiglie"
    | "processi_matching"
    | "lavoratori"
    | "mesi_lavorati"
    | "pagamenti"
    | "selezioni_lavoratori"
    | "rapporti_lavorativi"
  lookupOptions: Record<string, Array<{ label: string; value: string }>>
  lookupFilterTypes: Record<string, FilterFieldType | undefined>
}

export function toQueryBuilderFields({
  keys,
  columnsByName,
  entityTable,
  lookupOptions,
  lookupFilterTypes,
}: ToQueryBuilderFieldParams): AnagraficheQueryBuilderField[] {
  return keys.map((key) => {
    const lookupDomain = `${entityTable}.${key}`
    const type = lookupFilterTypes[lookupDomain] ?? columnsByName.get(key)?.filterType ?? "text"
    const values = (lookupOptions[lookupDomain] ?? []).map((option) => ({
      name: option.value,
      label: option.label,
    }))

    return {
      name: key,
      label: toReadableColumnLabel(key),
      type,
      values: values.length > 0 ? values : undefined,
    }
  })
}

export function emptyServerFilterGroup() {
  return createEmptyGroup("and")
}
