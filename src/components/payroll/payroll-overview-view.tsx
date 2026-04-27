import * as React from "react"
import {
  BadgeCheckIcon,
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleCheckBigIcon,
  ClipboardListIcon,
  CreditCardIcon,
  ExternalLinkIcon,
  FileTextIcon,
  LoaderCircleIcon,
  MessageSquareTextIcon,
  PencilIcon,
  StarIcon,
} from "lucide-react"

import { usePayrollBoard, type PayrollBoardCardData, type PayrollBoardColumnData } from "@/hooks/use-payroll-board"
import { ContributiInpsView } from "@/components/payroll/contributi-inps-view"
import { AttachmentUploadSlot } from "@/components/shared-next/attachment-upload-slot"
import { DetailSectionBlock } from "@/components/shared-next/detail-section-card"
import {
  KanbanColumnShell,
  KanbanColumnSkeleton,
  type KanbanColumnVisual,
} from "@/components/shared-next/kanban"
import { LinkedRapportoSummaryCard } from "@/components/shared-next/linked-rapporto-summary-card"
import { SectionHeader } from "@/components/shared-next/section-header"
import { StatisticsMetricCard } from "@/components/shared-next/statistics-metric-card"
import { Badge } from "@/components/ui-next/badge"
import { Button } from "@/components/ui-next/button"
import { Card, CardContent } from "@/components/ui-next/card"
import { Input } from "@/components/ui-next/input"
import { SearchInput } from "@/components/ui-next/search-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui-next/select"
import { Separator } from "@/components/ui-next/separator"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui-next/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui-next/table"
import { Textarea } from "@/components/ui-next/textarea"
import { runAutomationWebhook } from "@/lib/anagrafiche-api"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type PayrollMetric = {
  title: string
  value: string
  className?: string
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
  const month = `${now.getMonth() + 1}`.padStart(2, "0")
  return `${now.getFullYear()}-${month}`
}

function shiftMonth(value: string, delta: number) {
  const [yearPart, monthPart] = value.split("-")
  const year = Number.parseInt(yearPart ?? "", 10)
  const month = Number.parseInt(monthPart ?? "", 10)

  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return getCurrentMonthValue()
  }

  const nextDate = new Date(year, month - 1 + delta, 1)
  const nextMonth = `${nextDate.getMonth() + 1}`.padStart(2, "0")
  return `${nextDate.getFullYear()}-${nextMonth}`
}

function formatMonthLabel(value: string) {
  const [yearPart, monthPart] = value.split("-")
  const year = Number.parseInt(yearPart ?? "", 10)
  const month = Number.parseInt(monthPart ?? "", 10)

  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return value
  }

  return new Intl.DateTimeFormat("it-IT", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1))
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Non disponibile"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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

function normalizeCaseFlag(value: string | null | undefined) {
  const token = String(value ?? "").trim().toLowerCase()
  if (!token) return "no"
  if (["si", "sì", "yes", "true", "caso particolare"].includes(token)) return "si"
  return "no"
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

type PresenceDayRow = {
  day: number
  type: string
  hours: string
  event: string
  sicknessCode: string
  note: string
}

function buildPresenceDayRows(record: PayrollBoardCardData["presenze"]): PresenceDayRow[] {
  if (!record) return []

  return Array.from({ length: 31 }, (_, index) => {
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
  }).filter((row) => row.type || row.hours || row.event || row.sicknessCode || row.note)
}

function PresenceBadge({ isRegular }: { isRegular: boolean }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "rounded-full px-3",
        isRegular
          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
          : "bg-amber-100 text-amber-700 hover:bg-amber-100"
      )}
    >
      {isRegular ? "Presenze regolari" : "Presenze da verificare"}
    </Badge>
  )
}

function EditableStars({
  value,
  onChange,
}: {
  value: number | null | undefined
  onChange: (value: number) => void
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
            className="cursor-pointer"
            onClick={() => onChange(nextValue)}
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
    default:
      return { columnClassName: "", headerClassName: "", iconClassName: "text-muted-foreground/80" }
  }
}

