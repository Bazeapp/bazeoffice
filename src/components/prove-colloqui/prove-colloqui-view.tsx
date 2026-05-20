import * as React from "react"
import {
  BarChart3Icon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardListIcon,
  FileTextIcon,
  Link2Icon,
  PhoneCallIcon,
  PhoneIcon,
  RefreshCwIcon,
} from "lucide-react"
import { toast } from "sonner"

import { LavoratoreCard, type LavoratoreListItem } from "@/components/lavoratori/lavoratore-card"
import { AttachmentUploadSlot } from "@/components/shared-next/attachment-upload-slot"
import type { AttachmentLink } from "@/components/shared-next/attachment-utils"
import { DetailField, DetailFieldControl, DetailSectionBlock } from "@/components/shared-next/detail-section-card"
import { KanbanColumnShell, KanbanColumnSkeleton, type KanbanColumnVisual } from "@/components/shared-next/kanban"
import { SectionHeader } from "@/components/shared-next/section-header"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckboxChip } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { SearchInput } from "@/components/ui/search-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { getTagClassName, resolveLookupColor } from "@/features/lavoratori/lib/lookup-utils"
import { matchesSearchQuery } from "@/lib/search-utils"
import { buildAttachmentPayload, normalizeAttachmentArray } from "@/lib/attachments"
import { supabase } from "@/lib/supabase-client"
import { cn } from "@/lib/utils"
import { buildPathForRoute } from "@/routes/app-routes"
import {
  type ColloquioCalendarEvent,
  type CalendarDateRange,
  type LookupOption,
  type ProvaCardData,
  type ProvaColumnData,
  useProveColloquiData,
} from "@/hooks/use-prove-colloqui-data"
import type { ProcessoMatchingRecord, RapportoLavorativoRecord } from "@/types"

type ProveColloquiViewProps = {
  onOpenRicercaDetail: (processId: string) => void
}

type ViewTab = "prove" | "colloqui"
type CalendarEventKind = "colloquio" | "prova"
type CalendarStatusKey = "match" | "no-match" | "prova" | "colloquio" | "standby"

const DAY_LABELS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab"]
const DISTRIBUTION_DAY_LABELS = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"]
const CALENDAR_KIND_OPTIONS: Array<{ value: CalendarEventKind; label: string }> = [
  { value: "colloquio", label: "Colloquio" },
  { value: "prova", label: "Prova" },
]
const CALENDAR_STATUS_OPTIONS: Array<{ value: CalendarStatusKey; label: string }> = [
  { value: "match", label: "Match" },
  { value: "no-match", label: "No match" },
  { value: "prova", label: "In prova" },
  { value: "colloquio", label: "Colloquio" },
  { value: "standby", label: "Standby" },
]
const AUDIO_ACCEPT = "audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/ogg,audio/opus,audio/aac,.mp3,.m4a,.wav,.ogg,.opus,.aac"
type TrialRecordingSlot = "registrazione_chiamate_lavoratori" | "registrazione_chiamate_famiglia"

function toStringValue(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === "string") {
    const normalized = value.trim()
    return normalized ? normalized : null
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  return null
}

function normalizeToken(value: unknown) {
  return String(value ?? "").trim().toLowerCase()
}

function sanitizeFileName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

