import { CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

import { formatMonthLabel, shiftMonth } from "../lib"

export function PayrollOverviewCedoliniMonthSwitcher({
  value,
  onChange,
}: {
  value: string
  onChange: (nextValue: string) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label="Mese precedente"
        onClick={() => onChange(shiftMonth(value, -1))}
      >
        <ChevronLeftIcon />
      </Button>
      <div className="text-foreground inline-flex h-8 min-w-40 items-center justify-center gap-2 rounded-md text-sm font-medium capitalize">
        <CalendarDaysIcon className="text-muted-foreground size-4" />
        {formatMonthLabel(value)}
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label="Mese successivo"
        onClick={() => onChange(shiftMonth(value, 1))}
      >
        <ChevronRightIcon />
      </Button>
    </div>
  )
}
