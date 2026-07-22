import { useController } from "react-hook-form"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TIPO_CONTRATTO_OPTIONS } from "../lib/detail-utils"

export function VariazioniFieldTipoContratto({ name }: { name: string }) {
  const { field } = useController({ name })
  const current = typeof field.value === "string" ? field.value : ""
  return (
    <Select value={current || undefined} onValueChange={field.onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Seleziona tipo contratto" />
      </SelectTrigger>
      <SelectContent>
        {TIPO_CONTRATTO_OPTIONS.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
