import * as React from "react"
import { CheckIcon, StarIcon } from "lucide-react"
import { useController, useFormContext, useWatch } from "react-hook-form"

import { FieldInput, FieldTextarea } from "@/components/forms/field-components"
import { Checkbox } from "@/components/ui/checkbox"
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
import { FieldDescription, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  getLookupOptionLabel,
  normalizeLookupDbLabels,
  normalizeLookupOptionValues,
} from "../lib/lookup-utils"
import { EMPTY_SELECT_VALUE, type LookupOption } from "../lib/experience-references"

type ExperienceRoleFieldProps = {
  value: string[]
  options: LookupOption[]
  disabled: boolean
  onChange: (values: string[]) => void
}

export function ExperienceRoleField({
  value,
  options,
  disabled,
  onChange,
}: ExperienceRoleFieldProps) {
  const anchor = useComboboxAnchor()
  const normalizedValue = React.useMemo(
    () => normalizeLookupOptionValues(value, options),
    [options, value],
  )

  return (
    <Combobox
      multiple
      autoHighlight
      items={options.map((option) => option.value)}
      value={normalizedValue}
      onValueChange={(nextValues) =>
        onChange(normalizeLookupDbLabels(nextValues as string[], options))
      }
      disabled={disabled}
    >
      <ComboboxChips ref={anchor} className="w-full">
        <ComboboxValue>
          {(values) => (
            <React.Fragment>
              {values.map((item: string) => (
                <ComboboxChip key={item}>
                  {getLookupOptionLabel(options, item)}
                </ComboboxChip>
              ))}
              <ComboboxChipsInput placeholder="Seleziona ruoli" />
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

export function FieldExperienceRole({
  name,
  options,
  disabled,
}: {
  name: string
  options: LookupOption[]
  disabled: boolean
}) {
  const { field } = useController({ name })
  const value = Array.isArray(field.value) ? (field.value as string[]) : []
  return (
    <ExperienceRoleField
      value={value}
      options={options}
      disabled={disabled}
      onChange={field.onChange}
    />
  )
}

export function FieldTipoRapportoSelect({
  name,
  options,
  disabled,
}: {
  name: string
  options: LookupOption[]
  disabled: boolean
}) {
  const { field } = useController({ name })
  const value = typeof field.value === "string" ? field.value : ""
  return (
    <Select
      value={value || EMPTY_SELECT_VALUE}
      onValueChange={(next) =>
        field.onChange(next === EMPTY_SELECT_VALUE ? "" : next)
      }
      disabled={disabled}
    >
      <SelectTrigger className="h-9 w-full">
        <SelectValue placeholder="Seleziona tipo rapporto" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={EMPTY_SELECT_VALUE}>Non indicato</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.label}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function FieldRapportoAttivo({
  name,
  dataFineName,
  disabled,
}: {
  name: string
  dataFineName: string
  disabled: boolean
}) {
  const { field } = useController({ name })
  const { setValue } = useFormContext()
  const checked = Boolean(field.value)
  return (
    <label className="flex h-9 items-center gap-2 text-sm">
      <Checkbox
        checked={checked}
        onCheckedChange={(next) => {
          const nextValue = next === true
          field.onChange(nextValue)
          if (nextValue) {
            setValue(dataFineName, "", { shouldDirty: true })
          }
        }}
        disabled={disabled}
      />
      <span>{checked ? "Si" : "No"}</span>
    </label>
  )
}

export function FieldReferenceStatusSelect({
  name,
  options,
  disabled,
}: {
  name: string
  options: LookupOption[]
  disabled: boolean
}) {
  const { field } = useController({ name })
  const value = typeof field.value === "string" ? field.value : ""
  return (
    <Select
      value={value || EMPTY_SELECT_VALUE}
      onValueChange={(next) =>
        field.onChange(next === EMPTY_SELECT_VALUE ? "" : next)
      }
      disabled={disabled}
    >
      <SelectTrigger className="h-9 w-full">
        <SelectValue placeholder="Seleziona stato" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={EMPTY_SELECT_VALUE}>Non indicato</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.label}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function FieldStarRating({
  name,
  disabled,
}: {
  name: string
  disabled: boolean
}) {
  const { field } = useController({ name })
  const current = typeof field.value === "number" ? field.value : 0
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, index) => {
        const score = index + 1
        const active = current >= score
        return (
          <button
            key={score}
            type="button"
            onClick={() => field.onChange(score)}
            disabled={disabled}
            className="disabled:opacity-50"
          >
            <StarIcon
              className={
                active
                  ? "fill-primary text-primary size-4"
                  : "text-muted-foreground/35 size-4"
              }
            />
          </button>
        )
      })}
    </div>
  )
}

export function FieldDisponibileCheckbox({
  name,
  disabled,
}: {
  name: string
  disabled: boolean
}) {
  const { field } = useController({ name })
  const checked = Boolean(field.value)
  return (
    <label className="flex items-center gap-2 text-sm">
      <Checkbox
        checked={checked}
        onCheckedChange={(next) => field.onChange(next === true)}
        disabled={disabled}
      />
      <span className="inline-flex items-center gap-1">
        <CheckIcon className="size-3.5" />
        {checked ? "Si" : "No"}
      </span>
    </label>
  )
}

export function ExperienceReferencesFormBody({
  disabled,
  experienceTipoLavoroOptions,
  experienceTipoRapportoOptions,
}: {
  disabled: boolean
  experienceTipoLavoroOptions: LookupOption[]
  experienceTipoRapportoOptions: LookupOption[]
}) {
  const statoAttiva = Boolean(useWatch({ name: "stato_esperienza_attiva" }))

  return (
    <>
      <div className="space-y-2">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <FieldLabel>Tipo lavoro</FieldLabel>
            <FieldExperienceRole
              name="tipo_lavoro"
              options={experienceTipoLavoroOptions}
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <FieldLabel>Tipo rapporto</FieldLabel>
            <FieldTipoRapportoSelect
              name="tipo_rapporto"
              options={experienceTipoRapportoOptions}
              disabled={disabled}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <FieldLabel>Data inizio</FieldLabel>
            <FieldInput
              name="data_inizio"
              type="date"
              disabled={disabled}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-2">
            <FieldLabel>Data fine</FieldLabel>
            <FieldInput
              name="data_fine"
              type="date"
              disabled={disabled || statoAttiva}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-2">
            <FieldLabel>Rapporto attivo</FieldLabel>
            <FieldRapportoAttivo
              name="stato_esperienza_attiva"
              dataFineName="data_fine"
              disabled={disabled}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <FieldLabel>Descrizione Mansioni ed Esperienza</FieldLabel>
          <FieldTextarea
            name="descrizione"
            disabled={disabled}
            className="min-h-28 w-full text-sm"
          />
        </div>
        <div className="space-y-2">
          <FieldLabel>Descrizione Famiglia e Contesto</FieldLabel>
          <FieldTextarea
            name="descrizione_contesto_lavorativo"
            disabled={disabled}
            className="min-h-28 w-full text-sm"
          />
        </div>
      </div>

      {!statoAttiva ? (
        <div className="space-y-2">
          <FieldLabel>Motivazione fine rapporto</FieldLabel>
          <FieldTextarea
            name="motivazione_fine_rapporto"
            disabled={disabled}
            className="min-h-24 w-full text-sm"
          />
        </div>
      ) : null}
    </>
  )
}

export function ExperienceFormDataFineError() {
  const { formState } = useFormContext()
  const message = formState.errors.data_fine?.message
  if (!message || typeof message !== "string") return null
  return (
    <FieldDescription className="text-destructive">
      {message}
    </FieldDescription>
  )
}
