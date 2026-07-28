import { useController } from "react-hook-form"

import {
  getLookupLabelForSave,
  getLookupSelectValue,
} from "@/lib/lookup-utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Select "hai_referenze": il value memorizzato è la LABEL DB. Il wrapper
// preserva il mapping label DB ↔ option-value (getLookupSelectValue per
// renderizzare la selezione, getLookupLabelForSave per il commit).
export function FieldHaiReferenzeSelect({
  name,
  options,
  disabled,
}: {
  name: string
  options: Array<{ label: string; value: string }>
  disabled?: boolean
}) {
  const { field } = useController({ name })
  const stored = typeof field.value === "string" ? field.value : ""
  return (
    <Select
      value={getLookupSelectValue(stored, options, "") || undefined}
      onValueChange={(next) =>
        field.onChange(getLookupLabelForSave(next, options))
      }
      disabled={disabled}
    >
      <SelectTrigger>
        <SelectValue placeholder="Seleziona referenze" />
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
