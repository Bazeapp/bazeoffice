import { useController } from "react-hook-form"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { SCONTO_APPLICATO_OPTIONS } from "../lib/rapporto-detail-panel.constants"

// FASE 5 BIS — wrapper locale: il Select "Sconto applicato" salva su
// processi_matching.offerta (label = key, niente lookup). Gestisce `disabled`
// e l'opzione extra per un valore corrente fuori lista (logica bespoke
// preservata dall'originale).
export function RapportoDetailPanelFieldScontoSelect({
  name,
  disabled,
  placeholder,
}: {
  name: string
  disabled?: boolean
  placeholder?: string
}) {
  const { field } = useController({ name })
  const current = typeof field.value === "string" ? field.value : ""
  const options = [
    ...SCONTO_APPLICATO_OPTIONS,
    ...(current &&
    !SCONTO_APPLICATO_OPTIONS.includes(current as (typeof SCONTO_APPLICATO_OPTIONS)[number])
      ? [current]
      : []),
  ]
  return (
    <Select
      value={current || undefined}
      disabled={disabled}
      onValueChange={(value) => field.onChange(value)}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
