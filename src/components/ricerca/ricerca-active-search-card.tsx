import {
  BriefcaseBusinessIcon,
  CalendarIcon,
  Clock3Icon,
  MapPinIcon,
} from "lucide-react"

import { Badge } from "@/components/ui-next/badge"
import { CardMetaRow } from "@/components/shared-next/card-meta-row"
import { RecordCard } from "@/components/shared-next/record-card"
import type { RicercaBoardCardData } from "@/hooks/use-ricerca-board"

function formatBadgeLabel(value: string) {
  return value
    .replaceAll("-", " ")
    .replaceAll("/", " / ")
    .replace(/\s+/g, " ")
    .trim()
}

function getBadgeClassName(color: string | null | undefined) {
  switch ((color ?? "").toLowerCase()) {
    case "red":
      return "border-red-200 bg-red-100 text-red-700"
    case "rose":
      return "border-rose-200 bg-rose-100 text-rose-700"
    case "orange":
      return "border-orange-200 bg-orange-100 text-orange-700"
    case "amber":
      return "border-amber-200 bg-amber-100 text-amber-700"
    case "yellow":
      return "border-yellow-200 bg-yellow-100 text-yellow-700"
    case "lime":
      return "border-lime-200 bg-lime-100 text-lime-700"
    case "green":
      return "border-green-200 bg-green-100 text-green-700"
    case "emerald":
      return "border-emerald-200 bg-emerald-100 text-emerald-700"
    case "teal":
      return "border-teal-200 bg-teal-100 text-teal-700"
    case "cyan":
      return "border-cyan-200 bg-cyan-100 text-cyan-700"
    case "sky":
      return "border-sky-200 bg-sky-100 text-sky-700"
    case "blue":
      return "border-blue-200 bg-blue-100 text-blue-700"
    case "indigo":
      return "border-indigo-200 bg-indigo-100 text-indigo-700"
    case "violet":
      return "border-violet-200 bg-violet-100 text-violet-700"
    case "purple":
      return "border-purple-200 bg-purple-100 text-purple-700"
    case "fuchsia":
      return "border-fuchsia-200 bg-fuchsia-100 text-fuchsia-700"
    case "pink":
      return "border-pink-200 bg-pink-100 text-pink-700"
    case "slate":
      return "border-slate-200 bg-slate-100 text-slate-700"
    case "gray":
      return "border-gray-200 bg-gray-100 text-gray-700"
    case "zinc":
      return "border-zinc-200 bg-zinc-100 text-zinc-700"
    default:
      return "border-border bg-muted text-foreground"
  }
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
}: {
  data: RicercaBoardCardData
  onClick?: () => void
  className?: string
}) {
  const oreGiorni = formatOreGiorniLabel(data.oreSettimanali, data.giorniSettimanali)
  const hasUrgentDeadline = isUrgentDeadline(data.deadlineRaw)
  const hasTags = Boolean(data.tipoLavoroBadge || data.tipoRapportoBadge)

  return (
    <div className={className} onClick={onClick}>
      <RecordCard>
        <RecordCard.Header title={data.nomeFamiglia} />
        <RecordCard.Body>
          {hasTags ? (
            <CardMetaRow>
              {data.tipoLavoroBadge ? (
                <Badge className={getBadgeClassName(data.tipoLavoroColor)}>
                  <BriefcaseBusinessIcon data-icon="inline-start" />
                  {formatBadgeLabel(data.tipoLavoroBadge)}
                </Badge>
              ) : null}
              {data.tipoRapportoBadge ? (
                <Badge className={getBadgeClassName(data.tipoRapportoColor)}>
                  <Clock3Icon data-icon="inline-start" />
                  {formatBadgeLabel(data.tipoRapportoBadge)}
                </Badge>
              ) : null}
            </CardMetaRow>
          ) : null}
          <CardMetaRow icon={<Clock3Icon />}>{oreGiorni}</CardMetaRow>
          {hasUrgentDeadline ? (
            <div className="flex min-w-0 items-center gap-2 text-[12.5px]">
              <CalendarIcon className="size-3 shrink-0 text-red-600" />
              <span className="min-w-0 truncate font-medium text-red-600">
                {data.deadline}
              </span>
            </div>
          ) : (
            <CardMetaRow icon={<CalendarIcon />}>{data.deadline}</CardMetaRow>
          )}
          <CardMetaRow icon={<MapPinIcon />}>{data.zona}</CardMetaRow>
        </RecordCard.Body>
      </RecordCard>
    </div>
  )
}
