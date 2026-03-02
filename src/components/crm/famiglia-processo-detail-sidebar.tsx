import {
  BriefcaseBusinessIcon,
  CalendarIcon,
  Clock3Icon,
  MailIcon,
  PhoneIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { CreazioneAnnuncioCard } from "@/components/crm/cards/creazione-annuncio-card"
import { OnboardingCard } from "@/components/crm/cards/onboarding-card"
import { StatoLeadCard } from "@/components/crm/cards/stato-lead-card"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type {
  CrmPipelineCardData,
  LookupOptionsByField,
} from "@/hooks/use-crm-pipeline-preview"

type FamigliaProcessoDetailSidebarProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  card: CrmPipelineCardData | null
  lookupOptionsByField: LookupOptionsByField
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
  onChangeStatoSales,
  onPatchProcess,
}: FamigliaProcessoDetailSidebarProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="!w-[min(96vw,680px)] !max-w-none overflow-y-auto sm:!max-w-none"
      >
        <SheetHeader>
          <SheetTitle className="text-xl font-semibold">
            {renderValue(card?.nomeFamiglia)}
          </SheetTitle>
          <SheetDescription className="sr-only">
            Dettaglio famiglia e ricerca
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-4">
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

          <StatoLeadCard
            card={card}
            lookupOptionsByField={lookupOptionsByField}
            onChangeStage={onChangeStatoSales}
            onPatchProcess={onPatchProcess}
          />
          <OnboardingCard
            card={card}
            lookupOptionsByField={lookupOptionsByField}
            onPatchProcess={onPatchProcess}
          />
          <CreazioneAnnuncioCard />
        </div>
      </SheetContent>
    </Sheet>
  )
}
