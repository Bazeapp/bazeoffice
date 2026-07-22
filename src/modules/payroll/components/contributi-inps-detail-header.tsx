import { CalendarDaysIcon } from "lucide-react"

import { SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"

import type { ContributoInpsBoardCardData } from "../types"

type ContributiInpsDetailHeaderProps = {
  card: ContributoInpsBoardCardData | null
}

export function ContributiInpsDetailHeader({ card }: ContributiInpsDetailHeaderProps) {
  return (
    <SheetHeader className="border-b bg-surface px-5 py-5">
      <div className="space-y-2">
        <SheetTitle className="truncate text-xl font-semibold">
          {card?.nomeCompleto ?? "Dettaglio contributo INPS"}
        </SheetTitle>
        <SheetDescription className="sr-only">
          Dettaglio del contributo INPS con stato, importi, allegati e rapporto collegato.
        </SheetDescription>
        {card?.trimestreLabel ? (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <CalendarDaysIcon className="size-4" />
            <span>{card.trimestreLabel}</span>
          </div>
        ) : null}
      </div>
    </SheetHeader>
  )
}
