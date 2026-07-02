import * as React from "react"
import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleCheckBigIcon,
  CreditCardIcon,
  FileTextIcon,
} from "lucide-react"

import {
  useContributiInpsBoard,
  type ContributoInpsBoardCardData,
  type ContributoQuarterValue,
} from "../../hooks/use-contributi-inps-board"
import {
  AttachmentUploadSlot,
} from "@/components/shared-next/attachment-upload-slot"
import type { AttachmentLink } from "@/components/shared-next/attachment-utils"
import { DetailSectionBlock } from "@/components/shared-next/detail-section-card"
import { fetchContributiInpsByIds } from "../../queries/fetch-contributi-inps-by-ids"
import { fetchRapportiLavorativiByIds } from "@/modules/rapporti"
import { Form } from "@/components/ui/form"
import { FieldInput } from "@/components/forms/field-components"
import { useAutoSaveForm } from "@/hooks/use-auto-save-form"
import {
  buildAttachmentPayload,
  normalizeAttachmentArray,
} from "@/lib/attachments"
import {
  KanbanColumnShell,
  KanbanColumnSkeleton,
  type KanbanColumnVisual,
} from "@/components/shared-next/kanban"
import { LinkedRapportoSummaryCard } from "@/components/shared-next/linked-rapporto-summary-card"
import { SectionHeader } from "@/components/shared-next/section-header"
import { StatisticsMetricCard } from "@/components/shared-next/statistics-metric-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { SearchInput } from "@/components/ui/search-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { matchesSearchQuery } from "@/lib/search-utils"
import { supabase } from "@/lib/supabase-client"
import { cn } from "@/lib/utils"

type QuarterState = {
  quarter: ContributoQuarterValue
  year: number
}

export type ContributiColumnData = {
  id: string
  label: string
  color: string
  cards: ContributoInpsBoardCardData[]
}

const QUARTERS: ContributoQuarterValue[] = ["Q1", "Q2", "Q3", "Q4"]

