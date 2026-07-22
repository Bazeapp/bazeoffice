import { CircleCheckBigIcon, StarIcon } from "lucide-react"

import { TipoContrattoBadge } from "@/components/shared-next/tipo-contratto-badge"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

import {
  getCedolinoTypeClassName,
  getCedolinoTypeLabel,
  isAbbonamentoCard,
  isCardPaid,
  normalizeCaseFlag,
} from "../lib"
import type { PayrollBoardCardData } from "../types"

export function PayrollOverviewBoardCard({ card }: { card: PayrollBoardCardData }) {
  const [famiglia, lavoratore] = card.nomeCompleto.split(" – ")
  const isPaid = isCardPaid(card)
  const ratingValue =
    typeof card.record.rating_feedback_famiglia === "number" &&
    card.record.rating_feedback_famiglia > 0
      ? Math.max(0, Math.min(5, Math.round(card.record.rating_feedback_famiglia)))
      : 0

  return (
    <Card className="border border-border/70 bg-surface py-0 transition-shadow hover:shadow-md">
      <CardContent className="space-y-3 px-3 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">
              {famiglia || "Rapporto non disponibile"}
            </p>
            <p className="text-muted-foreground mt-0.5 truncate text-xs">
              {lavoratore || "Dettagli rapporto non disponibili"}
            </p>
          </div>
          {card.importoLabel ? (
            <p className="shrink-0 text-sm font-semibold">{card.importoLabel}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <TipoContrattoBadge isAbbonamento={isAbbonamentoCard(card)} className="px-2.5 py-0.5" />
          {normalizeCaseFlag(card.record.caso_particolare) !== "no" ? (
            <Badge
              variant="secondary"
              className={cn(
                "gap-1 rounded-full px-2.5 py-0.5 text-2xs",
                getCedolinoTypeClassName(card.record.caso_particolare),
              )}
            >
              <CircleCheckBigIcon className="size-3" />
              <span>{getCedolinoTypeLabel(card.record.caso_particolare)}</span>
            </Badge>
          ) : null}
          {isPaid ? (
            <Badge
              variant="secondary"
              className="gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-2xs text-emerald-700 hover:bg-emerald-100"
            >
              <CircleCheckBigIcon className="size-3" />
              <span>Pagato</span>
            </Badge>
          ) : null}
          <Badge
            variant="secondary"
            className={cn(
              "gap-1 rounded-full px-2.5 py-0.5 text-2xs",
              card.presenzeIrregolari
                ? "bg-red-100 text-red-700 hover:bg-red-100"
                : "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
            )}
          >
            <span>{card.presenzeIrregolari ? "Presenze irregolari" : "Presenze regolari"}</span>
          </Badge>
          {ratingValue > 0 ? (
            <div
              className="ml-auto flex items-center gap-0.5"
              title={card.record.testo_feedback_famiglia ?? `Rating famiglia: ${ratingValue}/5`}
              aria-label={`Rating famiglia ${ratingValue} su 5`}
            >
              {Array.from({ length: 5 }).map((_, index) => (
                <StarIcon
                  key={index}
                  className={cn(
                    "size-3.5",
                    index < ratingValue
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted-foreground/30",
                  )}
                />
              ))}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
