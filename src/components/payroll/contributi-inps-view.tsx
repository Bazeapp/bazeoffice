import * as React from "react"
import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleCheckBigIcon,
  CreditCardIcon,
  FileTextIcon,
  SearchIcon,
} from "lucide-react"

import {
  useContributiInpsBoard,
  type ContributoInpsBoardCardData,
  type ContributoQuarterValue,
} from "@/hooks/use-contributi-inps-board"
import {
  AttachmentUploadSlot,
  type AttachmentLink,
} from "@/components/shared/attachment-upload-slot"
import { DetailSectionBlock } from "@/components/shared/detail-section-card"
import { KanbanColumnShell, KanbanColumnSkeleton } from "@/components/shared/kanban"
import { LinkedRapportoSummaryCard } from "@/components/shared/linked-rapporto-summary-card"
import { StatisticsMetricCard } from "@/components/shared/statistics-metric-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { supabase } from "@/lib/supabase-client"
import { cn } from "@/lib/utils"

type QuarterState = {
  quarter: ContributoQuarterValue
  year: number
}

type ContributiColumnData = {
  id: string
  label: string
  color: string
  cards: ContributoInpsBoardCardData[]
}

const QUARTERS: ContributoQuarterValue[] = ["Q1", "Q2", "Q3", "Q4"]

function getCurrentQuarterState(): QuarterState {
  const now = new Date()
  const month = now.getMonth()

  if (month <= 2) return { quarter: "Q1", year: now.getFullYear() }
  if (month <= 5) return { quarter: "Q2", year: now.getFullYear() }
  if (month <= 8) return { quarter: "Q3", year: now.getFullYear() }
  return { quarter: "Q4", year: now.getFullYear() }
}