function formatDateTime(value: string | null | undefined) {
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

function formatTime(value: string | null | undefined) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function toIsoDateInput(value: string | null | undefined) {
  if (!value) return ""
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toISOString().slice(0, 10)
}

function startOfLocalDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function getTrialElapsedDays(startValue: string | null | undefined) {
  if (!startValue) return null
  const start = new Date(startValue)
  if (Number.isNaN(start.getTime())) return null
  const startDay = startOfLocalDay(start)
  const today = startOfLocalDay(new Date())
  return Math.floor((today.getTime() - startDay.getTime()) / 86_400_000) + 1
}

function getTrialDayLabel(days: number | null) {
  if (days === null) return "Giorno prova non disponibile"
  if (days < 0) return `Inizia tra ${Math.abs(days)} ${Math.abs(days) === 1 ? "giorno" : "giorni"}`
  return `D${days}`
}

function toDateRangeValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function startOfWeek(date: Date) {
  const next = new Date(date)
  const day = (next.getDay() + 6) % 7
  next.setDate(next.getDate() - day)
  next.setHours(0, 0, 0, 0)
  return next
}

function getWeekVisibleRange(date: Date): CalendarDateRange {
  const start = startOfWeek(date)
  return {
    start: toDateRangeValue(start),
    end: toDateRangeValue(addDays(start, 7)),
  }
}

function isSameDate(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

function getEventDate(event: ColloquioCalendarEvent) {
  const date = new Date(event.start)
  return Number.isNaN(date.getTime()) ? null : date
}

function getCalendarEventStatusToken(event: ColloquioCalendarEvent) {
  return normalizeToken(
    event.type === "colloquio"
      ? [event.status, event.process?.stato_res, event.selection.stato_selezione].filter(Boolean).join(" ")
      : event.status,
  )
}

function getCalendarEventStatusKey(event: ColloquioCalendarEvent): CalendarStatusKey {
  const statusToken = getCalendarEventStatusToken(event)
  if (statusToken.includes("no match") || statusToken.includes("nomatch")) return "no-match"
  if (statusToken.includes("match")) return "match"
  if (event.type === "prova" || statusToken.includes("prova")) return "prova"
  if (statusToken.includes("colloquio")) return "colloquio"
  return "standby"
}

function getCalendarStatusRailClassName(statusKey: CalendarStatusKey) {
  switch (statusKey) {
    case "match":
      return "bg-emerald-800"
    case "prova":
      return "bg-emerald-500"
    case "no-match":
      return "bg-red-500"
    case "colloquio":
      return "bg-emerald-200"
    case "standby":
    default:
      return "bg-zinc-400"
  }
}

function getColumnVisual(color: string | null): KanbanColumnVisual {
  switch (normalizeToken(color)) {
    case "red":
      return { columnClassName: "bg-red-400", headerClassName: "", iconClassName: "text-red-500" }
    case "rose":
      return { columnClassName: "bg-rose-400", headerClassName: "", iconClassName: "text-rose-500" }
    case "orange":
      return { columnClassName: "bg-orange-400", headerClassName: "", iconClassName: "text-orange-500" }
    case "amber":
      return { columnClassName: "bg-amber-400", headerClassName: "", iconClassName: "text-amber-500" }
    case "emerald":
    case "green":
      return { columnClassName: "bg-emerald-400", headerClassName: "", iconClassName: "text-emerald-500" }
    case "blue":
      return { columnClassName: "bg-blue-400", headerClassName: "", iconClassName: "text-blue-500" }
    case "sky":
      return { columnClassName: "bg-sky-400", headerClassName: "", iconClassName: "text-sky-500" }
    case "violet":
      return { columnClassName: "bg-violet-400", headerClassName: "", iconClassName: "text-violet-500" }
    case "zinc":
      return { columnClassName: "bg-zinc-400", headerClassName: "", iconClassName: "text-zinc-500" }
    default:
      return { columnClassName: "", headerClassName: "", iconClassName: "text-muted-foreground/80" }
  }
}

function buildDistributionItems(source: string | null, totalHours: number | null) {
  const hourMatches = source?.match(/(\d+(?:[.,]\d+)?)h?/g) ?? []
  const parsed = hourMatches.map((item) => Number.parseFloat(item.replace("h", "").replace(",", ".")))

  if (parsed.length >= 7) {
    return DISTRIBUTION_DAY_LABELS.map((day, index) => ({
      day,
      value: `${Math.round(parsed[index] ?? 0)}h`,
    }))
  }

  if (typeof totalHours !== "number" || !Number.isFinite(totalHours)) {
    return DAY_LABELS.map((day) => ({ day, value: "-" }))
  }

  const base = Math.floor(totalHours / 6)
  const remainder = Math.round(totalHours - base * 6)
  return DAY_LABELS.map((day, index) => ({
    day,
    value: `${base + (index < remainder ? 1 : 0)}h`,
  }))
}

function EditableTextarea({
  value,
  placeholder,
  disabled = false,
  onCommit,
}: {
  value: string | null | undefined
  placeholder?: string
  disabled?: boolean
  onCommit: (next: string | null) => Promise<void>
}) {
  const [draft, setDraft] = React.useState(value ?? "")
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    setDraft(value ?? "")
  }, [value])

  return (
    <div className="space-y-1.5">
      <Textarea
        value={draft}
        placeholder={placeholder}
        disabled={disabled}
        className="min-h-24 resize-y"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={async () => {
          if (disabled) return
          const next = draft.trim() || null
          if (next === (value ?? null)) return
          setSaving(true)
          try {
            await onCommit(next)
          } finally {
            setSaving(false)
          }
        }}
      />
      {saving ? <p className="text-2xs text-muted-foreground">Salvataggio...</p> : null}
    </div>
  )
}

function buildProvaWorkerCardItem(card: ProvaCardData): LavoratoreListItem {
  return {
    id: card.lavoratore?.id ?? card.rapporto.lavoratore_id ?? card.id,
    nomeCompleto: card.lavoratoreLabel,
    immagineUrl: card.workerAvatarUrl,
    locationLabel: null,
    telefono: card.lavoratore?.telefono ?? null,
    isBlacklisted: false,
    tipoRuolo: null,
    tipoRuoloColor: null,
    tipoLavoro: null,
    tipoLavoroColor: null,
    statoLavoratore: null,
    statoLavoratoreColor: null,
    disponibilita: null,
    disponibilitaColor: null,
    isDisponibile: null,
    isQualified: false,
    isIdoneo: false,
    isCertificato: false,
  }
}

function ProvaCard({
  card,
  onClick,
}: {
  card: ProvaCardData
  onClick: () => void
}) {
  const elapsedDays = getTrialElapsedDays(card.rapporto.data_inizio_rapporto)
  const elapsedDaysLabel =
    elapsedDays === null
      ? "-"
      : `${elapsedDays} ${elapsedDays === 1 ? "giorno" : "giorni"}`
  const worker = React.useMemo(() => buildProvaWorkerCardItem(card), [card])

  return (
    <LavoratoreCard
      worker={worker}
      isActive={false}
      onClick={onClick}
      subtitle={<span>{card.famigliaLabel}</span>}
      rightSlot={null}
      showQualificationStatus={false}
      bodySlot={
        <>
          <div className="border-t" />
          <div className="space-y-1.5 text-2xs text-muted-foreground">
            <p className="flex min-w-0 items-center gap-1.5">
              <CalendarIcon className="size-3.5 shrink-0" />
              <span className="truncate">{formatDate(card.rapporto.data_inizio_rapporto)}</span>
              <span className="shrink-0 text-muted-foreground/60">•</span>
              <span className="shrink-0">{elapsedDaysLabel}</span>
            </p>
            <p className="flex min-w-0 items-center gap-1.5">
              <PhoneIcon className="size-3.5 shrink-0" />
              <span className="truncate">{card.famiglia?.telefono ?? "Telefono famiglia non disponibile"}</span>
            </p>
            <p className="flex min-w-0 items-center gap-1.5">
              <PhoneCallIcon className="size-3.5 shrink-0" />
              <span className="truncate">{card.lavoratore?.telefono ?? "Telefono lavoratore non disponibile"}</span>
            </p>
          </div>
        </>
      }
    />
  )
}

