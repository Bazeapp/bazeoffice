import { CircleCheckBigIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

import type { ContributoInpsBoardCardData } from "../types"

export function ContributiInpsCard({ card }: { card: ContributoInpsBoardCardData }) {
  const hasAttachment = Boolean(card.record.allegato)

  return (
    <Card className="border border-border/70 bg-surface py-0 transition-shadow hover:shadow-md">
      <CardContent className="space-y-3 px-3 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">{card.nomeFamiglia}</p>
            <p className="text-muted-foreground mt-0.5 truncate text-xs">{card.nomeLavoratore}</p>
          </div>
          {card.importoLabel ? <p className="shrink-0 text-sm font-semibold">{card.importoLabel}</p> : null}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge
            variant="secondary"
            className="rounded-full bg-violet-100 px-2.5 py-0.5 text-2xs text-violet-700 hover:bg-violet-100"
          >
            {card.trimestreLabel}
          </Badge>
          {card.pagopaLabel ? (
            <Badge
              variant="secondary"
              className="rounded-full bg-sky-100 px-2.5 py-0.5 text-2xs text-sky-700 hover:bg-sky-100"
            >
              PagoPA {card.pagopaLabel}
            </Badge>
          ) : null}
          {hasAttachment ? (
            <Badge
              variant="secondary"
              className="gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-2xs text-emerald-700 hover:bg-emerald-100"
            >
              <CircleCheckBigIcon className="size-3" />
              Allegato
            </Badge>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
