import type { ComponentType } from "react"
import {
  BadgeCheckIcon,
  BabyIcon,
  CalendarDaysIcon,
  Clock3Icon,
  CheckCircle2Icon,
  HomeIcon,
  MapPinIcon,
  MinusCircleIcon,
  PhoneIcon,
  ShieldCheckIcon,
  XCircleIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { getLookupBadgeSoftClassName } from "@/lib/lookup-color-styles"
import { RelatedActiveSearchCard } from "@/components/ricerca/worker-pipeline-summary-cards"
import { RecordCard } from "@/components/shared-next/record-card"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"

type WorkerOtherSelectionSummaryItem = {
  id: string
  familyName: string
  ricercaLabel: string
  recruiterLabel: string
  statoSelezione: string
  statoSelezioneColor?: string | null
  statoRicerca: string
  statoRicercaColor?: string | null
  orarioDiLavoro: string
  zona: string
  appunti: string
}

type WorkerOtherSelectionSummary = {
  count: number
  dots: Array<{ key: string; colorClassName: string; label: string }>
  details: WorkerOtherSelectionSummaryItem[]
}

export type LavoratoreListItem = {
  id: string
  nomeCompleto: string
  immagineUrl: string | null
  travelTimeMinutes?: number | null
  locationLabel: string | null
  telefono: string | null
  isBlacklisted: boolean
  tipoRuolo: string | null
  tipoRuoloColor: string | null
  tipoLavoro: string | null
  tipoLavoroColor: string | null
  ruoliDomestici?: string[]
  eta?: number | null
  anniEsperienzaColf?: number | null
  anniEsperienzaBabysitter?: number | null
  statoLavoratore: string | null
  statoLavoratoreColor: string | null
  disponibilita: string | null
  disponibilitaColor: string | null
  isDisponibile: boolean | null
  isQualified: boolean
  isIdoneo: boolean
  isCertificato: boolean
  otherActiveSelections?: WorkerOtherSelectionSummary | null
}

function initialsFromName(name: string) {
  const parts = name
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

type LavoratoreCardProps = {
  worker: LavoratoreListItem
  isActive: boolean
  onClick: () => void
  variant?: "default" | "gate1"
  gate1Summary?: {
    provincia: string | null
    createdAt: string | null
    followup: string | null
  }
}

type WorkerQualificationStatus = {
  label: "Non qualificato" | "Non idoneo" | "Qualificato" | "Idoneo" | "Certificato"
  ringClassName: string
  badgeClassName: string
  icon: ComponentType<{ className?: string }>
}

const DEFAULT_BLUE_BADGE_CLASS_NAME =
  "border-blue-200 bg-blue-100 text-blue-700"

function getWorkerQualificationStatus(worker: LavoratoreListItem): WorkerQualificationStatus {
  if (worker.isCertificato) {
    return {
      label: "Certificato",
      ringClassName: "ring-2 ring-emerald-600/40",
      badgeClassName: "bg-success text-foreground-on-accent",
      icon: BadgeCheckIcon,
    }
  }

  if (worker.isIdoneo) {
    return {
      label: "Idoneo",
      ringClassName: "ring-2 ring-emerald-400/40",
      badgeClassName: "bg-emerald-400 text-emerald-950",
      icon: ShieldCheckIcon,
    }
  }

  if (worker.isQualified && !worker.isIdoneo) {
    return {
      label: "Non idoneo",
      ringClassName: "ring-2 ring-amber-400/40",
      badgeClassName: "bg-amber-300 text-amber-950",
      icon: XCircleIcon,
    }
  }

  if (worker.isQualified) {
    return {
      label: "Qualificato",
      ringClassName: "ring-2 ring-emerald-300/40",
      badgeClassName: "bg-emerald-300 text-emerald-950",
      icon: CheckCircle2Icon,
    }
  }

  return {
    label: "Non qualificato",
    ringClassName: "ring-2 ring-zinc-300/50",
    badgeClassName: "bg-zinc-300 text-zinc-900",
    icon: MinusCircleIcon,
  }
}

function getBadgeClassName(color: string | null | undefined) {
  void color
  return DEFAULT_BLUE_BADGE_CLASS_NAME
}

function getStatusSoftClassName(
  workerColor: string | null | undefined,
  statusLabel: string
) {
  if (workerColor) return getLookupBadgeSoftClassName(workerColor)
  void statusLabel
  return DEFAULT_BLUE_BADGE_CLASS_NAME
}

function formatYearsLabel(value: number) {
  if (Number.isInteger(value)) return `${value} anni`
  return `${value.toFixed(1).replace(".", ",")} anni`
}

function getExperienceLevel(value: number) {
  if (!Number.isFinite(value)) {
    return { activeSegments: 0, segmentClassName: "bg-muted-foreground/30" }
  }
  if (value < 2) {
    return { activeSegments: 1, segmentClassName: "bg-orange-500" }
  }
  if (value <= 8) {
    return { activeSegments: 2, segmentClassName: "bg-green-500" }
  }
  return { activeSegments: 3, segmentClassName: "bg-emerald-600" }
}

function formatOtherSelectionsLabel(count: number) {
  if (count === 1) return "1 altra selezione"
  return `${count} altre selezioni`
}

function formatTravelTimeLabel(minutes: number | null | undefined) {
  if (minutes == null || !Number.isFinite(minutes)) return null
  return `${Math.round(minutes)} min`
}

function formatCreatedAtLabel(value: string | null | undefined) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function WorkerAvatarMedia({
  worker,
  qualificationStatus,
  size = "lg",
}: {
  worker: LavoratoreListItem
  qualificationStatus: WorkerQualificationStatus
  size?: "md" | "lg"
}) {
  const StatusIcon = qualificationStatus.icon
  return (
    <span className="relative inline-block">
      <Avatar
        size={size}
        src={worker.immagineUrl ?? undefined}
        alt={worker.nomeCompleto}
        fallback={initialsFromName(worker.nomeCompleto)}
        className={qualificationStatus.ringClassName}
      />
      <span
        aria-hidden
        title={qualificationStatus.label}
        className={cn(
          "absolute -bottom-0.5 -left-0.5 flex size-4 items-center justify-center rounded-full ring-2 ring-white",
          qualificationStatus.badgeClassName,
        )}
      >
        <StatusIcon className="size-2.5" />
      </span>
    </span>
  )
}

export function LavoratoreCard({
  worker,
  isActive,
  onClick,
  variant = "default",
  gate1Summary,
}: LavoratoreCardProps) {
  const qualificationStatus = getWorkerQualificationStatus(worker)
  const workerStatusLabel = worker.statoLavoratore || qualificationStatus.label
  const ruoliDomestici = Array.isArray(worker.ruoliDomestici) ? worker.ruoliDomestici : []
  const displayRoles =
    ruoliDomestici.length > 0 ? ruoliDomestici.slice(0, 3) : worker.tipoRuolo ? [worker.tipoRuolo] : []

  const experienceEntries: Array<{
    label: string
    years: number
    icon: "colf" | "babysitter"
  }> = []
  const anniEsperienzaColf =
    typeof worker.anniEsperienzaColf === "number" && Number.isFinite(worker.anniEsperienzaColf)
      ? worker.anniEsperienzaColf
      : 0
  const anniEsperienzaBabysitter =
    typeof worker.anniEsperienzaBabysitter === "number" &&
    Number.isFinite(worker.anniEsperienzaBabysitter)
      ? worker.anniEsperienzaBabysitter
      : 0

  experienceEntries.push({
    label: formatYearsLabel(anniEsperienzaColf),
    years: anniEsperienzaColf,
    icon: "colf",
  })
  experienceEntries.push({
    label: formatYearsLabel(anniEsperienzaBabysitter),
    years: anniEsperienzaBabysitter,
    icon: "babysitter",
  })
  const otherSelections = worker.otherActiveSelections
  const travelTimeLabel = formatTravelTimeLabel(worker.travelTimeMinutes)

  const cardClassName = cn(
    worker.isBlacklisted && "opacity-55 saturate-0",
    isActive && "ring-primary/35 ring-2",
  )

  if (variant === "gate1") {
    return (
      <RecordCard onClick={onClick} className={cardClassName}>
        <RecordCard.Header
          media={
            <WorkerAvatarMedia
              worker={worker}
              qualificationStatus={qualificationStatus}
              size="md"
            />
          }
          title={
            <span className="text-sm font-semibold">{worker.nomeCompleto}</span>
          }
        />
        <RecordCard.Body className="text-muted-foreground gap-1.5 text-2xs">
          <p className="flex min-w-0 items-center gap-1.5">
            <MapPinIcon className="size-3 shrink-0" />
            <span className="truncate">{gate1Summary?.provincia || "-"}</span>
          </p>
          <p className="flex min-w-0 items-center gap-1.5">
            <CalendarDaysIcon className="size-3 shrink-0" />
            <span className="truncate">
              {formatCreatedAtLabel(gate1Summary?.createdAt)}
            </span>
          </p>
          <p className="flex min-w-0 items-center gap-1.5">
            <PhoneIcon className="size-3 shrink-0" />
            <span className="truncate">{worker.telefono || "-"}</span>
          </p>
          <p className="flex min-w-0 items-center gap-1.5">
            <CheckCircle2Icon className="size-3 shrink-0" />
            <span className="truncate">{gate1Summary?.followup || "-"}</span>
          </p>
        </RecordCard.Body>
      </RecordCard>
    )
  }

  return (
    <RecordCard onClick={onClick} className={cardClassName}>
      <RecordCard.Header
        media={
          <WorkerAvatarMedia
            worker={worker}
            qualificationStatus={qualificationStatus}
            size="lg"
          />
        }
        title={
          <span className="text-sm font-semibold">{worker.nomeCompleto}</span>
        }
        subtitle={
          typeof worker.eta === "number" ? `${worker.eta} anni` : "Età n.d."
        }
        rightSlot={
          <Badge
            className={cn(
              "h-5 px-2 text-2xs font-medium",
              getStatusSoftClassName(worker.statoLavoratoreColor, workerStatusLabel),
            )}
          >
            {workerStatusLabel}
          </Badge>
        }
      />
      <RecordCard.Body className="gap-2">
        {displayRoles.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {displayRoles.map((role, index) => (
              <Badge
                key={`${worker.id}-ruolo-${index}-${role}`}
                className={cn(
                  "h-5 px-2 text-2xs font-medium",
                  getBadgeClassName(worker.tipoRuoloColor),
                )}
              >
                {role}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-2xs leading-none">-</p>
        )}
        {worker.tipoLavoro ? (
          <Badge
            className={cn(
              "h-5 w-fit px-2 text-2xs font-medium",
              getBadgeClassName(worker.tipoLavoroColor),
            )}
          >
            <Clock3Icon />
            {worker.tipoLavoro}
          </Badge>
        ) : (
          <p className="text-muted-foreground text-2xs leading-none">-</p>
        )}

        <Separator className="my-1" />

        <div className="space-y-2">
          {otherSelections && otherSelections.count > 0 ? (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  onClick={(event) => event.stopPropagation()}
                  className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-2xs leading-none transition-colors"
                >
                  <div className="flex items-center gap-1">
                    {otherSelections.dots.map((dot) => (
                      <span
                        key={dot.key}
                        className={cn("size-2 rounded-full", dot.colorClassName)}
                        title={dot.label}
                      />
                    ))}
                  </div>
                  <span>{formatOtherSelectionsLabel(otherSelections.count)}</span>
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="w-80 p-3"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                  {otherSelections.details.map((detail) => (
                    <RelatedActiveSearchCard
                      key={detail.id}
                      item={{
                        selectionId: detail.id,
                        processId: detail.id,
                        familyName: detail.familyName,
                        ricercaLabel: detail.ricercaLabel,
                        recruiterLabel: detail.recruiterLabel,
                        statoSelezione: detail.statoSelezione,
                        statoSelezioneColor: detail.statoSelezioneColor,
                        statoRicerca: detail.statoRicerca,
                        statoRicercaColor: detail.statoRicercaColor,
                        orarioDiLavoro: detail.orarioDiLavoro,
                        zona: detail.zona,
                        appunti: detail.appunti,
                      }}
                    />
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          ) : null}
          {travelTimeLabel ? (
            <p className="text-muted-foreground flex items-center gap-1.5 text-2xs leading-none">
              <Clock3Icon className="size-3 shrink-0" />
              <span>{travelTimeLabel}</span>
            </p>
          ) : null}
          <p className="text-muted-foreground flex items-center gap-1.5 text-2xs leading-none">
            <MapPinIcon className="size-3 shrink-0" />
            <span className="truncate">{worker.locationLabel ?? "-"}</span>
            <span className="mx-1">•</span>
            <PhoneIcon className="size-3 shrink-0" />
            <span className="truncate">{worker.telefono ?? "-"}</span>
          </p>
          <div className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-2xs leading-none">
            {experienceEntries.map((entry, index) => {
              const level = getExperienceLevel(entry.years)
              return (
                <div
                  key={`${worker.id}-exp-${entry.icon}-${entry.label}-${index}`}
                  className="inline-flex items-center gap-1.5"
                >
                  {index > 0 ? <span className="mx-0.5">•</span> : null}
                  {entry.icon === "colf" ? (
                    <HomeIcon className="size-3 shrink-0" />
                  ) : (
                    <BabyIcon className="size-3 shrink-0" />
                  )}
                  <span>{entry.label}</span>
                  <div className="ml-0.5 inline-flex items-center gap-1">
                    {Array.from({ length: 3 }).map((_, dotIndex) => (
                      <span
                        key={`${worker.id}-exp-dot-${entry.label}-${dotIndex}`}
                        className={cn(
                          "size-1.5 rounded-full bg-muted",
                          dotIndex < level.activeSegments && level.segmentClassName,
                        )}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </RecordCard.Body>
    </RecordCard>
  )
}
