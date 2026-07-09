import * as React from "react"
import { useController } from "react-hook-form"
import {
  CalendarClockIcon,
  CalendarIcon,
  CheckCircle2Icon,
  Clock3Icon,
  FileTextIcon,
  MailIcon,
  PhoneCallIcon,
  XCircleIcon,
} from "lucide-react"

import type {
  RiattivazioneStageId,
  RiattivazioniBoardCardData,
  RiattivazioniBoardColumnData,
} from "../types"
import { useRiattivazioniBoard } from "../hooks/use-riattivazioni-board"
import { AttachmentUploadSlot } from "@/components/shared-next/attachment-upload-slot"
import { type AttachmentLink } from "@/components/shared-next/attachment-utils"
import { DetailField, DetailSectionBlock } from "@/components/shared-next/detail-section-card"
import {
  KanbanColumnShell,
  KanbanColumnSkeleton,
} from "@/components/shared-next/kanban"
import { LinkedRapportoSummaryCard } from "@/components/shared-next/linked-rapporto-summary-card"
import { RecordCard } from "@/components/shared-next/record-card"
import { SectionHeader } from "@/components/shared-next/section-header"
import { FieldInput } from "@/components/forms/field-components"
import { useAutoSaveForm } from "@/hooks/use-auto-save-form"
import { Badge } from "@/components/ui/badge"
import { Form } from "@/components/ui/form"
import { SearchInput } from "@/components/ui/search-input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { buildAttachmentPayload, normalizeAttachmentArray } from "@/lib/attachments"
import { sanitizeFileName } from "@/lib/file-utils"
import { toIsoDateInputValue } from "@/lib/format-utils"
import { getKanbanColumnVisual } from "@/lib/kanban-column-utils"
import { getLookupBadgeSoftClassName } from "@/lib/lookup-color-styles"
import { matchesSearchQuery } from "@/lib/search-utils"
import { supabase } from "@/lib/supabase-client"
import { updateRecord } from "@/lib/record-crud"
import { cn } from "@/lib/utils"

type ChiusuraAttachmentSlot = "allegato_compilato" | "documenti_chiusura_rapporto"

const EMPTY_SELECT_VALUE = "__empty__"
const SCONTO_RIATTIVAZIONE_OPTION = "mese gratis"

function riattivazioniStageTestId(stageId: string) {
  return `kanban-column-${stageId.replace(/\s+/g, "_")}`
}

