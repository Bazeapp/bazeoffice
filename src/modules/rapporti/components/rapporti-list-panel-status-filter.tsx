import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FieldLabel } from "@/components/ui/field"

import { RAPPORTO_STATUS_OPTIONS } from "../lib/list-panel-utils"
import type { RapportoStatusFilter } from "../types"

export type RapportiListPanelStatusFilterProps = {
  value: RapportoStatusFilter
  onChange: (value: RapportoStatusFilter) => void
}

export function RapportiListPanelStatusFilter({
  value,
  onChange,
}: RapportiListPanelStatusFilterProps) {
  return (
    <div className="space-y-1">
      <FieldLabel>Stato rapporto</FieldLabel>
      <Select value={value} onValueChange={(nextValue) => onChange(nextValue as RapportoStatusFilter)}>
        <SelectTrigger className="w-full" data-testid="rapporti-status-filter">
          <SelectValue placeholder="Tutti" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tutti</SelectItem>
          {RAPPORTO_STATUS_OPTIONS.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
