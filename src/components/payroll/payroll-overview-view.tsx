import * as React from "react"
import {
  BadgeCheckIcon,
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleCheckBigIcon,
  ClipboardListIcon,
  CopyIcon,
  CreditCardIcon,
  ExternalLinkIcon,
  EyeIcon,
  FileTextIcon,
  LoaderCircleIcon,
  MessageSquareTextIcon,
  PencilIcon,
  StarIcon,
} from "lucide-react"

import { usePayrollBoard, TERMINAL_STAGE_IDS, type PayrollBoardCardData, type PayrollBoardColumnData } from "@/hooks/use-payroll-board"
import { ContributiInpsView } from "@/components/payroll/contributi-inps-view"
import {
  CEDOLINI_FILTER_GROUPS,
  cardMatchesCedoliniFilters,
  createDefaultCedoliniFilters,
  isCardPaid,
  normalizeCaseFlag,
  toggleCedoliniFilter,
  type CedoliniFilters,
  type CedoliniFilterGroupKey,
} from "@/components/payroll/cedolini-filters"
import { AttachmentUploadSlot } from "@/components/shared-next/attachment-upload-slot"
import { flattenAttachmentLinks, type AttachmentLink } from "@/components/shared-next/attachment-utils"
import { DetailSectionBlock } from "@/components/shared-next/detail-section-card"
import {
  KanbanColumnShell,
  KanbanColumnSkeleton,
  type KanbanColumnVisual,
} from "@/components/shared-next/kanban"
import { LinkedRapportoSummaryCard } from "@/components/shared-next/linked-rapporto-summary-card"
import { SectionHeader } from "@/components/shared-next/section-header"
import { StatisticsMetricCard } from "@/components/shared-next/statistics-metric-card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { TipoContrattoBadge } from "@/components/shared-next/tipo-contratto-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CheckboxChip } from "@/components/ui/checkbox"
import { Form } from "@/components/ui/form"
import {
  FieldInput,
  FieldTextarea,
  FieldSelect,
  type FieldSelectOption,
} from "@/components/forms/field-components"
import { useAutoSaveForm } from "@/hooks/use-auto-save-form"
import { Input } from "@/components/ui/input"
import { SearchInput } from "@/components/ui/search-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import {
  fetchCedolinoDetail,
  runAutomationWebhook,
  updateRecord,
} from "@/lib/anagrafiche-api"
import { buildAttachmentPayload, normalizeAttachmentArray } from "@/lib/attachments"
import { buildFamilyPresenzeUrl } from "@/lib/private-area-url"
import { matchesSearchQuery } from "@/lib/search-utils"
import { supabase } from "@/lib/supabase-client"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type PayrollMetric = {
  title: string
  value: string
  className?: string
}

const MAKE_TRANSACTION_WEBHOOK_URL = "https://hook.eu1.make.com/wp7qdoft5vc11zbgh91trjm7d17zj4jm"

function getGoogleDriveFileId(url: string) {
  const filePathMatch = url.match(/\/file\/d\/([^/?#]+)/)
  if (filePathMatch?.[1]) return filePathMatch[1]

  try {
    const parsedUrl = new URL(url)
    return parsedUrl.searchParams.get("id")
  } catch {
    return null
  }
}

function toInlineDocumentUrl(url: string) {
  const driveFileId = getGoogleDriveFileId(url)
  if (driveFileId && url.includes("drive.google.com")) {
    return `https://drive.google.com/file/d/${driveFileId}/preview`
  }

  return url
}

function buildPayrollMetrics(columns: PayrollBoardColumnData[]): PayrollMetric[] {
  const cards = columns.flatMap((column) => column.cards)
  const rapportiAttivi = new Set(
    cards
      .map((card) => card.rapporto?.id)
      .filter((value): value is string => Boolean(value))
  ).size
  const cedoliniTotali = cards.length
  const presenzeDaRaccogliere = cards.filter((card) => !card.record.presenze_id).length
  const presenzeRicevute = cards.filter((card) => Boolean(card.record.presenze_id)).length
  const inviati = cards.filter((card) => card.stage === "Inviato cedolino").length
  const pagati = cards.filter((card) => card.stage === "Pagato").length
  const daPagare = cards.filter((card) =>
    ["Cedolino da controllare", "Cedolino Pronto", "Inviato cedolino", "Richiesta chiarimenti"].includes(card.stage)
  ).length

  return [
    {
      title: "Rapporti attivi",
      value: String(rapportiAttivi),
    },
    {
      title: "Cedolini totali",
      value: String(cedoliniTotali),
    },
    {
      title: "Presenze da raccogliere",
      value: String(presenzeDaRaccogliere),
    },
    {
      title: "Presenze ricevute",
      value: String(presenzeRicevute),
    },
    {
      title: "Inviati",
      value: String(inviati),
    },
    {
      title: "Pagati",
      value: String(pagati),
    },
    {
      title: "Da pagare",
      value: String(daPagare),
    },
  ]
}

function getCurrentMonthValue() {
  const now = new Date()
  const month = `${now.getUTCMonth() + 1}`.padStart(2, "0")
  return `${now.getUTCFullYear()}-${month}`
}

function shiftMonth(value: string, delta: number) {
  const [yearPart, monthPart] = value.split("-")
  const year = Number.parseInt(yearPart ?? "", 10)
  const month = Number.parseInt(monthPart ?? "", 10)

  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return getCurrentMonthValue()
  }

  const nextDate = new Date(Date.UTC(year, month - 1 + delta, 1))
  const nextMonth = `${nextDate.getUTCMonth() + 1}`.padStart(2, "0")
  return `${nextDate.getUTCFullYear()}-${nextMonth}`
}

function formatMonthLabel(value: string) {
  const [yearPart, monthPart] = value.split("-")
  const year = Number.parseInt(yearPart ?? "", 10)
  const month = Number.parseInt(monthPart ?? "", 10)

  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return value
  }

  return new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, 1)))
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Non disponibile"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed)
}

function formatDateOnly(value: string | null | undefined) {
  if (!value) return "Non disponibile"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed)
}

function toInputDateValue(value: string | null | undefined) {
  if (!value) return ""
  return value.slice(0, 10)
}

function formatCurrencyAmount(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "Non disponibile"
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function getCedolinoTypeLabel(value: string | null | undefined) {
  const normalized = normalizeCaseFlag(value)
  if (normalized === "chiusura") return "Chiusura rapporto"
  if (normalized === "si") return "Caso particolare"
  return "Regolare"
}

function getCedolinoTypeClassName(value: string | null | undefined) {
  const normalized = normalizeCaseFlag(value)
  if (normalized === "chiusura") return "bg-rose-100 text-rose-700 hover:bg-rose-100"
  if (normalized === "si") return "bg-amber-100 text-amber-700 hover:bg-amber-100"
  return "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
}

function normalizeAttachmentValue(value: unknown) {
  if (typeof value !== "string") return value
  const trimmed = value.trim()
  if (!trimmed) return null
  if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
    try {
      return JSON.parse(trimmed) as unknown
    } catch {
      return value
    }
  }
  return value
}

