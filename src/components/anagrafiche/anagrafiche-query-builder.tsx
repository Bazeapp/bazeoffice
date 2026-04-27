import * as React from "react"
import {
  AtSignIcon,
  CalendarIcon,
  CheckIcon,
  CircleDotIcon,
  FunnelIcon,
  HashIcon,
  ListFilterIcon,
  TypeIcon,
} from "lucide-react"
import type {
  ActionProps,
  CombinatorSelectorProps,
  Field,
  FieldSelectorProps,
  OperatorSelectorProps,
  RuleGroupType,
  ValueEditorProps,
} from "react-querybuilder"
import { QueryBuilder } from "react-querybuilder"

import {
  createEmptyGroup,
  getOperatorsForField,
  type FilterFieldType,
} from "@/components/data-table/data-table-filters"
import type { QueryFilterCondition, QueryFilterGroup } from "@/lib/anagrafiche-api"
import { Button } from "@/components/ui-next/button"
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui-next/combobox"
import { Card, CardContent } from "@/components/ui-next/card"
import { Input } from "@/components/ui-next/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui-next/select"
import { cn } from "@/lib/utils"

const UPPERCASE_TOKENS = new Set([
  "id",
  "url",
  "utm",
  "otp",
  "seo",
  "wa",
  "fbclid",
  "gclid",
  "cet",
  "ai",
  "inps",
  "cud",
  "json",
  "jsonb",
  "uuid",
])
const LOWERCASE_CONNECTORS = new Set([
  "a",
  "ad",
  "al",
  "alla",
  "con",
  "da",
  "dal",
  "dalla",
  "dei",
  "del",
  "della",
  "delle",
  "di",
  "e",
  "il",
  "in",
  "la",
  "le",
  "nel",
  "nella",
  "o",
  "per",
  "su",
  "tra",
])
const TOKEN_LABEL_OVERRIDES: Record<string, string> = {
  whatsapp: "WhatsApp",
  webflow: "Webflow",
  looker: "Looker",
  stripe: "Stripe",
  hubspot: "HubSpot",
  pipedrive: "Pipedrive",
  typeform: "Typeform",
  wized: "Wized",
  klaaryo: "Klaaryo",
}

function createFilterId() {
  return Math.random().toString(36).slice(2, 10)
}