function shiftQuarter(period: QuarterState, delta: number): QuarterState {
  const currentIndex = QUARTERS.indexOf(period.quarter)
  let nextIndex = currentIndex + delta
  let nextYear = period.year

  if (nextIndex < 0) {
    nextIndex = QUARTERS.length - 1
    nextYear -= 1
  }

  if (nextIndex >= QUARTERS.length) {
    nextIndex = 0
    nextYear += 1
  }

  return {
    quarter: QUARTERS[nextIndex] ?? "Q1",
    year: nextYear,
  }
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

function parseNullableNumber(value: string) {
  if (!value) return null
  const parsed = Number(value.replace(",", "."))
  return Number.isFinite(parsed) ? parsed : null
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
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
}

type StoredAttachmentPayload = {
  bucket: string
  content_type: string
  file_name: string
  name: string
  path: string
  public_url: string
  size: number
  uploaded_at: string
}

function getColumnClasses(color: string) {
  switch (color.toLowerCase()) {
    case "sky":
      return {
        columnClassName: "border-sky-300 bg-sky-50/70",
        headerClassName: "border-b border-sky-200/70",
        iconClassName: "text-sky-500",
      }
    case "cyan":
      return {
        columnClassName: "border-cyan-300 bg-cyan-50/70",
        headerClassName: "border-b border-cyan-200/70",
        iconClassName: "text-cyan-500",
      }
    case "amber":
    case "yellow":
      return {
        columnClassName: "border-amber-300 bg-amber-50/70",
        headerClassName: "border-b border-amber-200/70",
        iconClassName: "text-amber-500",
      }
    case "green":
      return {
        columnClassName: "border-green-300 bg-green-50/70",
        headerClassName: "border-b border-green-200/70",
        iconClassName: "text-green-500",
      }
    default:
      return {
        columnClassName: "border-border bg-muted/40",
        headerClassName: "border-b border-border/70",
        iconClassName: "text-muted-foreground",
      }
  }
}

function ContributoInpsCard({ card }: { card: ContributoInpsBoardCardData }) {
  const hasAttachment = Boolean(card.record.allegato)

  return (
    <Card className="border border-border/70 bg-white py-0 transition-shadow hover:shadow-md">
      <CardContent className="space-y-3 px-3 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">{card.nomeFamiglia}</p>
            <p className="text-muted-foreground mt-0.5 truncate text-xs">{card.nomeLavoratore}</p>
          </div>
          {card.importoLabel ? <p className="shrink-0 text-sm font-semibold">{card.importoLabel}</p> : null}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge
            variant="secondary"
            className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] text-violet-700 hover:bg-violet-100"
          >
            {card.trimestreLabel}
          </Badge>
          {card.pagopaLabel ? (
            <Badge
              variant="secondary"
              className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] text-sky-700 hover:bg-sky-100"
            >
              PagoPA {card.pagopaLabel}
            </Badge>
          ) : null}
          {hasAttachment ? (
            <Badge
              variant="secondary"
              className="gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] text-emerald-700 hover:bg-emerald-100"
            >
              <CircleCheckBigIcon className="size-3" />
              Allegato
            </Badge>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

function ContributoInpsDetailSheet({
  card,
  columns,
  open,
  onOpenChange,
  onStageChange,
  onPatchCard,
}: {
  card: ContributoInpsBoardCardData | null
  columns: ContributiColumnData[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onStageChange: (recordId: string, targetStageId: string) => Promise<void>
  onPatchCard: (
    recordId: string,
    patch: Partial<ContributoInpsBoardCardData["record"]>
  ) => Promise<void>
}) {
  const rapporto = card?.rapporto
  const [stageValue, setStageValue] = React.useState("")
  const [importoValue, setImportoValue] = React.useState("")
  const [pagopaValue, setPagopaValue] = React.useState("")
  const [dataInvioValue, setDataInvioValue] = React.useState("")
  const [selectedPreview, setSelectedPreview] = React.useState<AttachmentLink | null>(null)
  const [isUploadingAttachment, setIsUploadingAttachment] = React.useState(false)
  const [uploadError, setUploadError] = React.useState<string | null>(null)

  React.useEffect(() => {
    setStageValue(card?.stage ?? "")
    setImportoValue(card?.record.importo_contributi_inps?.toString() ?? "")
    setPagopaValue(card?.record.valore_pagopa?.toString() ?? "")
    setDataInvioValue(toInputDateValue(card?.record.data_invio_famiglia))
    setSelectedPreview(null)
    setUploadError(null)
    setIsUploadingAttachment(false)
  }, [
    card?.id,
    card?.stage,
    card?.record.data_invio_famiglia,
    card?.record.importo_contributi_inps,
    card?.record.valore_pagopa,
  ])

  const handleStageValueChange = React.useCallback(
    async (nextValue: string) => {
      setStageValue(nextValue)
      if (!card || nextValue === card.stage) return
      await onStageChange(card.id, nextValue)
    },
    [card, onStageChange]
  )

  const commitImportoValue = React.useCallback(async () => {
    if (!card) return

    const nextValue = parseNullableNumber(importoValue)
    if ((card.record.importo_contributi_inps ?? null) === nextValue) return

    await onPatchCard(card.id, {
      importo_contributi_inps: nextValue,
    })
  }, [card, importoValue, onPatchCard])

  const commitPagopaValue = React.useCallback(async () => {
    if (!card) return

    const nextValue = parseNullableNumber(pagopaValue)
    if ((card.record.valore_pagopa ?? null) === nextValue) return

    await onPatchCard(card.id, {
      valore_pagopa: nextValue,
    })
  }, [card, onPatchCard, pagopaValue])

  const commitDataInvioValue = React.useCallback(async () => {
    if (!card) return

    const nextValue = dataInvioValue || null
    if ((card.record.data_invio_famiglia ?? null) === nextValue) return

    await onPatchCard(card.id, {
      data_invio_famiglia: nextValue,
    })
  }, [card, dataInvioValue, onPatchCard])

  const handleUploadAttachment = React.useCallback(
    async (file: File) => {
      if (!card) return

      setUploadError(null)
      setIsUploadingAttachment(true)

      try {
        const safeName = sanitizeFileName(file.name || "allegato")
        const storagePath = ["contributi-inps", card.id, `${Date.now()}-${safeName}`].join("/")

        const uploadResult = await supabase.storage.from("baze-bucket").upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || undefined,
        })

        if (uploadResult.error) {
          throw uploadResult.error
        }

        const publicUrlResult = supabase.storage.from("baze-bucket").getPublicUrl(storagePath)
        const payload: StoredAttachmentPayload = {
          bucket: "baze-bucket",
          content_type: file.type || "application/octet-stream",
          file_name: file.name,
          name: file.name,
          path: storagePath,
          public_url: publicUrlResult.data.publicUrl,
          size: file.size,
          uploaded_at: new Date().toISOString(),
        }

        await onPatchCard(card.id, {
          allegato: payload,
        })
      } catch (caughtError) {
        setUploadError(
          caughtError instanceof Error ? caughtError.message : "Errore caricando allegato contributo"
        )
      } finally {
        setIsUploadingAttachment(false)
      }
    },
    [card, onPatchCard]
  )

  React.useEffect(() => {
    if (open) return
    setSelectedPreview(null)
  }, [open])

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-[min(96vw,980px)]! max-w-none! p-0 sm:max-w-none">
          <SheetHeader className="border-b bg-background px-5 py-5">
            <div className="space-y-2">
              <SheetTitle className="truncate text-xl font-semibold">
                {card?.nomeCompleto ?? "Dettaglio contributo INPS"}
              </SheetTitle>
              <SheetDescription className="sr-only">
                Dettaglio del contributo INPS con stato, importi, allegati e rapporto collegato.
              </SheetDescription>
              {card?.trimestreLabel ? (
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                  <CalendarDaysIcon className="size-4" />
                  <span>{card.trimestreLabel}</span>
                </div>
              ) : null}
            </div>
          </SheetHeader>

          {card ? (
            <section className="h-full overflow-y-auto bg-muted/20 px-5 py-5">
              <div className="mx-auto max-w-5xl space-y-5">
                <LinkedRapportoSummaryCard title={card.nomeCompleto} rapporto={rapporto ?? null} />

                <DetailSectionBlock
                  title="Contributo INPS"
                  icon={<CreditCardIcon className="text-muted-foreground size-5" />}
                  contentClassName="space-y-5"
                >
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <p className="ui-type-label">Stato contributo</p>
                      <Select
                        value={stageValue}
                        onValueChange={(nextValue) => void handleStageValueChange(nextValue)}
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
                    <div className="space-y-2">
                      <p className="ui-type-label">Trimestre</p>
                      <p className="font-medium">{card.trimestreLabel}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="ui-type-label">Importo contributo INPS</p>
                      <Input
                        type="number"
                        step="0.01"
                        value={importoValue}
                        onChange={(event) => setImportoValue(event.target.value)}
                        onBlur={() => void commitImportoValue()}
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="ui-type-label">Valore PagoPA</p>
                      <Input
                        type="number"
                        step="0.01"
                        value={pagopaValue}
                        onChange={(event) => setPagopaValue(event.target.value)}
                        onBlur={() => void commitPagopaValue()}
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="ui-type-label">Data invio famiglia</p>
                      <Input
                        type="date"
                        value={dataInvioValue}
                        onChange={(event) => setDataInvioValue(event.target.value)}
                        onBlur={() => void commitDataInvioValue()}
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="ui-type-label">Creato il</p>
                      <p className="font-medium">
                        {formatDateTime(card.record.data_ora_creazione ?? card.record.creato_il)}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="ui-type-label">Importo attuale</p>
                      <p className="font-medium">{formatCurrencyAmount(card.record.importo_contributi_inps)}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="ui-type-label">PagoPA attuale</p>
                      <p className="font-medium">{formatCurrencyAmount(card.record.valore_pagopa)}</p>
                    </div>
                  </div>
                </DetailSectionBlock>

                <DetailSectionBlock
                  title="Allegato"
                  icon={<FileTextIcon className="text-muted-foreground size-5" />}
                  contentClassName="space-y-4"
                >
                  <AttachmentUploadSlot
                    label="Allegato PagoPA"
                    value={normalizeAttachmentValue(card.record.allegato)}
                    onAdd={(file) => void handleUploadAttachment(file)}
                    onPreviewOpen={setSelectedPreview}
                    isUploading={isUploadingAttachment}
                  />
                  {uploadError ? <p className="text-sm text-red-600">{uploadError}</p> : null}
                </DetailSectionBlock>
              </div>
            </section>
          ) : null}
        </SheetContent>
      </Sheet>
      <Dialog open={Boolean(selectedPreview)} onOpenChange={(nextOpen) => !nextOpen && setSelectedPreview(null)}>
        <DialogContent
          className="max-w-[min(96vw,72rem)] border-none bg-black/90 p-2 shadow-none sm:max-w-[min(96vw,72rem)]"
          showCloseButton={true}
        >
          <DialogTitle className="sr-only">
            {selectedPreview?.label ?? "Anteprima allegato contributo"}
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
  )
}

function ContributoInpsBoardColumn({
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
  column: ContributiColumnData
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
  const visual = getColumnClasses(column.color)

  return (
    <KanbanColumnShell
      columnId={column.id}
      title={column.label}
      countLabel={`${column.cards.length} ${column.cards.length === 1 ? "contributo" : "contributi"}`}
      visual={visual}
      density="compact"
      widthClassName="w-[292px]"
      isDropTarget={isDropTarget}
      emptyState={
        <div className="text-muted-foreground rounded-lg border border-dashed border-border/60 p-3 text-xs">
          Nessun contributo
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
          <ContributoInpsCard card={card} />
        </div>
      ))}
    </KanbanColumnShell>
  )
}

