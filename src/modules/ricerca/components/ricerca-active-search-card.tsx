import {
  BriefcaseBusinessIcon,
  CalendarIcon,
  Clock3Icon,
  MapPinIcon,
} from "lucide-react"

import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { CardMetaRow } from "@/components/shared-next/card-meta-row"
import { RecordCard } from "@/components/shared-next/record-card"
import { formatBadgeLabel } from "@/lib/format-utils"
import { getLookupBadgeSoftClassName } from "@/lib/lookup-color-styles"
import type { RicercaBoardCardData } from "../types"

/**
 * View-model del recruiter per l'avatar della card (stile assegnazione):
 * solo iniziali + anello colorato per-operatore. Il consumer (board) lo
 * pre-calcola dagli `operatorOptions` così la card resta disaccoppiata dal
 * modello operatori.
 */
export type RicercaCardRecruiter = {
  /** Iniziali già calcolate (es. "MR"). */
  avatar: string
  /** Classe Tailwind dell'anello colorato per-operatore (es. "ring-2 ring-sky-500"). */
  ringClassName: string
  /** Nome completo, mostrato come tooltip nativo sull'avatar. */
  label: string
}

function formatOreGiorniLabel(oreSettimanali: string, giorniSettimanali: string) {
  const oreToken = oreSettimanali.trim()
  const giorniToken = giorniSettimanali.trim()

  if (
    (oreToken === "" || oreToken === "-") &&
    (giorniToken === "" || giorniToken === "-")
  ) {
    return "-"
  }

  const oreLabel = oreToken && oreToken !== "-" ? `${oreToken}h` : "-"
  const giorniLabel = giorniToken && giorniToken !== "-" ? `${giorniToken}g` : "-"
  return `${oreLabel} | ${giorniLabel}`
}

function isUrgentDeadline(value: string | null | undefined) {
  if (!value) return false
  const normalized = value.trim()
  if (!normalized) return false
  const deadline = new Date(normalized)
  if (Number.isNaN(deadline.getTime())) return false
  const now = new Date()
  const diff = deadline.getTime() - now.getTime()
  return diff <= 1000 * 60 * 60 * 24 * 7
}

export function RicercaActiveSearchCard({
  data,
  onClick,
  className,
  recruiter,
}: {
  data: RicercaBoardCardData
  onClick?: () => void
  className?: string
  recruiter?: RicercaCardRecruiter | null
}) {
  const oreGiorni = formatOreGiorniLabel(data.oreSettimanali, data.giorniSettimanali)
  const hasUrgentDeadline = isUrgentDeadline(data.deadlineRaw)
  const tipoLavoroBadges =
    data.tipoLavoroBadges && data.tipoLavoroBadges.length > 0
      ? data.tipoLavoroBadges
      : data.tipoLavoroBadge
        ? [data.tipoLavoroBadge]
        : []
  const hasTags = Boolean(tipoLavoroBadges.length > 0 || data.tipoRapportoBadge)

  return (
    <div className={className} onClick={onClick}>
      <RecordCard>
        <RecordCard.Header title={data.nomeFamiglia} />
        <RecordCard.Body>
          {hasTags ? (
            <CardMetaRow>
              {tipoLavoroBadges.map((tipoLavoro) => (
                <Badge
                  key={tipoLavoro}
                  className={getLookupBadgeSoftClassName(
                    data.tipoLavoroColors?.[tipoLavoro] ?? data.tipoLavoroColor
                  )}
                >
                  <BriefcaseBusinessIcon data-icon="inline-start" />
                  {formatBadgeLabel(tipoLavoro)}
                </Badge>
              ))}
              {data.tipoRapportoBadge ? (
                <Badge className={getLookupBadgeSoftClassName(data.tipoRapportoColor)}>
                  <Clock3Icon data-icon="inline-start" />
                  {formatBadgeLabel(data.tipoRapportoBadge)}
                </Badge>
              ) : null}
            </CardMetaRow>
          ) : null}
          <CardMetaRow icon={<Clock3Icon />}>{oreGiorni}</CardMetaRow>
          <CardMetaRow icon={<MapPinIcon />}>{data.zona}</CardMetaRow>
        </RecordCard.Body>
        <RecordCard.Footer
          leftSlot={
            hasUrgentDeadline ? (
              <div className="flex min-w-0 items-center gap-2 text-[12.5px]">
                <CalendarIcon className="size-3 shrink-0 text-red-600" />
                <span className="min-w-0 truncate font-medium text-red-600">
                  {data.deadline}
                </span>
              </div>
            ) : (
              <CardMetaRow icon={<CalendarIcon />}>{data.deadline}</CardMetaRow>
            )
          }
          rightSlot={
            recruiter ? (
              <Avatar
                size="md"
                fallback={recruiter.avatar}
                className={recruiter.ringClassName}
                title={recruiter.label}
              />
            ) : undefined
          }
        />
      </RecordCard>
    </div>
  )
}
