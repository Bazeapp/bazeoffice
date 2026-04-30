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
  getTagClassName,
  normalizeLookupToken,
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
      [normalizeLookupToken(option.value), index] as const,
      [normalizeLookupToken(option.label), index] as const,
    ]),
  )

  return [...values].sort((left, right) => {
    const leftOrder = order.get(normalizeLookupToken(left)) ?? Number.MAX_SAFE_INTEGER
    const rightOrder = order.get(normalizeLookupToken(right)) ?? Number.MAX_SAFE_INTEGER
    return leftOrder - rightOrder || left.localeCompare(right)
  })
}

function getDomesticWorkKind(value: string) {
  const token = normalizeLookupToken(value)
  if (token.includes("badante") || token.includes("assistenza")) return "badante"
  if (token.includes("babysitter") || token.includes("baby sitter") || token.includes("tata")) {
    return "tata"
  }
  if (token.includes("colf") || token.includes("pulizie")) return "colf"
  return null
}

function normalizeDomesticWorkValue(value: string, options: LookupOption[]) {
  const valueKind = getDomesticWorkKind(value)
  if (!valueKind) return value

  return (
    options.find(
      (option) =>
        getDomesticWorkKind(option.value) === valueKind ||
        getDomesticWorkKind(option.label) === valueKind
    )?.value ?? value
  )
}

function normalizeValueForField(field: WorkerShiftPreferenceField, value: string) {
  if (field.domain === "lavoratori.tipo_lavoro_domestico") {
    return normalizeDomesticWorkValue(value, field.options)
  }
  return value
}

function normalizeValuesForField(field: WorkerShiftPreferenceField) {
  const normalizedValues = Array.from(new Set(field.value.map((value) => normalizeValueForField(field, value))))
  if (!field.sortByOptionOrder) return normalizedValues
  return sortValuesByOptionOrder(normalizedValues, field.options)
}

function getOptionLabel(options: LookupOption[], value: string) {
  return options.find((option) => option.value === value)?.label ?? value
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
                    field.sortByOptionOrder
                      ? sortValuesByOptionOrder(nextValues, field.options)
                      : nextValues
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
