import { CalendarDaysIcon } from "lucide-react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

import { formatMonthLabel, TERMINAL_STAGE_IDS } from "../lib"
import type { CedolinoDetailHeaderProps } from "../types"

export function PayrollOverviewCedolinoDetailHeader({
  card,
  columns,
  onStageChange,
}: CedolinoDetailHeaderProps) {
  return (
    <SheetHeader className="border-b bg-surface px-5 py-5">
      <div className="space-y-3">
        <SheetTitle className="truncate text-xl font-semibold">
          {card?.nomeCompleto ?? "Dettaglio cedolino"}
        </SheetTitle>
        <SheetDescription className="sr-only">
          Dettaglio del cedolino con rapporto, stato mese lavorativo, pagamento, presenze e
          feedback.
        </SheetDescription>
        {card?.mese?.mese_lavorativo_copy || card?.mese?.data_inizio ? (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <CalendarDaysIcon className="size-4" />
            <span>
              {card.mese?.mese_lavorativo_copy ??
                formatMonthLabel(card.mese?.data_inizio?.slice(0, 7) ?? "")}
            </span>
          </div>
        ) : null}
        {card ? (
          <Select
            value={card.stage}
            onValueChange={(nextValue) => {
              if (TERMINAL_STAGE_IDS.has(nextValue)) return
              onStageChange(card.id, nextValue)
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {columns.map((column) => (
                <SelectItem
                  key={column.id}
                  value={column.id}
                  disabled={TERMINAL_STAGE_IDS.has(column.id) && card.stage !== column.id}
                >
                  {column.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>
    </SheetHeader>
  )
}