function PayrollBoardCard({ card }: { card: PayrollBoardCardData }) {
  const famiglia = card.rapporto?.cognome_nome_datore_proper?.trim() || "Famiglia non disponibile"
  const lavoratore = card.rapporto?.nome_lavoratore_per_url?.trim() || "Lavoratore non disponibile"

  return (
    <Card className="border border-border/70 bg-white py-0 transition-shadow hover:shadow-md">
      <CardContent className="space-y-3 px-3 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">{famiglia}</p>
            <p className="text-muted-foreground mt-0.5 truncate text-xs">{lavoratore}</p>
          </div>
          {card.importoLabel ? (
            <p className="shrink-0 text-sm font-semibold">{card.importoLabel}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Badge
            variant="secondary"
            className="gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] text-emerald-700 hover:bg-emerald-100"
          >
            <CircleCheckBigIcon className="size-3" />
            <span>REG</span>
          </Badge>
          <Badge
            variant="secondary"
            className="gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] text-emerald-700 hover:bg-emerald-100"
          >
            <CircleCheckBigIcon className="size-3" />
            <span>Pagato</span>
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

export function CedolinoDetailSheet({
  card,
  columns,
  open,
  onOpenChange,
  onStageChange,
  onPatchCard,
}: {
  card: PayrollBoardCardData | null
  columns: PayrollBoardColumnData[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onStageChange: (recordId: string, targetStageId: string) => void
  onPatchCard: (recordId: string, patch: Partial<PayrollBoardCardData["record"]>) => void
}) {
  const famiglia = card?.famiglia
  const pagamento = card?.pagamento
  const presenceRows = React.useMemo(() => buildPresenceDayRows(card?.presenze ?? null), [card?.presenze])
  const rapporto = card?.rapporto
  const statoServizio = rapporto?.stato_servizio || "Non disponibile"
  const isRegularPresence = Boolean(card?.record.presenze_regolare_id)
  const [runningAutomationId, setRunningAutomationId] = React.useState<string | null>(null)

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[min(96vw,980px)]! max-w-none! p-0 sm:max-w-none">
        <SheetHeader className="border-b bg-white px-5 py-5">
          <div className="space-y-2">
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
          </div>
        </SheetHeader>

        {card ? (
          <section className="h-full overflow-y-auto bg-[var(--neutral-150)] px-5 py-5">
            <div className="mx-auto max-w-5xl space-y-5">
              <LinkedRapportoSummaryCard title={card.nomeCompleto} rapporto={rapporto ?? null} status={statoServizio} />

              <DetailSectionBlock
                title="Dettagli rapporto"
                icon={<ClipboardListIcon className="text-muted-foreground size-5" />}
                action={<PencilIcon className="text-muted-foreground size-4" />}
                contentClassName="space-y-5"
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <p className="ui-type-label">Stato del servizio</p>
                    <Badge variant="secondary" className="w-fit rounded-full px-3">
                      {statoServizio}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <p className="ui-type-label">Data creazione rapporto</p>
                    <p className="font-medium">{formatDateTime(rapporto?.creata ?? card.record.data_ora_creazione)}</p>
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
                    <p className="ui-type-label">ID</p>
                    <p className="font-medium">{rapporto?.id_rapporto ?? rapporto?.id ?? "Non disponibile"}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="ui-type-label">Codice Datore Webcolf</p>
                    <p className="font-medium">{rapporto?.codice_datore_webcolf ?? "Non disponibile"}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="ui-type-label">Data invio famiglia</label>
                    <Input
                      type="date"
                      value={toInputDateValue(card.record.data_invio_famiglia)}
                      onChange={(event) =>
                        onPatchCard(card.id, {
                          data_invio_famiglia: event.target.value || null,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="ui-type-label">Caso particolare?</p>
                    <Select
                      value={normalizeCaseFlag(card.record.caso_particolare)}
                      onValueChange={(value) =>
                        onPatchCard(card.id, {
                          caso_particolare: value === "si" ? "Caso particolare" : null,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="si">Caso particolare</SelectItem>
                        <SelectItem value="no">Regolare</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </DetailSectionBlock>

              <DetailSectionBlock
                title="Cedolino"
                icon={<FileTextIcon className="text-muted-foreground size-5" />}
                action={
                  <Button variant="outline" size="sm" asChild>
                    <a href="#" onClick={(event) => event.preventDefault()}>
                      Apri calendario presenze
                      <ExternalLinkIcon className="size-3.5" />
                    </a>
                  </Button>
                }
                contentClassName="space-y-5"
              >
                <div className="space-y-2">
                  <p className="ui-type-label">Stato cedolino</p>
                  <Select
                    value={card.stage}
                    onValueChange={(nextValue) => onStageChange(card.id, nextValue)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map((column) => (
                        <SelectItem key={column.id} value={column.id}>
                          {column.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <AttachmentUploadSlot
                  label="Cedolino"
                  value={normalizeAttachmentValue(card.record.cedolino)}
                  onAdd={() => {}}
                  onPreviewOpen={() => {}}
                  isUploading={false}
                />

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <p className="ui-type-label">Ore da contratto</p>
                    <p className="font-medium">{card.record.ore_contratto_mese ?? "Non disponibile"}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="ui-type-label">Ore svolte</p>
                    <p className="font-medium">{card.record.ore_lavorate_estratte ?? "Non disponibile"}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="ui-type-label">Importo busta paga</p>
                    <Input
                      type="number"
                      step="0.01"
                      value={card.record.importo_busta_estratto ?? ""}
                      onChange={(event) =>
                        onPatchCard(card.id, {
                          importo_busta_estratto: event.target.value
                            ? Number(event.target.value)
                            : null,
                        })
                      }
                    />
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
                  <Textarea
                    value={card.record.note ?? ""}
                    className="min-h-24 w-full"
                    onChange={(event) => onPatchCard(card.id, { note: event.target.value || null })}
                  />
                </div>
              </DetailSectionBlock>

              <DetailSectionBlock
                title="Pagamento"
                icon={<CreditCardIcon className="text-muted-foreground size-5" />}
                contentClassName="space-y-5"
              >
                {pagamento ? (
                  <div className="space-y-5">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div className="space-y-2">
                        <p className="ui-type-label">Transazione</p>
                        <p className="font-medium">{pagamento.payment_intent_id ?? pagamento.charge_id ?? "Non disponibile"}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="ui-type-label">Stato pagamento</p>
                        <Badge variant="secondary" className="w-fit rounded-full px-3">
                          {pagamento.status ?? "Non disponibile"}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <p className="ui-type-label">Importo cedolino</p>
                        <p className="font-medium">{formatCurrencyAmount(pagamento.amount)}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="ui-type-label">Application fee</p>
                        <p className="font-medium">{formatCurrencyAmount(pagamento.fee)}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="ui-type-label">Tipo pagamento</p>
                        <p className="font-medium">{pagamento.type_of_payment ?? "Non disponibile"}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="ui-type-label">Data pagamento</p>
                        <p className="font-medium">{formatDateTime(pagamento.data_ora_di_pagamento)}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={runningAutomationId !== null}
                        onClick={() =>
                          void handleRunPagamentoAutomation("finance-request-invoice-data")
                        }
                      >
                        {runningAutomationId === "finance-request-invoice-data" ? (
                          <LoaderCircleIcon className="animate-spin" />
                        ) : null}
                        Chiedi dati
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={runningAutomationId !== null}
                        onClick={() =>
                          void handleRunPagamentoAutomation("finance-invoice-payment")
                        }
                      >
                        {runningAutomationId === "finance-invoice-payment" ? (
                          <LoaderCircleIcon className="animate-spin" />
                        ) : null}
                        Fatturare
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nessun pagamento collegato a questo cedolino.</p>
                )}
              </DetailSectionBlock>

              <DetailSectionBlock
                title="Presenze"
                icon={<BadgeCheckIcon className="text-muted-foreground size-5" />}
                contentClassName="space-y-5"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="ui-type-label">Presenze regolari?</span>
                  <PresenceBadge isRegular={isRegularPresence} />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <p className="ui-type-label">Presenze</p>
                    <div className="rounded-xl border bg-white p-4">
                      <p className="truncate font-medium">{card.nomeCompleto}</p>
                      <div className="text-muted-foreground mt-2 grid gap-2 text-sm sm:grid-cols-2">
                        <div>
                          <p className="text-xs uppercase tracking-wide">Totale ore da pagare</p>
                          <p className="mt-1">{card.presenze?.presenze_mensili ?? card.record.ore_lavorate_estratte ?? "Non disponibile"}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide">Data creazione</p>
                          <p className="mt-1">{formatDateTime(card.presenze?.data_ora_creazione ?? card.record.data_ora_creazione)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="ui-type-label">Totale ore da pagare</p>
                    <p className="font-medium">{card.presenze?.presenze_mensili ?? card.record.ore_lavorate_estratte ?? "Non disponibile"}</p>
                  </div>
                </div>

                {presenceRows.length > 0 ? (
                  <div className="rounded-xl border bg-white">
                    <div className="max-h-80 overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-14">G.</TableHead>
                            <TableHead className="w-28">Tipo</TableHead>
                            <TableHead className="w-16">Ore</TableHead>
                            <TableHead className="min-w-40">Evento</TableHead>
                            <TableHead className="w-20">PNR</TableHead>
                            <TableHead>Note</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {presenceRows.map((row) => (
                            <TableRow key={row.day}>
                              <TableCell className="font-mono text-xs">{row.day}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="rounded-full px-2 text-[11px]">
                                  {row.type || "n/d"}
                                </Badge>
                              </TableCell>
                              <TableCell>{row.hours || "-"}</TableCell>
                              <TableCell>{row.event || "-"}</TableCell>
                              <TableCell>{row.sicknessCode || "-"}</TableCell>
                              <TableCell className="max-w-72 truncate">{row.note || "-"}</TableCell>
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
                      onChange={(value) => onPatchCard(card.id, { rating_feedback_famiglia: value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="ui-type-label">Feedback scritto</p>
                    <Textarea
                      value={card.record.testo_feedback_famiglia ?? ""}
                      className="min-h-24"
                      onChange={(event) =>
                        onPatchCard(card.id, { testo_feedback_famiglia: event.target.value || null })
                      }
                    />
                  </div>
                </div>
              </DetailSectionBlock>
            </div>
          </section>
        ) : null}
      </SheetContent>
    </Sheet>
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
      widthClassName="w-[280px]"
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
  return <KanbanColumnSkeleton widthClassName="w-[280px]" density="compact" />
}

function CedoliniPayrollView() {
  const [selectedMonth, setSelectedMonth] = React.useState(getCurrentMonthValue)
  const { loading, error, columns, moveCard, patchCard } = usePayrollBoard(selectedMonth)
  const [draggingRecordId, setDraggingRecordId] = React.useState<string | null>(null)
  const [dropTargetColumnId, setDropTargetColumnId] = React.useState<string | null>(null)
  const [selectedCardId, setSelectedCardId] = React.useState<string | null>(null)
  const [searchValue, setSearchValue] = React.useState("")

  const filteredColumns = React.useMemo(() => {
    const query = searchValue.trim().toLowerCase()
    if (!query) return columns
    const tokens = query.split(/\s+/).filter(Boolean)
    return columns.map((column) => ({
      ...column,
      cards: column.cards.filter((card) => {
        const haystack = [
          card.nomeCompleto,
          card.rapporto?.cognome_nome_datore_proper,
          card.rapporto?.nome_lavoratore_per_url,
          card.famiglia?.email,
          card.famiglia?.customer_email,
          card.rapporto?.tipo_rapporto,
          card.rapporto?.tipo_contratto,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        return tokens.every((token) => haystack.includes(token))
      }),
    }))
  }, [columns, searchValue])

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

  const selectedCard = React.useMemo(
    () => columns.flatMap((column) => column.cards).find((card) => card.id === selectedCardId) ?? null,
    [columns, selectedCardId]
  )

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
      <div className="text-foreground inline-flex h-8 min-w-[160px] items-center justify-center gap-2 rounded-md text-sm font-medium capitalize">
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
    <section className="ui-next flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden">
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

      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden px-4 pb-2 pt-4">
        <div className="flex h-full min-h-0 min-w-max gap-4">
          {loading
            ? Array.from({ length: 4 }).map((_, index) => <PayrollBoardSkeletonColumn key={index} />)
            : filteredColumns.map((column) => (
                <PayrollBoardColumn
                  key={column.id}
                  column={column}
                  draggingRecordId={draggingRecordId}
                  isDropTarget={dropTargetColumnId === column.id}
                  onOpenCard={setSelectedCardId}
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
                    void moveCard(recordId, columnId)
                  }}
                />
              ))}
        </div>
      </div>

      <CedolinoDetailSheet
        card={selectedCard}
        columns={columns}
        open={Boolean(selectedCard)}
        onOpenChange={(open) => {
          if (!open) setSelectedCardId(null)
        }}
        onStageChange={(recordId, targetStageId) => {
          void moveCard(recordId, targetStageId)
        }}
        onPatchCard={(recordId, patch) => {
          void patchCard(recordId, patch)
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
