import * as React from "react"
import {
  BabyIcon,
  CalendarDaysIcon,
  Clock3Icon,
  CheckCircle2Icon,
  FlagIcon,
  HomeIcon,
  MapPinIcon,
  PhoneIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import {
  formatCreatedAtLabel,
  formatOtherSelectionsLabel,
  formatTravelTimeLabel,
  formatYearsLabel,
  getExperienceLevel,
  getWorkerCardBadgeClassName,
  getWorkerCardInitials,
  getWorkerStatusSoftClassName,
} from "../lib/card-utils"
import {
  getWorkerQualificationStatus,
  type WorkerQualificationStatus,
} from "../lib/status-utils"
import { RelatedActiveSearchCard } from "@/modules/ricerca/components/worker-pipeline-summary-cards"
import { RecordCard } from "@/components/shared-next/record-card"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"

export type WorkerOtherSelectionSummaryItem = {
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
  tipoLavori?: string[]
  tipoLavoriColors?: Record<string, string | null>
  tipoLavoro: string | null
  tipoLavoroColor: string | null
  ruoliDomestici?: string[]
  eta?: number | null
  sesso?: string | null
  nazionalita?: string | null
  comeTiSposti?: string[]
  checkLavoriAccettabili?: string[]
  anniEsperienzaColf?: number | null
  anniEsperienzaBabysitter?: number | null
  statoLavoratore: string | null
  statoLavoratoreColor: string | null
  disponibilita: string | null
  disponibilitaColor: string | null
  coordinates?: {
    lat: number
    lng: number
  } | null
  isDisponibile: boolean | null
  isQualified: boolean
  isIdoneo: boolean
  isCertificato: boolean
  otherActiveSelections?: WorkerOtherSelectionSummary | null
}

type LavoratoreCardProps = {
  worker: LavoratoreListItem
  isActive: boolean
  onClick: () => void
  variant?: "default" | "gate1"
  subtitle?: React.ReactNode
  rightSlot?: React.ReactNode
  bodySlot?: React.ReactNode
  showQualificationStatus?: boolean
  bottomSlot?: React.ReactNode
  onLoadOtherActiveSelectionDetails?: (
    workerId: string
  ) => Promise<WorkerOtherSelectionSummaryItem[]>
  /**
   * Notifica l'apertura/chiusura del popover "altre selezioni". La mappa lo usa
   * per fissare (pin) il popup del marker quando l'utente apre il popover, così
   * spostando il mouse sulla lista (portalata su body) la card non si chiude.
   */
  onOtherActiveSelectionsOpenChange?: (open: boolean) => void
  gate1Summary?: {
    provincia: string | null
    createdAt: string | null
    followup: string | null
  }
  cardTestId?: string
}

function WorkerAvatarMedia({
  worker,
  qualificationStatus,
  showQualificationStatus = true,
  size = "lg",
}: {
  worker: LavoratoreListItem
  qualificationStatus: WorkerQualificationStatus
  showQualificationStatus?: boolean
  size?: "md" | "lg"
}) {
  const StatusIcon = qualificationStatus.icon
  return (
    <span className="relative inline-block">
      <Avatar
        size={size}
        src={worker.immagineUrl ?? undefined}
        alt={worker.nomeCompleto}
        fallback={getWorkerCardInitials(worker.nomeCompleto)}
        className={qualificationStatus.ringClassName}
      />
      {showQualificationStatus ? (
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
      ) : null}
    </span>
  )
}

export function LavoratoreCard({
  worker,
  isActive,
  onClick,
  variant = "default",
  subtitle,
  rightSlot,
  bodySlot,
  showQualificationStatus = true,
  bottomSlot,
  onLoadOtherActiveSelectionDetails,
  onOtherActiveSelectionsOpenChange,
  gate1Summary,
  cardTestId,
}: LavoratoreCardProps) {
  const qualificationStatus = getWorkerQualificationStatus(worker)
  const workerStatusLabel = worker.statoLavoratore || qualificationStatus.label
  const ruoliDomestici = Array.isArray(worker.ruoliDomestici) ? worker.ruoliDomestici : []
  const displayRoles =
    ruoliDomestici.length > 0 ? ruoliDomestici.slice(0, 3) : worker.tipoRuolo ? [worker.tipoRuolo] : []
  const tipoLavori = Array.isArray(worker.tipoLavori) ? worker.tipoLavori : []
  const displayWorkTypes =
    tipoLavori.length > 0 ? tipoLavori : worker.tipoLavoro ? [worker.tipoLavoro] : []

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
  const [loadedOtherSelectionDetails, setLoadedOtherSelectionDetails] =
    React.useState<WorkerOtherSelectionSummaryItem[] | null>(null)
  const [loadingOtherSelectionDetails, setLoadingOtherSelectionDetails] =
    React.useState(false)
  const [otherSelectionDetailsError, setOtherSelectionDetailsError] =
    React.useState<string | null>(null)
  const displayedOtherSelectionDetails =
    loadedOtherSelectionDetails ?? otherSelections?.details ?? []
  const loadOtherSelectionDetails = React.useCallback(() => {
    if (
      !otherSelections ||
      otherSelections.count === 0 ||
      displayedOtherSelectionDetails.length > 0 ||
      loadingOtherSelectionDetails ||
      !onLoadOtherActiveSelectionDetails
    ) {
      return
    }

    setLoadingOtherSelectionDetails(true)
    setOtherSelectionDetailsError(null)
    void onLoadOtherActiveSelectionDetails(worker.id)
      .then((details) => setLoadedOtherSelectionDetails(details))
      .catch((error) => {
        setOtherSelectionDetailsError(
          error instanceof Error ? error.message : "Impossibile caricare"
        )
      })
      .finally(() => setLoadingOtherSelectionDetails(false))
  }, [
    displayedOtherSelectionDetails.length,
    loadingOtherSelectionDetails,
    onLoadOtherActiveSelectionDetails,
    otherSelections,
    worker.id,
  ])
  const travelTimeLabel = formatTravelTimeLabel(worker.travelTimeMinutes)

  const cardClassName = cn(
    worker.isBlacklisted && "opacity-55 saturate-0",
  )

  if (variant === "gate1") {
    return (
      <RecordCard
        onClick={onClick}
        selected={isActive}
        className={cardClassName}
        data-testid={cardTestId ?? `lavoratore-card-${worker.id}`}
      >
        <RecordCard.Header
          media={
            <WorkerAvatarMedia
              worker={worker}
              qualificationStatus={qualificationStatus}
              showQualificationStatus={showQualificationStatus}
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
    <RecordCard
      onClick={onClick}
      selected={isActive}
      className={cardClassName}
      data-testid={cardTestId ?? `lavoratore-card-${worker.id}`}
    >
      <RecordCard.Header
        media={
            <WorkerAvatarMedia
              worker={worker}
              qualificationStatus={qualificationStatus}
              showQualificationStatus={showQualificationStatus}
              size="lg"
            />
        }
        title={
          <span className="text-sm font-semibold">{worker.nomeCompleto}</span>
        }
        subtitle={
          subtitle !== undefined
            ? subtitle
            : typeof worker.eta === "number"
              ? `${worker.eta} anni`
              : "Età n.d."
        }
        rightSlot={
          rightSlot !== undefined ? (
            rightSlot
          ) : (
            <Badge
              className={cn(
                "h-5 px-2 text-2xs font-medium",
                getWorkerStatusSoftClassName(worker.statoLavoratoreColor, workerStatusLabel),
              )}
            >
              {workerStatusLabel}
            </Badge>
          )
        }
      />
      {bodySlot !== undefined ? (
        <RecordCard.Body className="gap-2">{bodySlot}</RecordCard.Body>
      ) : (
      <RecordCard.Body className="gap-2">
        {displayRoles.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {displayRoles.map((role, index) => (
              <Badge
                key={`${worker.id}-ruolo-${index}-${role}`}
                className={cn(
                  "h-5 px-2 text-2xs font-medium",
                  getWorkerCardBadgeClassName(worker.tipoRuoloColor),
                )}
              >
                {role}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-2xs leading-none">-</p>
        )}
        {displayWorkTypes.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {displayWorkTypes.map((workType) => (
              <Badge
                key={`${worker.id}-tipo-lavoro-${workType}`}
                className={cn(
                  "h-5 w-fit px-2 text-2xs font-medium",
                  getWorkerCardBadgeClassName(
                    worker.tipoLavoriColors?.[workType] ?? worker.tipoLavoroColor,
                  ),
                )}
              >
                <Clock3Icon />
                {workType}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-2xs leading-none">-</p>
        )}

        {worker.nazionalita || (worker.checkLavoriAccettabili?.length ?? 0) > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {worker.nazionalita ? (
              <Badge className={cn("h-5 px-2 text-2xs font-medium", getWorkerCardBadgeClassName(null))}>
                <FlagIcon />
                {worker.nazionalita}
              </Badge>
            ) : null}
            {worker.checkLavoriAccettabili?.map((giorno) => (
              <Badge
                key={`${worker.id}-giorno-${giorno}`}
                className={cn("h-5 px-2 text-2xs font-medium", getWorkerCardBadgeClassName(null))}
              >
                {giorno
                  .replace("Lavori di ", "")
                  .replace(" giorno", "g")
                  .replace(" giorni", "g")}
              </Badge>
            ))}
          </div>
        ) : null}

        <Separator className="my-1" />

        <div className="space-y-2">
          {otherSelections && otherSelections.count > 0 ? (
            <Popover
              onOpenChange={(open) => {
                if (open) loadOtherSelectionDetails()
                onOtherActiveSelectionsOpenChange?.(open)
              }}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  onClick={(event) => event.stopPropagation()}
                  onFocus={loadOtherSelectionDetails}
                  onMouseEnter={loadOtherSelectionDetails}
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
                  {loadingOtherSelectionDetails &&
                  displayedOtherSelectionDetails.length === 0 ? (
                    <p className="text-muted-foreground px-1 py-2 text-xs">
                      Caricamento altre selezioni...
                    </p>
                  ) : null}
                  {otherSelectionDetailsError ? (
                    <p className="px-1 py-2 text-xs text-red-600">
                      {otherSelectionDetailsError}
                    </p>
                  ) : null}
                  {!loadingOtherSelectionDetails &&
                  !otherSelectionDetailsError &&
                  displayedOtherSelectionDetails.length === 0 ? (
                    <p className="text-muted-foreground px-1 py-2 text-xs">
                      Apri il profilo lavoratore per vedere il dettaglio.
                    </p>
                  ) : null}
                  {displayedOtherSelectionDetails.map((detail) => (
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
          {bottomSlot ? (
            <>
              <Separator className="my-1" />
              {bottomSlot}
            </>
          ) : null}
        </div>
      </RecordCard.Body>
      )}
    </RecordCard>
  )
}