function ContributoInpsBoardSkeletonColumn() {
  return <KanbanColumnSkeleton widthClassName="w-[292px]" density="compact" showBadgeRow />
}

export function ContributiInpsView() {
  const [period, setPeriod] = React.useState<QuarterState>(getCurrentQuarterState)
  const [search, setSearch] = React.useState("")
  const [stageFilter, setStageFilter] = React.useState("all")
  const { loading, error, stages, cards, activeRapportiCount, moveCard, patchCard } = useContributiInpsBoard(
    period.year,
    period.quarter
  )
  const [draggingRecordId, setDraggingRecordId] = React.useState<string | null>(null)
  const [dropTargetColumnId, setDropTargetColumnId] = React.useState<string | null>(null)
  const [selectedCardId, setSelectedCardId] = React.useState<string | null>(null)

  const filteredCards = React.useMemo(() => {
    return cards.filter((card) => {
      if (stageFilter !== "all" && card.stage !== stageFilter) return false

      const normalizedSearch = search.trim().toLowerCase()
      if (!normalizedSearch) return true

      return (
        card.nomeFamiglia.toLowerCase().includes(normalizedSearch) ||
        card.nomeLavoratore.toLowerCase().includes(normalizedSearch)
      )
    })
  }, [cards, search, stageFilter])

  const columns = React.useMemo<ContributiColumnData[]>(
    () =>
      stages.map((stage) => ({
        id: stage.id,
        label: stage.label,
        color: stage.color,
        cards: filteredCards.filter((card) => card.stage === stage.id),
      })),
    [filteredCards, stages]
  )

  const stats = React.useMemo(() => {
    const grouped = new Map<string, number>()
    for (const stage of stages) {
      grouped.set(stage.id, 0)
    }
    for (const card of filteredCards) {
      grouped.set(card.stage, (grouped.get(card.stage) ?? 0) + 1)
    }

    return {
      totale: filteredCards.length,
      grouped,
    }
  }, [filteredCards, stages])

  const metricGroups = React.useMemo<Array<Array<{ title: string; value: string; className?: string }>>>(
    () => [
      [
        {
          title: "Rapporti attivi",
          value: String(activeRapportiCount),
          className:
            "border-primary/30 [&_[data-slot=card-content]>p:first-child]:text-primary [&_[data-slot=card-content]>p:last-child]:text-primary/80",
        },
        {
          title: "Contributi totali",
          value: String(stats.totale),
          className:
            "border-primary/30 [&_[data-slot=card-content]>p:first-child]:text-primary [&_[data-slot=card-content]>p:last-child]:text-primary/80",
        },
      ],
      stages.map((stage) => ({
        title: stage.label,
        value: String(stats.grouped.get(stage.id) ?? 0),
      })),
    ],
    [activeRapportiCount, stages, stats.grouped, stats.totale]
  )

  const selectedCard = React.useMemo(
    () => cards.find((card) => card.id === selectedCardId) ?? null,
    [cards, selectedCardId]
  )

  return (
    <section className="flex h-full min-h-0 w-full min-w-0 flex-col space-y-3 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[240px] flex-1 sm:max-w-xs">
            <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-8"
              placeholder="Cerca famiglia o lavoratore"
            />
          </div>

          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="min-w-[180px]">
              <SelectValue placeholder="Tutti gli stati" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti gli stati</SelectItem>
              {stages.map((stage) => (
                <SelectItem key={stage.id} value={stage.id}>
                  {stage.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(search || stageFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("")
                setStageFilter("all")
              }}
            >
              Reset filtri
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">Trimestre</span>
          <Button variant="outline" size="icon-sm" onClick={() => setPeriod((current) => shiftQuarter(current, -1))}>
            <ChevronLeftIcon className="size-3.5" />
          </Button>
          <div className="text-foreground min-w-[120px] text-center text-sm font-medium">
            {period.quarter} {period.year}
          </div>
          <Button variant="outline" size="icon-sm" onClick={() => setPeriod((current) => shiftQuarter(current, 1))}>
            <ChevronRightIcon className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="min-h-0 pb-2">
        <div className="flex w-full items-stretch gap-3">
          {metricGroups.map((group, groupIndex) => (
            <React.Fragment key={groupIndex}>
              <div
                className={cn(
                  "grid flex-1 items-stretch gap-3",
                  group.length > 0 && "grid-cols-1"
                )}
                style={{ gridTemplateColumns: `repeat(${Math.max(group.length, 1)}, minmax(0, 1fr))` }}
              >
                {group.map((metric) => (
                  <div key={metric.title} className="min-w-0">
                    <StatisticsMetricCard
                      value={metric.value}
                      title={metric.title}
                      density="compact"
                      className={metric.className}
                    />
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
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Errore caricamento contributi INPS: {error}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden pb-2">
        <div className="flex h-full min-h-0 min-w-max gap-4">
          {loading
            ? Array.from({ length: 4 }).map((_, index) => <ContributoInpsBoardSkeletonColumn key={index} />)
            : columns.map((column) => (
                <ContributoInpsBoardColumn
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

      <ContributoInpsDetailSheet
        card={selectedCard}
        columns={columns}
        open={Boolean(selectedCard)}
        onOpenChange={(open) => {
          if (!open) setSelectedCardId(null)
        }}
        onStageChange={moveCard}
        onPatchCard={patchCard}
      />
    </section>
  )
}
