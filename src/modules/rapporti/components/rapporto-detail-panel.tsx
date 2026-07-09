import * as React from "react"
import {
  ArrowRightIcon,
  BriefcaseBusinessIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  CopyIcon,
  CreditCardIcon,
  ExternalLinkIcon,
  FileTextIcon,
  MailIcon,
  MessageSquareTextIcon,
  OctagonAlertIcon,
  PencilIcon,
  PhoneIcon,
  RefreshCwIcon,
  ShieldAlertIcon,
  StarIcon,
  TriangleAlertIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react"

import { getTagClassName } from "@/modules/lavoratori/lib"
import {
  getRapportoFamilyLabel,
  getRapportoStatusColor,
  getRapportoTitle,
  getRapportoWorkerLabel,
  resolveRapportoStatus,
} from "@/modules/rapporti/lib"
import {
  AttachmentUploadSlot,
} from "@/components/shared-next/attachment-upload-slot"
import {
  hasAttachmentValue,
  type AttachmentLink,
} from "@/components/shared-next/attachment-utils"
import {
  DetailField,
  DetailFieldControl,
  DetailSectionBlock,
  DetailSectionCard,
} from "@/components/shared-next/detail-section-card"
import { RecordDetailShell } from "@/components/shared-next/record-detail-shell"
import type {
  ContributoInpsBoardCardData,
  PayrollBoardCardData,
  PayrollBoardColumnData,
} from "@/modules/payroll/types"
import { ContributoInpsDetailSheet, type ContributiColumnData, CedolinoDetailSheet } from "@/modules/payroll/components"
import { SupportTicketCreateDialog, type SupportTicketTag, type SupportTicketType, type SupportTicketUrgency } from "@/modules/support/components"
import { Badge } from "@/components/ui/badge"
import { TipoContrattoBadge } from "@/components/shared-next/tipo-contratto-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { sanitizeFileName } from "@/lib/file-utils"
import { formatItalianCurrency, formatItalianDateTimeOr } from "@/lib/format-utils"
import { updateRecord } from "@/lib/record-crud"
import type { RapportoAssunzioneNames } from "@/modules/gestione-contrattuale/types"
import { useController } from "react-hook-form"
import { Form } from "@/components/ui/form"
import { FieldInput } from "@/components/forms/field-components"
import { useAutoSaveForm } from "@/hooks/use-auto-save-form"
import {
  buildAttachmentPayload,
  normalizeAttachmentArray,
} from "@/lib/attachments"
import { supabase } from "@/lib/supabase-client"
import { buildPathForRoute } from "@/routes/app-routes"
import { buildFamilyPresenzeUrl } from "@/lib/private-area-url"
import type {
  ChiusuraContrattoRecord,
  ContributoInpsRecord,
  FamigliaRecord,
  LavoratoreRecord,
  MeseCalendarioRecord,
  MeseLavoratoRecord,
  PagamentoRecord,
  PresenzaMensileRecord,
  ProcessoMatchingRecord,
  RapportoLavorativoRecord,
  RichiestaAttivazioneRecord,
  TicketRecord,
  TransazioneFinanziariaRecord,
  VariazioneContrattualeRecord,
} from "@/types"

type RapportoDetailPanelProps = {
  rapporto: RapportoLavorativoRecord | null
  loadingRapporto?: boolean
  famiglia: FamigliaRecord | null
  lavoratore: LavoratoreRecord | null
  assunzioneNames?: RapportoAssunzioneNames | null
  processi: ProcessoMatchingRecord[]
  contributi: ContributoInpsRecord[]
  mesi: MeseLavoratoRecord[]
  mesiCalendario: MeseCalendarioRecord[]
  pagamenti: PagamentoRecord[]
  transazioni: TransazioneFinanziariaRecord[]
  presenze: PresenzaMensileRecord[]
  variazioni: VariazioneContrattualeRecord[]
  chiusure: ChiusuraContrattoRecord[]
  tickets?: TicketRecord[]
  richiesteAttivazione?: RichiestaAttivazioneRecord[]
  loadingRelated: boolean
  lookupColorsByDomain: Map<string, string>
  onCreateTicket?: (input: {
    tipo: SupportTicketType
    rapportoId: string
    tag: SupportTicketTag
    urgenza: SupportTicketUrgency
    causale: string
    note: string
  }) => Promise<void>
  // Called after a successful contratto save with the fresh row returned by
  // update-record. The parent uses this to keep `selectedRapporto` and the
  // board cache aligned with what's now in the DB, so the prop the panel
  // receives next render is no longer stale relative to local state. Without
  // this callback, the parent's `selectedRapporto` would remain at the
  // pre-save snapshot and any draft resync against the prop would clobber
  // the just-saved value.
  onRapportoUpdated?: (updatedRapporto: RapportoLavorativoRecord) => void
  hideHeader?: boolean
}

type SectionTab = {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const SECTION_TABS: SectionTab[] = [
  { id: "contratto", label: "Contratto", icon: BriefcaseBusinessIcon },
  { id: "preventivo", label: "Preventivo", icon: FileTextIcon },
  { id: "gestione", label: "Datore e Lavoratore", icon: UsersIcon },
  { id: "tickets", label: "Tickets", icon: MessageSquareTextIcon },
  { id: "cedolini", label: "Cedolini", icon: CreditCardIcon },
  { id: "contributi", label: "Contributi", icon: CalendarDaysIcon },
  { id: "variazioni", label: "Variazioni", icon: RefreshCwIcon },
  { id: "chiusure", label: "Chiusure", icon: TriangleAlertIcon },
]

const SCONTO_APPLICATO_OPTIONS = ["50%", "prova_gratuita", "100€"] as const

const PAYROLL_STAGE_OPTIONS = [
  "TODO",
  "Inviate richiesta presenze",
  "Follow up richiesta presenze",
  "Followup fatti",
  "Problema in comunicazione presenze",
  "Ricezione presenze",
  "Cedolino da controllare",
  "Cedolino Pronto",
  "Inviato cedolino",
  "Richiesta chiarimenti",
  "Pagato",
] as const

const CONTRIBUTI_STAGE_OPTIONS = [
  { id: "Da richiedere", label: "Da richiedere", color: "sky" },
  { id: "PagoPA ricevuto", label: "PagoPA ricevuto", color: "cyan" },
  { id: "Inviato alla famiglia", label: "Inviato alla famiglia", color: "amber" },
  { id: "Pagato", label: "Pagato", color: "green" },
] as const

const CONTRIBUTI_LEGACY_STAGE_ALIASES: Record<string, string> = {
  todo: "Da richiedere",
  "to do": "Da richiedere",
  inviato: "Inviato alla famiglia",
  "inviato alla famiglia": "Inviato alla famiglia",
  "inviato pagopa": "Inviato alla famiglia",
  inviati: "Inviato alla famiglia",
  pagopa: "PagoPA ricevuto",
  "pagopa ricevuto": "PagoPA ricevuto",
  done: "Pagato",
  pagato: "Pagato",
}

function normalizeToken(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase().replaceAll("_", " ")
}

function resolveContributoStage(value: string | null | undefined) {
  const token = normalizeToken(value)
  if (!token) return CONTRIBUTI_STAGE_OPTIONS[0].id

  const canonicalStage = CONTRIBUTI_STAGE_OPTIONS.find(
    (stage) => normalizeToken(stage.id) === token || normalizeToken(stage.label) === token
  )

  return canonicalStage?.id ?? CONTRIBUTI_LEGACY_STAGE_ALIASES[token] ?? CONTRIBUTI_STAGE_OPTIONS[0].id
}

function formatDate(value: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

function getStatusColor(value: string | null | undefined) {
  const token = normalizeToken(value)
  if (!token) return "zinc"
  if (token.includes("attivo")) return "emerald"
  if (token.includes("attiv") || token.includes("in corso") || token.includes("presa in carico")) {
    return "amber"
  }
  if (token.includes("pagato") || token.includes("effettuata") || token.includes("inviato")) {
    return "emerald"
  }
  if (token.includes("todo") || token.includes("to do")) return "sky"
  if (token.includes("chius") || token.includes("annull") || token.includes("cess")) return "zinc"
  return "sky"
}

function getDurationLabel(startDate: string | null, endDate: string | null = null) {
  if (!startDate) return "-"
  const start = new Date(startDate)
  const end = endDate ? new Date(endDate) : new Date()
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "-"
  const diffDays = Math.max(0, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
  return `${diffDays} giorni`
}

function getMonthLabel(mese: MeseLavoratoRecord, meseCalendario: MeseCalendarioRecord | null) {
  if (meseCalendario?.mese_lavorativo_copy?.trim()) {
    return meseCalendario.mese_lavorativo_copy.trim()
  }

  if (meseCalendario?.data_inizio) {
    const date = new Date(meseCalendario.data_inizio)
    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat("it-IT", {
        timeZone: "Europe/Rome",
        month: "long",
        year: "numeric",
      }).format(date)
    }
  }

  return formatDate(mese.creato_il)
}

function toNumericValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value !== "string" || !value.trim()) return null
  const parsed = Number(value.replace(",", "."))
  return Number.isFinite(parsed) ? parsed : null
}

function formatHoursLabel(value: number) {
  return new Intl.NumberFormat("it-IT", {
    maximumFractionDigits: 2,
  }).format(value)
}

function sumPresenceHours(value: PresenzaMensileRecord) {
  let total = 0
  let hasHours = false

  for (let day = 1; day <= 31; day += 1) {
    const hours = toNumericValue(value[`ore_day_${day}`])
    if (hours === null) continue
    hasHours = true
    total += hours
  }

  return hasHours ? total : null
}

function hasPresenceDayData(value: PresenzaMensileRecord) {
  for (let day = 1; day <= 31; day += 1) {
    if (
      value[`tipo_day_${day}`] ||
      value[`evento_day_${day}`] ||
      value[`note_day_${day}`] ||
      value[`codice_malattia_day_${day}`]
    ) {
      return true
    }
  }

  return false
}

function getPresenceSummary(value: PresenzaMensileRecord | null) {
  if (!value) return "Presenze non disponibili"

  const monthlyPresenceValue = toNumericValue(value.presenze_mensili)
  const hoursValue = monthlyPresenceValue ?? sumPresenceHours(value)

  if (hoursValue !== null) {
    return `Presenze disponibili (${formatHoursLabel(hoursValue)} ore)`
  }

  if (hasPresenceDayData(value)) return "Presenze disponibili"

  return "Presenze non disponibili"
}

function getContributoTitle(record: ContributoInpsRecord) {
  const metadata =
    record.metadati_migrazione && typeof record.metadati_migrazione === "object"
      ? record.metadati_migrazione
      : null
  const quarterLabel =
    typeof metadata?.trimestre_label === "string" && metadata.trimestre_label.trim()
      ? metadata.trimestre_label.trim()
      : typeof metadata?.trimestre === "string" && metadata.trimestre.trim()
        ? metadata.trimestre.trim()
        : null

  return quarterLabel ?? "Contributo INPS"
}

function copyToClipboard(value: string | null | undefined) {
  if (!value) return
  void navigator.clipboard?.writeText(value)
}

function firstAvailableText(...values: Array<string | null | undefined>) {
  return values.find((value) => value?.trim())?.trim() ?? null
}

function RelatedPersonCard({
  role,
  name,
  email,
  phone,
  href,
  details,
}: {
  role: string
  name: string
  email: string | null | undefined
  phone: string | null | undefined
  href?: string
  details?: Array<{
    label: string
    value: string | null | undefined
  }>
}) {
  return (
    <Card className="py-0 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <CardContent className="px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-full">
              <UserIcon className="text-muted-foreground size-4" />
            </div>
            <div className="min-w-0">
              <p className="ui-type-label">{role}</p>
              <p className="ui-type-value truncate">{name}</p>
            </div>
          </div>
          {href ? (
            <Button asChild variant="ghost" size="icon-sm">
              <a href={href} title={`Apri ${role.toLowerCase()}`}>
                <ExternalLinkIcon className="size-4" />
              </a>
            </Button>
          ) : null}
        </div>
        <div className="mt-3 space-y-1.5 pl-11 text-sm">
          <button
            type="button"
            onClick={() => copyToClipboard(email)}
            className="text-muted-foreground hover:text-foreground flex w-full items-center gap-2 text-left transition-colors"
          >
            <MailIcon className="size-4" />
            <span className="truncate">{email ?? "Record non collegato"}</span>
            {email ? <CopyIcon className="size-3.5 opacity-50" /> : null}
          </button>
          <button
            type="button"
            onClick={() => copyToClipboard(phone)}
            className="text-muted-foreground hover:text-foreground flex w-full items-center gap-2 text-left transition-colors"
          >
            <PhoneIcon className="size-4" />
            <span>{phone ?? "Record non collegato"}</span>
            {phone ? <CopyIcon className="size-3.5 opacity-50" /> : null}
          </button>
          {details?.map((detail) => (
            <button
              key={detail.label}
              type="button"
              onClick={() => copyToClipboard(detail.value)}
              className="text-muted-foreground hover:text-foreground flex w-full items-center gap-2 text-left transition-colors"
            >
              <CreditCardIcon className="size-4" />
              <span className="w-16 shrink-0 text-xs font-medium uppercase tracking-wide">
                {detail.label}
              </span>
              <span className="truncate">{detail.value ?? "-"}</span>
              {detail.value ? <CopyIcon className="size-3.5 opacity-50" /> : null}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

const ATTACHMENT_SKELETON_KEYS = ["accordo", "ricevuta", "delega"] as const
const LINKED_ROW_SKELETON_KEYS = ["first", "second", "third"] as const

function RelatedPersonCardSkeleton() {
  return (
    <Card className="py-0 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <CardContent className="px-4 py-3">
        <div className="flex items-start gap-3">
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-40 max-w-full" />
          </div>
        </div>
        <div className="mt-3 space-y-2 pl-11">
          <Skeleton className="h-4 w-56 max-w-full" />
          <Skeleton className="h-4 w-36 max-w-full" />
        </div>
      </CardContent>
    </Card>
  )
}

function AttachmentSkeletonGrid() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {ATTACHMENT_SKELETON_KEYS.map((key) => (
        <div key={key} className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="size-4 rounded-full" />
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-dashed p-4">
            <Skeleton className="size-11 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-32 max-w-full" />
              <Skeleton className="h-3 w-24 max-w-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function RelatedRecordsSkeleton() {
  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        <RelatedPersonCardSkeleton />
        <RelatedPersonCardSkeleton />
      </div>
      <Separator className="bg-border/60" />
      <AttachmentSkeletonGrid />
    </>
  )
}

function LinkedRowsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {LINKED_ROW_SKELETON_KEYS.slice(0, rows).map((key) => (
        <Card key={key} className="bg-surface py-0 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <CardContent className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-48 max-w-full" />
              <Skeleton className="h-3 w-72 max-w-full" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function RapportoDetailPanelSkeleton() {
  return (
    <DetailSectionCard
      title="Dettaglio rapporto"
      titleIcon={<BriefcaseBusinessIcon className="size-5" />}
      className="h-full"
      contentClassName="space-y-6"
    >
      <div className="space-y-3">
        <Skeleton className="h-8 w-72 max-w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <Skeleton className="h-3 w-32" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 7 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-14 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      </div>
    </DetailSectionCard>
  )
}

function ListRowCard({
  title,
  subtitle,
  rightBadge,
  trailing,
  onClick,
}: {
  title: string
  subtitle?: string
  rightBadge?: string
  trailing?: React.ReactNode
  onClick?: () => void
}) {
  return (
    <Card
      className={cn(
        "bg-surface py-0 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:bg-neutral-100",
        onClick ? "cursor-pointer" : "",
      )}
      onClick={onClick}
    >
      <CardContent className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">{title}</p>
          {subtitle ? <p className="text-muted-foreground mt-1 text-xs">{subtitle}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {rightBadge ? (
            <Badge className={getTagClassName(getStatusColor(rightBadge))}>{rightBadge}</Badge>
          ) : null}
          {trailing}
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyLinkedState({
  icon,
  label,
}: {
  icon: React.ReactNode
  label: string
}) {
  return (
    <div className="py-8 text-center">
      <div className="text-muted-foreground/35 mx-auto mb-2 flex size-10 items-center justify-center">
        {icon}
      </div>
      <p className="ui-type-meta">{label}</p>
    </div>
  )
}

// FASE 5 BIS — wrapper locale: il Select "Sconto applicato" salva su
// processi_matching.offerta (label = key, niente lookup). Gestisce `disabled`
// e l'opzione extra per un valore corrente fuori lista (logica bespoke
// preservata dall'originale).
function FieldScontoSelect({
  name,
  disabled,
  placeholder,
}: {
  name: string
  disabled?: boolean
  placeholder?: string
}) {
  const { field } = useController({ name })
  const current = typeof field.value === "string" ? field.value : ""
  const options = [
    ...SCONTO_APPLICATO_OPTIONS,
    ...(current &&
    !SCONTO_APPLICATO_OPTIONS.includes(current as (typeof SCONTO_APPLICATO_OPTIONS)[number])
      ? [current]
      : []),
  ]
  return (
    <Select
      value={current || undefined}
      disabled={disabled}
      onValueChange={(value) => field.onChange(value)}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function RapportoDetailPanel({
  rapporto,
  loadingRapporto = false,
  famiglia,
  lavoratore,
  assunzioneNames,
  processi,
  contributi,
  mesi,
  mesiCalendario,
  pagamenti,
  transazioni,
  presenze,
  variazioni,
  chiusure,
  tickets = [],
  richiesteAttivazione = [],
  loadingRelated,
  lookupColorsByDomain,
  onCreateTicket,
  onRapportoUpdated,
  hideHeader = false,
}: RapportoDetailPanelProps) {
  const detailScrollRef = React.useRef<HTMLElement | null>(null)
  const sectionRefs = React.useRef<Record<string, HTMLDivElement | null>>({})
  const [activeSection, setActiveSection] = React.useState<string>("contratto")
  const isScrollingByClickRef = React.useRef(false)
  const [selectedPreview, setSelectedPreview] = React.useState<AttachmentLink | null>(null)
  const [uploadingSlot, setUploadingSlot] = React.useState<string | null>(null)
  const [uploadError, setUploadError] = React.useState<string | null>(null)
  const [editingSection, setEditingSection] = React.useState<"contratto" | null>(null)
  const [selectedCedolinoId, setSelectedCedolinoId] = React.useState<string | null>(null)
  const [selectedContributoId, setSelectedContributoId] = React.useState<string | null>(null)
  const [selectedTicket, setSelectedTicket] = React.useState<TicketRecord | null>(null)
  const [isCreateTicketOpen, setIsCreateTicketOpen] = React.useState(false)
  const [rapportoState, setRapportoState] = React.useState<RapportoLavorativoRecord | null>(rapporto)
  const previousRapportoIdRef = React.useRef<string | null>(rapporto?.id ?? null)

  React.useEffect(() => {
    const nextRapportoId = rapporto?.id ?? null
    const isDifferentRapporto = previousRapportoIdRef.current !== nextRapportoId
    previousRapportoIdRef.current = nextRapportoId

    // Same rapporto: do NOT resync local state from the prop here. The prop
    // (`rapporto`) is owned by `useRapportiLavorativiData` and is not
    // refetched after our own `updateRecord` calls, so for some time after
    // a save it is strictly older than `rapportoState` (which holds the
    // edge function's `response.row`). The form resync (keepDirtyValues) is
    // keyed on the data signature, so in-progress edits are never clobbered;
    // the parent is also informed via `onRapportoUpdated`, so by the time the
    // prop changes for the same id it is already aligned with local state.
    //
    // Different rapporto id: full reset (in practice the parent unmounts us
    // via `key={selectedRapportoId}`, but we keep this branch defensively).
    if (!isDifferentRapporto) {
      return
    }

    setRapportoState(rapporto)
    setSelectedCedolinoId(null)
    setSelectedContributoId(null)
    setSelectedTicket(null)
    setEditingSection(null)
    setActiveSection("contratto")
    // NOTE: `editingSection` is deliberately omitted from the dep array.
    // This effect must only run on rapporto-id transitions, never on
    // edit-mode toggles.
  }, [rapporto])

  React.useEffect(() => {
    const container = detailScrollRef.current
    if (!container) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrollingByClickRef.current) return
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible.length > 0) {
          const sectionId = visible[0].target.getAttribute("data-section-id")
          if (sectionId) {
            setActiveSection(sectionId)
          }
        }
      },
      { root: container, rootMargin: "-120px 0px -60% 0px", threshold: 0 }
    )

    Object.values(sectionRefs.current).forEach((element) => {
      if (element) observer.observe(element)
    })

    return () => observer.disconnect()
  }, [rapporto])

  const setSectionRef = React.useCallback(
    (sectionId: string) => (element: HTMLDivElement | null) => {
      if (element) {
        element.setAttribute("data-section-id", sectionId)
        sectionRefs.current[sectionId] = element
      } else {
        delete sectionRefs.current[sectionId]
      }
    },
    []
  )

  const scrollToSection = React.useCallback((sectionId: string) => {
    setActiveSection(sectionId)
    isScrollingByClickRef.current = true
    sectionRefs.current[sectionId]?.scrollIntoView({ behavior: "smooth", block: "start" })
    window.setTimeout(() => {
      isScrollingByClickRef.current = false
    }, 700)
  }, [])

  const handleUploadRapportoAttachment = React.useCallback(
    async (
      slot: "accordo_di_lavoro_allegati" | "ricevuta_inps_allegati" | "delega_inps_allegati",
      file: File
    ) => {
      const rapportoRecord = rapportoState ?? rapporto
      if (!rapportoRecord) return

      setUploadError(null)
      setUploadingSlot(slot)

      const rapportoMetadata =
        rapportoRecord.metadati_migrazione && typeof rapportoRecord.metadati_migrazione === "object"
          ? rapportoRecord.metadati_migrazione
          : {}

      try {
        const safeName = sanitizeFileName(file.name || "documento")
        const storagePath = [
          "rapporti_lavorativi",
          rapportoRecord.id,
          slot,
          `${Date.now()}-${safeName}`,
        ].join("/")

        const uploadResult = await supabase.storage
          .from("baze-bucket")
          .upload(storagePath, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type || undefined,
          })

        if (uploadResult.error) {
          throw uploadResult.error
        }

        const payload = buildAttachmentPayload(file, storagePath)

        if (slot === "delega_inps_allegati") {
          const nextMetadata = {
            ...(typeof rapportoMetadata === "object" ? rapportoMetadata : {}),
            delega_inps_allegati: [
              ...normalizeAttachmentArray(
                (rapportoMetadata as Record<string, unknown>)?.delega_inps_allegati,
              ),
              payload,
            ],
          }
          const response = await updateRecord("rapporti_lavorativi", rapportoRecord.id, {
            metadati_migrazione: nextMetadata,
          })
          const updatedRow = response.row as RapportoLavorativoRecord
          setRapportoState(updatedRow)
          onRapportoUpdated?.(updatedRow)
        } else {
          const response = await updateRecord("rapporti_lavorativi", rapportoRecord.id, {
            [slot]: [...normalizeAttachmentArray(rapportoRecord[slot]), payload],
          })
          const updatedRow = response.row as RapportoLavorativoRecord
          setRapportoState(updatedRow)
          onRapportoUpdated?.(updatedRow)
        }
      } catch (caughtError) {
        setUploadError(
          caughtError instanceof Error ? caughtError.message : "Errore caricando allegato"
        )
      } finally {
        setUploadingSlot(null)
      }
    },
    [rapporto, rapportoState, onRapportoUpdated]
  )

  const currentRapporto = rapportoState ?? rapporto
  const currentProcesso =
    processi.find((processo) =>
      richiesteAttivazione.some((richiesta) => richiesta.processo_res_id === processo.id)
    ) ??
    processi[0] ??
    null
  const richiestaAttivazione =
    (currentProcesso
      ? richiesteAttivazione.find(
          (richiesta) => richiesta.processo_res_id === currentProcesso.id
        )
      : null) ??
    richiesteAttivazione[0] ??
    null

  // FASE 5 BIS — form + autosave: source of truth unica per i campi editabili
  // di questo pannello. Sostituisce il draft/debounce bespoke del contratto
  // (i 2 codici Webcolf), il `useDebouncedSave` della fee e lo useState +
  // Select dello sconto. onSave instrada per chiave ai 3 target:
  //  - codice_*_webcolf → rapporti_lavorativi (con merge ottimistico locale +
  //    onRapportoUpdated, logica preservata dall'originale);
  //  - fee_concordata → richieste_attivazione;
  //  - offerta → processi_matching.
  // Resync realtime senza clobber: keepDirtyValues (firma sui valori server).
  const form = useAutoSaveForm({
    defaults: {
      codice_datore_webcolf:
        typeof currentRapporto?.codice_datore_webcolf === "number"
          ? String(currentRapporto.codice_datore_webcolf)
          : "",
      codice_dipendente_webcolf:
        typeof currentRapporto?.codice_dipendente_webcolf === "number"
          ? String(currentRapporto.codice_dipendente_webcolf)
          : "",
      fee_concordata: richiestaAttivazione?.fee_concordata?.toString() ?? "",
      offerta: currentProcesso?.offerta ?? "",
    },
    onSave: async (patch) => {
      const rapportoPatch: Record<string, number | null> = {}
      for (const [key, raw] of Object.entries(patch)) {
        const value = raw as string
        if (key === "fee_concordata") {
          if (!richiestaAttivazione?.id) continue
          const rawValue = value.trim()
          const nextValue = rawValue ? Number(rawValue) : null
          if (rawValue && Number.isNaN(nextValue)) continue
          await updateRecord("richieste_attivazione", richiestaAttivazione.id, {
            fee_concordata: nextValue,
          })
          continue
        }
        if (key === "offerta") {
          if (!currentProcesso?.id) continue
          await updateRecord("processi_matching", currentProcesso.id, {
            offerta: value || null,
          })
          continue
        }
        // codice_datore_webcolf / codice_dipendente_webcolf
        rapportoPatch[key] = value ? Number(value) : null
      }

      if (Object.keys(rapportoPatch).length > 0 && currentRapporto) {
        // Merge ottimistico locale (come prima), poi riconciliazione con la
        // riga fresca della edge function + push al parent via onRapportoUpdated
        // così `selectedRapporto`/board cache non restano stale.
        setRapportoState((previous) =>
          previous ? { ...previous, ...rapportoPatch } : previous,
        )
        const response = await updateRecord(
          "rapporti_lavorativi",
          currentRapporto.id,
          rapportoPatch,
        )
        const updatedRow = response.row as RapportoLavorativoRecord
        setRapportoState((previous) => ({
          ...((previous ?? currentRapporto) as RapportoLavorativoRecord),
          ...updatedRow,
        }))
        onRapportoUpdated?.(updatedRow)
      }
    },
  })

  if (loadingRapporto) {
    return <RapportoDetailPanelSkeleton />
  }

  if (!rapporto) {
    return (
      <DetailSectionCard
        title="Dettaglio rapporto"
        titleIcon={<BriefcaseBusinessIcon className="size-5" />}
        className="h-full"
        contentClassName="flex h-full items-center justify-center"
      >
        <p className="text-muted-foreground text-sm">
          Seleziona un rapporto lavorativo dalla lista per vedere il dettaglio.
        </p>
      </DetailSectionCard>
    )
  }

  const rapportoView = currentRapporto ?? rapporto
  const familyName = getRapportoFamilyLabel(rapportoView, famiglia, assunzioneNames?.datore)
  const workerName = getRapportoWorkerLabel(rapportoView, lavoratore, assunzioneNames?.lavoratore)
  const familyEmail = firstAvailableText(
    famiglia?.email,
    famiglia?.customer_email,
    famiglia?.secondary_email,
  )
  const familyPhone = firstAvailableText(famiglia?.telefono, famiglia?.whatsapp)
  const workerEmail = firstAvailableText(lavoratore?.email)
  const workerPhone = firstAvailableText(lavoratore?.telefono)
  const presenzeUrl = buildFamilyPresenzeUrl(famiglia?.email, famiglia?.id)
  const relationshipTitle = getRapportoTitle(rapportoView, {
    famiglia,
    lavoratore,
    assunzioneDatore: assunzioneNames?.datore,
    assunzioneLavoratore: assunzioneNames?.lavoratore,
  })
  const rapportoMetadata =
    rapportoView.metadati_migrazione && typeof rapportoView.metadati_migrazione === "object"
      ? rapportoView.metadati_migrazione
      : {}
  const delegaInpsValue =
    typeof rapportoMetadata === "object" && rapportoMetadata
      ? (rapportoMetadata as Record<string, unknown>).delega_inps_allegati ?? null
      : null
  const hasAccordoDiLavoro = hasAttachmentValue(rapportoView.accordo_di_lavoro_allegati)
  const hasRicevutaInps = hasAttachmentValue(rapportoView.ricevuta_inps_allegati)
  const hasDelegaInps = hasAttachmentValue(delegaInpsValue)
  const startDateLabel = formatDate(rapportoView.data_inizio_rapporto)
  const rapportoStatus = resolveRapportoStatus(
    rapportoView,
    chiusure[0]?.data_fine_rapporto ?? rapportoView.data_fine_rapporto
  )
  const statoRapportoColor =
    lookupColorsByDomain.get(
      `rapporti_lavorativi.stato_rapporto:${normalizeToken(rapportoStatus)}`
    ) ?? getRapportoStatusColor(rapportoStatus)
  const meseCalendarioById = new Map(mesiCalendario.map((item) => [item.id, item]))
  const presenzeById = new Map(presenze.map((item) => [item.id, item]))
  // `transazioni` arriva ordinato per creato_il desc: tenendo la prima per
  // mese_lavorativo_id si conserva la transazione più recente (come la RPC
  // cedolini_board lato pagina cedolini).
  const transazioniByMeseId = new Map<string, TransazioneFinanziariaRecord>()
  for (const item of transazioni) {
    if (!item.mese_lavorativo_id) continue
    if (!transazioniByMeseId.has(item.mese_lavorativo_id)) {
      transazioniByMeseId.set(item.mese_lavorativo_id, item)
    }
  }
  // Il pagamento si collega al cedolino tramite la transazione, non il ticket
  // (idem RPC cedolini_board). `pagamenti` è ordinato per creato_il desc: la
  // prima per transazione_id è la più recente.
  const pagamentoByTransazioneId = new Map<string, PagamentoRecord>()
  for (const item of pagamenti) {
    if (!item.transazione_id) continue
    if (!pagamentoByTransazioneId.has(item.transazione_id)) {
      pagamentoByTransazioneId.set(item.transazione_id, item)
    }
  }
  // Risolve il pagamento di un cedolino seguendo mese → transazione → pagamento.
  const getPagamentoForMese = (meseLavoratoId: string) => {
    const transazione = transazioniByMeseId.get(meseLavoratoId)
    return transazione ? pagamentoByTransazioneId.get(transazione.id) ?? null : null
  }
  const sortedMesi = [...mesi].sort((left, right) => {
    const leftDate =
      (left.mese_id ? meseCalendarioById.get(left.mese_id)?.data_inizio : null) ??
      left.creato_il ??
      ""
    const rightDate =
      (right.mese_id ? meseCalendarioById.get(right.mese_id)?.data_inizio : null) ??
      right.creato_il ??
      ""
    return rightDate.localeCompare(leftDate)
  })
  const cedolinoCards = sortedMesi.map((mese) => {
    const meseCalendario = mese.mese_id ? meseCalendarioById.get(mese.mese_id) ?? null : null
    const pagamento = getPagamentoForMese(mese.id)
    const presenzeMese = mese.presenze_id ? presenzeById.get(mese.presenze_id) ?? null : null
    const presenzeRegolari = mese.presenze_regolare_id
      ? presenzeById.get(mese.presenze_regolare_id) ?? null
      : null
    const nomeCompleto =
      [rapportoView.cognome_nome_datore_proper, rapportoView.nome_lavoratore_per_url]
        .filter(Boolean)
        .join(" – ")
        .trim() || "Rapporto non disponibile"

    return {
      id: mese.id,
      stage: mese.stato_mese_lavorativo ?? "TODO",
      record: mese,
      famiglia,
      pagamento,
      transazione: transazioniByMeseId.get(mese.id) ?? null,
      presenze: presenzeMese,
      presenzeRegolari,
      rapporto: rapportoView,
      mese: meseCalendario,
      richiestaAttivazione: richiestaAttivazione
        ? { id: richiestaAttivazione.id, fee_concordata: richiestaAttivazione.fee_concordata ?? null }
        : null,
      presenzeIrregolari: (() => {
        if (!presenzeMese) return false
        for (let day = 1; day <= 31; day += 1) {
          const value = (presenzeMese as Record<string, unknown>)[`evento_day_${day}`]
          if (value !== null && value !== undefined && String(value).trim() !== "") return true
        }
        return false
      })(),
      nomeCompleto,
      importoLabel: typeof mese.importo_busta_estratto === "number" ? formatItalianCurrency(mese.importo_busta_estratto) : null,
      dataInvioLabel: mese.data_invio_famiglia ? formatDate(mese.data_invio_famiglia) : null,
    } satisfies PayrollBoardCardData
  })
  const cedolinoColumns: PayrollBoardColumnData[] = PAYROLL_STAGE_OPTIONS.map((stage) => ({
    id: stage,
    label: stage,
    color: "sky",
    cards: cedolinoCards.filter((card) => card.stage === stage),
  }))
  const selectedCedolino = cedolinoCards.find((card) => card.id === selectedCedolinoId) ?? null
  const contributoCards: ContributoInpsBoardCardData[] = contributi.map((contributo) => {
    const stage = resolveContributoStage(contributo.stato_contributi_inps)

    return {
      id: contributo.id,
      stage,
      record: contributo,
      rapporto: rapportoView,
      trimestre: null,
      nomeFamiglia: familyName,
      nomeLavoratore: workerName,
      nomeCompleto: relationshipTitle,
      trimestreLabel: getContributoTitle(contributo),
      importoLabel:
        typeof contributo.importo_contributi_inps === "number"
          ? formatItalianCurrency(contributo.importo_contributi_inps)
          : null,
      pagopaLabel:
        typeof contributo.valore_pagopa === "number" ? formatItalianCurrency(contributo.valore_pagopa) : null,
    } satisfies ContributoInpsBoardCardData
  })
  const contributoColumns: ContributiColumnData[] = CONTRIBUTI_STAGE_OPTIONS.map((stage) => ({
    id: stage.id,
    label: stage.label,
    color: stage.color,
    cards: contributoCards.filter((card) => card.stage === stage.id),
  }))
  const selectedContributo =
    contributoCards.find((card) => card.id === selectedContributoId) ?? null
  const headerContent = (
    <div className="space-y-3">
      <div>
        <h2 className="truncate text-xl leading-tight font-semibold">{relationshipTitle}</h2>
        <div className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          {famiglia?.email ? <span>{famiglia.email}</span> : null}
          {famiglia?.email && startDateLabel !== "-" ? <span>•</span> : null}
          {startDateLabel !== "-" ? <span>dal {startDateLabel}</span> : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge className={getTagClassName(statoRapportoColor)}>
          {rapportoStatus}
        </Badge>
        {rapportoView.stato_servizio ? (
          <Badge variant="outline" className="h-6 rounded-full px-2.5 text-2xs font-medium">
            {rapportoView.stato_servizio}
          </Badge>
        ) : null}
        {rapportoView.tipo_rapporto ? (
          <Badge variant="outline" className="h-6 rounded-full px-2.5 text-2xs font-medium">
            {rapportoView.tipo_rapporto}
          </Badge>
        ) : null}
        {rapportoView.tipo_contratto ? (
          <Badge variant="secondary" className="h-6 rounded-full px-2.5 text-2xs font-medium">
            {rapportoView.tipo_contratto}
          </Badge>
        ) : null}
        <TipoContrattoBadge
          isAbbonamento={rapportoView.richiesta_attivazione_id == null}
          className="h-6 rounded-full px-2.5 text-2xs font-medium"
        />
      </div>
    </div>
  )

  return (
    <Form {...form}>
      <RecordDetailShell
        key={rapporto?.id ?? "__empty__"}
        sectionRef={detailScrollRef}
        tabs={SECTION_TABS}
        activeSection={activeSection}
        onSectionChange={scrollToSection}
        header={hideHeader ? undefined : headerContent}
        embedded={hideHeader}
      >
      <>
        <div className="space-y-6 text-sm">
          <div ref={setSectionRef("contratto")}>
            <DetailSectionBlock
              title="Caratteristiche del rapporto"
              icon={<BriefcaseBusinessIcon className="size-5" />}
              action={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => {
                    // L'autosave (debounce form) persiste mentre si digita:
                    // chiudere la modifica si limita a nascondere i campi.
                    setEditingSection(
                      editingSection === "contratto" ? null : "contratto",
                    )
                  }}
                  aria-label={
                    editingSection === "contratto"
                      ? "Chiudi modifica caratteristiche del rapporto"
                      : "Modifica caratteristiche del rapporto"
                  }
                  title={
                    editingSection === "contratto"
                      ? "Chiudi modifica caratteristiche del rapporto"
                      : "Modifica caratteristiche del rapporto"
                  }
                >
                  <PencilIcon className="size-4" />
                </Button>
              }
            >
              <div className="space-y-4">
                {editingSection === "contratto" ? (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <DetailFieldControl label="Tipo contratto">
                      {/* Campo non editabile dal pannello: mostrato read-only
                          anche in modalità modifica (popolato da workflow). */}
                      <Input value={rapportoView.tipo_contratto ?? ""} readOnly />
                    </DetailFieldControl>
                    <DetailFieldControl label="Tipo rapporto">
                      <Select value={rapportoView.tipo_rapporto || "__empty__"} disabled>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona tipo rapporto" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__empty__">Non impostato</SelectItem>
                          <SelectItem value="Lavoro ad ore">Lavoro ad ore</SelectItem>
                          <SelectItem value="Part time">Part time</SelectItem>
                          <SelectItem value="Convivente">Convivente</SelectItem>
                          <SelectItem value="Non convivente full-time">Non convivente full-time</SelectItem>
                          {rapportoView.tipo_rapporto &&
                          ![
                            "Lavoro ad ore",
                            "Part time",
                            "Convivente",
                            "Non convivente full-time",
                          ].includes(rapportoView.tipo_rapporto) ? (
                            <SelectItem value={rapportoView.tipo_rapporto}>
                              {rapportoView.tipo_rapporto}
                            </SelectItem>
                          ) : null}
                        </SelectContent>
                      </Select>
                    </DetailFieldControl>
                    <DetailFieldControl label="Data inizio">
                      <Input
                        type="date"
                        value={(rapportoView.data_inizio_rapporto ?? "").slice(0, 10)}
                        readOnly
                      />
                    </DetailFieldControl>
                    <DetailField label="Durata" value={getDurationLabel(rapportoView.data_inizio_rapporto)} />
                    <DetailFieldControl label="Stato assunzione">
                      <Input value={rapportoView.stato_assunzione ?? ""} readOnly />
                    </DetailFieldControl>
                    <DetailFieldControl label="Relazione lavorativa">
                      <Input value={rapportoView.relazione_lavorativa ?? ""} readOnly />
                    </DetailFieldControl>
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <DetailField label="Tipo contratto" value={rapportoView.tipo_contratto ?? "-"} />
                    <DetailField label="Tipo rapporto" value={rapportoView.tipo_rapporto ?? "-"} />
                    <DetailField label="Data inizio" value={startDateLabel} />
                    <DetailField label="Durata" value={getDurationLabel(rapportoView.data_inizio_rapporto)} />
                    <DetailField label="Stato assunzione" value={rapportoView.stato_assunzione ?? "-"} />
                    <DetailField label="Relazione lavorativa" value={rapportoView.relazione_lavorativa ?? "-"} />
                  </div>
                )}
              </div>

              <Separator className="bg-border/60" />

              <div className="space-y-1">
                <p className="ui-type-label">Distribuzione ore settimanali</p>
                <p className="ui-type-meta">Parte da domenica</p>
                <p className="ui-type-value">{rapportoView.distribuzione_ore_settimana || "-"}</p>
              </div>

              <Separator className="bg-border/60" />

              <div className="space-y-4">
                {editingSection === "contratto" ? (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <DetailFieldControl label="Paga oraria lorda">
                      <Input
                        type="number"
                        step="0.01"
                        value={
                          typeof rapportoView.paga_oraria_lorda === "number"
                            ? String(rapportoView.paga_oraria_lorda)
                            : ""
                        }
                        readOnly
                      />
                    </DetailFieldControl>
                    <DetailFieldControl label="Paga mensile lorda">
                      <Input
                        type="number"
                        step="0.01"
                        value={
                          typeof rapportoView.paga_mensile_lorda === "number"
                            ? String(rapportoView.paga_mensile_lorda)
                            : ""
                        }
                        readOnly
                      />
                    </DetailFieldControl>
                    <DetailFieldControl label="Cod. rapporto Webcolf">
                      <FieldInput name="codice_datore_webcolf" type="number" />
                    </DetailFieldControl>
                    <DetailFieldControl label="Cod. lavoratore Webcolf">
                      <FieldInput name="codice_dipendente_webcolf" type="number" />
                    </DetailFieldControl>
                    {/* ID rapporto INPS is populated by external workflows
                        (e.g. assunzione automation) and must never be edited
                        by hand from this panel — render it read-only even
                        inside the edit mode grid. */}
                    <DetailField label="ID rapporto INPS" value={rapportoView.id_rapporto ?? "-"} />
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <DetailField label="Paga oraria lorda" value={formatItalianCurrency(rapportoView.paga_oraria_lorda)} />
                    <DetailField label="Paga mensile lorda" value={formatItalianCurrency(rapportoView.paga_mensile_lorda)} />
                    <DetailField
                      label="Cod. rapporto Webcolf"
                      value={rapportoView.codice_datore_webcolf ? String(rapportoView.codice_datore_webcolf) : "-"}
                    />
                    <DetailField
                      label="Cod. lavoratore Webcolf"
                      value={
                        rapportoView.codice_dipendente_webcolf
                          ? String(rapportoView.codice_dipendente_webcolf)
                          : "-"
                      }
                    />
                    <DetailField label="ID rapporto INPS" value={rapportoView.id_rapporto ?? "-"} />
                  </div>
                )}
              </div>
            </DetailSectionBlock>
          </div>

          <div ref={setSectionRef("preventivo")}>
            <DetailSectionBlock
              title="Preventivo collegato"
              icon={<FileTextIcon className="size-5" />}
            >
              {loadingRelated ? (
                <div className="grid gap-3 md:grid-cols-3">
                  <Skeleton className="h-16 rounded-lg" />
                  <Skeleton className="h-16 rounded-lg" />
                  <Skeleton className="h-16 rounded-lg" />
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-3">
                  <DetailFieldControl label="Fee concordata">
                    <FieldInput
                      name="fee_concordata"
                      type="number"
                      step="0.01"
                      disabled={!richiestaAttivazione?.id}
                      placeholder="-"
                    />
                  </DetailFieldControl>
                  <div className="rounded-lg border bg-surface px-3 py-2">
                    <p className="ui-type-label mb-2">URL origine</p>
                    {currentProcesso?.source_url ? (
                      <Button type="button" variant="outline" size="sm" asChild>
                        <a
                          href={currentProcesso.source_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Apri URL origine
                          <ExternalLinkIcon className="ml-2 size-4" />
                        </a>
                      </Button>
                    ) : (
                      <span className="text-muted-foreground text-sm">
                        -
                      </span>
                    )}
                  </div>
                  <DetailFieldControl label="Sconto applicato">
                    <FieldScontoSelect
                      name="offerta"
                      disabled={!currentProcesso?.id}
                      placeholder="Seleziona sconto"
                    />
                  </DetailFieldControl>
                </div>
              )}
            </DetailSectionBlock>
          </div>

          <div ref={setSectionRef("gestione")}>
            <DetailSectionBlock
              title="Datore e lavoratore"
              icon={<UsersIcon className="size-5" />}
            >
              {loadingRelated ? (
                <RelatedRecordsSkeleton />
              ) : (
                <>
                  <div className="grid gap-3 md:grid-cols-2">
                    <RelatedPersonCard
                      role="Datore"
                      name={familyName}
                      email={familyEmail}
                      phone={familyPhone}
                      href={
                        rapporto?.id
                          ? buildPathForRoute({
                              // BAZ-20: apre la pagina Assunzioni con la card di
                              // questo rapporto già selezionata (il board è
                              // indicizzato per rapporto id). Il CS ha bisogno
                              // dei dati dell'assunzione per i controlli INPS.
                              mainSection: "gestione_contrattuale_assunzioni",
                              anagraficheTab: "famiglie",
                              ricercaProcessId: null,
                              selectedAssunzioneRapportoId: rapporto.id,
                            })
                          : undefined
                      }
                    />
                    <RelatedPersonCard
                      role="Lavoratore"
                      name={workerName}
                      email={workerEmail}
                      phone={workerPhone}
                      details={[
                        {
                          label: "IBAN",
                          value: firstAvailableText(lavoratore?.iban),
                        },
                        {
                          label: "Stripe",
                          value: firstAvailableText(
                            lavoratore?.id_stripe_account,
                          ),
                        },
                      ]}
                      href={
                        lavoratore
                          ? buildPathForRoute({
                              mainSection: "lavoratori_cerca",
                              anagraficheTab: "famiglie",
                              ricercaProcessId: null,
                              selectedWorkerId: lavoratore.id,
                            })
                          : undefined
                      }
                    />
                  </div>

                  <Separator className="bg-border/60" />

                  <div className="grid gap-4 lg:grid-cols-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <FileTextIcon className="text-muted-foreground size-4" />
                        <span className="text-2xs font-semibold">Accordo di lavoro</span>
                        {hasAccordoDiLavoro ? (
                          <CheckCircle2Icon className="size-4 text-green-600" />
                        ) : (
                          <OctagonAlertIcon className="size-4 text-red-500" />
                        )}
                      </div>
                      <AttachmentUploadSlot
                        label="Accordo di lavoro"
                        value={rapportoView.accordo_di_lavoro_allegati}
                        onAdd={(file) => void handleUploadRapportoAttachment("accordo_di_lavoro_allegati", file)}
                        onPreviewOpen={setSelectedPreview}
                        isUploading={uploadingSlot === "accordo_di_lavoro_allegati"}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <FileTextIcon className="text-muted-foreground size-4" />
                        <span className="text-2xs font-semibold">Ricevuta INPS</span>
                        {hasRicevutaInps ? (
                          <CheckCircle2Icon className="size-4 text-green-600" />
                        ) : (
                          <OctagonAlertIcon className="size-4 text-red-500" />
                        )}
                      </div>
                      <AttachmentUploadSlot
                        label="Ricevuta INPS"
                        value={rapportoView.ricevuta_inps_allegati}
                        onAdd={(file) => void handleUploadRapportoAttachment("ricevuta_inps_allegati", file)}
                        onPreviewOpen={setSelectedPreview}
                        isUploading={uploadingSlot === "ricevuta_inps_allegati"}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <FileTextIcon className="text-muted-foreground size-4" />
                        <span className="text-2xs font-semibold">Delega INPS</span>
                        {hasDelegaInps ? (
                          <CheckCircle2Icon className="size-4 text-green-600" />
                        ) : (
                          <OctagonAlertIcon className="size-4 text-red-500" />
                        )}
                      </div>
                      <AttachmentUploadSlot
                        label="Delega INPS"
                        value={delegaInpsValue}
                        onAdd={(file) => void handleUploadRapportoAttachment("delega_inps_allegati", file)}
                        onPreviewOpen={setSelectedPreview}
                        isUploading={uploadingSlot === "delega_inps_allegati"}
                      />
                    </div>
                  </div>

                  {uploadError ? <p className="text-sm text-red-600">{uploadError}</p> : null}

                  {processi.length > 0 ? (
                    <>
                      <Separator className="bg-border/60" />
                      <div className="space-y-3">
                        <p className="ui-type-label">Record collegati</p>
                        <div className="space-y-2">
                          {processi.map((processo) => (
                            <ListRowCard
                              key={processo.id}
                              title={processo.titolo_annuncio || processo.id}
                              subtitle={`Stato RES: ${processo.stato_res ?? "-"}`}
                              trailing={
                                <Button asChild variant="outline" size="sm">
                                  <a
                                    href={buildPathForRoute({
                                      mainSection: "ricerca_pipeline",
                                      anagraficheTab: "famiglie",
                                      ricercaProcessId: processo.id,
                                    })}
                                  >
                                    Apri
                                    <ArrowRightIcon className="size-4" />
                                  </a>
                                </Button>
                              }
                            />
                          ))}
                        </div>
                      </div>
                    </>
                  ) : null}
                </>
              )}
            </DetailSectionBlock>
          </div>

          <div ref={setSectionRef("tickets")} className="space-y-4">
            <DetailSectionBlock
              title="Tickets"
              icon={<MessageSquareTextIcon className="size-5" />}
              action={
                onCreateTicket ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCreateTicketOpen(true)}
                  >
                    Apri un ticket
                    <ArrowRightIcon className="size-4" />
                  </Button>
                ) : null
              }
              contentClassName="space-y-3 pt-2"
            >
              {loadingRelated ? (
                <LinkedRowsSkeleton />
              ) : tickets.length > 0 ? (
                tickets.map((ticket) => (
                  <ListRowCard
                    key={ticket.id}
                    title={ticket.causale ?? "Ticket senza causale"}
                    subtitle={[
                      ticket.tipo ? `Tipo ${ticket.tipo}` : null,
                      ticket.data_apertura ? `Aperto il ${formatDate(ticket.data_apertura)}` : null,
                      ticket.urgenza ? `Urgenza ${ticket.urgenza}` : null,
                    ]
                      .filter(Boolean)
                      .join(" • ")}
                    rightBadge={ticket.stato ?? undefined}
                    onClick={() => setSelectedTicket(ticket)}
                  />
                ))
              ) : (
                <EmptyLinkedState
                  icon={<MessageSquareTextIcon className="size-8" />}
                  label="Nessun ticket collegato"
                />
              )}
            </DetailSectionBlock>
          </div>

          <div ref={setSectionRef("cedolini")} className="space-y-4">
            <DetailSectionBlock
              title="Cedolini"
              icon={<FileTextIcon className="size-5" />}
              contentClassName="space-y-3 pt-2"
              action={
                presenzeUrl ? (
                  <Button asChild variant="outline" size="sm">
                    <a
                      href={presenzeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Apri il calendario presenze della famiglia"
                    >
                      <CalendarDaysIcon className="size-4" />
                      Calendario presenze
                    </a>
                  </Button>
                ) : undefined
              }
            >
              {loadingRelated ? (
                <LinkedRowsSkeleton />
              ) : sortedMesi.length > 0 ? (
                sortedMesi.map((mese) => {
                  const meseCalendario = mese.mese_id ? meseCalendarioById.get(mese.mese_id) ?? null : null
                  const pagamento = getPagamentoForMese(mese.id)
                  const presenzeMese = mese.presenze_id ? presenzeById.get(mese.presenze_id) ?? null : null
                  const ratingValue =
                    typeof mese.rating_feedback_famiglia === "number" && mese.rating_feedback_famiglia > 0
                      ? Math.max(0, Math.min(5, Math.round(mese.rating_feedback_famiglia)))
                      : 0

                  return (
                    <ListRowCard
                      key={mese.id}
                      title={getMonthLabel(mese, meseCalendario)}
                      subtitle={[
                        mese.stato_mese_lavorativo ?? "Stato non disponibile",
                        getPresenceSummary(presenzeMese),
                        pagamento?.status ? `Pagamento ${pagamento.status}` : null,
                      ]
                        .filter(Boolean)
                        .join(" • ")}
                      rightBadge={mese.stato_mese_lavorativo ?? undefined}
                      trailing={
                        <div className="flex items-center gap-2">
                          {ratingValue > 0 ? (
                            <div
                              className="flex items-center gap-0.5"
                              title={mese.testo_feedback_famiglia ?? `Rating famiglia: ${ratingValue}/5`}
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
                          <span className="text-xs font-semibold whitespace-nowrap">
                            {typeof mese.importo_busta_estratto === "number"
                              ? formatItalianCurrency(mese.importo_busta_estratto)
                              : "-"}
                          </span>
                        </div>
                      }
                      onClick={() => setSelectedCedolinoId(mese.id)}
                    />
                  )
                })
              ) : (
                <EmptyLinkedState
                  icon={<CreditCardIcon className="size-8" />}
                  label="Nessun cedolino collegato"
                />
              )}
            </DetailSectionBlock>
          </div>

          <div ref={setSectionRef("contributi")} className="space-y-4">
            <DetailSectionBlock
              title="Contributi INPS"
              icon={<CalendarDaysIcon className="size-5" />}
              contentClassName="space-y-3 pt-2"
            >
              {loadingRelated ? (
                <LinkedRowsSkeleton />
              ) : contributi.length > 0 ? (
                contributi.map((contributo) => (
                  <ListRowCard
                    key={contributo.id}
                    title={getContributoTitle(contributo)}
                    subtitle={[
                      contributo.data_invio_famiglia
                        ? `Inviato il ${formatDate(contributo.data_invio_famiglia)}`
                        : contributo.data_ora_creazione
                          ? `Creato il ${formatItalianDateTimeOr(contributo.data_ora_creazione, "-")}`
                        : null,
                      contributo.valore_pagopa != null
                        ? `PagoPA ${formatItalianCurrency(contributo.valore_pagopa)}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" • ")}
                    rightBadge={resolveContributoStage(contributo.stato_contributi_inps)}
                    trailing={
                      <span className="text-xs font-semibold whitespace-nowrap">
                        {typeof contributo.importo_contributi_inps === "number"
                          ? formatItalianCurrency(contributo.importo_contributi_inps)
                          : "-"}
                      </span>
                    }
                    onClick={() => setSelectedContributoId(contributo.id)}
                  />
                ))
              ) : (
                <EmptyLinkedState
                  icon={<CalendarDaysIcon className="size-8" />}
                  label="Nessun contributo INPS collegato"
                />
              )}
            </DetailSectionBlock>
          </div>

          <div ref={setSectionRef("variazioni")} className="space-y-4">
            <DetailSectionBlock
              title="Variazioni contrattuali"
              icon={<RefreshCwIcon className="size-5" />}
              contentClassName="space-y-3 pt-2"
            >
              {loadingRelated ? (
                <LinkedRowsSkeleton rows={2} />
              ) : variazioni.length > 0 ? (
                variazioni.map((variazione) => (
                  <ListRowCard
                    key={variazione.id}
                    title={variazione.variazione_da_applicare ?? "Variazione contrattuale"}
                    subtitle={[
                      variazione.data_variazione
                        ? `Data variazione ${formatDate(variazione.data_variazione)}`
                        : null,
                      variazione.ticket_id ? `Ticket collegato` : null,
                    ]
                      .filter(Boolean)
                      .join(" • ")}
                    rightBadge={variazione.stato ?? undefined}
                  />
                ))
              ) : (
                <EmptyLinkedState
                  icon={<RefreshCwIcon className="size-8" />}
                  label="Nessuna variazione contrattuale collegata"
                />
              )}
            </DetailSectionBlock>
          </div>

          <div ref={setSectionRef("chiusure")} className="space-y-4">
            <DetailSectionBlock
              title="Chiusure"
              icon={<ShieldAlertIcon className="size-5" />}
              contentClassName="space-y-3 pt-2"
            >
              {loadingRelated ? (
                <LinkedRowsSkeleton rows={2} />
              ) : chiusure.length > 0 ? (
                chiusure.map((chiusura) => (
                  <ListRowCard
                    key={chiusura.id}
                    title={
                      chiusura.tipo_licenziamento ??
                      chiusura.motivazione_cessazione_rapporto ??
                      "Chiusura contrattuale"
                    }
                    subtitle={[
                      chiusura.data_fine_rapporto
                        ? `Fine rapporto ${formatDate(chiusura.data_fine_rapporto)}`
                        : null,
                      chiusura.informazioni_aggiuntive ?? null,
                    ]
                      .filter(Boolean)
                      .join(" • ")}
                    rightBadge={chiusura.stato ?? undefined}
                  />
                ))
              ) : (
                <EmptyLinkedState
                  icon={<TriangleAlertIcon className="size-8" />}
                  label="Nessuna chiusura collegata"
                />
              )}
            </DetailSectionBlock>
          </div>

          <div className="h-8" />
        </div>
      {onCreateTicket ? (
        <SupportTicketCreateDialog
          open={isCreateTicketOpen}
          onOpenChange={setIsCreateTicketOpen}
          defaultTicketType="Customer"
          defaultRapportoId={rapportoView.id}
          rapportoOptions={[{ id: rapportoView.id, label: relationshipTitle }]}
          onCreateTicket={onCreateTicket}
        />
      ) : null}
      <CedolinoDetailSheet
        key={selectedCedolinoId ?? "__empty__"}
        card={selectedCedolino}
        columns={cedolinoColumns}
        open={Boolean(selectedCedolino)}
        onOpenChange={(open) => {
          if (!open) setSelectedCedolinoId(null)
        }}
        onStageChange={(recordId, targetStageId) => {
          void updateRecord("mesi_lavorati", recordId, {
            stato_mese_lavorativo: targetStageId,
          })
        }}
        onPatchCard={(recordId, patch) => {
          void updateRecord("mesi_lavorati", recordId, patch as Record<string, unknown>)
        }}
        onPatchPresence={(recordId, patch) => {
          void updateRecord("presenze_mensili", recordId, patch as Record<string, unknown>)
        }}
      />
      <ContributoInpsDetailSheet
        key={selectedContributoId ?? "__empty__"}
        card={selectedContributo}
        columns={contributoColumns}
        open={Boolean(selectedContributo)}
        onOpenChange={(open) => {
          if (!open) setSelectedContributoId(null)
        }}
        onStageChange={async (recordId, targetStageId) => {
          await updateRecord("contributi_inps", recordId, {
            stato_contributi_inps: targetStageId,
          })
        }}
        onPatchCard={async (recordId, patch) => {
          await updateRecord("contributi_inps", recordId, patch as Record<string, unknown>)
        }}
      />
      <Dialog open={Boolean(selectedTicket)} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="max-w-2xl">
          <DialogTitle>{selectedTicket?.causale ?? "Dettaglio ticket"}</DialogTitle>
          {selectedTicket ? (
            <div className="grid gap-4 pt-2 sm:grid-cols-2">
              <DetailField label="Stato" value={selectedTicket.stato ?? "-"} />
              <DetailField label="Tipo" value={selectedTicket.tipo ?? "-"} />
              <DetailField label="Urgenza" value={selectedTicket.urgenza ?? "-"} />
              <DetailField label="Data apertura" value={formatDate(selectedTicket.data_apertura)} />
              <DetailField label="Creato da" value={selectedTicket.created_by ?? "-"} />
              <DetailField label="ID ticket" value={selectedTicket.id} />
              <div className="sm:col-span-2">
                <DetailField
                  label="Metadati"
                  value={
                    selectedTicket.metadati_migrazione
                      ? JSON.stringify(selectedTicket.metadati_migrazione)
                      : "-"
                  }
                />
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(selectedPreview)} onOpenChange={(open) => !open && setSelectedPreview(null)}>
        <DialogContent
          className="max-w-[min(96vw,72rem)] border-none bg-neutral-950/90 p-2 shadow-none sm:max-w-[min(96vw,72rem)]"
        >
          <DialogTitle className="sr-only">
            {selectedPreview?.label ?? "Anteprima documento"}
          </DialogTitle>
          {selectedPreview ? (
            <div className="flex max-h-[88vh] items-center justify-center overflow-hidden rounded-lg">
              <img
                src={selectedPreview.url}
                alt={selectedPreview.label}
                className="max-h-[88vh] w-auto max-w-full object-contain"
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      </>
      </RecordDetailShell>
    </Form>
  )
}