function getCurrentQuarterState(): QuarterState {
  const now = new Date()
  const month = now.getUTCMonth()

  if (month <= 2) return { quarter: "Q1", year: now.getUTCFullYear() }
  if (month <= 5) return { quarter: "Q2", year: now.getUTCFullYear() }
  if (month <= 8) return { quarter: "Q3", year: now.getUTCFullYear() }
  return { quarter: "Q4", year: now.getUTCFullYear() }
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
    timeZone: "Europe/Rome",
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

function getColumnVisual(color: string): KanbanColumnVisual {
  switch (color.toLowerCase()) {
    case "sky":
      return { columnClassName: "bg-sky-400", headerClassName: "", iconClassName: "text-sky-500" }
    case "cyan":
      return { columnClassName: "bg-cyan-400", headerClassName: "", iconClassName: "text-cyan-500" }
    case "amber":
    case "yellow":
      return { columnClassName: "bg-amber-400", headerClassName: "", iconClassName: "text-amber-500" }
    case "green":
      return { columnClassName: "bg-green-400", headerClassName: "", iconClassName: "text-green-500" }
    default:
      return { columnClassName: "", headerClassName: "", iconClassName: "text-muted-foreground/80" }
  }
}

function ContributoInpsCard({ card }: { card: ContributoInpsBoardCardData }) {
  const hasAttachment = Boolean(card.record.allegato)

  return (
    <Card className="border border-border/70 bg-surface py-0 transition-shadow hover:shadow-md">
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
            className="rounded-full bg-violet-100 px-2.5 py-0.5 text-2xs text-violet-700 hover:bg-violet-100"
          >
            {card.trimestreLabel}
          </Badge>
          {card.pagopaLabel ? (
            <Badge
              variant="secondary"
              className="rounded-full bg-sky-100 px-2.5 py-0.5 text-2xs text-sky-700 hover:bg-sky-100"
            >
              PagoPA {card.pagopaLabel}
            </Badge>
          ) : null}
          {hasAttachment ? (
            <Badge
              variant="secondary"
              className="gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-2xs text-emerald-700 hover:bg-emerald-100"
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

export function ContributoInpsDetailSheet({
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
  const [selectedPreview, setSelectedPreview] = React.useState<AttachmentLink | null>(null)
  const [isUploadingAttachment, setIsUploadingAttachment] = React.useState(false)
  const [uploadError, setUploadError] = React.useState<string | null>(null)

  React.useEffect(() => {
    setStageValue(card?.stage ?? "")
    setSelectedPreview(null)
    setUploadError(null)
    setIsUploadingAttachment(false)
  }, [card?.id, card?.stage])

  // FASE 5 BIS — form + autosave (sostituisce i 3 useDebouncedSave). onSave
  // instrada su onPatchCard(card.id, …) con le trasformazioni originali
  // (parseNullableNumber per gli importi, ||null per la data). Il dirty-tracking
  // del form sostituisce le guardie "skip se invariato".
  const form = useAutoSaveForm({
    defaults: {
      importo_contributi_inps: card?.record.importo_contributi_inps?.toString() ?? "",
      valore_pagopa: card?.record.valore_pagopa?.toString() ?? "",
      data_invio_famiglia: toInputDateValue(card?.record.data_invio_famiglia),
    },
    onSave: async (patch) => {
      if (!card) return
      const out: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(patch)) {
        out[key] =
          key === "data_invio_famiglia"
            ? (value as string) || null
            : parseNullableNumber(value as string)
      }
      await onPatchCard(
        card.id,
        out as Partial<ContributoInpsBoardCardData["record"]>,
      )
    },
  })

  const handleStageValueChange = React.useCallback(
    async (nextValue: string) => {
      setStageValue(nextValue)
      if (!card || nextValue === card.stage) return
      await onStageChange(card.id, nextValue)
    },
    [card, onStageChange]
  )


  const handleUploadAttachment = React.useCallback(
    async (file: File) => {
      if (!card) return

      setUploadError(null)
      setIsUploadingAttachment(true)

      try {
        const safeName = sanitizeFileName(file.name || "allegato")
        const storagePath = ["contributi_inps", card.id, `${Date.now()}-${safeName}`].join("/")

        const uploadResult = await supabase.storage.from("baze-bucket").upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || undefined,
        })

        if (uploadResult.error) {
          throw uploadResult.error
        }

        const payload = buildAttachmentPayload(file, storagePath)

        await onPatchCard(card.id, {
          allegato: [...normalizeAttachmentArray(card.record.allegato), payload],
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

  const handleRemoveAttachment = React.useCallback(
    async (link: AttachmentLink) => {
      if (!card) return

      setUploadError(null)
      setIsUploadingAttachment(true)

      try {
        const nextValue = normalizeAttachmentArray(card.record.allegato).filter(
          (a) => !(link.path && a.path === link.path) && a.name !== link.label,
        )

        if (link.path?.startsWith("baze-bucket/")) {
          await supabase.storage
            .from("baze-bucket")
            .remove([link.path.replace(/^baze-bucket\//, "")])
        }

        await onPatchCard(card.id, {
          allegato: nextValue.length > 0 ? nextValue : null,
        })
      } catch (caughtError) {
        setUploadError(
          caughtError instanceof Error ? caughtError.message : "Errore rimuovendo allegato",
        )
      } finally {
        setIsUploadingAttachment(false)
      }
    },
    [card, onPatchCard],
  )

  React.useEffect(() => {
    if (open) return
    setSelectedPreview(null)
  }, [open])

  return (
    <Form {...form}>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-[min(96vw,980px)]! max-w-none! p-0 sm:max-w-none">
          <SheetHeader className="border-b bg-surface px-5 py-5">
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
            <section className="h-full overflow-y-auto bg-surface-muted px-5 py-5">
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
                      <FieldInput
                        name="importo_contributi_inps"
                        type="number"
                        step="0.01"
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="ui-type-label">Valore PagoPA</p>
                      <FieldInput
                        name="valore_pagopa"
                        type="number"
                        step="0.01"
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="ui-type-label">Data invio famiglia</p>
                      <FieldInput name="data_invio_famiglia" type="date" />
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
                    onRemove={(link) => void handleRemoveAttachment(link)}
                    onPreviewOpen={setSelectedPreview}
                    isUploading={isUploadingAttachment}
                  />
                  {uploadError ? <p className="text-sm text-red-600">{uploadError}</p> : null}
                </DetailSectionBlock>
              </div>
            </section>
          ) : (
            <DetailSheetSkeleton />
          )}
        </SheetContent>
      </Sheet>
      <Dialog open={Boolean(selectedPreview)} onOpenChange={(nextOpen) => !nextOpen && setSelectedPreview(null)}>
        <DialogContent
          className="max-w-[min(96vw,72rem)] border-none bg-neutral-950/90 p-2 shadow-none sm:max-w-[min(96vw,72rem)]"
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
    </Form>
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
  const visual = getColumnVisual(column.color)

  return (
    <KanbanColumnShell
      columnId={column.id}
      title={column.label}
      countLabel={`${column.cards.length} ${column.cards.length === 1 ? "contributo" : "contributi"}`}
      visual={visual}
      density="compact"
      widthClassName="w-73"
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
  return <KanbanColumnSkeleton widthClassName="w-73" density="compact" showBadgeRow />
}

function DetailSheetSkeleton() {
  return (
    <section className="h-full overflow-y-auto bg-surface-muted px-5 py-5">
      <div className="mx-auto max-w-5xl space-y-5">
        <Skeleton className="h-24 rounded-lg" />
        <div className="rounded-lg border bg-surface p-4">
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
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
  const [selectedCard, setSelectedCard] = React.useState<ContributoInpsBoardCardData | null>(null)

  const filteredCards = React.useMemo(() => {
    return cards.filter((card) => {
      if (stageFilter !== "all" && card.stage !== stageFilter) return false

      return matchesSearchQuery(
        [
          card.id,
          card.nomeFamiglia,
          card.nomeLavoratore,
          card.nomeCompleto,
          card.trimestreLabel,
          card.importoLabel,
          card.pagopaLabel,
          card.rapporto?.id,
          card.rapporto?.id_rapporto,
          card.rapporto?.codice_datore_webcolf,
          card.rapporto?.codice_dipendente_webcolf,
          card.rapporto?.cognome_nome_datore_proper,
          card.rapporto?.nome_lavoratore_per_url,
          card.rapporto?.tipo_rapporto,
          card.rapporto?.tipo_contratto,
        ],
        search,
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
        },
        {
          title: "Contributi totali",
          value: String(stats.totale),
        },
      ],
      stages.map((stage) => ({
        title: stage.label,
        value: String(stats.grouped.get(stage.id) ?? 0),
      })),
    ],
    [activeRapportiCount, stages, stats.grouped, stats.totale]
  )

  const selectedCardFromCards = React.useMemo(
    () => cards.find((card) => card.id === selectedCardId) ?? null,
    [cards, selectedCardId]
  )

  React.useEffect(() => {
    if (!selectedCardId) {
      setSelectedCard(null)
      return
    }
    if (!selectedCardFromCards) return

    let isActive = true
    const currentCardId = selectedCardId
    const currentCard = selectedCardFromCards
    setSelectedCard(null)

    async function loadSelectedCard() {
      try {
        const recordResponse = await fetchContributiInpsByIds([currentCardId])

        const freshRecord = recordResponse.rows[0] as ContributoInpsBoardCardData["record"] | undefined
        if (!isActive || !freshRecord) return

        const rapportoId =
          currentCard.rapporto?.id ??
          (typeof freshRecord.rapporto_lavorativo_id === "string" ? freshRecord.rapporto_lavorativo_id : null)

        const rapportoResponse = rapportoId
          ? await fetchRapportiLavorativiByIds([rapportoId])
          : { rows: [], total: 0, columns: [] }

        const freshRapporto =
          (rapportoResponse.rows[0] as ContributoInpsBoardCardData["rapporto"]) ??
          currentCard.rapporto

        if (!isActive) return

        setSelectedCard({
          ...currentCard,
          record: freshRecord,
          rapporto: freshRapporto,
        })
      } catch (error) {
        if (!isActive) return
        console.error("Errore caricando dettaglio contributo", error)
      }
    }

    void loadSelectedCard()

    return () => {
      isActive = false
    }
    // Watching id only on purpose: avoid re-fetching detail on every board refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCardFromCards?.id, selectedCardId])

  const quarterSwitcher = (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label="Trimestre precedente"
        onClick={() => setPeriod((current) => shiftQuarter(current, -1))}
      >
        <ChevronLeftIcon />
      </Button>
      <div className="text-foreground inline-flex h-8 min-w-30 items-center justify-center gap-2 rounded-md text-sm font-medium">
        <CalendarDaysIcon className="text-muted-foreground size-4" />
        {period.quarter} {period.year}
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label="Trimestre successivo"
        onClick={() => setPeriod((current) => shiftQuarter(current, 1))}
      >
        <ChevronRightIcon />
      </Button>
    </div>
  )

  return (
    <section className="ui flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden">
      <SectionHeader>
        <SectionHeader.Title
          subtitle={`${stats.totale} ${stats.totale === 1 ? "contributo" : "contributi"}`}
        >
          Contributi INPS
        </SectionHeader.Title>
        <SectionHeader.Actions>{quarterSwitcher}</SectionHeader.Actions>
        <SectionHeader.Toolbar>
          <div className="w-full md:max-w-sm">
            <SearchInput
              placeholder="Cerca famiglia o lavoratore..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onClear={() => setSearch("")}
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            {search || stageFilter !== "all" ? (
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
            ) : null}
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="min-w-50">
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
          </div>
        </SectionHeader.Toolbar>
      </SectionHeader>

      <div className="px-4 pt-4">
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
        <div className="mx-4 mt-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Errore caricamento contributi INPS: {error}
        </div>
      ) : null}

      <div className="scrollbar-visible min-h-0 flex-1 overflow-x-auto overflow-y-hidden px-4 pb-2 pt-4 [scrollbar-gutter:stable]">
        <div className="flex h-full min-h-0 min-w-max gap-4">
          {loading
            ? Array.from({ length: 4 }).map((_, index) => <ContributoInpsBoardSkeletonColumn key={index} />)
            : columns.map((column) => (
                <ContributoInpsBoardColumn
                  key={column.id}
                  column={column}
                  draggingRecordId={draggingRecordId}
                  isDropTarget={dropTargetColumnId === column.id}
                  onOpenCard={(cardId) => {
                    setSelectedCard(null)
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
                    void moveCard(recordId, columnId)
                  }}
                />
              ))}
        </div>
      </div>

      <ContributoInpsDetailSheet
        // Remount on card switch so debounced inputs reset their local draft.
        key={selectedCardId ?? "__empty__"}
        card={selectedCard}
        columns={columns}
        open={Boolean(selectedCardId)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedCardId(null)
            setSelectedCard(null)
          }
        }}
        onStageChange={moveCard}
        onPatchCard={async (recordId, patch) => {
          await patchCard(recordId, patch)
          setSelectedCard((current) =>
            current?.id === recordId
              ? { ...current, record: { ...current.record, ...patch } }
              : current
          )
        }}
      />
    </section>
  )
}
