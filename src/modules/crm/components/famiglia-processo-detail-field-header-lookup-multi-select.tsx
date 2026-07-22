import * as React from "react"
import { useController } from "react-hook-form"

import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxChipsTrigger,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox"
import { getLookupBadgeSoftClassName } from "@/lib/lookup-color-styles"
import { cn } from "@/lib/utils"
import { normalizeLookupToken } from "@/lib/value-utils"
import type { LookupOptionsByField } from "../types"
import {
  getLookupOptionLabel,
  normalizeLookupMultiValues,
} from "../lib/famiglia-processo-lookup"

type FamigliaProcessoDetailFieldHeaderLookupMultiSelectProps = {
  name: string
  options: LookupOptionsByField[string]
  colorsByValue: Record<string, string | null>
  disabled: boolean
  placeholder: string
  icon: React.ComponentType<{ className?: string }>
}

export function FamigliaProcessoDetailFieldHeaderLookupMultiSelect({
  name,
  options,
  colorsByValue,
  disabled,
  placeholder,
  icon: Icon,
}: FamigliaProcessoDetailFieldHeaderLookupMultiSelectProps) {
  const anchor = useComboboxAnchor()
  const { field } = useController({ name })
  const value = React.useMemo(
    () => (Array.isArray(field.value) ? (field.value as string[]) : []),
    [field.value]
  )
  const onChange = (values: string[]) => field.onChange(values)
  const normalizedValue = React.useMemo(
    () => normalizeLookupMultiValues(value, options),
    [options, value]
  )
  const selectedTokens = React.useMemo(
    () => new Set(normalizedValue.map((item) => normalizeLookupToken(item))),
    [normalizedValue]
  )
  const availableItems = React.useMemo(
    () =>
      options
        .map((option) => option.valueLabel)
        .filter((label) => !selectedTokens.has(normalizeLookupToken(label))),
    [options, selectedTokens]
  )
  const selectedTone = getLookupBadgeSoftClassName(colorsByValue[normalizedValue[0]])

  return (
    <Combobox
      multiple
      autoHighlight
      items={availableItems}
      value={normalizedValue}
      onValueChange={(nextValues) => {
        onChange(normalizeLookupMultiValues(nextValues as string[], options))
      }}
      disabled={disabled}
    >
      <ComboboxChips
        ref={anchor}
        className={cn(
          "inline-flex min-h-8 w-fit max-w-full flex-none items-center gap-1 rounded-full border py-0 pl-2 pr-1 shadow-none",
          "focus-within:shadow-[0_0_0_2px_color-mix(in_srgb,var(--accent)_45%,transparent)]",
          normalizedValue.length > 0
            ? selectedTone
            : "border-border bg-surface text-muted-foreground"
        )}
      >
        <Icon className="size-3.5 shrink-0" />
        <ComboboxValue>
          {(values) => (
            <React.Fragment>
              {values.map((item: string) => (
                <ComboboxChip
                  key={item}
                  className={cn(
                    "h-7 rounded-full bg-transparent px-1 pr-0.5 text-sm font-medium text-current shadow-none"
                  )}
                >
                  {item}
                </ComboboxChip>
              ))}
              <ComboboxChipsInput
                placeholder={values.length > 0 ? "" : placeholder}
                className={cn(
                  "h-7 px-1 text-sm",
                  values.length > 0
                    ? "w-px min-w-0 max-w-px flex-none p-0 opacity-0"
                    : "min-w-24"
                )}
              />
            </React.Fragment>
          )}
        </ComboboxValue>
        <ComboboxChipsTrigger
          aria-label={`Apri opzioni ${placeholder}`}
          className="size-7 rounded-full text-current hover:bg-black/5"
        />
      </ComboboxChips>
      <ComboboxContent anchor={anchor} className="max-h-80">
        <ComboboxEmpty>Nessuna opzione disponibile.</ComboboxEmpty>
        <ComboboxList className="max-h-72 overflow-y-auto">
          {(item) => (
            <ComboboxItem key={item} value={item}>
              {getLookupOptionLabel(options, item)}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
