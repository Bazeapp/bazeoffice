import * as React from "react"
import { useController } from "react-hook-form"

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
} from "@/components/ui/combobox"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getLookupOptionLabel, normalizeLookupDbLabels, normalizeLookupOptionValues, type LookupOption } from "@/lib/lookup-utils"
import type { WorkerPipelineSummaryTone } from "../types/worker-pipeline-summary"
import { toneBadgeClassName } from "../lib/worker-pipeline-summary.utils"

export function SectionToneBadge({
  label,
  tone,
}: {
  label: string
  tone: WorkerPipelineSummaryTone
}) {
  return (
    <Badge variant="outline" className={toneBadgeClassName(tone)}>
      {label}
    </Badge>
  )
}

// FASE 5 BIS — Select provincia lavoratore agganciata al form. Preserva il
// mapping valore-form ↔ "none" (campo vuoto) e value=value (sigla).
export function FieldWorkerProvinciaSelect({
  name,
  options,
}: {
  name: string
  options: LookupOption[]
}) {
  const { field } = useController({ name })
  const value = typeof field.value === "string" ? field.value : ""
  return (
    <Select
      value={value || "none"}
      onValueChange={(next) => field.onChange(next === "none" ? "" : next)}
    >
      <SelectTrigger className="h-9 text-sm">
        <SelectValue placeholder="Seleziona provincia" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

// FASE 5 BIS — Select provincia indirizzo prova agganciata al form. Preserva
// l'originale: SelectItem value=label, "none" → campo vuoto.
export function FieldFamilyProvinciaSelect({
  name,
  options,
  placeholder,
  disabled,
}: {
  name: string
  options: LookupOption[]
  placeholder: string
  disabled?: boolean
}) {
  const { field } = useController({ name })
  const value = typeof field.value === "string" ? field.value : ""
  return (
    <Select
      value={value || "none"}
      onValueChange={(next) => field.onChange(next === "none" ? "" : next)}
      disabled={disabled}
    >
      <SelectTrigger className="h-9">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Nessuna provincia</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.label}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// FASE 5 BIS — Combobox multi "Mobilita" agganciata al form. Preserva la
// normalizzazione bespoke value↔label (normalizeLookupOptionValues per i chip;
// normalizeLookupDbLabels per il commit verso il DB).
export function FieldMobilityCombobox({
  name,
  options,
  anchor,
}: {
  name: string
  options: LookupOption[]
  anchor: React.RefObject<HTMLDivElement | null>
}) {
  const { field } = useController({ name })
  const stored = Array.isArray(field.value) ? (field.value as string[]) : []
  return (
    <Combobox
      multiple
      autoHighlight
      items={options.map((option) => option.value)}
      value={normalizeLookupOptionValues(stored, options)}
      onValueChange={(nextValues) =>
        field.onChange(
          normalizeLookupDbLabels(nextValues as string[], options),
        )
      }
    >
      <ComboboxChips ref={anchor} className="w-full">
        <ComboboxValue>
          {(values) => (
            <React.Fragment>
              {values.map((value: string) => (
                <ComboboxChip key={value}>
                  {getLookupOptionLabel(options, value)}
                </ComboboxChip>
              ))}
              <ComboboxChipsInput placeholder="Seleziona opzioni" />
            </React.Fragment>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent anchor={anchor} className="max-h-80">
        <ComboboxEmpty>Nessuna opzione trovata.</ComboboxEmpty>
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
