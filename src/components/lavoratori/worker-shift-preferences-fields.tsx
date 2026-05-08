import * as React from "react"

import { Badge } from "@/components/ui/badge"
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
} from "@/components/ui/combobox"
import { FieldLabel } from "@/components/ui/field"
import {
  normalizeDomesticRoleDbLabels,
  normalizeDomesticRoleLookupValue,
} from "@/features/lavoratori/lib/base-utils"
import {
  getLookupOptionLabel,
  getTagClassName,
  normalizeLookupComparableToken,
  normalizeLookupDbLabels,
  normalizeLookupOptionValue,
  resolveLookupColor,
  type LookupOption,
} from "@/features/lavoratori/lib/lookup-utils"

type WorkerShiftPreferenceField = {
  id: string
  label: React.ReactNode
  domain: string
  value: string[]
  options: LookupOption[]
  placeholder: string
  onChange: (values: string[]) => void
  sortByOptionOrder?: boolean
}

type WorkerShiftPreferencesFieldsProps = {
  fields: WorkerShiftPreferenceField[]
  isEditing: boolean
  isUpdating?: boolean
  lookupColorsByDomain: Map<string, string>
  columns?: 1 | 2
}

function sortValuesByOptionOrder(values: string[], options: LookupOption[]) {
  const order = new Map(
    options.flatMap((option, index) => [
      [normalizeLookupComparableToken(option.value), index] as const,
      [normalizeLookupComparableToken(option.label), index] as const,
    ]),
  )

  return [...values].sort((left, right) => {
    const leftOrder =
      order.get(normalizeLookupComparableToken(left)) ?? Number.MAX_SAFE_INTEGER
    const rightOrder =
      order.get(normalizeLookupComparableToken(right)) ??
      Number.MAX_SAFE_INTEGER
    return leftOrder - rightOrder || left.localeCompare(right)
  })
}

function normalizeValueForField(field: WorkerShiftPreferenceField, value: string) {
  if (field.domain === "lavoratori.tipo_lavoro_domestico") {
    return normalizeDomesticRoleLookupValue(value, field.options)
  }
  return normalizeLookupOptionValue(value, field.options)
}

function normalizeValuesForField(field: WorkerShiftPreferenceField) {
  const normalizedValues: string[] = []
  const seen = new Set<string>()
  for (const value of field.value) {
    const normalized = normalizeValueForField(field, value)
    const token = normalizeLookupComparableToken(normalized)
    if (!normalized || seen.has(token)) continue
    normalizedValues.push(normalized)
    seen.add(token)
  }
  if (!field.sortByOptionOrder) return normalizedValues
  return sortValuesByOptionOrder(normalizedValues, field.options)
}

function getOptionLabel(options: LookupOption[], value: string) {
  return getLookupOptionLabel(options, value)
}

function normalizeChangeValuesForField(field: WorkerShiftPreferenceField, values: string[]) {
  if (field.domain === "lavoratori.tipo_lavoro_domestico") {
    return normalizeDomesticRoleDbLabels(values)
  }
  return normalizeLookupDbLabels(values, field.options)
}

function MultiSelectField({
  value,
  options,
  disabled,
  placeholder,
  onChange,
}: {
  value: string[]
  options: LookupOption[]
  disabled: boolean
  placeholder: string
  onChange: (values: string[]) => void
}) {
  const anchor = useComboboxAnchor()

  return (
    <Combobox
      multiple
      autoHighlight
      items={options.map((option) => option.value)}
      value={value}
      onValueChange={(nextValues) =>
        onChange(Array.from(new Set(nextValues as string[])))
      }
      disabled={disabled}
    >
      <ComboboxChips ref={anchor} className="w-full">
        <ComboboxValue>
          {(values) => (
            <>
              {values.map((item: string) => (
                <ComboboxChip key={item}>
                  {getOptionLabel(options, item)}
                </ComboboxChip>
              ))}
              <ComboboxChipsInput placeholder={placeholder} />
            </>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent anchor={anchor} className="max-h-80">
        <ComboboxEmpty>Nessuna opzione trovata.</ComboboxEmpty>
        <ComboboxList className="max-h-72 overflow-y-auto">
          {(item) => (
            <ComboboxItem key={item} value={item}>
              {getOptionLabel(options, item)}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}

export function WorkerShiftPreferencesFields({
  fields,
  isEditing,
  isUpdating = false,
  lookupColorsByDomain,
  columns = 1,
}: WorkerShiftPreferencesFieldsProps) {
  const gridClassName = columns === 2 ? "grid gap-4 md:grid-cols-2" : "space-y-4"

  return (
    <div className={gridClassName}>
      {fields.map((field) => {
        const values = normalizeValuesForField(field)

        return (
          <div key={field.id} className="space-y-1">
            <FieldLabel>{field.label}</FieldLabel>
            {isEditing ? (
              <MultiSelectField
                value={values}
                options={field.options}
                disabled={isUpdating}
                placeholder={field.placeholder}
                onChange={(nextValues) =>
                  field.onChange(
                    normalizeChangeValuesForField(
                      field,
                      field.sortByOptionOrder
                        ? sortValuesByOptionOrder(nextValues, field.options)
                        : nextValues
                    )
                  )
                }
              />
            ) : values.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {values.map((value) => (
                  <Badge
                    key={`${field.id}-${value}`}
                    variant="outline"
                    className={getTagClassName(
                      resolveLookupColor(lookupColorsByDomain, field.domain, value)
                    )}
                  >
                    {getOptionLabel(field.options, value)}
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground text-sm">-</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
