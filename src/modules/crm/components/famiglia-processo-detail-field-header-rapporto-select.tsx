import { Clock3Icon } from "lucide-react"
import { useController } from "react-hook-form"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { LookupOptionsByField } from "../types"
import { getSelectedLookupValue } from "../lib/famiglia-processo-lookup"

type FamigliaProcessoDetailFieldHeaderRapportoSelectProps = {
  name: string
  options: LookupOptionsByField[string]
  colorClassName: string
  disabled: boolean
}

export function FamigliaProcessoDetailFieldHeaderRapportoSelect({
  name,
  options,
  colorClassName,
  disabled,
}: FamigliaProcessoDetailFieldHeaderRapportoSelectProps) {
  const { field } = useController({ name })
  const current = typeof field.value === "string" ? field.value : ""

  return (
    <Select
      value={getSelectedLookupValue(current, options) || undefined}
      onValueChange={(nextValue) => {
        if (!nextValue) return
        const label =
          options.find((option) => option.valueKey === nextValue)?.valueLabel ??
          nextValue
        field.onChange(label)
      }}
      disabled={disabled}
    >
      <SelectTrigger
        className={cn(
          "h-7 w-auto gap-1.5 rounded-full pl-2.5 pr-1.5 text-xs font-medium shadow-none",
          "[&_svg]:!text-current",
          colorClassName
        )}
      >
        <Clock3Icon className="size-3.5 shrink-0" />
        <SelectValue placeholder="Tipo rapporto" />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.valueKey} value={option.valueKey}>
            {option.valueLabel}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