function ProvaDetailSheet({
  card,
  statusOptions,
  feedbackFamigliaOptions,
  feedbackLavoratoreOptions,
  ramoD2Options,
  lookupColorsByDomain,
  open,
  onOpenChange,
  patchRapporto,
}: {
  card: ProvaCardData | null
  statusOptions: LookupOption[]
  feedbackFamigliaOptions: LookupOption[]
  feedbackLavoratoreOptions: LookupOption[]
  ramoD2Options: LookupOption[]
  lookupColorsByDomain: Map<string, string>
  open: boolean
  onOpenChange: (open: boolean) => void
  patchRapporto: (rapportoId: string, patch: Partial<RapportoLavorativoRecord>) => Promise<RapportoLavorativoRecord>
}) {
  const rapporto = card?.rapporto ?? null
  const famiglia = card?.famiglia ?? null
  const lavoratore = card?.lavoratore ?? null
  const statusColor = resolveLookupColor(lookupColorsByDomain, "rapporti_lavorativi.prova_stato_cs", rapporto?.prova_stato_cs ?? null)
  const distribution = buildDistributionItems(rapporto?.distribuzione_ore_settimana ?? null, rapporto?.ore_a_settimana ?? null)
  const trialElapsedDays = getTrialElapsedDays(rapporto?.data_inizio_rapporto)
  const rapportoPath = rapporto
    ? buildPathForRoute({
        mainSection: "gestione_contrattuale_rapporti",
        anagraficheTab: "famiglie",
        ricercaProcessId: null,
        selectedRapportoId: rapporto.id,
      })
    : null
  const [uploadingSlot, setUploadingSlot] = React.useState<TrialRecordingSlot | null>(null)
  const [recordingError, setRecordingError] = React.useState<string | null>(null)
  const rapportoRef = React.useRef(rapporto)

  React.useEffect(() => {
    rapportoRef.current = rapporto
  }, [rapporto])

  async function updateRapporto(patch: Partial<RapportoLavorativoRecord>) {
    if (!rapporto) return
    await patchRapporto(rapporto.id, patch)
  }

  async function handleUploadRecording(slot: TrialRecordingSlot, file: File) {
    const currentRapporto = rapportoRef.current
    if (!currentRapporto) return
    if (!file.type.startsWith("audio/") && !/\.(mp3|m4a|wav|ogg|opus|aac)$/i.test(file.name)) {
      setRecordingError("Formato non supportato. Carica file audio mp3, m4a, wav, ogg, opus o aac.")
      return
    }

    setRecordingError(null)
    setUploadingSlot(slot)

    try {
      const safeName = sanitizeFileName(file.name || "registrazione-audio")
      const storagePath = [
        "rapporti_lavorativi",
        currentRapporto.id,
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
      const updated = await patchRapporto(currentRapporto.id, {
        [slot]: [...normalizeAttachmentArray(currentRapporto[slot]), payload],
      } as Partial<RapportoLavorativoRecord>)
      rapportoRef.current = { ...currentRapporto, ...updated }
      toast.success("Registrazione caricata")
    } catch (caughtError) {
      setRecordingError(
        caughtError instanceof Error ? caughtError.message : "Errore caricando registrazione",
      )
    } finally {
      setUploadingSlot(null)
    }
  }

  async function handleRemoveRecording(slot: TrialRecordingSlot, link: AttachmentLink) {
    const currentRapporto = rapportoRef.current
    if (!currentRapporto) return
    if (!window.confirm(`Rimuovere la registrazione "${link.label}"?`)) return

    setRecordingError(null)
    setUploadingSlot(slot)

    try {
      const nextValue = normalizeAttachmentArray(currentRapporto[slot]).filter((attachment) => {
        if (link.path && attachment.path === link.path) return false
        return attachment.name !== link.label
      })

      if (link.path?.startsWith("baze-bucket/")) {
        const removeResult = await supabase.storage
          .from("baze-bucket")
          .remove([link.path.replace(/^baze-bucket\//, "")])

        if (removeResult.error) {
          throw removeResult.error
        }
      }

      const updated = await patchRapporto(currentRapporto.id, {
        [slot]: nextValue.length > 0 ? nextValue : null,
      } as Partial<RapportoLavorativoRecord>)
      rapportoRef.current = { ...currentRapporto, ...updated }
      toast.success("Registrazione rimossa")
    } catch (caughtError) {
      setRecordingError(
        caughtError instanceof Error ? caughtError.message : "Errore rimuovendo registrazione",
      )
    } finally {
      setUploadingSlot(null)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[min(96vw,720px)]! max-w-none! p-0 sm:max-w-none">
        <SheetHeader className="border-b bg-surface px-5 py-5">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="min-w-0">
              <SheetTitle className="truncate text-xl font-semibold">
                {card?.title ?? "Dettaglio prova"}
              </SheetTitle>
              <SheetDescription className="sr-only">
                Dettaglio operativo del rapporto in prova con stato, riepilogo rapporto, feedback e check-in.
              </SheetDescription>
              <p className="mt-1 text-sm text-muted-foreground">
                Rapporto avviato il {formatDate(rapporto?.data_inizio_rapporto)} · Oggi {formatDate(new Date().toISOString())} · {getTrialDayLabel(trialElapsedDays)}
              </p>
            </div>

            {rapporto ? (
              <DetailFieldControl label="Stato CS Prova" className="max-w-sm">
                <Select
                  value={rapporto.prova_stato_cs ?? "none"}
                  onValueChange={(next) => {
                    void updateRapporto({ prova_stato_cs: next === "none" ? null : next }).catch((caughtError) => {
                      toast.error(caughtError instanceof Error ? caughtError.message : "Errore aggiornando stato prova")
                    })
                  }}
                >
                  <SelectTrigger className={cn("bg-surface", getTagClassName(statusColor))}>
                    <SelectValue placeholder="Stato prova" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nessuno stato</SelectItem>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </DetailFieldControl>
            ) : null}
          </div>
        </SheetHeader>

        {card && rapporto ? (
          <section className="h-full overflow-y-auto bg-surface-muted px-5 py-5">
            <div className="mx-auto max-w-5xl space-y-5">
              <DetailSectionBlock
                title="Rapporto"
                icon={<ClipboardListIcon className="size-4" />}
                action={
                  rapportoPath ? (
                    <Button type="button" variant="ghost" size="sm" asChild className="gap-1.5">
                      <a href={rapportoPath}>
                        <Link2Icon className="size-4" />
                        Vai al rapporto
                      </a>
                    </Button>
                  ) : null
                }
                contentClassName="space-y-5"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <DetailField
                    label="Stato Pratica Assunzione"
                    value={
                      <Badge className={getTagClassName(resolveLookupColor(lookupColorsByDomain, "rapporti_lavorativi.stato_assunzione", rapporto.stato_assunzione))}>
                        {rapporto.stato_assunzione ?? "-"}
                      </Badge>
                    }
                  />
                  <DetailField label="Ore Settimanali" value={rapporto.ore_a_settimana ?? "-"} />
                  <DetailField label="Email Datore" value={famiglia?.email ?? "-"} />
                  <DetailField label="Nome Datore" value={card.famigliaLabel} />
                  <DetailField label="Email Lavoratore" value={lavoratore?.email ?? "-"} />
                  <DetailField label="Nome Lavoratore" value={card.lavoratoreLabel} />
                  <DetailField label="Data Inizio Rapporto" value={formatDate(rapporto.data_inizio_rapporto)} />
                  <DetailField label="Telefono famiglia" value={famiglia?.telefono ?? "-"} />
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
                  {distribution.map((item) => (
                    <div key={item.day} className="rounded-lg border bg-surface px-3 py-2">
                      <div className="text-xs font-medium text-muted-foreground">{item.day}</div>
                      <div className="mt-1 text-sm font-semibold">{item.value}</div>
                    </div>
                  ))}
                </div>
              </DetailSectionBlock>

              <DetailSectionBlock
                title="D0 - Pre-prova"
                icon={<PhoneCallIcon className="size-4" />}
                cardClassName="ring-1 ring-primary/15"
                contentClassName="space-y-4"
              >
                <p className="text-sm text-muted-foreground">
                  Da compilare durante/dopo la call onboarding per segnare le priorità della famiglia a livello di pulizia, organizzazione e rapporto con il lavoratore.
                </p>
                <DetailFieldControl label="Priorità famiglia">
                  <EditableTextarea
                    value={rapporto.prova_priorita_famiglia}
                    placeholder="Pulizia, organizzazione, rapporto con il lavoratore..."
                    onCommit={async (next) => {
                      await updateRapporto({ prova_priorita_famiglia: next })
                    }}
                  />
                </DetailFieldControl>
              </DetailSectionBlock>

              <DetailSectionBlock
                title="D1 - Feedback"
                icon={<BarChart3Icon className="size-4" />}
                cardClassName="ring-1 ring-primary/15"
                contentClassName="grid gap-4 md:grid-cols-2"
              >
                <DetailFieldControl label="Feedback Famiglia">
                  <Select
                    value={rapporto.prova_feedback_famiglia ?? "none"}
                    onValueChange={(next) => void updateRapporto({ prova_feedback_famiglia: next === "none" ? null : next })}
                  >
                    <SelectTrigger className="bg-surface">
                      <SelectValue placeholder="Feedback famiglia" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nessuna selezione</SelectItem>
                      {feedbackFamigliaOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </DetailFieldControl>
                <DetailFieldControl label="Feedback Lavoratore">
                  <Select
                    value={rapporto.prova_feedback_lavoratore ?? "none"}
                    onValueChange={(next) => void updateRapporto({ prova_feedback_lavoratore: next === "none" ? null : next })}
                  >
                    <SelectTrigger className="bg-surface">
                      <SelectValue placeholder="Feedback lavoratore" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nessuna selezione</SelectItem>
                      {feedbackLavoratoreOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </DetailFieldControl>
                <DetailFieldControl label="Ramificazione D2">
                  <Select
                    value={rapporto.prova_ramo_d2 ?? "none"}
                    onValueChange={(next) => void updateRapporto({ prova_ramo_d2: next === "none" ? null : next })}
                  >
                    <SelectTrigger className="bg-surface">
                      <SelectValue placeholder="Ramificazione D2" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nessuna selezione</SelectItem>
                      {ramoD2Options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </DetailFieldControl>
              </DetailSectionBlock>

              <DetailSectionBlock
                title="D2 - Feedback"
                icon={<RefreshCwIcon className="size-4" />}
                cardClassName="ring-1 ring-primary/15"
                contentClassName="space-y-4"
              >
                <DetailFieldControl label="Note CS Lavoratore">
                  <EditableTextarea
                    value={rapporto.prova_note_cs_lavoratore}
                    placeholder="Appunti CS sul lavoratore al D2"
                    onCommit={async (next) => {
                      await updateRapporto({ prova_note_cs_lavoratore: next })
                    }}
                  />
                </DetailFieldControl>
                <DetailFieldControl label="Note CS Famiglia">
                  <EditableTextarea
                    value={rapporto.prova_note_cs_famiglia}
                    placeholder="Appunti CS sulla famiglia al D2"
                    onCommit={async (next) => {
                      await updateRapporto({ prova_note_cs_famiglia: next })
                    }}
                  />
                </DetailFieldControl>
              </DetailSectionBlock>

              <DetailSectionBlock
                title="D7 - Check-in"
                icon={<FileTextIcon className="size-4" />}
                cardClassName="ring-1 ring-primary/15"
                contentClassName="space-y-4"
              >
                <p className="text-sm text-muted-foreground">
                  Il check-in deve essere impostato almeno dopo il secondo giorno di prova, a distanza di una settimana dal D2. In caso di rapporti part-time o full-time, impostarlo al quinto giorno di prova. Può essere spostato per esigenze operative della situazione.
                </p>
                <DetailFieldControl label="Data Check-in" className="max-w-sm">
                  <Input
                    type="date"
                    value={toIsoDateInput(rapporto.prova_data_checkin)}
                    onChange={(event) => {
                      void updateRapporto({ prova_data_checkin: event.target.value || null })
                    }}
                    className="bg-surface"
                  />
                </DetailFieldControl>
              </DetailSectionBlock>

              <DetailSectionBlock
                title="Registrazioni chiamate"
                icon={<PhoneCallIcon className="size-4" />}
                contentClassName="space-y-4"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <AttachmentUploadSlot
                    label="Chiamate lavoratore"
                    value={rapporto.registrazione_chiamate_lavoratori}
                    accept={AUDIO_ACCEPT}
                    emptyText="Nessuna registrazione caricata"
                    onAdd={(file) => void handleUploadRecording("registrazione_chiamate_lavoratori", file)}
                    onRemove={(link) => void handleRemoveRecording("registrazione_chiamate_lavoratori", link)}
                    onPreviewOpen={() => {}}
                    isUploading={uploadingSlot === "registrazione_chiamate_lavoratori"}
                  />
                  <AttachmentUploadSlot
                    label="Chiamate famiglie"
                    value={rapporto.registrazione_chiamate_famiglia}
                    accept={AUDIO_ACCEPT}
                    emptyText="Nessuna registrazione caricata"
                    onAdd={(file) => void handleUploadRecording("registrazione_chiamate_famiglia", file)}
                    onRemove={(link) => void handleRemoveRecording("registrazione_chiamate_famiglia", link)}
                    onPreviewOpen={() => {}}
                    isUploading={uploadingSlot === "registrazione_chiamate_famiglia"}
                  />
                </div>
                {recordingError ? <p className="text-sm text-red-600">{recordingError}</p> : null}
              </DetailSectionBlock>
            </div>
          </section>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function ProveKanban({
  columns,
  searchQuery,
  loading,
  onCardClick,
}: {
  columns: ProvaColumnData[]
  searchQuery: string
  loading: boolean
  onCardClick: (card: ProvaCardData) => void
}) {
  const filteredColumns = React.useMemo(
    () =>
      columns.map((column) => {
        const cards = column.cards.filter((card) =>
          matchesSearchQuery(
            [
              card.title,
              card.famigliaLabel,
              card.lavoratoreLabel,
              card.famiglia?.email,
              card.lavoratore?.email,
              card.rapporto.prova_stato_cs,
            ],
            searchQuery,
          ),
        )
        return { ...column, cards, totalCount: cards.length }
      }),
    [columns, searchQuery],
  )
  const totalCards = filteredColumns.reduce((sum, column) => sum + column.cards.length, 0)

  if (!loading && totalCards === 0) {
    return (
      <div className="flex min-h-80 items-center justify-center rounded-lg border border-dashed bg-muted/10 text-sm text-muted-foreground">
        Nessun rapporto in prova al momento
      </div>
    )
  }

  return (
    <div className="scrollbar-visible min-h-0 flex-1 overflow-x-auto overflow-y-hidden [scrollbar-gutter:stable]">
      <div className="flex h-full min-w-max gap-4 px-6">
        {loading
          ? Array.from({ length: 5 }).map((_, index) => (
              <KanbanColumnSkeleton
                key={index}
                widthClassName="w-80"
                cardCount={3}
              />
            ))
          : filteredColumns.map((column) => (
              <KanbanColumnShell
                key={column.id}
                columnId={column.id}
                title={column.label}
                countLabel={`${column.totalCount} ${column.totalCount === 1 ? "prova" : "prove"}`}
                visual={getColumnVisual(column.color)}
                widthClassName="w-80"
                emptyMessage="Nessuna prova"
              >
                {column.cards.map((card) => (
                  <ProvaCard
                    key={card.id}
                    card={card}
                    onClick={() => onCardClick(card)}
                  />
                ))}
              </KanbanColumnShell>
            ))}
      </div>
    </div>
  )
}

function CalendarEventButton({
  event,
  compact = false,
  onClick,
}: {
  event: ColloquioCalendarEvent
  compact?: boolean
  onClick: () => void
}) {
  const isColloquio = event.type === "colloquio"
  const avatarUrl = isColloquio ? event.workerAvatarUrl : event.card.workerAvatarUrl
  const workerLabel = isColloquio
    ? [event.lavoratore?.nome, event.lavoratore?.cognome].filter(Boolean).join(" ") || "Lavoratore"
    : event.card.lavoratoreLabel
  const familyLabel = isColloquio
    ? [event.famiglia?.nome, event.famiglia?.cognome].filter(Boolean).join(" ") || event.famiglia?.email || "Famiglia"
    : event.card.famigliaLabel
  const timeLabel = formatTime(event.start)
  const statusRailClassName = getCalendarStatusRailClassName(getCalendarEventStatusKey(event))

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative w-full overflow-hidden rounded-md border bg-white px-2 py-1.5 pl-3 text-left text-xs text-foreground transition hover:border-border hover:bg-white",
      )}
    >
      <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1", statusRailClassName)} />
      <div className="mb-1.5 flex min-w-0 items-center gap-1.5">
        {!compact ? (
          <Avatar size="xs" src={avatarUrl ?? undefined} fallback={workerLabel[0] ?? "L"} />
        ) : null}
        <Badge
          size="sm"
          variant="outline"
          className="border-border bg-muted/40 text-muted-foreground"
        >
          {isColloquio ? "Colloquio" : "Prova"}
        </Badge>
        {isColloquio && timeLabel ? (
          <>
            <span className="text-muted-foreground/60">•</span>
            <span className="shrink-0 text-2xs font-semibold tabular-nums text-muted-foreground">{timeLabel}</span>
          </>
        ) : null}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold leading-tight text-foreground">{familyLabel}</p>
        <p className="mt-0.5 truncate text-xs leading-tight text-muted-foreground">{workerLabel}</p>
      </div>
    </button>
  )
}

function CalendarView({
  events,
  searchQuery,
  onEventClick,
  onVisibleRangeChange,
}: {
  events: ColloquioCalendarEvent[]
  searchQuery: string
  onEventClick: (event: ColloquioCalendarEvent) => void
  onVisibleRangeChange: (range: CalendarDateRange) => void
}) {
  const [cursor, setCursor] = React.useState(() => new Date())
  const [selectedKinds, setSelectedKinds] = React.useState<Set<CalendarEventKind>>(
    () => new Set(CALENDAR_KIND_OPTIONS.map((option) => option.value)),
  )
  const [selectedStatuses, setSelectedStatuses] = React.useState<Set<CalendarStatusKey>>(
    () => new Set(CALENDAR_STATUS_OPTIONS.map((option) => option.value)),
  )
  const toggleKind = React.useCallback((value: CalendarEventKind) => {
    setSelectedKinds((current) => {
      const next = new Set(current)
      if (next.has(value)) {
        next.delete(value)
      } else {
        next.add(value)
      }
      return next
    })
  }, [])
  const toggleStatus = React.useCallback((value: CalendarStatusKey) => {
    setSelectedStatuses((current) => {
      const next = new Set(current)
      if (next.has(value)) {
        next.delete(value)
      } else {
        next.add(value)
      }
      return next
    })
  }, [])
  const filteredEvents = React.useMemo(
    () =>
      events.filter((event) => {
        if (!selectedKinds.has(event.type)) return false
        if (!selectedStatuses.has(getCalendarEventStatusKey(event))) return false
        return matchesSearchQuery(
          [
            event.title,
            event.status,
            event.type,
            event.type === "colloquio" ? event.famiglia?.email : event.card.famiglia?.email,
            event.type === "colloquio" ? event.lavoratore?.email : event.card.lavoratore?.email,
          ],
          searchQuery,
        )
      }),
    [events, searchQuery, selectedKinds, selectedStatuses],
  )

  const visibleDays = React.useMemo(() => {
    const start = startOfWeek(cursor)
    return Array.from({ length: 7 }, (_, index) => addDays(start, index))
  }, [cursor])

  const visibleEvents = React.useMemo(() => {
    const firstDay = visibleDays[0]
    const lastDay = visibleDays[visibleDays.length - 1]
    if (!firstDay || !lastDay) return []
    return filteredEvents.filter((event) => {
      const date = getEventDate(event)
      if (!date) return false
      return date >= firstDay && date <= addDays(lastDay, 1)
    })
  }, [filteredEvents, visibleDays])

  React.useEffect(() => {
    const firstDay = visibleDays[0]
    const lastDay = visibleDays[visibleDays.length - 1]
    if (!firstDay || !lastDay) return
    onVisibleRangeChange({
      start: toDateRangeValue(firstDay),
      end: toDateRangeValue(addDays(lastDay, 1)),
    })
  }, [onVisibleRangeChange, visibleDays])

  const weekStart = visibleDays[0] ?? cursor
  const weekEnd = visibleDays[6] ?? cursor
  const title = `${new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
  }).format(weekStart)} - ${new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(weekEnd)}`

  function move(direction: -1 | 1) {
    setCursor((current) => addDays(current, direction * 7))
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 pb-4">
      <div className="flex flex-wrap items-center gap-2 border-b py-3">
        <Button type="button" variant="outline" size="sm" onClick={() => setCursor(new Date())}>
          Oggi
        </Button>
        <Button type="button" variant="outline" size="icon-sm" onClick={() => move(-1)} aria-label="Periodo precedente">
          <ChevronLeftIcon className="size-4" />
        </Button>
        <Button type="button" variant="outline" size="icon-sm" onClick={() => move(1)} aria-label="Periodo successivo">
          <ChevronRightIcon className="size-4" />
        </Button>
        <div className="min-w-0 flex-1 text-sm font-semibold capitalize text-foreground">{title}</div>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Tipo</span>
          {CALENDAR_KIND_OPTIONS.map((option) => (
            <CheckboxChip
              key={option.value}
              checked={selectedKinds.has(option.value)}
              onCheckedChange={() => toggleKind(option.value)}
            >
              {option.label}
            </CheckboxChip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Stato</span>
          {CALENDAR_STATUS_OPTIONS.map((option) => (
            <CheckboxChip
              key={option.value}
              checked={selectedStatuses.has(option.value)}
              onCheckedChange={() => toggleStatus(option.value)}
            >
              {option.label}
            </CheckboxChip>
          ))}
        </div>
      </div>

      {!visibleEvents.length ? (
        <div className="flex min-h-80 flex-1 items-center justify-center rounded-lg border border-dashed bg-muted/10 text-sm text-muted-foreground">
          Nessun colloquio programmato questa settimana
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden border-l">
          <div className="grid h-full min-w-[1180px] grid-cols-7 items-stretch">
            {visibleDays.map((day) => {
              const dayEvents = filteredEvents
                .filter((event) => {
                  const date = getEventDate(event)
                  return date ? isSameDate(date, day) : false
                })
                .sort((left, right) => {
                  if (left.type !== right.type) return left.type === "colloquio" ? -1 : 1
                  const leftTime = getEventDate(left)?.getTime() ?? 0
                  const rightTime = getEventDate(right)?.getTime() ?? 0
                  return leftTime - rightTime
                })
              return (
              <div key={day.toISOString()} className="flex min-h-0 flex-col border-b border-r bg-surface p-2">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-2xs font-medium capitalize text-muted-foreground">
                    {new Intl.DateTimeFormat("it-IT", { weekday: "short" }).format(day)}
                  </span>
                  <span className={cn("text-xs font-semibold tabular-nums", isSameDate(day, new Date()) && "rounded-full bg-accent px-1.5 py-0.5 text-accent-foreground")}>
                    {day.getDate()}
                  </span>
                </div>
                <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
                  {dayEvents.map((event) => (
                    <CalendarEventButton
                      key={event.id}
                      event={event}
                      onClick={() => onEventClick(event)}
                    />
                  ))}
                </div>
              </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function ColloquioSheet({
  event,
  tipoIncontroOptions,
  open,
  onOpenChange,
  onOpenRicercaDetail,
  patchProcess,
}: {
  event: Extract<ColloquioCalendarEvent, { type: "colloquio" }> | null
  tipoIncontroOptions: LookupOption[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenRicercaDetail: (processId: string) => void
  patchProcess: (processId: string, patch: Partial<ProcessoMatchingRecord>) => Promise<ProcessoMatchingRecord>
}) {
  const processId = toStringValue(event?.process?.id)
  const workerLabel = [event?.lavoratore?.nome, event?.lavoratore?.cognome].filter(Boolean).join(" ") || "Lavoratore"
  const familyLabel = [event?.famiglia?.nome, event?.famiglia?.cognome].filter(Boolean).join(" ") || event?.famiglia?.email || "Famiglia"
  const address = [event?.process?.indirizzo_prova_via, event?.process?.indirizzo_prova_civico].filter(Boolean).join(" ") || "-"
  const tipoIncontroValue = event?.process?.tipo_incontro_famiglia_lavoratore ?? "none"
  const hasCurrentTipoIncontro =
    tipoIncontroValue === "none" || tipoIncontroOptions.some((option) => option.value === tipoIncontroValue)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[min(96vw,720px)]! max-w-none! p-0 sm:max-w-none">
        <SheetHeader className="border-b bg-surface px-5 py-5">
          <div className="flex min-w-0 items-start justify-between gap-4">
            <div className="min-w-0">
              <SheetTitle className="truncate text-xl font-semibold">
                {event ? `${workerLabel} in res. ${familyLabel}` : "Colloquio"}
              </SheetTitle>
              <SheetDescription className="mt-1">
                Dettaglio colloquio collegato al processo di ricerca.
              </SheetDescription>
            </div>
            <Button
              type="button"
              disabled={!processId}
              onClick={() => {
                if (!processId) return
                onOpenChange(false)
                onOpenRicercaDetail(processId)
              }}
            >
              Apri scheda completa
            </Button>
          </div>
        </SheetHeader>
        {event ? (
          <section className="h-full overflow-y-auto bg-surface-muted px-5 py-5">
            <div className="space-y-5">
              <DetailSectionBlock
                title="Colloquio"
                icon={<CalendarIcon className="size-4" />}
                contentClassName="grid gap-4 md:grid-cols-2"
              >
                <DetailField label="Famiglia" value={event.famiglia?.email ?? "-"} />
                <DetailField label="Stato processo" value={event.process?.stato_res ?? "-"} />
                <DetailField label="Lavoratore" value={workerLabel} />
                <DetailField label="Colloquio effettuato" value={toStringValue(event.selection.colloquio_effettuato) ?? "-"} />
                <DetailField label="Data e ora colloquio" value={formatDateTime(event.start)} />
                <DetailField label="Indirizzo prova" value={address} />
                <DetailField label="Comune" value={event.process?.indirizzo_prova_comune ?? "-"} />
              </DetailSectionBlock>

              <DetailSectionBlock
                title="Esito colloquio"
                icon={<ClipboardListIcon className="size-4" />}
                contentClassName="space-y-4"
              >
                <DetailFieldControl label="prova_colloquio_res" className="max-w-sm">
                  <Select
                    value={tipoIncontroValue}
                    disabled={!processId}
                    onValueChange={(next) => {
                      if (!processId) return
                      void patchProcess(processId, {
                        tipo_incontro_famiglia_lavoratore: next === "none" ? null : next,
                      }).catch((caughtError) => {
                        toast.error(caughtError instanceof Error ? caughtError.message : "Errore aggiornando colloquio")
                      })
                    }}
                  >
                    <SelectTrigger className="bg-surface">
                      <SelectValue placeholder="Seleziona..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Non segnato</SelectItem>
                      {!hasCurrentTipoIncontro ? (
                        <SelectItem value={tipoIncontroValue}>{tipoIncontroValue}</SelectItem>
                      ) : null}
                      {tipoIncontroOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </DetailFieldControl>
              </DetailSectionBlock>
            </div>
          </section>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

export function ProveColloquiView({ onOpenRicercaDetail }: ProveColloquiViewProps) {
  const [calendarRange, setCalendarRange] = React.useState<CalendarDateRange>(() => getWeekVisibleRange(new Date()))
  const {
    loading,
    error,
    reload,
    provaColumns,
    provaCards,
    calendarEvents,
    lookupOptionsByDomain,
    lookupColorsByDomain,
    patchRapporto,
    patchProcess,
  } = useProveColloquiData(calendarRange)
  const [activeTab, setActiveTab] = React.useState<ViewTab>("prove")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedCardId, setSelectedCardId] = React.useState<string | null>(null)
  const [selectedColloquio, setSelectedColloquio] =
    React.useState<Extract<ColloquioCalendarEvent, { type: "colloquio" }> | null>(null)

  const selectedCard = React.useMemo(
    () => provaCards.find((card) => card.id === selectedCardId) ?? null,
    [provaCards, selectedCardId],
  )
  const statusOptions = lookupOptionsByDomain.get("rapporti_lavorativi.prova_stato_cs") ?? []
  const feedbackFamigliaOptions = lookupOptionsByDomain.get("rapporti_lavorativi.prova_feedback_famiglia") ?? []
  const feedbackLavoratoreOptions = lookupOptionsByDomain.get("rapporti_lavorativi.prova_feedback_lavoratore") ?? []
  const ramoD2Options = lookupOptionsByDomain.get("rapporti_lavorativi.prova_ramo_d2") ?? []
  const tipoIncontroOptions = lookupOptionsByDomain.get("processi_matching.tipo_incontro_famiglia_lavoratore") ?? []
  const totalProve = provaColumns.reduce((sum, column) => sum + column.totalCount, 0)
  const handleVisibleRangeChange = React.useCallback((nextRange: CalendarDateRange) => {
    setCalendarRange((currentRange) =>
      currentRange.start === nextRange.start && currentRange.end === nextRange.end
        ? currentRange
        : nextRange,
    )
  }, [])

  return (
    <section className="ui flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden">
      <SectionHeader>
        <SectionHeader.Title
          badge={<Badge>{activeTab === "prove" ? `${totalProve} prove` : `${calendarEvents.length} eventi`}</Badge>}
        >
          Prove e Colloqui
        </SectionHeader.Title>
        <SectionHeader.Actions>
          <Tabs value={activeTab} onValueChange={(next) => setActiveTab(next as ViewTab)}>
            <TabsList variant="segmented">
              <TabsTrigger value="prove">Prove</TabsTrigger>
              <TabsTrigger value="colloqui">Colloqui</TabsTrigger>
            </TabsList>
          </Tabs>
        </SectionHeader.Actions>
        <SectionHeader.Toolbar>
          <div className="min-w-0 flex-1 max-w-120">
            <SearchInput
              placeholder="Cerca famiglia, lavoratore, email..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onClear={() => setSearchQuery("")}
            />
          </div>
          {error ? (
            <Button type="button" variant="outline" size="sm" onClick={reload}>
              Riprova
            </Button>
          ) : null}
        </SectionHeader.Toolbar>
      </SectionHeader>

      {error ? (
        <div className="mx-6 mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Errore caricamento: {error}
        </div>
      ) : null}

      {activeTab === "prove" ? (
        <ProveKanban
          columns={provaColumns}
          searchQuery={searchQuery}
          loading={loading}
          onCardClick={(card) => {
            setSelectedCardId(card.id)
          }}
        />
      ) : (
        <CalendarView
          events={calendarEvents}
          searchQuery={searchQuery}
          onVisibleRangeChange={handleVisibleRangeChange}
          onEventClick={(event) => {
            if (event.type === "prova") {
              setSelectedCardId(event.card.id)
              return
            }
            setSelectedColloquio(event)
          }}
        />
      )}

      <ProvaDetailSheet
        card={selectedCard}
        statusOptions={statusOptions}
        feedbackFamigliaOptions={feedbackFamigliaOptions}
        feedbackLavoratoreOptions={feedbackLavoratoreOptions}
        ramoD2Options={ramoD2Options}
        lookupColorsByDomain={lookupColorsByDomain}
        open={Boolean(selectedCard)}
        onOpenChange={(open) => {
          if (!open) setSelectedCardId(null)
        }}
        patchRapporto={patchRapporto}
      />

      <ColloquioSheet
        event={selectedColloquio}
        tipoIncontroOptions={tipoIncontroOptions}
        open={Boolean(selectedColloquio)}
        onOpenChange={(open) => {
          if (!open) setSelectedColloquio(null)
        }}
        onOpenRicercaDetail={onOpenRicercaDetail}
        patchProcess={patchProcess}
      />
    </section>
  )
}