function sanitizeFileName(name: string) {
  return name
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "cedolino"
}

type PresenceDayRow = {
  day: number
  type: string
  hours: string
  event: string
  sicknessCode: string
  note: string
}

type PresenceSelectOption = {
  value: string
  label: string
}

const EMPTY_PRESENCE_SELECT_VALUE = "__empty__"
const PRESENCE_SELECT_TRIGGER_CLASS =
  "h-8 justify-between text-left [&>span]:min-w-0 [&>span]:flex-1 [&>span]:truncate [&>span]:text-left"

// Campi giornalieri della tabella presenze instradati su onPatchPresence.
const PRESENCE_DAY_FIELD_REGEX =
  /^(ore_day_|evento_day_|codice_malattia_day_|note_day_)\d+$/

const CASO_PARTICOLARE_OPTIONS: FieldSelectOption[] = [
  { value: "no", label: "Regolare" },
  { value: "si", label: "Caso particolare" },
  { value: "chiusura", label: "Chiusura rapporto" },
]

const PRESENCE_DAY_TYPE_OPTIONS: PresenceSelectOption[] = [
  { value: "festivo", label: "Festivo" },
  { value: "lavorativo", label: "Lavorativo" },
  { value: "non-lavorativo", label: "Non lavorativo" },
]

const PRESENCE_EVENT_OPTIONS: PresenceSelectOption[] = [
  { value: "unpaidLeave", label: "Permesso non retribuito" },
  { value: "paidLeave", label: "Permesso retribuito" },
  { value: "medicalVisit", label: "Visita medica" },
  { value: "training", label: "Formazione" },
  { value: "bereavement", label: "Lutto" },
  { value: "marriage", label: "Matrimonio" },
  { value: "maternityPaternity", label: "Maternita/Paternita" },
  { value: "overtime", label: "Straordinario" },
  { value: "vacation", label: "Ferie" },
  { value: "sickness", label: "Malattia" },
]

function withCurrentPresenceOption(options: PresenceSelectOption[], currentValue: string) {
  if (!currentValue || options.some((option) => option.value === currentValue)) {
    return options
  }

  return [
    ...options,
    {
      value: currentValue,
      label: currentValue,
    },
  ]
}

const WEEKDAY_LETTERS_IT = ["D", "L", "M", "M", "G", "V", "S"] as const

function getWeekdayLetter(yearMonth: string | null | undefined, day: number): string {
  if (!yearMonth) return ""
  const year = Number(yearMonth.slice(0, 4))
  const month = Number(yearMonth.slice(5, 7))
  if (!Number.isFinite(year) || !Number.isFinite(month)) return ""
  const date = new Date(Date.UTC(year, month - 1, day))
  if (Number.isNaN(date.getTime())) return ""
  return WEEKDAY_LETTERS_IT[date.getUTCDay()]
}

function getPresenceRegolariHours(
  record: PayrollBoardCardData["presenzeRegolari"],
  day: number,
): string {
  if (!record) return ""
  const raw = record[`ore_day_${day}`]
  if (raw === null || raw === undefined) return ""
  return String(raw).trim()
}

function getDayTypeLabel(type: string): string {
  if (!type) return ""
  return PRESENCE_DAY_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type
}

function getDaysInMonth(meseDataFine: string | null | undefined): number {
  // data_fine looks like "2026-05-31" → 31, "2026-02-28" → 28. Falls back to
  // 31 so we never under-show days when the field is missing or malformed.
  if (!meseDataFine) return 31
  const parsed = new Date(meseDataFine)
  if (Number.isNaN(parsed.getTime())) return 31
  return parsed.getUTCDate()
}

function buildPresenceDayRows(
  record: PayrollBoardCardData["presenze"],
  daysInMonth: number = 31,
): PresenceDayRow[] {
  if (!record) return []

  // Show every day of the month, even when all its fields are empty —
  // otherwise the row "disappears" the moment the user clears tipo/ore/etc.
  // and they have no way to enter the day back without page refresh.
  return Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1
    const type = String(record[`tipo_day_${day}`] ?? "").trim()
    const hours = String(record[`ore_day_${day}`] ?? "").trim()
    const event = String(record[`evento_day_${day}`] ?? "").trim()
    const sicknessCode = String(record[`codice_malattia_day_${day}`] ?? "").trim()
    const note = String(record[`note_day_${day}`] ?? "").trim()

    return {
      day,
      type,
      hours,
      event,
      sicknessCode,
      note,
    }
  })
}

function sumPresenceHours(
  record: PayrollBoardCardData["presenzeRegolari"],
  range?: { startDay: number; endDay: number } | null,
): number | null {
  if (!record) return null

  const startDay = range?.startDay ?? 1
  const endDay = range?.endDay ?? 31
  if (endDay < startDay) return 0

  let total = 0
  for (let day = startDay; day <= endDay; day += 1) {
    const value = Number(record[`ore_day_${day}`])
    if (Number.isFinite(value)) total += value
  }
  return total
}

function getPayrollDayRange(
  mese: { data_inizio: string | null; data_fine: string | null } | null | undefined,
  rapporto: { data_inizio_rapporto?: string | null; data_fine_rapporto?: string | null } | null | undefined,
): { startDay: number; endDay: number } | null {
  const meseInizio = mese?.data_inizio
  const meseFine = mese?.data_fine
  if (!meseInizio || !meseFine) return null

  const monthKey = meseInizio.slice(0, 7)
  let startDay = Number(meseInizio.slice(8, 10))
  let endDay = Number(meseFine.slice(8, 10))
  if (!Number.isFinite(startDay) || !Number.isFinite(endDay)) return null

  const dataInizioRapporto = rapporto?.data_inizio_rapporto
  if (dataInizioRapporto && dataInizioRapporto.slice(0, 7) === monthKey) {
    const day = Number(dataInizioRapporto.slice(8, 10))
    if (Number.isFinite(day) && day > startDay) startDay = day
  }

  const dataFineRapporto = rapporto?.data_fine_rapporto
  if (dataFineRapporto && dataFineRapporto.slice(0, 7) === monthKey) {
    const day = Number(dataFineRapporto.slice(8, 10))
    if (Number.isFinite(day) && day < endDay) endDay = day
  }

  return { startDay, endDay }
}

function formatHoursValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "Non disponibile"
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return String(value)
  return Number.isInteger(numericValue) ? String(numericValue) : String(numericValue)
}

function PresenceBadge({ isRegular }: { isRegular: boolean }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "rounded-full px-3",
        isRegular
          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
          : "bg-red-100 text-red-700 hover:bg-red-100"
      )}
    >
      {isRegular ? "Presenze regolari" : "Presenze irregolari"}
    </Badge>
  )
}

