import * as React from "react"

import {
  BriefcaseBusinessIcon,
  CalendarIcon,
  Clock3Icon,
  MailIcon,
  PencilIcon,
  PhoneIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CreazioneAnnuncioCard } from "@/components/crm/cards/creazione-annuncio-card"
import { OnboardingCard } from "@/components/crm/cards/onboarding-card"
import { StatoLeadCard } from "@/components/crm/cards/stato-lead-card"
import { DetailSheetWrapper } from "@/components/shared/detail-sheet-wrapper"
import type {
  CrmPipelineCardData,
  LookupOptionsByField,
} from "@/hooks/use-crm-pipeline-preview"

type FamigliaProcessoDetailSidebarProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  card: CrmPipelineCardData | null
  lookupOptionsByField: LookupOptionsByField
  editMode?: "always" | "toggle"
  onChangeStatoSales?: (processId: string, targetStageId: string) => void | Promise<void>
  onPatchProcess?: (
    processId: string,
    patch: Record<string, unknown>
  ) => void | Promise<void>
}

function renderValue(value: string | null | undefined) {
  if (!value) return "-"
  const normalized = value.trim()
  return normalized ? normalized : "-"
}

function formatBadgeLabel(value: string) {
  return value
    .replaceAll("_", " ")
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
    case "neutral":
      return "border-neutral-200 bg-neutral-100 text-neutral-700"
    case "stone":
      return "border-stone-200 bg-stone-100 text-stone-700"
    default:
      return "border-border bg-muted text-foreground"
  }
}

export function FamigliaProcessoDetailSidebar({
  open,
  onOpenChange,
  card,
  lookupOptionsByField,
  editMode = "always",
  onChangeStatoSales,
  onPatchProcess,
}: FamigliaProcessoDetailSidebarProps) {
  const [isEditingStatoLead, setIsEditingStatoLead] = React.useState(
    editMode === "always"
  )
  const [isEditingOnboarding, setIsEditingOnboarding] = React.useState(
    editMode === "always"
  )
  const [isEditingAnnuncio, setIsEditingAnnuncio] = React.useState(
    editMode === "always"
  )

  React.useEffect(() => {
    if (editMode === "always") {
      setIsEditingStatoLead(true)
      setIsEditingOnboarding(true)
      setIsEditingAnnuncio(true)
      return
    }

    if (!open) {
      setIsEditingStatoLead(false)
      setIsEditingOnboarding(false)
      setIsEditingAnnuncio(false)
    }
  }, [editMode, open, card?.id])

  const canEditStatoLead = editMode === "always" ? true : isEditingStatoLead
  const canEditOnboarding = editMode === "always" ? true : isEditingOnboarding
  const canEditAnnuncio = editMode === "always" ? true : isEditingAnnuncio

  return (
    <DetailSheetWrapper
      open={open}
      onOpenChange={onOpenChange}
      title={renderValue(card?.nomeFamiglia)}
    >
      <div className="space-y-4">
        <div className="text-muted-foreground space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <PhoneIcon className="size-4" />
            <span className="truncate">{renderValue(card?.telefono)}</span>
          </div>
          <div className="flex items-center gap-2">
            <MailIcon className="size-4" />
            <span className="truncate">{renderValue(card?.email)}</span>
          </div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="size-4" />
            <span className="truncate">{renderValue(card?.dataLead)}</span>
          </div>
        </div>

        <div className="flex flex-col items-start gap-2">
          {card?.tipoLavoroBadge ? (
            <Badge
              variant="outline"
              className={getBadgeClassName(card.tipoLavoroColor)}
            >
              <BriefcaseBusinessIcon data-icon="inline-start" />
              {formatBadgeLabel(card.tipoLavoroBadge)}
            </Badge>
          ) : null}
          {card?.tipoRapportoBadge ? (
            <Badge
              variant="outline"
              className={getBadgeClassName(card.tipoRapportoColor)}
            >
              <Clock3Icon data-icon="inline-start" />
              {formatBadgeLabel(card.tipoRapportoBadge)}
            </Badge>
          ) : null}
        </div>

        <div className="space-y-4">
          <div
            className={
              canEditStatoLead
                ? "space-y-4"
                : "pointer-events-none space-y-4 select-none"
            }
          >
            <StatoLeadCard
              card={card}
              lookupOptionsByField={lookupOptionsByField}
              titleAction={
                editMode === "toggle" ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={
                      canEditStatoLead
                        ? "Termina modifica stato lead"
                        : "Modifica stato lead"
                    }
                    title={
                      canEditStatoLead
                        ? "Termina modifica stato lead"
                        : "Modifica stato lead"
                    }
                    onClick={() =>
                      setIsEditingStatoLead((current) => !current)
                    }
                  >
                    <PencilIcon />
                  </Button>
                ) : undefined
              }
              onChangeStage={canEditStatoLead ? onChangeStatoSales : undefined}
              onPatchProcess={canEditStatoLead ? onPatchProcess : undefined}
            />
          </div>

          <div
            className={
              canEditOnboarding
                ? "space-y-4"
                : "pointer-events-none space-y-4 select-none"
            }
          >
            <OnboardingCard
              card={card}
              lookupOptionsByField={lookupOptionsByField}
              titleAction={
                editMode === "toggle" ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={
                      canEditOnboarding
                        ? "Termina modifica onboarding"
                        : "Modifica onboarding"
                    }
                    title={
                      canEditOnboarding
                        ? "Termina modifica onboarding"
                        : "Modifica onboarding"
                    }
                    onClick={() =>
                      setIsEditingOnboarding((current) => !current)
                    }
                  >
                    <PencilIcon />
                  </Button>
                ) : undefined
              }
              onPatchProcess={canEditOnboarding ? onPatchProcess : undefined}
            />
          </div>

          <div
            className={
              canEditAnnuncio
                ? "space-y-4"
                : "pointer-events-none space-y-4 select-none"
            }
          >
            <CreazioneAnnuncioCard
              titleAction={
                editMode === "toggle" ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={
                      canEditAnnuncio
                        ? "Termina modifica creazione annuncio"
                        : "Modifica creazione annuncio"
                    }
                    title={
                      canEditAnnuncio
                        ? "Termina modifica creazione annuncio"
                        : "Modifica creazione annuncio"
                    }
                    onClick={() =>
                      setIsEditingAnnuncio((current) => !current)
                    }
                  >
                    <PencilIcon />
                  </Button>
                ) : undefined
              }
            />
          </div>
        </div>
      </div>
    </DetailSheetWrapper>
  )
}
