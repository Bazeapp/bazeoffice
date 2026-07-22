import * as React from "react"
import { useController } from "react-hook-form"

import { FieldInput } from "@/components/forms/field-components"
import { renderFamigliaProcessoValue } from "../lib/famiglia-processo-display"

type FamigliaProcessoDetailFieldHeaderInlineProps = {
  name: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  editing: boolean
  autoFocus?: boolean
  inputType?: React.HTMLInputTypeAttribute
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"]
}

export function FamigliaProcessoDetailFieldHeaderInline({
  name,
  label,
  icon: Icon,
  editing,
  autoFocus = false,
  inputType = "text",
  inputMode,
}: FamigliaProcessoDetailFieldHeaderInlineProps) {
  const { field } = useController({ name })
  const currentValue = typeof field.value === "string" ? field.value : ""

  if (editing) {
    return (
      <span className="inline-flex min-w-44 items-center gap-1.5">
        <Icon className="text-muted-foreground size-3.5 shrink-0" />
        <FieldInput
          name={name}
          type={inputType}
          inputMode={inputMode}
          aria-label={label}
          autoFocus={autoFocus}
          className="h-7 min-w-0 px-2 text-xs"
        />
      </span>
    )
  }

  return (
    <span className="text-muted-foreground inline-flex min-w-0 items-center gap-1.5 text-xs">
      <Icon className="size-3.5 shrink-0" />
      <span className="truncate">{renderFamigliaProcessoValue(currentValue)}</span>
    </span>
  )
}