function EditableStars({
  value,
  onChange,
  readOnly = false,
}: {
  value: number | null | undefined
  onChange?: (value: number) => void
  readOnly?: boolean
}) {
  const rating = typeof value === "number" ? Math.max(0, Math.min(5, Math.round(value))) : 0

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, index) => {
        const nextValue = index + 1
        return (
          <button
            key={nextValue}
            type="button"
            className={readOnly ? "cursor-default" : "cursor-pointer"}
            disabled={readOnly}
            onClick={() => onChange?.(nextValue)}
            aria-label={`Imposta rating ${nextValue}`}
          >
            <StarIcon
              className={cn(
                "size-4",
                index < rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
              )}
            />
          </button>
        )
      })}
    </div>
  )
}

function getColumnVisual(color: string): KanbanColumnVisual {
  switch (color.toLowerCase()) {
    case "sky":
      return { columnClassName: "bg-sky-400", headerClassName: "", iconClassName: "text-sky-500" }
    case "cyan":
      return { columnClassName: "bg-cyan-400", headerClassName: "", iconClassName: "text-cyan-500" }
    case "blue":
      return { columnClassName: "bg-blue-400", headerClassName: "", iconClassName: "text-blue-500" }
    case "orange":
      return { columnClassName: "bg-orange-400", headerClassName: "", iconClassName: "text-orange-500" }
    case "amber":
    case "yellow":
      return { columnClassName: "bg-amber-400", headerClassName: "", iconClassName: "text-amber-500" }
    case "lime":
      return { columnClassName: "bg-lime-400", headerClassName: "", iconClassName: "text-lime-500" }
    case "green":
      return { columnClassName: "bg-green-400", headerClassName: "", iconClassName: "text-green-500" }
    case "emerald":
      return { columnClassName: "bg-emerald-400", headerClassName: "", iconClassName: "text-emerald-500" }
    case "teal":
      return { columnClassName: "bg-teal-400", headerClassName: "", iconClassName: "text-teal-500" }
    default:
      return { columnClassName: "", headerClassName: "", iconClassName: "text-muted-foreground/80" }
  }
}

