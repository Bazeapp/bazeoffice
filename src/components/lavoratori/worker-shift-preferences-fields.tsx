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
import { FieldTitle } from "@/components/ui/field"
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
  const order = new Map(options.map((option, index) => [normalizeLookupToken(option.label), index]))

  return [...values].sort((left, right) => {
    const leftOrder = order.get(normalizeLookupToken(left)) ?? Number.MAX_SAFE_INTEGER
    const rightOrder = order.get(normalizeLookupToken(right)) ?? Number.MAX_SAFE_INTEGER
    return leftOrder - rightOrder || left.localeCompare(right)
  })
}

function normalizeValuesForField(field: WorkerShiftPreferenceField) {
  if (!field.sortByOptionOrder) return field.value
  return sortValuesByOptionOrder(field.value, field.options)
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
      items={options.map((option) => option.label)}
      value={value}
      onValueChange={(nextValues) => onChange(nextValues as string[])}
      disabled={disabled}
    >
      <ComboboxChips ref={anchor} className="w-full">
        <ComboboxValue>
          {(values) => (
            <>
              {values.map((item: string) => (
                <ComboboxChip key={item}>{item}</ComboboxChip>
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
              {item}
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
            <FieldTitle>{field.label}</FieldTitle>
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
                    {value}
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
