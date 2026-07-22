import * as React from "react"
import { useController } from "react-hook-form"
import {
  CheckCircle2Icon,
  MailIcon,
  OctagonAlertIcon,
  PhoneIcon,
} from "lucide-react"

import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  type DetailTarget,
  type LookupOption,
  getLookupLabelForSave,
  getLookupSelectDisplayValue,
} from "../lib/detail-utils"

export function FieldSingleSelect({
  name,
  placeholder,
  options,
}: {
  name: string
  placeholder: string
  options: readonly string[]
}) {
  const { field } = useController({ name })
  const value = typeof field.value === "string" ? field.value : ""
  const optionValues = value && !options.includes(value) ? [value, ...options] : options
  return (
    <Select value={value || undefined} onValueChange={field.onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {optionValues.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// FASE 5 BIS — wrapper form-aware per i Select di lookup (label↔key). Il form
// memorizza la LABEL da salvare (come l'originale: getLookupLabelForSave),
// mentre il trigger mostra la value_key risolta.
export function FieldLookupSelect({
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
  const current = typeof field.value === "string" ? field.value : ""
  return (
    <Select
      value={getLookupSelectDisplayValue(current, options)}
      onValueChange={(value) => field.onChange(getLookupLabelForSave(value, options))}
      disabled={disabled}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function EditableField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <p className="ui-type-label">{label}</p>
      {children}
    </div>
  )
}

export function RelatedSubjectCard({
  role,
  name,
  email,
  phone,
  value,
  selected,
  isComplete,
}: {
  role: string
  name: string
  email: string | null | undefined
  phone: string | null | undefined
  value: DetailTarget
  selected: boolean
  isComplete: boolean
}) {
  return (
    <FieldLabel
      htmlFor={`assunzione-target-${value}`}
      className="h-full border-0 p-0 has-[>[data-slot=field]]:border-0"
    >
      <Field
        orientation="horizontal"
        className={cn(
          "h-full items-start rounded-xl border bg-background p-5 transition-colors",
          isComplete ? "border-emerald-400" : "border-red-400",
          selected && (isComplete ? "border-emerald-500" : "border-red-500")
        )}
      >
        <div className="flex size-12 shrink-0 items-center justify-center">
          {isComplete ? (
            <CheckCircle2Icon className="size-7 text-emerald-600" />
          ) : (
            <OctagonAlertIcon className="size-7 text-red-600" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            {role}
          </p>
          <FieldDescription className="mt-1 text-sm font-semibold text-foreground">
            {name}
          </FieldDescription>
          <div className="mt-4 space-y-2">
            <p className="text-muted-foreground flex items-center gap-2 text-sm">
              <MailIcon className="size-4 shrink-0" />
              <span className="truncate">{email ?? "-"}</span>
            </p>
            <p className="text-muted-foreground flex items-center gap-2 text-sm">
              <PhoneIcon className="size-4 shrink-0" />
              <span>{phone ?? "-"}</span>
            </p>
          </div>
        </div>
        <RadioGroupItem
          value={value}
          id={`assunzione-target-${value}`}
          aria-label={`Seleziona ${role.toLowerCase()}`}
        />
      </Field>
    </FieldLabel>
  )
}
