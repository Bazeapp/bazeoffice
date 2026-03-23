import type { ComponentType } from "react"
import {
  BadgeCheckIcon,
  BabyIcon,
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
import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export type LavoratoreListItem = {
  id: string
  nomeCompleto: string
  immagineUrl: string | null
  cap: string | null
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
}

type WorkerQualificationStatus = {
  label: "Non qualificato" | "Non idoneo" | "Qualificato" | "Idoneo" | "Certificato"
  ringClassName: string
  badgeClassName: string
  icon: ComponentType<{ className?: string }>
}

function getWorkerQualificationStatus(worker: LavoratoreListItem): WorkerQualificationStatus {
  if (worker.isCertificato) {
    return {
      label: "Certificato",
      ringClassName: "ring-2 ring-emerald-600/40",
      badgeClassName: "bg-emerald-600 text-white",
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
    case "neutral":
      return "border-neutral-200 bg-neutral-100 text-neutral-700"
    case "stone":
      return "border-stone-200 bg-stone-100 text-stone-700"
    default:
      return "border-border bg-muted text-foreground"
  }
}

function getStatusSoftClassName(
  workerColor: string | null | undefined,
  statusLabel: string
) {
  if (workerColor) return getBadgeClassName(workerColor)

  switch (statusLabel) {
    case "Certificato":
      return "border-emerald-200 bg-emerald-100 text-emerald-700"
    case "Idoneo":
      return "border-green-200 bg-green-100 text-green-700"
    case "Non idoneo":
      return "border-amber-200 bg-amber-100 text-amber-700"
    case "Qualificato":
      return "border-teal-200 bg-teal-100 text-teal-700"
    default:
      return "border-zinc-200 bg-zinc-100 text-zinc-700"
  }
}

function normalizeToken(value: string) {
  return value.trim().toLowerCase().replaceAll("_", " ")
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

export function LavoratoreCard({ worker, isActive, onClick }: LavoratoreCardProps) {
  const qualificationStatus = getWorkerQualificationStatus(worker)
  const StatusIcon = qualificationStatus.icon
  const ruoliDomestici = Array.isArray(worker.ruoliDomestici) ? worker.ruoliDomestici : []
  const normalizedRoles = ruoliDomestici.map(normalizeToken)
  const hasColfRole = normalizedRoles.some((role) => role.includes("colf"))
  const hasBabysitterRole = normalizedRoles.some((role) => role.includes("babysitter"))
  const displayRoles =
    ruoliDomestici.length > 0 ? ruoliDomestici.slice(0, 3) : worker.tipoRuolo ? [worker.tipoRuolo] : []

  const experienceEntries: Array<{
    label: string
    years: number
    icon: "colf" | "babysitter"
  }> = []
  if (hasColfRole && typeof worker.anniEsperienzaColf === "number" && worker.anniEsperienzaColf > 0) {
    experienceEntries.push({
      label: formatYearsLabel(worker.anniEsperienzaColf),
      years: worker.anniEsperienzaColf,
      icon: "colf",
    })
  }
  if (
    hasBabysitterRole &&
    typeof worker.anniEsperienzaBabysitter === "number" &&
    worker.anniEsperienzaBabysitter > 0
  ) {
    experienceEntries.push({
      label: formatYearsLabel(worker.anniEsperienzaBabysitter),
      years: worker.anniEsperienzaBabysitter,
      icon: "babysitter",
    })
  }

  return (
    <Card
      onClick={onClick}
      className={cn(
        "bg-white border border-border/70 cursor-pointer py-3 shadow-none transition-shadow hover:shadow-md",
        worker.isBlacklisted && "opacity-55 saturate-0",
        isActive && "ring-primary/35 ring-2"
      )}
    >
      <CardContent className="space-y-4 px-4">
        <div className="flex items-start gap-4">
          <Avatar
            className={cn("size-10", qualificationStatus.ringClassName)}
            title={qualificationStatus.label}
          >
            <AvatarImage src={worker.immagineUrl ?? undefined} alt={worker.nomeCompleto} />
            <AvatarFallback>{initialsFromName(worker.nomeCompleto)}</AvatarFallback>
            <AvatarBadge className={qualificationStatus.badgeClassName}>
              <StatusIcon />
            </AvatarBadge>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm leading-none font-semibold">{worker.nomeCompleto}</p>
                <p className="text-muted-foreground mt-1.5 text-xs leading-none">
                  {typeof worker.eta === "number" ? `${worker.eta} anni` : "Eta n.d."}
                </p>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "h-5 shrink-0 px-2 text-[11px] font-medium",
                  getStatusSoftClassName(worker.statoLavoratoreColor, qualificationStatus.label)
                )}
              >
                {qualificationStatus.label}
              </Badge>
            </div>
            <div className="flex flex-col gap-2">
              <div className="space-y-1.5">
                {displayRoles.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {displayRoles.map((role, index) => (
                      <Badge
                        key={`${worker.id}-ruolo-${index}-${role}`}
                        variant="outline"
                        className={cn(
                          "h-5 w-fit px-2 text-[11px] font-medium",
                          index === 0
                            ? getBadgeClassName(worker.tipoRuoloColor)
                            : "border-border bg-muted text-foreground"
                        )}
                      >
                        {role}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-[11px] leading-none">-</p>
                )}
              </div>
              <div className="space-y-1.5">
                {worker.tipoLavoro ? (
                  <Badge
                    variant="outline"
                    className={cn(
                      "h-5 w-fit px-2 text-[11px] font-medium",
                      getBadgeClassName(worker.tipoLavoroColor)
                    )}
                  >
                    <Clock3Icon data-icon="inline-start" />
                    {worker.tipoLavoro}
                  </Badge>
                ) : (
                  <p className="text-muted-foreground text-[11px] leading-none">-</p>
                )}
              </div>
            </div>
            <Separator className="my-3" />
            <div className="space-y-2">
              <p className="text-muted-foreground flex items-center gap-1.5 text-[11px] leading-none">
                <MapPinIcon className="size-3 shrink-0" />
                <span className="truncate">{worker.cap ?? "-"}</span>
                <span className="mx-1">•</span>
                <PhoneIcon className="size-3 shrink-0" />
                <span className="truncate">{worker.telefono ?? "-"}</span>
              </p>
              {experienceEntries.length > 0 ? (
                <div className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-[11px] leading-none">
                  {experienceEntries.map((entry, index) => {
                    const level = getExperienceLevel(entry.years)
                    return (
                    <div
                      key={`${worker.id}-exp-${entry.label}`}
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
                              dotIndex < level.activeSegments && level.segmentClassName
                            )}
                          />
                        ))}
                      </div>
                    </div>
                    )
                  })}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