function formatDate(value: string | null | undefined) {
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

function getStageColor(stageId: RiattivazioneStageId) {
  switch (stageId) {
    case "da sentire":
      return "sky"
    case "in attesa":
      return "amber"
    case "riattivato":
      return "emerald"
    case "non riattiva":
      return "rose"
  }
}

function renderStageIcon(stageId: RiattivazioneStageId) {
  switch (stageId) {
    case "da sentire":
      return <PhoneCallIcon className="size-3.5" />
    case "in attesa":
      return <Clock3Icon className="size-3.5" />
    case "riattivato":
      return <CheckCircle2Icon className="size-3.5" />
    case "non riattiva":
      return <XCircleIcon className="size-3.5" />
  }
}

// FASE 5 BIS — wrapper form-aware per lo sconto: il form memorizza il valore DB
// (stringa o "" per "nessuno"), ma il Select usa il sentinel EMPTY_SELECT_VALUE
// per l'opzione vuota. Qui mappiamo sentinel↔"" senza che la card lo sappia.
function FieldScontoSelect({ name }: { name: string }) {
  const { field } = useController({ name })
  const current = typeof field.value === "string" && field.value ? field.value : EMPTY_SELECT_VALUE
  return (
    <Select
      value={current}
      onValueChange={(next) =>
        field.onChange(next === EMPTY_SELECT_VALUE ? "" : next)
      }
    >
      <SelectTrigger className="bg-surface">
        <SelectValue placeholder="Seleziona sconto" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={EMPTY_SELECT_VALUE}>Nessuno sconto</SelectItem>
        <SelectItem value={SCONTO_RIATTIVAZIONE_OPTION}>
          {SCONTO_RIATTIVAZIONE_OPTION}
        </SelectItem>
      </SelectContent>
    </Select>
  )
}

function RiattivazioniDetailSheet({
  card,
  columns,
  open,
  onOpenChange,
  onStatusChange,
  onCardChange,
}: {
  card: RiattivazioniBoardCardData | null
  columns: RiattivazioniBoardColumnData[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onStatusChange: (recordId: string, targetStageId: RiattivazioneStageId) => Promise<void>
  onCardChange: (card: RiattivazioniBoardCardData) => void
}) {
  const [updatingStatus, setUpdatingStatus] = React.useState(false)
  const [uploadingSlot, setUploadingSlot] = React.useState<ChiusuraAttachmentSlot | null>(null)
  const [detailsError, setDetailsError] = React.useState<string | null>(null)
  const latestCardRef = React.useRef<RiattivazioniBoardCardData | null>(card)

  React.useEffect(() => {
    latestCardRef.current = card
  }, [card])

  const applyCardChange = React.useCallback(
    (nextCard: RiattivazioniBoardCardData) => {
      latestCardRef.current = nextCard
      onCardChange(nextCard)
    },
    [onCardChange]
  )

  async function handleStatusChange(nextValue: string) {
    const currentCard = latestCardRef.current ?? card
    if (!currentCard || nextValue === currentCard.stage) return
    try {
      setUpdatingStatus(true)
      setDetailsError(null)
      await onStatusChange(currentCard.id, nextValue as RiattivazioneStageId)
    } catch (caughtError) {
      setDetailsError(
        caughtError instanceof Error ? caughtError.message : "Errore aggiornando stato riattivazione",
      )
    } finally {
      setUpdatingStatus(false)
    }
  }

  // FASE 5 BIS — form + autosave: sostituisce DebouncedInput committedValue (data
  // recall) e il Select onValueChange (sconto). onSave instrada ogni chiave al
  // medesimo updateRecord("chiusure_contratti", …) dell'originale, con le stesse
  // trasformazioni (""→null) e preservando l'optimistic local-merge via
  // applyCardChange(response.row) e l'errore inline (setDetailsError). Il
  // dirty-tracking del form sostituisce le guardie "skip se invariato".
  const form = useAutoSaveForm({
    defaults: {
      data_per_riattivazione: toIsoDateInputValue(card?.record.data_per_riattivazione),
      sconto_proposto_riattivazione: card?.record.sconto_proposto_riattivazione ?? "",
    },
    onSave: async (patch) => {
      const currentCard = latestCardRef.current ?? card
      if (!currentCard) return
      const out: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(patch)) {
        out[key] = (value as string) || null
      }
      setDetailsError(null)
      try {
        const response = await updateRecord("chiusure_contratti", currentCard.id, out)
        const baseCard = latestCardRef.current ?? currentCard
        const nextRecord = {
          ...baseCard.record,
          ...response.row,
        } as RiattivazioniBoardCardData["record"]
        applyCardChange({
          ...baseCard,
          record: nextRecord,
        })
      } catch (caughtError) {
        setDetailsError(
          caughtError instanceof Error
            ? caughtError.message
            : "Errore aggiornando riattivazione",
        )
      }
    },
  })

  async function handleUploadAttachment(slot: ChiusuraAttachmentSlot, file: File) {
    const currentCard = latestCardRef.current ?? card
    if (!currentCard) return

    setUploadingSlot(slot)
    setDetailsError(null)

    try {
      const safeName = sanitizeFileName(file.name || "documento", "documento")
      const storagePath = [
        "chiusure_contratti",
        currentCard.id,
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
      const baseCard = latestCardRef.current ?? currentCard
      const nextValue = [...normalizeAttachmentArray(baseCard.record[slot]), payload]
      const response = await updateRecord("chiusure_contratti", currentCard.id, {
        [slot]: nextValue,
      })
      const nextRecord = {
        ...baseCard.record,
        ...response.row,
      } as RiattivazioniBoardCardData["record"]

      applyCardChange({
        ...baseCard,
        record: nextRecord,
      })
    } catch (caughtError) {
      setDetailsError(
        caughtError instanceof Error ? caughtError.message : "Errore caricando allegato chiusura",
      )
    } finally {
      setUploadingSlot(null)
    }
  }

  async function handleRemoveAttachment(slot: ChiusuraAttachmentSlot, link: AttachmentLink) {
    const currentCard = latestCardRef.current ?? card
    if (!currentCard) return

    setUploadingSlot(slot)
    setDetailsError(null)

    try {
      const nextValue = normalizeAttachmentArray(currentCard.record[slot]).filter(
        (a) => !(link.path && a.path === link.path) && a.name !== link.label,
      )

      if (link.path?.startsWith("baze-bucket/")) {
        await supabase.storage
          .from("baze-bucket")
          .remove([link.path.replace(/^baze-bucket\//, "")])
      }

      const baseCard = latestCardRef.current ?? currentCard
      const response = await updateRecord("chiusure_contratti", currentCard.id, {
        [slot]: nextValue.length > 0 ? nextValue : null,
      })

      applyCardChange({
        ...baseCard,
        record: { ...baseCard.record, ...response.row } as RiattivazioniBoardCardData["record"],
      })
    } catch (caughtError) {
      setDetailsError(
        caughtError instanceof Error ? caughtError.message : "Errore rimuovendo allegato",
      )
    } finally {
      setUploadingSlot(null)
    }
  }

  return (
    <Form {...form}>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[min(96vw,900px)]! max-w-none! p-0 sm:max-w-none">
        <SheetHeader className="border-b bg-surface px-5 py-5">
          <div className="space-y-3">
            <div className="min-w-0">
              <SheetTitle className="truncate text-xl font-semibold">
                {card?.nomeCompleto ?? "Dettaglio riattivazione"}
              </SheetTitle>
              <SheetDescription className="sr-only">
                Dettaglio riattivazione famiglia con stato, rapporto collegato e dati chiusura.
              </SheetDescription>
              <p className="mt-1 text-sm text-muted-foreground">
                Chiusura creata il {formatDate(card?.record.creato_il)}
              </p>
            </div>

            {card ? (
              <Select value={card.stage} onValueChange={handleStatusChange} disabled={updatingStatus}>
                <SelectTrigger className="h-8 w-auto gap-1.5 rounded-full bg-surface px-3 text-xs font-medium">
                  <SelectValue placeholder="Seleziona stato" />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((column) => (
                    <SelectItem key={column.id} value={column.id}>
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
              <LinkedRapportoSummaryCard title={card.nomeCompleto} rapporto={card.rapporto} />

              <DetailSectionBlock
                title="Dati chiusura"
                icon={<FileTextIcon className="size-4" />}
                contentClassName="grid gap-4 md:grid-cols-2"
              >
                <DetailField label="Data fine rapporto" value={formatDate(card.record.data_fine_rapporto)} />
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">
                    Data recall riattivazione
                  </span>
                  <FieldInput
                    name="data_per_riattivazione"
                    type="date"
                    className="bg-surface"
                  />
                </label>
                <DetailField label="Tipo" value={card.tipoLabel} />
                <DetailField label="Presenze ultimo mese" value={card.record.presenze_ultimo_mese ?? "-"} />
                <DetailField label="Email" value={card.email} />
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">
                    Sconto proposto riattivazione
                  </span>
                  <FieldScontoSelect name="sconto_proposto_riattivazione" />
                </div>
                <DetailField
                  label="Motivazione"
                  value={card.record.motivazione_lost ?? "-"}
                  multiline
                  className="md:col-span-2"
                />
                <DetailField
                  label="Informazioni aggiuntive"
                  value={card.record.informazioni_aggiuntive ?? "-"}
                  multiline
                  className="md:col-span-2"
                />
                {detailsError ? (
                  <p className="text-xs font-medium text-red-600 md:col-span-2">{detailsError}</p>
                ) : null}
              </DetailSectionBlock>

              <DetailSectionBlock
                title="Allegati chiusura"
                icon={<FileTextIcon className="size-4" />}
                contentClassName="space-y-4"
              >
                <AttachmentUploadSlot
                  label="Lettera dimissioni / licenziamento"
                  value={card.record.allegato_compilato ?? null}
                  onAdd={(file) => void handleUploadAttachment("allegato_compilato", file)}
                  onRemove={(link) => void handleRemoveAttachment("allegato_compilato", link)}
                  onPreviewOpen={() => {}}
                  isUploading={uploadingSlot === "allegato_compilato"}
                />
                <AttachmentUploadSlot
                  label="Documenti finali di chiusura"
                  value={card.record.documenti_chiusura_rapporto ?? null}
                  onAdd={(file) => void handleUploadAttachment("documenti_chiusura_rapporto", file)}
                  onRemove={(link) => void handleRemoveAttachment("documenti_chiusura_rapporto", link)}
                  onPreviewOpen={() => {}}
                  isUploading={uploadingSlot === "documenti_chiusura_rapporto"}
                />
              </DetailSectionBlock>
            </div>
          </section>
        ) : null}
      </SheetContent>
    </Sheet>
    </Form>
  )
}

function RiattivazioniBoardCard({
  card,
  dragging,
  onOpen,
  onDragStart,
  onDragEnd,
}: {
  card: RiattivazioniBoardCardData
  dragging: boolean
  onOpen: () => void
  onDragStart: (event: React.DragEvent<HTMLDivElement>) => void
  onDragEnd: () => void
}) {
  return (
    <div
      draggable
      data-testid={`riattivazioni-card-${card.id}`}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      className={cn("cursor-grab transition-opacity active:cursor-grabbing", dragging && "opacity-40")}
    >
      <RecordCard>
        <RecordCard.Header
          title={card.famigliaLabel}
          subtitle={card.lavoratoreLabel}
          rightSlot={
            <Badge
              variant="outline"
              className={cn(
                "flex size-6 items-center justify-center rounded-full p-0",
                getLookupBadgeSoftClassName(getStageColor(card.stage)),
              )}
              aria-label={card.stage}
              title={card.stage}
            >
              {renderStageIcon(card.stage)}
            </Badge>
          }
        />
        <RecordCard.Body>
          <div>
            <Badge variant="outline" className="rounded-full px-2.5 text-2xs font-medium">
              {card.tipoLabel}
            </Badge>
          </div>
          <div className="space-y-1.5 border-t pt-2 text-xs text-muted-foreground">
            <p className="flex items-center gap-1.5 truncate">
              <MailIcon className="size-3.5 shrink-0" />
              <span className="truncate">{card.email}</span>
            </p>
            <p className="flex items-center gap-1.5 truncate">
              <CalendarIcon className="size-3.5 shrink-0" />
              <span className="truncate">{card.dataFineRapporto}</span>
            </p>
            <p className="flex items-center gap-1.5 truncate">
              <CalendarClockIcon className="size-3.5 shrink-0" />
              <span className="truncate">{formatDate(card.record.data_per_riattivazione)}</span>
            </p>
            {card.motivazione ? <p className="line-clamp-2">{card.motivazione}</p> : null}
            {card.record.sconto_proposto_riattivazione ? (
              <p className="truncate">Sconto {card.record.sconto_proposto_riattivazione}</p>
            ) : null}
          </div>
        </RecordCard.Body>
      </RecordCard>
    </div>
  )
}

function RiattivazioniBoardColumn({
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
  column: RiattivazioniBoardColumnData
  draggingRecordId: string | null
  isDropTarget: boolean
  onOpenCard: (recordId: string) => void
  onDragStartCard: (recordId: string) => void
  onDragEndCard: () => void
  onDragEnterColumn: (columnId: RiattivazioneStageId) => void
  onDragOverColumn: (columnId: RiattivazioneStageId) => void
  onDragLeaveColumn: (event: React.DragEvent<HTMLDivElement>) => void
  onDropToColumn: (columnId: RiattivazioneStageId, recordId: string | null) => void
}) {
  const visual = getKanbanColumnVisual(column.color)

  return (
    <KanbanColumnShell
      columnId={column.id}
      title={column.label}
      countLabel={`${column.cards.length} ${column.cards.length === 1 ? "chiusura" : "chiusure"}`}
      visual={visual}
      testId={riattivazioniStageTestId(column.id)}
      isDropTarget={isDropTarget}
      emptyMessage="Nessuna chiusura"
      onDragEnter={(columnId) => onDragEnterColumn(columnId as RiattivazioneStageId)}
      onDragOver={(columnId) => onDragOverColumn(columnId as RiattivazioneStageId)}
      onDragLeave={onDragLeaveColumn}
      onDrop={(columnId, payload) => onDropToColumn(columnId as RiattivazioneStageId, payload)}
    >
      {column.cards.map((card) => (
        <RiattivazioniBoardCard
          key={card.id}
          card={card}
          dragging={draggingRecordId === card.id}
          onOpen={() => onOpenCard(card.id)}
          onDragStart={(event) => {
            event.dataTransfer.setData("text/plain", card.id)
            event.dataTransfer.effectAllowed = "move"
            onDragStartCard(card.id)
          }}
          onDragEnd={onDragEndCard}
        />
      ))}
    </KanbanColumnShell>
  )
}

export function RiattivazioniBoardView() {
  const { loading, error, columns, moveCard, updateCard } = useRiattivazioniBoard()
  const [draggingRecordId, setDraggingRecordId] = React.useState<string | null>(null)
  const [dropTargetColumnId, setDropTargetColumnId] = React.useState<RiattivazioneStageId | null>(null)
  const [selectedCardId, setSelectedCardId] = React.useState<string | null>(null)
  const [searchValue, setSearchValue] = React.useState("")

  const filteredColumns = React.useMemo(() => {
    const mappedColumns = columns.map((column) => ({
      ...column,
      cards: column.cards.filter((card) =>
        matchesSearchQuery(
          [
            card.id,
            card.nomeCompleto,
            card.famigliaLabel,
            card.lavoratoreLabel,
            card.email,
            card.motivazione,
            card.tipoLabel,
            card.dataFineRapporto,
            card.record.data_per_riattivazione,
            card.record.sconto_proposto_riattivazione,
            card.stage,
            card.rapporto?.id,
            card.rapporto?.id_rapporto,
            card.rapporto?.cognome_nome_datore_proper,
            card.rapporto?.nome_lavoratore_per_url,
            card.rapporto?.tipo_rapporto,
            card.rapporto?.tipo_contratto,
          ],
          searchValue,
        ),
      ),
    }))

    return mappedColumns
  }, [columns, searchValue])

  const totalRiattivazioni = React.useMemo(
    () => filteredColumns.reduce((sum, column) => sum + column.cards.length, 0),
    [filteredColumns],
  )

  const selectedCard = React.useMemo(
    () => columns.flatMap((column) => column.cards).find((card) => card.id === selectedCardId) ?? null,
    [columns, selectedCardId],
  )

  return (
    <>
      <section className="ui flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden">
        <SectionHeader>
          <SectionHeader.Title
            subtitle={`${totalRiattivazioni} ${totalRiattivazioni === 1 ? "chiusura" : "chiusure"}`}
          >
            Riattivazioni
          </SectionHeader.Title>
          <SectionHeader.Toolbar>
            <SearchInput
              className="md:max-w-sm"
              data-testid="riattivazioni-search-input"
              placeholder="Cerca per famiglia, lavoratore, email, motivazione..."
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              onClear={() => setSearchValue("")}
            />
          </SectionHeader.Toolbar>
        </SectionHeader>

        {error ? (
          <div className="mx-4 mt-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Errore caricamento riattivazioni: {error}
          </div>
        ) : null}

        <div className="scrollbar-visible min-h-0 flex-1 overflow-x-auto overflow-y-hidden px-4 pb-2 pt-4 [scrollbar-gutter:stable]">
          <div className="flex h-full min-h-0 min-w-max gap-4">
            {loading
              ? Array.from({ length: 4 }).map((_, index) => <KanbanColumnSkeleton key={index} />)
              : filteredColumns.map((column) => (
                  <RiattivazioniBoardColumn
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
      </section>

      <RiattivazioniDetailSheet
        // Remount on card switch so debounced inputs reset their local draft.
        key={selectedCardId ?? "__empty__"}
        card={selectedCard}
        columns={columns}
        open={Boolean(selectedCard)}
        onOpenChange={(open) => {
          if (!open) setSelectedCardId(null)
        }}
        onStatusChange={moveCard}
        onCardChange={(nextCard) => updateCard(nextCard.id, () => nextCard)}
      />
    </>
  )
}