function PayrollBoardCard({ card }: { card: PayrollBoardCardData }) {
  const [famiglia, lavoratore] = card.nomeCompleto.split(" – ")
  const isPaid = isCardPaid(card)
  const ratingValue =
    typeof card.record.rating_feedback_famiglia === "number" && card.record.rating_feedback_famiglia > 0
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
          <TipoContrattoBadge
            isAbbonamento={card.richiestaAttivazione == null}
            className="px-2.5 py-0.5"
          />
          {normalizeCaseFlag(card.record.caso_particolare) !== "no" ? (
            <Badge
              variant="secondary"
              className={cn(
                "gap-1 rounded-full px-2.5 py-0.5 text-2xs",
                getCedolinoTypeClassName(card.record.caso_particolare)
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
                : "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
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
                      : "text-muted-foreground/30"
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

// Campo "Importo sconto": controllato e con clamp sul commit (blur/Enter).
// Non usa DebouncedInput perché, dopo il primo input, quel hook tiene il
// draft "sticky" e non rifletterebbe il valore limitato al cap. Qui invece
// se si digita un valore oltre il massimo viene riportato al massimo, sia
// nel valore salvato sia in quello mostrato.
function ImportoScontoField({
  value,
  max,
  onCommit,
}: {
  value: number | null
  max: number
  onCommit: (value: number | null) => Promise<void>
}) {
  const [draft, setDraft] = React.useState(value === null ? "" : String(value))
  const isEditingRef = React.useRef(false)

  // Riallinea dal server solo quando il campo non è in editing
  // (mount iniziale + refresh remoto di un campo non toccato).
  React.useEffect(() => {
    if (isEditingRef.current) return
    setDraft(value === null ? "" : String(value))
  }, [value])

  const commit = React.useCallback(
    async (raw: string) => {
      isEditingRef.current = false
      const trimmed = raw.trim()

      if (trimmed === "") {
        setDraft("")
        if (value !== null) await onCommit(null)
        return
      }

      const parsed = Number(trimmed)
      if (!Number.isFinite(parsed) || parsed < 0) {
        // Valore non valido: ripristina l'ultimo salvato.
        setDraft(value === null ? "" : String(value))
        return
      }

      let next = parsed
      if (next > max) {
        next = max
        toast.info(`Importo sconto limitato al massimo di ${formatCurrencyAmount(max)}`)
      }

      setDraft(String(next))
      if (next !== value) await onCommit(next)
    },
    [max, value, onCommit],
  )

  return (
    <Input
      type="number"
      step="0.01"
      min="0"
      value={draft}
      onChange={(event) => {
        isEditingRef.current = true
        setDraft(event.target.value)
      }}
      onBlur={(event) => void commit(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur()
      }}
    />
  )
}

export function CedolinoDetailSheet({
  card,
  columns,
  open,
  onOpenChange,
  onStageChange,
  onPatchCard,
  onPatchPresence,
}: {
  card: PayrollBoardCardData | null
  columns: PayrollBoardColumnData[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onStageChange: (recordId: string, targetStageId: string) => void
  onPatchCard: (recordId: string, patch: Partial<PayrollBoardCardData["record"]>) => void
  onPatchPresence: (recordId: string, patch: Partial<NonNullable<PayrollBoardCardData["presenze"]>>) => void
}) {
  const famiglia = card?.famiglia
  const pagamento = card?.pagamento
  const transazione = card?.transazione
  const presenceRows = React.useMemo(
    () => buildPresenceDayRows(card?.presenze ?? null, getDaysInMonth(card?.mese?.data_fine)),
    [card?.presenze, card?.mese?.data_fine],
  )
  const rapporto = card?.rapporto
  const lastWorkingDay = React.useMemo<number | null>(() => {
    const dataFine = rapporto?.data_fine_rapporto
    const meseInizio = card?.mese?.data_inizio
    if (!dataFine || !meseInizio) return null
    if (dataFine.slice(0, 7) !== meseInizio.slice(0, 7)) return null
    const day = Number(dataFine.slice(8, 10))
    return Number.isFinite(day) ? day : null
  }, [rapporto?.data_fine_rapporto, card?.mese?.data_inizio])
  const isRegularPresence = React.useMemo(() => {
    const presenze = card?.presenze
    if (!presenze) return !(card?.presenzeIrregolari ?? false)
    for (let day = 1; day <= 31; day += 1) {
      const value = presenze[`evento_day_${day}`]
      if (value !== null && value !== undefined && String(value).trim() !== "") {
        return false
      }
    }
    return true
  }, [card?.presenze, card?.presenzeIrregolari])
  const paymentStatus = pagamento?.status ?? "Pagamento non ancora registrato"
  const paymentAmount = pagamento?.amount ?? card?.record.importo_busta_estratto ?? null
  const feeConcordata = card?.richiestaAttivazione?.fee_concordata ?? null
  const makeTransactionUrl = transazione?.id
    ? `${MAKE_TRANSACTION_WEBHOOK_URL}?recordId=${encodeURIComponent(transazione.id)}`
    : null
  const payrollDayRange = React.useMemo(
    () => getPayrollDayRange(card?.mese ?? null, rapporto ?? null),
    [card?.mese, rapporto]
  )
  const contractHours = React.useMemo(
    () => sumPresenceHours(card?.presenzeRegolari ?? null, payrollDayRange),
    [card?.presenzeRegolari, payrollDayRange]
  )
  const workedHours = React.useMemo(
    () => sumPresenceHours(card?.presenze ?? null, payrollDayRange),
    [card?.presenze, payrollDayRange]
  )
  const hoursToPay = React.useMemo(() => {
    if (contractHours === null && workedHours === null) return null
    return Math.max(contractHours ?? 0, workedHours ?? 0)
  }, [contractHours, workedHours])
  const applicationFee = React.useMemo(() => {
    if (feeConcordata === null || hoursToPay === null) return null
    return feeConcordata * hoursToPay
  }, [feeConcordata, hoursToPay])
  // L'importo sconto non può superare il totale a carico della famiglia
  // (importo cedolino + application fee) meno un margine di 2€.
  const importoScontoMax = React.useMemo(
    () => (paymentAmount ?? 0) + (applicationFee ?? 0) - 2,
    [paymentAmount, applicationFee],
  )
  const [runningAutomationId, setRunningAutomationId] = React.useState<string | null>(null)
  const [uploadingCedolino, setUploadingCedolino] = React.useState(false)
  const [uploadError, setUploadError] = React.useState<string | null>(null)
  const [showCedolinoPreview, setShowCedolinoPreview] = React.useState(false)
  const cedolinoPreviewUrl = React.useMemo(() => {
    const attachmentUrl = flattenAttachmentLinks(card?.record.cedolino, "Cedolino")[0]?.url
    const sourceUrl = attachmentUrl ?? card?.record.cedolino_url?.trim()
    return sourceUrl ? toInlineDocumentUrl(sourceUrl) : null
  }, [card?.record.cedolino, card?.record.cedolino_url])

  // FASE 5 BIS — form + autosave. Sostituisce i DebouncedInput/DebouncedTextarea
  // e i Select cablati a mano (caso_particolare + eventi presenza). Le chiavi del
  // form sono i NOMI COLONNA DB; onSave instrada per chiave su due target:
  //  - i campi del cedolino → onPatchCard(card.id, …) (stesse trasformazioni:
  //    importo_busta_estratto → Number|null, data/url/note/caso → string|null,
  //    label↔key del caso particolare);
  //  - i campi giornalieri di presenza (ore_day_N, evento_day_N,
  //    codice_malattia_day_N, note_day_N) → onPatchPresence(card.presenze.id, …)
  //    (string|null, sentinel evento "nessuno" → null).
  const presenzeRecord = card?.presenze
  const presenceFieldDefaults = React.useMemo(() => {
    const out: Record<string, string> = {}
    for (const row of presenceRows) {
      out[`ore_day_${row.day}`] = row.hours
      out[`evento_day_${row.day}`] = row.event || EMPTY_PRESENCE_SELECT_VALUE
      out[`codice_malattia_day_${row.day}`] = row.sicknessCode
      out[`note_day_${row.day}`] = row.note
    }
    return out
  }, [presenceRows])

  const form = useAutoSaveForm<Record<string, string>>({
    defaults: {
      data_invio_famiglia: toInputDateValue(card?.record.data_invio_famiglia),
      caso_particolare: normalizeCaseFlag(card?.record.caso_particolare),
      cedolino_url: card?.record.cedolino_url ?? "",
      importo_busta_estratto: String(card?.record.importo_busta_estratto ?? ""),
      note: card?.record.note ?? "",
      ...presenceFieldDefaults,
    },
    onSave: async (patch) => {
      if (!card) return
      const cardPatch: Record<string, unknown> = {}
      const presencePatch: Record<string, unknown> = {}

      for (const [key, raw] of Object.entries(patch)) {
        const value = raw as string
        if (PRESENCE_DAY_FIELD_REGEX.test(key)) {
          presencePatch[key] =
            key.startsWith("evento_day_")
              ? value === EMPTY_PRESENCE_SELECT_VALUE
                ? null
                : value
              : value || null
          continue
        }

        switch (key) {
          case "data_invio_famiglia":
          case "cedolino_url":
          case "note":
            cardPatch[key] = value || null
            break
          case "importo_busta_estratto":
            cardPatch[key] = value ? Number(value) : null
            break
          case "caso_particolare":
            cardPatch[key] =
              value === "chiusura"
                ? "Chiusura rapporto"
                : value === "si"
                  ? "Caso particolare"
                  : null
            break
          default:
            cardPatch[key] = value || null
        }
      }

      if (Object.keys(cardPatch).length > 0) {
        await onPatchCard(card.id, cardPatch as Partial<PayrollBoardCardData["record"]>)
      }
      if (Object.keys(presencePatch).length > 0 && presenzeRecord) {
        await onPatchPresence(
          presenzeRecord.id,
          presencePatch as Partial<NonNullable<PayrollBoardCardData["presenze"]>>,
        )
      }
    },
  })

  React.useEffect(() => {
    setShowCedolinoPreview(false)
  }, [card?.id])

  const handleRunPagamentoAutomation = React.useCallback(
    async (
      automationId: "finance-request-invoice-data" | "finance-invoice-payment"
    ) => {
      if (!pagamento?.id) {
        toast.error("Il pagamento non ha un id associato")
        return
      }

      setRunningAutomationId(automationId)
      try {
        await runAutomationWebhook(automationId, pagamento.id, {
          famiglia_id: pagamento.famiglia_id,
          ticket_id: pagamento.ticket_id,
        })
        toast.success(
          automationId === "finance-request-invoice-data"
            ? "Richiesta dati fatturazione inviata"
            : "Workflow fatturazione avviato"
        )
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Errore avvio automazione")
      } finally {
        setRunningAutomationId(null)
      }
    },
    [pagamento]
  )

  const handleCopyMakeTransactionUrl = React.useCallback(async () => {
    if (!makeTransactionUrl) {
      toast.error("Nessuna transazione collegata al cedolino")
      return
    }

    try {
      await navigator.clipboard.writeText(makeTransactionUrl)
      toast.success("Link Make copiato")
    } catch {
      toast.error("Impossibile copiare il link Make")
    }
  }, [makeTransactionUrl])

  const handleUploadCedolino = React.useCallback(
    async (file: File) => {
      if (!card) return

      setUploadingCedolino(true)
      setUploadError(null)

      try {
        const safeName = sanitizeFileName(file.name || "cedolino")
        const storagePath = [
          "mesi_lavorati",
          card.id,
          "cedolino",
          `${Date.now()}-${safeName}`,
        ].join("/")

        const uploadResult = await supabase.storage.from("baze-bucket").upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || undefined,
        })

        if (uploadResult.error) {
          throw uploadResult.error
        }

        const payload = buildAttachmentPayload(file, storagePath)
        const nextCedolino = [...normalizeAttachmentArray(card.record.cedolino), payload]
        const response = await updateRecord("mesi_lavorati", card.id, {
          cedolino: nextCedolino,
        })

        onPatchCard(card.id, {
          cedolino: response.row.cedolino as PayrollBoardCardData["record"]["cedolino"],
        })
      } catch (caughtError) {
        setUploadError(
          caughtError instanceof Error ? caughtError.message : "Errore caricando cedolino"
        )
      } finally {
        setUploadingCedolino(false)
      }
    },
    [card, onPatchCard]
  )

  const handleRemoveCedolino = React.useCallback(
    async (link: AttachmentLink) => {
      if (!card) return

      setUploadingCedolino(true)
      setUploadError(null)

      try {
        const nextValue = normalizeAttachmentArray(card.record.cedolino).filter(
          (a) => !(link.path && a.path === link.path) && a.name !== link.label,
        )

        if (link.path?.startsWith("baze-bucket/")) {
          await supabase.storage
            .from("baze-bucket")
            .remove([link.path.replace(/^baze-bucket\//, "")])
        }

        const response = await updateRecord("mesi_lavorati", card.id, {
          cedolino: nextValue.length > 0 ? nextValue : null,
        })

        onPatchCard(card.id, {
          cedolino: response.row.cedolino as PayrollBoardCardData["record"]["cedolino"],
        })
      } catch (caughtError) {
        setUploadError(
          caughtError instanceof Error ? caughtError.message : "Errore rimuovendo cedolino",
        )
      } finally {
        setUploadingCedolino(false)
      }
    },
    [card, onPatchCard],
  )

  function openAttachmentPreview(link: AttachmentLink) {
    window.open(link.url, "_blank", "noopener,noreferrer")
  }

  return (
    <Form {...form}>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[min(96vw,980px)]! max-w-none! p-0 sm:max-w-none">
        <SheetHeader className="border-b bg-surface px-5 py-5">
          <div className="space-y-3">
            <SheetTitle className="truncate text-xl font-semibold">
              {card?.nomeCompleto ?? "Dettaglio cedolino"}
            </SheetTitle>
            <SheetDescription className="sr-only">
              Dettaglio del cedolino con rapporto, stato mese lavorativo, pagamento, presenze e feedback.
            </SheetDescription>
            {card?.mese?.mese_lavorativo_copy || card?.mese?.data_inizio ? (
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <CalendarDaysIcon className="size-4" />
                <span>{card.mese?.mese_lavorativo_copy ?? formatMonthLabel(card.mese?.data_inizio?.slice(0, 7) ?? "")}</span>
              </div>
            ) : null}
            {card ? (
              <Select
                value={card.stage}
                onValueChange={(nextValue) => {
                  // Stages in TERMINAL_STAGE_IDS can't be set manually
                  // (currently none — DONE è spostabile a mano).
                  if (TERMINAL_STAGE_IDS.has(nextValue)) return
                  onStageChange(card.id, nextValue)
                }}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((column) => (
                    <SelectItem
                      key={column.id}
                      value={column.id}
                      // Terminal stages (TERMINAL_STAGE_IDS) aren't manually
                      // selectable; kept visible so a card already there shows
                      // its label. Currently empty → DONE selezionabile.
                      disabled={
                        TERMINAL_STAGE_IDS.has(column.id) && card.stage !== column.id
                      }
                    >
                      {column.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
          </div>
        </SheetHeader>

        {card ? (
          <section className="h-full overflow-y-auto bg-surface-muted px-5 py-5">
            <div className="mx-auto max-w-5xl space-y-5">
              <LinkedRapportoSummaryCard title={card.nomeCompleto} rapporto={rapporto ?? null} />

              <DetailSectionBlock
                title="Dettagli rapporto"
                icon={<ClipboardListIcon className="text-muted-foreground size-5" />}
                action={<PencilIcon className="text-muted-foreground size-4" />}
                contentClassName="space-y-5"
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <p className="ui-type-label">Data creazione rapporto</p>
                    <p className="font-medium">{formatDateOnly(rapporto?.creata ?? card.record.data_ora_creazione)}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="ui-type-label">Data fine rapporto</p>
                    {rapporto?.data_fine_rapporto ? (
                      <p className="font-medium">{formatDateOnly(rapporto.data_fine_rapporto)}</p>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="w-fit rounded-full bg-emerald-100 px-3 text-emerald-700 hover:bg-emerald-100"
                      >
                        In corso
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="ui-type-label">Nome</p>
                    <p className="font-medium">{famiglia?.nome ?? "Non disponibile"}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="ui-type-label">Email</p>
                    <p className="font-medium">{famiglia?.email ?? famiglia?.customer_email ?? "Non disponibile"}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="ui-type-label">Codice Datore Webcolf</p>
                    <p className="font-medium">{rapporto?.codice_datore_webcolf ?? "Non disponibile"}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="ui-type-label">Codice Lavoratore Webcolf</p>
                    <p className="font-medium">{rapporto?.codice_dipendente_webcolf ?? "Non disponibile"}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="ui-type-label">Data invio famiglia</label>
                    <FieldInput name="data_invio_famiglia" type="date" />
                  </div>
                  <div className="space-y-2">
                    <p className="ui-type-label">Caso particolare?</p>
                    <FieldSelect name="caso_particolare" options={CASO_PARTICOLARE_OPTIONS} />
                  </div>
                </div>
              </DetailSectionBlock>

              <DetailSectionBlock
                title="Cedolino"
                icon={<FileTextIcon className="text-muted-foreground size-5" />}
                action={(() => {
                  const presenzeUrl = buildFamilyPresenzeUrl(
                    famiglia?.email ?? famiglia?.customer_email,
                    famiglia?.id,
                  )
                  return presenzeUrl ? (
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={presenzeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Apri il calendario presenze della famiglia"
                      >
                        Apri calendario presenze
                        <ExternalLinkIcon className="size-3.5" />
                      </a>
                    </Button>
                  ) : null
                })()}
                contentClassName="space-y-5"
              >
                <AttachmentUploadSlot
                  label="Cedolino"
                  value={normalizeAttachmentValue(card.record.cedolino)}
                  onAdd={handleUploadCedolino}
                  onRemove={handleRemoveCedolino}
                  onPreviewOpen={openAttachmentPreview}
                  isUploading={uploadingCedolino}
                />
                <div className="space-y-3">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!cedolinoPreviewUrl}
                    onClick={() => setShowCedolinoPreview((current) => !current)}
                  >
                    <EyeIcon />
                    {showCedolinoPreview ? "Nascondi cedolino" : "Vedi cedolino in pagina"}
                  </Button>
                  {showCedolinoPreview && cedolinoPreviewUrl ? (
                    <div className="overflow-hidden rounded-lg border bg-surface">
                      <iframe
                        src={cedolinoPreviewUrl}
                        title="Anteprima cedolino"
                        className="h-[min(72vh,760px)] w-full"
                      />
                    </div>
                  ) : null}
                </div>
                {uploadError ? (
                  <p className="text-xs font-medium text-red-600">{uploadError}</p>
                ) : null}

                <div className="space-y-2">
                  <p className="ui-type-label">URL cedolino</p>
                  <div className="flex gap-2">
                    <FieldInput name="cedolino_url" type="url" placeholder="https://..." />
                    {card.record.cedolino_url ? (
                      <Button variant="outline" size="icon" asChild>
                        <a
                          href={card.record.cedolino_url}
                          target="_blank"
                          rel="noreferrer"
                          title="Apri cedolino"
                        >
                          <ExternalLinkIcon className="size-4" />
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <p className="ui-type-label">Ore da contratto</p>
                    <p className="font-medium">{formatHoursValue(contractHours)}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="ui-type-label">Ore svolte</p>
                    <p className="font-medium">{formatHoursValue(workedHours)}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="ui-type-label">Importo busta paga</p>
                    <FieldInput name="importo_busta_estratto" type="number" step="0.01" />
                  </div>
                  <div className="space-y-2">
                    <p className="ui-type-label">Cedolino corretto?</p>
                    <Badge variant={card.record.cedolino_corretto ? "default" : "secondary"} className="w-fit rounded-full px-3">
                      {card.record.cedolino_corretto ? "Confermato" : "Da verificare"}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="ui-type-label">Note interne</p>
                  <FieldTextarea name="note" className="min-h-24 w-full" />
                </div>
              </DetailSectionBlock>

              <DetailSectionBlock
                title="Pagamento"
                icon={<CreditCardIcon className="text-muted-foreground size-5" />}
                contentClassName="space-y-5"
              >
                <div className="space-y-5">
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2">
                      <p className="ui-type-label">Totale ore da pagare</p>
                      <p className="font-medium">{formatHoursValue(hoursToPay)}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="ui-type-label">Fee concordata</p>
                      <p className="font-medium">{formatCurrencyAmount(feeConcordata)}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="ui-type-label">Application fee</p>
                      <p className="font-medium">{formatCurrencyAmount(applicationFee)}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="ui-type-label">Importo cedolino</p>
                      <p className="font-medium">{formatCurrencyAmount(paymentAmount)}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="ui-type-label">Importo sconto</p>
                      <ImportoScontoField
                        value={card.record.importo_sconto_mese ?? null}
                        max={importoScontoMax}
                        onCommit={async (next) => {
                          await onPatchCard(card.id, { importo_sconto_mese: next })
                        }}
                      />
                    </div>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <p className="ui-type-label">Transazione</p>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!makeTransactionUrl}
                        onClick={() => void handleCopyMakeTransactionUrl()}
                      >
                        <CopyIcon />
                        Copia link pagamento
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <p className="ui-type-label">Stato pagamento</p>
                      <Badge variant="secondary" className="w-fit rounded-full px-3">
                        {paymentStatus}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <p className="ui-type-label">Tipo pagamento</p>
                      <p className="font-medium">{pagamento?.type_of_payment ?? "Non ancora disponibile"}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="ui-type-label">Data pagamento</p>
                      <p className="font-medium">
                        {pagamento?.data_ora_di_pagamento
                          ? formatDateTime(pagamento.data_ora_di_pagamento)
                          : "Non ancora pagato"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {pagamento ? (
                      <>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={runningAutomationId !== null}
                        >
                          {runningAutomationId === "finance-request-invoice-data" ? (
                            <LoaderCircleIcon className="animate-spin" />
                          ) : null}
                          Chiedi dati
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogTitle>Inviare richiesta dati fatturazione?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Partira il workflow automatico per chiedere alla famiglia i dati di fatturazione.
                        </AlertDialogDescription>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annulla</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() =>
                              void handleRunPagamentoAutomation("finance-request-invoice-data")
                            }
                          >
                            Conferma
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={runningAutomationId !== null}
                        >
                          {runningAutomationId === "finance-invoice-payment" ? (
                            <LoaderCircleIcon className="animate-spin" />
                          ) : null}
                          Fatturare
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogTitle>Avviare fatturazione?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Partira il workflow automatico di fatturazione per questo pagamento.
                        </AlertDialogDescription>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annulla</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() =>
                              void handleRunPagamentoAutomation("finance-invoice-payment")
                            }
                          >
                            Conferma
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                      </>
                    ) : null}
                    </div>

                  {!pagamento && transazione ? (
                    <p className="text-sm text-muted-foreground">
                      Transazione collegata: pagamento Stripe non ancora registrato.
                    </p>
                  ) : null}

                  {!pagamento && !transazione ? (
                    <p className="text-sm text-muted-foreground">
                      Nessuna transazione o pagamento collegato: importo mostrato dal cedolino.
                    </p>
                  ) : null}
                </div>
              </DetailSectionBlock>

              <DetailSectionBlock
                title="Presenze"
                icon={<BadgeCheckIcon className="text-muted-foreground size-5" />}
                contentClassName="space-y-5"
              >
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="ui-type-label">Presenze regolari?</span>
                    <PresenceBadge isRegular={isRegularPresence} />
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="ui-type-label">Distribuzione ore settimanali</span>
                    <span className="font-mono text-sm">
                      {rapporto?.distribuzione_ore_settimana ?? "—"}
                    </span>
                  </div>
                </div>

                {presenceRows.length > 0 ? (
                  <div className="rounded-xl border bg-surface">
                    <div className="max-h-80 overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-14">G.</TableHead>
                            <TableHead className="w-10">GG</TableHead>
                            <TableHead className="w-28">Tipo</TableHead>
                            <TableHead className="w-16">Ore</TableHead>
                            <TableHead className="w-16">Ore r.</TableHead>
                            <TableHead className="min-w-40">Evento</TableHead>
                            <TableHead className="w-20">PNR</TableHead>
                            <TableHead>Note</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {presenceRows.map((row) => (
                            <TableRow
                              key={row.day}
                              className={cn(
                                row.day === lastWorkingDay &&
                                  "bg-orange-100 hover:bg-orange-100 dark:bg-orange-950/40 dark:hover:bg-orange-950/40",
                              )}
                              title={
                                row.day === lastWorkingDay ? "Ultimo giorno di rapporto" : undefined
                              }
                            >
                              <TableCell className="font-mono text-xs">{row.day}</TableCell>
                              <TableCell className="text-muted-foreground font-mono text-xs">
                                {getWeekdayLetter(card.mese?.data_inizio, row.day)}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {getDayTypeLabel(row.type) || "—"}
                              </TableCell>
                              <TableCell>
                                <FieldInput
                                  name={`ore_day_${row.day}`}
                                  className="h-8 w-20"
                                  placeholder="Ore"
                                />
                              </TableCell>
                              <TableCell className="text-muted-foreground font-mono text-xs">
                                {getPresenceRegolariHours(card.presenzeRegolari, row.day) || "—"}
                              </TableCell>
                              <TableCell>
                                <FieldSelect
                                  name={`evento_day_${row.day}`}
                                  placeholder="Evento"
                                  triggerClassName={cn(PRESENCE_SELECT_TRIGGER_CLASS, "w-56")}
                                  options={[
                                    { value: EMPTY_PRESENCE_SELECT_VALUE, label: "Nessuno" },
                                    ...withCurrentPresenceOption(PRESENCE_EVENT_OPTIONS, row.event),
                                  ]}
                                />
                              </TableCell>
                              <TableCell>
                                <FieldInput
                                  name={`codice_malattia_day_${row.day}`}
                                  className="h-8 w-24"
                                  placeholder="PNR"
                                />
                              </TableCell>
                              <TableCell className="min-w-72">
                                <FieldInput
                                  name={`note_day_${row.day}`}
                                  className="h-8"
                                  placeholder="Note"
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nessuna presenza collegata a questo mese lavorato.</p>
                )}
              </DetailSectionBlock>

              <DetailSectionBlock
                title="Feedback"
                icon={<MessageSquareTextIcon className="text-muted-foreground size-5" />}
                contentClassName="space-y-5"
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <p className="ui-type-label">Feedback rating</p>
                    <EditableStars
                      value={card.record.rating_feedback_famiglia}
                      readOnly
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="ui-type-label">Feedback scritto</p>
                    <Textarea
                      value={card.record.testo_feedback_famiglia ?? ""}
                      className="min-h-24"
                      readOnly
                    />
                  </div>
                </div>
              </DetailSectionBlock>
            </div>
          </section>
        ) : (
          <DetailSheetSkeleton />
        )}
      </SheetContent>
    </Sheet>
    </Form>
  )
}

function PayrollBoardColumn({
  column,
  draggingRecordId,
  isDropTarget,
  onOpenCard,
  onDragStartCard,
  onDragEndCard,
  onDragEnterColumn,
  onDragOverColumn,
  onDragLeaveColumn,
  onDropToColumn,
}: {
  column: PayrollBoardColumnData
  draggingRecordId: string | null
  isDropTarget: boolean
  onOpenCard: (recordId: string) => void
  onDragStartCard: (recordId: string) => void
  onDragEndCard: () => void
  onDragEnterColumn: (columnId: string) => void
  onDragOverColumn: (columnId: string) => void
  onDragLeaveColumn: (event: React.DragEvent<HTMLDivElement>) => void
  onDropToColumn: (columnId: string, recordId: string | null) => void
}) {
  const visual = getColumnVisual(column.color)

  return (
    <KanbanColumnShell
      columnId={column.id}
      title={column.label}
      countLabel={`${column.cards.length} ${column.cards.length === 1 ? "cedolino" : "cedolini"}`}
      visual={visual}
      density="compact"
      widthClassName="w-70"
      isDropTarget={isDropTarget}
      emptyState={
        <div className="text-muted-foreground rounded-lg border border-dashed border-border/60 p-3 text-xs">
          Nessun cedolino
        </div>
      }
      onDragEnter={onDragEnterColumn}
      onDragOver={onDragOverColumn}
      onDragLeave={onDragLeaveColumn}
      onDrop={onDropToColumn}
    >
      {column.cards.map((card) => (
        <div
          key={card.id}
          draggable
          onClick={() => onOpenCard(card.id)}
          onDragStart={(event) => {
            event.dataTransfer.setData("text/plain", card.id)
            event.dataTransfer.effectAllowed = "move"
            onDragStartCard(card.id)
          }}
          onDragEnd={onDragEndCard}
          className={cn(
            "cursor-grab transition-opacity active:cursor-grabbing",
            draggingRecordId === card.id && "opacity-40"
          )}
        >
          <PayrollBoardCard card={card} />
        </div>
      ))}
    </KanbanColumnShell>
  )
}

function PayrollBoardSkeletonColumn() {
  return <KanbanColumnSkeleton widthClassName="w-70" density="compact" />
}

function DetailSheetSkeleton() {
  return (
    <section className="h-full overflow-y-auto bg-surface-muted px-5 py-5">
      <div className="mx-auto max-w-5xl space-y-5">
        <Skeleton className="h-24 rounded-lg" />
        <div className="rounded-lg border bg-surface p-4">
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function CedoliniFilterBar({
  filters,
  onToggle,
}: {
  filters: CedoliniFilters
  onToggle: (group: CedoliniFilterGroupKey, value: string) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      {CEDOLINI_FILTER_GROUPS.map((group) => (
        <div key={group.key} role="group" aria-label={group.label} className="flex flex-wrap items-center gap-2">
          <span className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
            {group.label}
          </span>
          {group.options.map((option) => (
            <CheckboxChip
              key={option.value}
              checked={filters[group.key].has(option.value)}
              onCheckedChange={() => onToggle(group.key, option.value)}
            >
              {option.label}
            </CheckboxChip>
          ))}
        </div>
      ))}
    </div>
  )
}

function CedoliniPayrollView() {
  const [selectedMonth, setSelectedMonth] = React.useState(getCurrentMonthValue)
  const {
    loading,
    error,
    columns,
    moveCard,
    patchCard,
    patchPresence,
    enrichCardFromDetail,
    detailRefreshTick,
  } = usePayrollBoard(selectedMonth)
  const [draggingRecordId, setDraggingRecordId] = React.useState<string | null>(null)
  const [dropTargetColumnId, setDropTargetColumnId] = React.useState<string | null>(null)
  const [selectedCardId, setSelectedCardId] = React.useState<string | null>(null)
  const [searchValue, setSearchValue] = React.useState("")
  const [filters, setFilters] = React.useState<CedoliniFilters>(createDefaultCedoliniFilters)

  const toggleFilter = React.useCallback((group: CedoliniFilterGroupKey, value: string) => {
    setFilters((current) => toggleCedoliniFilter(current, group, value))
  }, [])

  const filteredColumns = React.useMemo(() => {
    const mappedColumns = columns.map((column) => ({
      ...column,
      cards: column.cards.filter((card) => {
        if (!cardMatchesCedoliniFilters(card, filters)) return false
        return matchesSearchQuery(
          [
            card.id,
            card.nomeCompleto,
            card.importoLabel,
            card.dataInvioLabel,
            card.mese?.mese_lavorativo_copy,
            card.mese?.data_inizio,
            card.mese?.data_fine,
            card.rapporto?.id,
            card.rapporto?.id_rapporto,
            card.rapporto?.codice_datore_webcolf,
            card.rapporto?.codice_dipendente_webcolf,
            card.rapporto?.cognome_nome_datore_proper,
            card.rapporto?.nome_lavoratore_per_url,
            card.famiglia?.nome,
            card.famiglia?.cognome,
            card.famiglia?.email,
            card.famiglia?.customer_email,
            card.rapporto?.tipo_rapporto,
            card.rapporto?.tipo_contratto,
          ],
          searchValue,
        )
      }),
    }))

    return mappedColumns
  }, [columns, searchValue, filters])

  const payrollMetrics = React.useMemo(
    () => buildPayrollMetrics(filteredColumns),
    [filteredColumns],
  )
  const metricGroups = [
    payrollMetrics.slice(0, 2),
    payrollMetrics.slice(2, 5),
    payrollMetrics.slice(5),
  ]

  const totalCedolini = React.useMemo(
    () => filteredColumns.reduce((sum, column) => sum + column.cards.length, 0),
    [filteredColumns],
  )

  const selectedCardFromColumns = React.useMemo(
    () => columns.flatMap((column) => column.cards).find((card) => card.id === selectedCardId) ?? null,
    [columns, selectedCardId]
  )

  // Detail loader: fetch enriched fields and inject them into the BOARD
  // cache via enrichCardFromDetail (same shape as CRM pipeline Pattern A).
  // The detail panel binds to `selectedCardFromColumns` (board cache), so
  // optimistic patches from onPatchCard / onPatchPresence flow directly to
  // the UI without a separate React state to race against.
  //
  // Triggers:
  // - selectedCardId change → card switch, fetch fresh detail.
  // - detailRefreshTick increment → a remote realtime change arrived
  //   (after the echo-window guard, so this is NOT our own echo). Pattern
  //   A's preserveDetailFields keeps the local previous presenze during
  //   board refetch, so without re-fetching the detail here a remote
  //   change to presenze (tipo_day_X, ore_day_X, evento_day_X, note_day_X)
  //   would stay invisible until page reload.
  React.useEffect(() => {
    if (!selectedCardId) return
    let isActive = true
    const currentCardId = selectedCardId

    async function loadSelectedCard() {
      try {
        const detail = await fetchCedolinoDetail(currentCardId)
        if (!isActive || !detail || !detail.record) return

        enrichCardFromDetail(currentCardId, {
          record: detail.record as PayrollBoardCardData["record"],
          rapporto: detail.rapporto as PayrollBoardCardData["rapporto"],
          famiglia: detail.famiglia as PayrollBoardCardData["famiglia"],
          mese: detail.mese as PayrollBoardCardData["mese"],
          presenze: detail.presenze as PayrollBoardCardData["presenze"],
          presenzeRegolari:
            detail.presenzeRegolari as PayrollBoardCardData["presenzeRegolari"],
          richiestaAttivazione:
            detail.richiestaAttivazione as PayrollBoardCardData["richiestaAttivazione"],
        })
      } catch (error) {
        if (!isActive) return
        console.error("Errore caricando dettaglio cedolino", error)
      }
    }

    void loadSelectedCard()

    return () => {
      isActive = false
    }
  }, [selectedCardId, enrichCardFromDetail, detailRefreshTick])

  const monthSwitcher = (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label="Mese precedente"
        onClick={() => setSelectedMonth((current) => shiftMonth(current, -1))}
      >
        <ChevronLeftIcon />
      </Button>
      <div className="text-foreground inline-flex h-8 min-w-40 items-center justify-center gap-2 rounded-md text-sm font-medium capitalize">
        <CalendarDaysIcon className="text-muted-foreground size-4" />
        {formatMonthLabel(selectedMonth)}
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label="Mese successivo"
        onClick={() => setSelectedMonth((current) => shiftMonth(current, 1))}
      >
        <ChevronRightIcon />
      </Button>
    </div>
  )

  return (
    <section className="ui flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden">
      <SectionHeader>
        <SectionHeader.Title
          subtitle={`${totalCedolini} ${totalCedolini === 1 ? "cedolino" : "cedolini"}`}
        >
          Cedolini
        </SectionHeader.Title>
        <SectionHeader.Actions>{monthSwitcher}</SectionHeader.Actions>
        <SectionHeader.Toolbar>
          <SearchInput
            className="md:max-w-sm"
            placeholder="Cerca per famiglia, lavoratore, email..."
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            onClear={() => setSearchValue("")}
          />
          <CedoliniFilterBar filters={filters} onToggle={toggleFilter} />
        </SectionHeader.Toolbar>
      </SectionHeader>

      <div className="px-4 pt-4">
        <div className="flex w-full items-stretch gap-3">
          {metricGroups.map((group, groupIndex) => (
            <React.Fragment key={groupIndex}>
              <div
                className={cn(
                  "grid flex-1 items-stretch gap-3",
                  group.length === 2 && "grid-cols-2",
                  group.length === 3 && "grid-cols-3",
                )}
              >
                {group.map((metric) => (
                  <div key={metric.title} className="min-w-0">
                    <StatisticsMetricCard {...metric} density="compact" />
                  </div>
                ))}
              </div>
              {groupIndex < metricGroups.length - 1 ? (
                <Separator orientation="vertical" className="mx-1 h-auto self-stretch" />
              ) : null}
            </React.Fragment>
          ))}
        </div>
      </div>

      {error ? (
        <div className="mx-4 mt-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Errore caricamento payroll: {error}
        </div>
      ) : null}

      <div className="scrollbar-visible min-h-0 flex-1 overflow-x-auto overflow-y-hidden px-4 pb-2 pt-4 [scrollbar-gutter:stable]">
        <div className="flex h-full min-h-0 min-w-max gap-4">
          {loading
            ? Array.from({ length: 4 }).map((_, index) => <PayrollBoardSkeletonColumn key={index} />)
            : filteredColumns.map((column) => (
                <PayrollBoardColumn
                  key={column.id}
                  column={column}
                  draggingRecordId={draggingRecordId}
                  isDropTarget={dropTargetColumnId === column.id}
                  onOpenCard={(cardId) => {
                    setSelectedCardId(cardId)
                  }}
                  onDragStartCard={setDraggingRecordId}
                  onDragEndCard={() => {
                    window.setTimeout(() => {
                      setDraggingRecordId(null)
                      setDropTargetColumnId(null)
                    }, 0)
                  }}
                  onDragEnterColumn={setDropTargetColumnId}
                  onDragOverColumn={setDropTargetColumnId}
                  onDragLeaveColumn={(event) => {
                    const nextTarget = event.relatedTarget
                    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return
                    setDropTargetColumnId((current) => (current === column.id ? null : current))
                  }}
                  onDropToColumn={(columnId, recordId) => {
                    setDropTargetColumnId(null)
                    setDraggingRecordId(null)
                    if (!recordId) return
                    // Block manual drops onto terminal stages
                    // (TERMINAL_STAGE_IDS). Currently empty → drop in DONE
                    // consentito. NB: non invia la conferma di pagamento.
                    if (TERMINAL_STAGE_IDS.has(columnId)) return
                    void moveCard(recordId, columnId)
                  }}
                />
              ))}
        </div>
      </div>

      <CedolinoDetailSheet
        // Remount on card switch so debounced inputs reset their local draft
        // (useDebouncedSave's hasUserEditedRef) instead of carrying it across
        // to a different cedolino.
        key={selectedCardId ?? "__empty__"}
        card={selectedCardFromColumns}
        columns={columns}
        open={Boolean(selectedCardId)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedCardId(null)
          }
        }}
        onStageChange={(recordId, targetStageId) => {
          void moveCard(recordId, targetStageId)
        }}
        onPatchCard={(recordId, patch) => {
          void patchCard(recordId, patch)
        }}
        onPatchPresence={(recordId, patch) => {
          void patchPresence(recordId, patch)
        }}
      />
    </section>
  )
}

export function PayrollOverviewView({
  defaultTab = "cedolini",
}: {
  defaultTab?: "cedolini" | "contributi-inps"
}) {
  if (defaultTab === "contributi-inps") {
    return <ContributiInpsView />
  }

  return <CedoliniPayrollView />
}
