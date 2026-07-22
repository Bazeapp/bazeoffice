import { useController } from "react-hook-form"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  EMPTY_SELECT_VALUE,
  SCONTO_RIATTIVAZIONE_OPTION,
} from "../lib/riattivazioni-board.constants"

// FASE 5 BIS — wrapper form-aware per lo sconto: il form memorizza il valore DB
// (stringa o "" per "nessuno"), ma il Select usa il sentinel EMPTY_SELECT_VALUE
// per l'opzione vuota. Qui mappiamo sentinel↔"" senza che la card lo sappia.
export function RiattivazioniDetailScontoSelect({ name }: { name: string }) {
  const { field } = useController({ name })
  const current = typeof field.value === "string" && field.value ? field.value : EMPTY_SELECT_VALUE

  return (
    <Select
      value={current}
      onValueChange={(next) => field.onChange(next === EMPTY_SELECT_VALUE ? "" : next)}
    >
      <SelectTrigger className="bg-surface">
        <SelectValue placeholder="Seleziona sconto" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={EMPTY_SELECT_VALUE}>Nessuno sconto</SelectItem>
        <SelectItem value={SCONTO_RIATTIVAZIONE_OPTION}>{SCONTO_RIATTIVAZIONE_OPTION}</SelectItem>
      </SelectContent>
    </Select>
  )
}
