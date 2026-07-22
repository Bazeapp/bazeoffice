import { useController } from "react-hook-form"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Select "documenti_in_regola": il value memorizzato è la LABEL DB (come
// l'originale che usava SelectItem value={option.label}).
export function FieldDocumentiInRegolaSelect({
  name,
  options,
  disabled,
}: {
  name: string
  options: Array<{ label: string; value: string }>
  disabled?: boolean
}) {
  const { field } = useController({ name })
  const value = typeof field.value === "string" ? field.value : ""
  return (
    <Select
      value={value || undefined}
      onValueChange={(next) => field.onChange(next || "")}
      disabled={disabled}
    >
      <SelectTrigger>
        <SelectValue placeholder="Seleziona stato documenti" />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.label}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
