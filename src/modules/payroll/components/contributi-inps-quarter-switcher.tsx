import * as React from "react"
import { CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

import { shiftQuarter } from "../lib"
import type { ContributiPeriod } from "../types"

type ContributiInpsQuarterSwitcherProps = {
  period: ContributiPeriod
  onPeriodChange: React.Dispatch<React.SetStateAction<ContributiPeriod>>
}

export function ContributiInpsQuarterSwitcher({
  period,
  onPeriodChange,
}: ContributiInpsQuarterSwitcherProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label="Trimestre precedente"
        onClick={() => onPeriodChange((current) => shiftQuarter(current, -1))}
      >
        <ChevronLeftIcon />
      </Button>
      <div className="text-foreground inline-flex h-8 min-w-30 items-center justify-center gap-2 rounded-md text-sm font-medium">
        <CalendarDaysIcon className="text-muted-foreground size-4" />
        {period.quarter} {period.year}
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label="Trimestre successivo"
        onClick={() => onPeriodChange((current) => shiftQuarter(current, 1))}
      >
        <ChevronRightIcon />
      </Button>
    </div>
  )
}