function toReadableColumnLabel(key: string) {
  const normalized = key.replace(/__+/g, "_").trim()
  if (!normalized) return key

  const parts = normalized
    .split("_")
    .map((part) => part.trim())
    .filter(Boolean)

  if (!parts.length) return key

  return parts
    .map((part, index) => {
      const lower = part.toLowerCase()

      if (TOKEN_LABEL_OVERRIDES[lower]) {
        return TOKEN_LABEL_OVERRIDES[lower]
      }

      if (UPPERCASE_TOKENS.has(lower)) {
        return lower.toUpperCase()
      }

      if (index > 0 && LOWERCASE_CONNECTORS.has(lower)) {
        return lower
      }

      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join(" ")
}

export type AnagraficheQueryBuilderField = {
  name: string
  label: string
  type: FilterFieldType
  values?: Array<{ name: string; label: string }>
}

function getFieldTypeIcon(fieldType: FilterFieldType | undefined) {
  switch (fieldType) {
    case "id":
      return AtSignIcon
    case "number":
      return HashIcon
    case "date":
      return CalendarIcon
    case "boolean":
      return CheckIcon
    case "enum":
      return CircleDotIcon
    case "multi_enum":
      return ListFilterIcon
    case "text":
    default:
      return TypeIcon
  }
}

export function makeEmptyRuleGroup(): RuleGroupType {
  return {
    combinator: "and",
    rules: [],
  }
}

function needsNoValue(operator: string) {
  return operator === "is_true" || operator === "is_false" || operator === "is_empty" || operator === "is_not_empty"
}

function getValueEditorType(fieldType: FilterFieldType, operator: string) {
  if (needsNoValue(operator)) return null
  if (fieldType === "boolean") return "select"
  if (fieldType === "enum") {
    return operator === "has_any" || operator === "not_has_any" ? "multiselect" : "select"
  }
  if (fieldType === "multi_enum") {
    return operator === "has_any" || operator === "has_all" || operator === "not_has_any"
      ? "multiselect"
      : "select"
  }
  if (fieldType === "number") return "text"
  if (fieldType === "date") return "text"
  return "text"
}

function fieldTypeToInputType(fieldType: FilterFieldType) {
  if (fieldType === "number") return "number"
  if (fieldType === "date") return "date"
  return "text"
}

function normalizeOptionValue(value: unknown) {
  return String(value ?? "")
}

function splitFilterList(value: string) {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
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

type NormalizedOption = {
  value: string
  label: React.ReactNode
  disabled?: boolean
  type?: FilterFieldType
}

function normalizeOptions(
  options: Array<Record<string, unknown>>,
  fallbackType?: FilterFieldType
): NormalizedOption[] {
  return options.flatMap((option) => {
    if ("options" in option && Array.isArray(option.options)) {
      return normalizeOptions(
        option.options as Array<Record<string, unknown>>,
        fallbackType
      )
    }

    const value = normalizeOptionValue(option.name ?? option.value)
    return [
      {
        value,
        label: (option.label as React.ReactNode) ?? value,
        disabled: option.disabled as boolean | undefined,
        type: (option.type as FilterFieldType | undefined) ?? fallbackType,
      },
    ]
  })
}

function ShadcnActionButton({
  label,
  title,
  disabled,
  handleOnClick,
}: ActionProps) {
  const text = typeof label === "string" ? label : ""
  const isRemove = text.toLowerCase().includes("remove")
  const isAdd = text.toLowerCase().includes("add")

  return (
    <Button
      type="button"
      size="sm"
      variant={isRemove ? "ghost" : isAdd ? "outline" : "outline"}
      disabled={disabled}
      title={title}
      onClick={(event) => handleOnClick(event)}
    >
      {text
        .replace(/^add rule$/i, "+ Regola")
        .replace(/^add group$/i, "+ Gruppo")
        .replace(/^remove rule$/i, "Rimuovi")
        .replace(/^remove group$/i, "Rimuovi")}
    </Button>
  )
}

function ShadcnCombinatorSelector({
  value,
  options,
  disabled,
  handleOnChange,
}: CombinatorSelectorProps) {
  const normalizedOptions = normalizeOptions(options as Array<Record<string, unknown>>)

  return (
    <Select value={value} onValueChange={handleOnChange} disabled={disabled}>
      <SelectTrigger className="h-8 w-[92px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {normalizedOptions.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function ShadcnFieldSelector({
  value,
  options,
  disabled,
  handleOnChange,
}: FieldSelectorProps) {
  const normalizedOptions = normalizeOptions(
    options as Array<Record<string, unknown>>
  )

  return (
    <Select value={value} onValueChange={handleOnChange} disabled={disabled}>
      <SelectTrigger className="h-9 min-w-[220px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {normalizedOptions.map((option) => {
          const Icon = getFieldTypeIcon(option.type)

          return (
            <SelectItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              <span className="flex items-center gap-2">
                <Icon className="text-muted-foreground size-3.5 shrink-0" />
                <span>{option.label}</span>
              </span>
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}

function ShadcnOperatorSelector({
  value,
  options,
  disabled,
  handleOnChange,
}: OperatorSelectorProps) {
  const normalizedOptions = normalizeOptions(options as Array<Record<string, unknown>>)

  return (
    <Select value={value} onValueChange={handleOnChange} disabled={disabled}>
      <SelectTrigger className="h-9 min-w-[180px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {normalizedOptions.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function ShadcnValueEditor(props: ValueEditorProps) {
  const anchor = useComboboxAnchor()
  const fieldType = ((props.fieldData as { type?: FilterFieldType } | undefined)?.type ?? "text") as FilterFieldType
  const optionValues = (props.values ?? []) as Array<{ name?: string; value?: string; label?: string }>
  const normalizedOptions = optionValues.map((option) => {
    const value = normalizeOptionValue(option.name ?? option.value)
    return {
      value,
      label: option.label ?? value,
    }
  })
  const valueLabelByValue = new Map(normalizedOptions.map((option) => [option.value, option.label]))
  const stringValue = Array.isArray(props.value) ? props.value.join(",") : String(props.value ?? "")
  const useSingleSelect =
    (fieldType === "boolean" ||
      (fieldType === "enum" && !["has_any", "not_has_any"].includes(props.operator))) &&
    normalizedOptions.length > 0
  const useSingleEnumSelect =
    fieldType === "multi_enum" &&
    ["is", "is_not", "has", "not_has"].includes(props.operator) &&
    normalizedOptions.length > 0
  const useEnumLookupMultiSelect =
    fieldType === "enum" &&
    ["has_any", "not_has_any"].includes(props.operator) &&
    normalizedOptions.length > 0
  const useMultiEnumLookupSelect =
    fieldType === "multi_enum" &&
    ["has_any", "has_all", "not_has_any"].includes(props.operator) &&
    normalizedOptions.length > 0

  if (props.operator === "between") {
    const betweenValue = readBetweenValue(props.value)
    const inputType = fieldTypeToInputType(fieldType)

    return (
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          type={inputType}
          inputMode={fieldType === "number" ? "decimal" : undefined}
          value={betweenValue.from}
          onChange={(event) =>
            props.handleOnChange([event.target.value, betweenValue.to])
          }
          placeholder="Da"
          className="h-9 min-w-[160px]"
          disabled={props.disabled}
        />
        <Input
          type={inputType}
          inputMode={fieldType === "number" ? "decimal" : undefined}
          value={betweenValue.to}
          onChange={(event) =>
            props.handleOnChange([betweenValue.from, event.target.value])
          }
          placeholder="A"
          className="h-9 min-w-[160px]"
          disabled={props.disabled}
        />
      </div>
    )
  }

  if (fieldType === "boolean") {
    return (
      <Select
        value={stringValue || undefined}
        onValueChange={props.handleOnChange}
        disabled={props.disabled}
      >
        <SelectTrigger className="h-9 min-w-[180px]">
          <SelectValue placeholder="Valore" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="true">Sì</SelectItem>
          <SelectItem value="false">No</SelectItem>
        </SelectContent>
      </Select>
    )
  }

  if (useSingleSelect || useSingleEnumSelect) {
    return (
      <Select
        value={stringValue || undefined}
        onValueChange={props.handleOnChange}
        disabled={props.disabled}
      >
        <SelectTrigger className="h-9 min-w-[220px]">
          <SelectValue placeholder="Valore" />
        </SelectTrigger>
        <SelectContent>
          {normalizedOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  if (useEnumLookupMultiSelect || useMultiEnumLookupSelect) {
    const selectedValues = splitFilterList(stringValue)

    return (
      <Combobox
        multiple
        autoHighlight
        items={normalizedOptions.map((option) => option.value)}
        value={selectedValues}
        onValueChange={(nextValues) => props.handleOnChange((nextValues as string[]).join(","))}
      >
        <ComboboxChips
          ref={anchor}
          className="min-h-9 w-full min-w-[260px] rounded-md border bg-background px-2"
        >
          <ComboboxValue>
            {(values) => (
              <>
                {values.map((value: string) => (
                  <ComboboxChip key={value}>{valueLabelByValue.get(value) ?? value}</ComboboxChip>
                ))}
                <ComboboxChipsInput />
              </>
            )}
          </ComboboxValue>
        </ComboboxChips>
        <ComboboxContent anchor={anchor} className="max-h-80">
          <ComboboxEmpty>Nessun valore trovato.</ComboboxEmpty>
          <ComboboxList className="max-h-72 overflow-y-auto">
            {(item) => (
              <ComboboxItem key={item} value={item}>
                {valueLabelByValue.get(item) ?? item}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    )
  }

  return (
    <Input
      type={fieldTypeToInputType(fieldType)}
      inputMode={fieldType === "number" ? "decimal" : undefined}
      value={stringValue}
      onChange={(event) => props.handleOnChange(event.target.value)}
      placeholder={
        (fieldType === "enum" || fieldType === "multi_enum") &&
        ["has_any", "has_all", "not_has_any"].includes(props.operator)
          ? "Valori separati da virgola"
          : "Valore"
      }
      className="h-9 min-w-[220px]"
      disabled={props.disabled}
    />
  )
}

function translateRuleToCondition(rule: any, fieldsByName: Map<string, AnagraficheQueryBuilderField>): QueryFilterCondition | null {
  const field = String(rule.field ?? "").trim()
  const operator = String(rule.operator ?? "").trim()
  const fieldMeta = fieldsByName.get(field)
  if (!field || !operator || !fieldMeta) return null

  const rawValue = rule.value
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
        if ("rules" in rule) {
          return queryBuilderToFilterGroup(rule as RuleGroupType, fieldsByName)
        }
        return translateRuleToCondition(rule, fieldsByName)
      })
      .filter((node): node is QueryFilterGroup | QueryFilterCondition => node !== null),
  }
}

function countRules(group: RuleGroupType): number {
  return group.rules.reduce((count, rule) => {
    if ("rules" in rule) return count + countRules(rule as RuleGroupType)
    return count + 1
  }, 0)
}

type AnagraficheQueryBuilderProps = {
  fields: AnagraficheQueryBuilderField[]
  query: RuleGroupType
  open: boolean
  hideTrigger?: boolean
  onOpenChange: (open: boolean) => void
  onQueryChange: (query: RuleGroupType) => void
  onApply: () => void
  onReset: () => void
}

export function AnagraficheQueryBuilder({
  fields,
  query,
  open,
  hideTrigger = false,
  onOpenChange,
  onQueryChange,
  onApply,
  onReset,
}: AnagraficheQueryBuilderProps) {
  const activeCount = countRules(query)

  const builderFields = React.useMemo<Field[]>(
    () =>
      fields.map((field) => ({
        name: field.name,
        label: field.label,
        type: field.type,
        operators: getOperatorsForField(field.type).map((operator) => ({
          name: operator.value,
          label: operator.label,
        })),
        values: field.values?.map((value) => ({
          name: value.name,
          label: value.label,
        })),
        valueEditorType: (operator: string) => getValueEditorType(field.type, operator),
        inputType: fieldTypeToInputType(field.type),
      })),
    [fields]
  )

  return (
    <div className="space-y-3">
      {!hideTrigger ? (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={activeCount > 0 ? "default" : "outline"}
            size="sm"
            onClick={() => onOpenChange(!open)}
          >
            <FunnelIcon className="size-4" />
            Filtri avanzati
          </Button>
          {activeCount > 0 ? (
            <span className="text-muted-foreground text-sm">{activeCount} regole</span>
          ) : null}
        </div>
      ) : null}

      {open ? (
        <Card className="rounded-2xl border bg-background shadow-none">
          <CardContent className="space-y-4 p-4">
            <div
              className={cn(
                "query-builder-shell rounded-xl border bg-muted/20 p-3",
                "[&_.queryBuilder]:space-y-3",
                "[&_.queryBuilder-groups]:space-y-3",
                "[&_.queryBuilder-group]:rounded-xl [&_.queryBuilder-group]:border [&_.queryBuilder-group]:bg-background [&_.queryBuilder-group]:p-3",
                "[&_.queryBuilder-group_.queryBuilder-group]:bg-muted/20",
                "[&_.queryBuilder-header]:mb-3 [&_.queryBuilder-header]:flex [&_.queryBuilder-header]:flex-wrap [&_.queryBuilder-header]:items-center [&_.queryBuilder-header]:gap-2",
                "[&_.queryBuilder-body]:space-y-2",
                "[&_.queryBuilder-rule]:grid [&_.queryBuilder-rule]:grid-cols-1 [&_.queryBuilder-rule]:items-start [&_.queryBuilder-rule]:gap-2 md:[&_.queryBuilder-rule]:grid-cols-[minmax(220px,1.15fr)_minmax(180px,0.9fr)_minmax(220px,1.25fr)_auto]",
                "[&_.queryBuilder-rule_.rule-value]:min-w-0",
                "[&_.queryBuilder-rule_.rule-value>*]:w-full",
                "[&_.ruleGroup-combinators]:w-[92px]"
              )}
            >
              <QueryBuilder
                fields={builderFields}
                query={query}
                onQueryChange={(next) => onQueryChange(next)}
                controlClassnames={{
                  queryBuilder: "queryBuilder",
                  ruleGroup: "queryBuilder-group",
                  header: "queryBuilder-header",
                  rule: "queryBuilder-rule",
                  fields: "rule-fields",
                  operators: "rule-operators",
                  value: "rule-value",
                  addRule: "ruleGroup-addRule",
                  addGroup: "ruleGroup-addGroup",
                  removeGroup: "queryBuilder-remove",
                  removeRule: "rule-remove",
                  combinators: "ruleGroup-combinators",
                  body: "queryBuilder-body",
                }}
                controlElements={{
                  addRuleAction: ShadcnActionButton,
                  addGroupAction: ShadcnActionButton,
                  removeGroupAction: ShadcnActionButton,
                  removeRuleAction: ShadcnActionButton,
                  combinatorSelector: ShadcnCombinatorSelector,
                  fieldSelector: ShadcnFieldSelector,
                  operatorSelector: ShadcnOperatorSelector,
                  valueEditor: ShadcnValueEditor,
                }}
              />
            </div>

            <div className="flex items-center justify-end gap-2 border-t pt-3">
              <Button type="button" variant="ghost" onClick={onReset}>
                Reset
              </Button>
              <Button type="button" onClick={onApply}>
                Applica
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
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
