import type { ComponentProps } from "react"

import {
  FieldInput,
  FieldTextarea,
} from "@/components/forms/field-components"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { getLookupSelectValue } from "@/lib/lookup-utils"
import {
  FieldLookupSelect,
  GateFormLevelField,
} from "./gate1/gate-form-fields"
import type { WorkerProfileOverviewLookupOption } from "./worker-profile-overview.types"

export const WORKER_PROFILE_EMPTY_SELECT_VALUE = "none"

type FieldModeProps = {
  useFormFields: boolean
  draftValue?: string
  onFieldChange?: (field: string, value: string) => void
}

export function WorkerProfileOverviewTextField({
  name,
  useFormFields,
  draftValue = "",
  onFieldChange,
  ...inputProps
}: FieldModeProps & { name: string } & ComponentProps<typeof Input>) {
  if (useFormFields) {
    return <FieldInput name={name} {...inputProps} />
  }

  return (
    <Input
      value={draftValue}
      onChange={(event) => onFieldChange?.(name, event.target.value)}
      {...inputProps}
    />
  )
}

export function WorkerProfileOverviewTextareaField({
  name,
  useFormFields,
  draftValue = "",
  onFieldChange,
  ...textareaProps
}: FieldModeProps & { name: string } & ComponentProps<typeof Textarea>) {
  if (useFormFields) {
    return <FieldTextarea name={name} {...textareaProps} />
  }

  return (
    <Textarea
      value={draftValue}
      onChange={(event) => onFieldChange?.(name, event.target.value)}
      {...textareaProps}
    />
  )
}

export function WorkerProfileOverviewLookupField({
  name,
  useFormFields,
  draftValue = "",
  options,
  onFieldChange,
  placeholder,
  emptyLabel = "Non indicato",
  className,
}: FieldModeProps & {
  name: string
  options: WorkerProfileOverviewLookupOption[]
  placeholder: string
  emptyLabel?: string
  className?: string
}) {
  if (useFormFields) {
    return (
      <div className={className}>
        <FieldLookupSelect
          name={name}
          options={options}
          placeholder={placeholder}
          emptyLabel={emptyLabel}
        />
      </div>
    )
  }

  return (
    <div className={className}>
      <Select
        value={getLookupSelectValue(
          draftValue,
          options,
          WORKER_PROFILE_EMPTY_SELECT_VALUE,
        )}
        onValueChange={(value) =>
          onFieldChange?.(
            name,
            value === WORKER_PROFILE_EMPTY_SELECT_VALUE ? "" : value,
          )
        }
      >
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={WORKER_PROFILE_EMPTY_SELECT_VALUE}>
            {emptyLabel}
          </SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function WorkerProfileOverviewLivelloItalianoField({
  useFormFields,
  livelloItaliano,
  livelloItalianoOptions,
  resolvedLivelloItalianoOptions,
  lookupColorsByDomain,
  onLivelloItalianoChange,
}: {
  useFormFields: boolean
  livelloItaliano?: string
  livelloItalianoOptions: WorkerProfileOverviewLookupOption[]
  resolvedLivelloItalianoOptions: WorkerProfileOverviewLookupOption[]
  lookupColorsByDomain: Map<string, string>
  onLivelloItalianoChange?: (value: string) => void
}) {
  if (useFormFields) {
    return (
      <div className="w-full max-w-xs">
        <GateFormLevelField
          name="livello_italiano"
          label=""
          options={livelloItalianoOptions}
          domain="lavoratori.livello_italiano"
          isEditing
          isUpdating={false}
          lookupColorsByDomain={lookupColorsByDomain}
          persistMode="value"
        />
      </div>
    )
  }

  return (
    <div className="w-full max-w-xs">
      <Select
        value={getLookupSelectValue(
          livelloItaliano ?? "",
          resolvedLivelloItalianoOptions,
          WORKER_PROFILE_EMPTY_SELECT_VALUE,
        )}
        onValueChange={(value) =>
          onLivelloItalianoChange?.(
            value === WORKER_PROFILE_EMPTY_SELECT_VALUE ? "" : value,
          )
        }
      >
        <SelectTrigger>
          <SelectValue placeholder="Seleziona livello" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={WORKER_PROFILE_EMPTY_SELECT_VALUE}>
            Non indicato
          </SelectItem>
          {resolvedLivelloItalianoOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
