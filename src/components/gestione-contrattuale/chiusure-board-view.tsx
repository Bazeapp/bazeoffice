import * as React from "react"
import {
  CalendarIcon,
  CalendarX2Icon,
  FileTextIcon,
  FileX2Icon,
  MailIcon,
  PencilIcon,
} from "lucide-react"

import {
  type ChiusureBoardCardData,
  type ChiusureBoardColumnData,
  useChiusureBoard,
} from "@/hooks/use-chiusure-board"
import { AttachmentUploadSlot } from "@/components/shared/attachment-upload-slot"
import { DetailSectionBlock } from "@/components/shared/detail-section-card"
import { KanbanColumnShell, KanbanColumnSkeleton } from "@/components/shared/kanban"
import { LinkedRapportoSummaryCard } from "@/components/shared/linked-rapporto-summary-card"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

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

function getLicenziamentoVariant(label: string | null | undefined) {
  const normalized = String(label ?? "").toLowerCase()
  if (normalized.includes("prova")) {
    return "bg-amber-100 text-amber-700"
  }
  if (normalized.includes("preavviso")) {
    return "bg-sky-100 text-sky-700"
  }
  if (normalized.includes("decesso")) {
    return "bg-rose-100 text-rose-700"
  }
  return "bg-muted text-foreground"
}

function getLookupBadgeClasses(color: string | null | undefined) {
  switch (String(color ?? "").toLowerCase()) {
    case "sky":
    case "cyan":
      return "bg-sky-100 text-sky-700"
    case "teal":
      return "bg-teal-100 text-teal-700"
    case "lime":
    case "green":
      return "bg-green-100 text-green-700"
    case "amber":
    case "yellow":
      return "bg-amber-100 text-amber-700"
    case "orange":
      return "bg-orange-100 text-orange-700"
    case "red":
    case "rose":
    case "pink":
      return "bg-rose-100 text-rose-700"
    case "violet":
    case "purple":
      return "bg-violet-100 text-violet-700"
    case "zinc":
    case "gray":
    case "grey":
      return "bg-zinc-100 text-zinc-700"
    default:
      return "bg-muted text-foreground"
  }
}

function ChiusureDetailSheet({
  card,
  columns,
  open,
  onOpenChange,
  onStatusChange,
}: {
  card: ChiusureBoardCardData | null
  columns: ChiusureBoardColumnData[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onStatusChange: (recordId: string, targetStageId: string) => Promise<void>
}) {
  const [updatingStatus, setUpdatingStatus] = React.useState(false)

  async function handleStatusChange(nextValue: string) {
    if (!card || nextValue === card.stage) return
    try {
      setUpdatingStatus(true)
      await onStatusChange(card.id, nextValue)
    } finally {
      setUpdatingStatus(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[min(96vw,980px)]! max-w-none! p-0 sm:max-w-none">
        <SheetHeader className="border-b bg-background px-5 py-5">
          <div className="space-y-4">
            <div className="min-w-0">
              <div className="flex items-start justify-between gap-4">
                <SheetTitle className="truncate text-xl font-semibold">
                  {card?.nomeCompleto ?? "Dettaglio chiusura"}
                </SheetTitle>
              </div>
              <SheetDescription className="sr-only">
                Dettaglio pratica di chiusura con stato, riepilogo rapporto e allegati.
              </SheetDescription>
              <p className="text-muted-foreground mt-2 text-sm">
                Creata il {formatDate(card?.record.data_creazione)}
              </p>
            </div>

            <div className="grid max-w-md gap-2">
              <span className="text-muted-foreground text-sm font-medium">Stato</span>
              <Select
                value={card?.stage}
                onValueChange={handleStatusChange}
                disabled={!card || updatingStatus}
              >
                <SelectTrigger>
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
            </div>
          </div>
        </SheetHeader>

        {card ? (
          <section className="h-full overflow-y-auto bg-muted/20 px-5 py-5">
            <div className="mx-auto max-w-5xl space-y-5">
              <LinkedRapportoSummaryCard title={card.nomeCompleto} rapporto={card.rapporto} />

              <DetailSectionBlock
                title="Dettagli chiusura"
                icon={<FileTextIcon className="text-muted-foreground size-5" />}
                action={<PencilIcon className="text-muted-foreground size-4" />}
                contentClassName="space-y-5"
              >
                <div className="flex items-center gap-2 text-sm sm:text-base">
                  <CalendarX2Icon className="text-muted-foreground size-5 shrink-0" />
                  <span className="text-muted-foreground">Data fine rapporto:</span>
                  <span className="font-semibold text-foreground">
                    {formatDate(card.record.data_fine_rapporto)}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm sm:text-base">
                  <span className="text-muted-foreground">Tipo:</span>
                  <span
                    className={cn(
                      "inline-flex rounded-full px-3 py-1 text-sm font-medium",
                      card.tipoColor
                        ? getLookupBadgeClasses(card.tipoColor)
                        : getLicenziamentoVariant(card.record.tipo_licenziamento)
                    )}
                  >
                    {card.tipoLabel}
                  </span>
                </div>

                <div className="grid gap-4 border-t border-border/70 pt-5 text-sm sm:text-base">
                  <p>
                    <span className="text-muted-foreground">Presenze ultimo mese:</span>{" "}
                    <span className="font-medium text-foreground">
                      {card.record.presenze_ultimo_mese ?? "-"}
                    </span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Motivazione:</span>{" "}
                    <span className="font-medium text-foreground">
                      {card.record.motivazione_cessazione_rapporto ?? "-"}
                    </span>
                  </p>
                </div>
              </DetailSectionBlock>

              <DetailSectionBlock
                title="Allegato chiusura"
                icon={<FileTextIcon className="text-muted-foreground size-5" />}
                contentClassName="space-y-4"
              >
                <AttachmentUploadSlot
                  label="Lettera dimissioni / licenziamento"
                  value={card.record.documenti_chiusura_rapporto ?? card.record.allegato_compilato ?? null}
                  onAdd={() => {}}
                  onPreviewOpen={() => {}}
                  isUploading={false}
                />
              </DetailSectionBlock>
            </div>
          </section>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function getColumnClasses(color: string) {
  switch (color.toLowerCase()) {
    case "violet":
      return {
        columnClassName: "border-violet-300 bg-violet-50/70",
        headerClassName: "border-b border-violet-200/70",
        iconClassName: "text-violet-500",
      }
    case "zinc":
      return {
        columnClassName: "border-zinc-300 bg-zinc-50/70",
        headerClassName: "border-b border-zinc-200/70",
        iconClassName: "text-zinc-500",
      }
    case "sky":
      return {
        columnClassName: "border-sky-300 bg-sky-50/70",
        headerClassName: "border-b border-sky-200/70",
        iconClassName: "text-sky-500",
      }
    case "lime":
      return {
        columnClassName: "border-lime-300 bg-lime-50/70",
        headerClassName: "border-b border-lime-200/70",
        iconClassName: "text-lime-500",
      }
    case "amber":
      return {
        columnClassName: "border-amber-300 bg-amber-50/70",
        headerClassName: "border-b border-amber-200/70",
        iconClassName: "text-amber-500",
      }
    case "orange":
      return {
        columnClassName: "border-orange-300 bg-orange-50/70",
        headerClassName: "border-b border-orange-200/70",
        iconClassName: "text-orange-500",
      }
    case "green":
      return {
        columnClassName: "border-green-300 bg-green-50/70",
        headerClassName: "border-b border-green-200/70",
        iconClassName: "text-green-600",
      }
    default:
      return {
        columnClassName: "border-border bg-muted/40",
        headerClassName: "border-b border-border/70",
        iconClassName: "text-muted-foreground",
      }
  }
}

function ChiusureBoardCard({
  card,
  dragging,
  onOpen,
  onDragStart,
  onDragEnd,
}: {
  card: ChiusureBoardCardData
  dragging: boolean
  onOpen: () => void
  onDragStart: (event: React.DragEvent<HTMLDivElement>) => void
  onDragEnd: () => void
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn("cursor-grab transition-opacity active:cursor-grabbing", dragging && "opacity-40")}
    >
      <Card
        className="border border-border/70 bg-white py-2 transition-shadow hover:shadow-md"
        onClick={onOpen}
      >
        <CardContent className="space-y-3 px-3">
          <div className="space-y-2">
            <p className="text-sm font-semibold leading-tight">{card.nomeCompleto}</p>
            <div>
              <span
                className={cn(
                  "inline-flex rounded-full px-2 py-1 text-[11px] font-medium",
                  card.tipoColor
                    ? getLookupBadgeClasses(card.tipoColor)
                    : getLicenziamentoVariant(card.record.tipo_licenziamento)
                )}
              >
                {card.tipoLabel}
              </span>
            </div>
          </div>
          <div className="text-muted-foreground space-y-1.5 border-t pt-2 text-xs">
            <p className="flex items-center gap-1.5 truncate">
              <MailIcon className="size-3.5 shrink-0" />
              <span className="truncate">{card.email}</span>
            </p>
            <p className="flex items-center gap-1.5 truncate">
              <CalendarIcon className="size-3.5 shrink-0" />
              <span className="truncate">{card.dataFineRapporto}</span>
            </p>
            {card.motivazione ? <p className="line-clamp-2">{card.motivazione}</p> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ChiusureBoardColumn({
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
  column: ChiusureBoardColumnData
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
      countLabel={`${column.cards.length} ${column.cards.length === 1 ? "chiusura" : "chiusure"}`}
      visual={visual}
      isDropTarget={isDropTarget}
      emptyState={
        <div className="text-muted-foreground rounded-lg border border-dashed border-border/60 p-3 text-xs">
          Nessuna chiusura
        </div>
      }
      onDragEnter={onDragEnterColumn}
      onDragOver={onDragOverColumn}
      onDragLeave={onDragLeaveColumn}
      onDrop={onDropToColumn}
    >
      {column.cards.map((card) => (
        <ChiusureBoardCard
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

function ChiusureBoardSkeletonColumn() {
  return <KanbanColumnSkeleton />
}

export function ChiusureBoardView() {
  const { loading, error, columns, moveCard } = useChiusureBoard()
  const [draggingRecordId, setDraggingRecordId] = React.useState<string | null>(null)
  const [dropTargetColumnId, setDropTargetColumnId] = React.useState<string | null>(null)
  const [selectedCardId, setSelectedCardId] = React.useState<string | null>(null)

  const selectedCard = React.useMemo(
    () => columns.flatMap((column) => column.cards).find((card) => card.id === selectedCardId) ?? null,
    [columns, selectedCardId]
  )

  return (
    <>
      <section className="flex h-full min-h-0 w-full min-w-0 flex-col space-y-3 overflow-hidden">
        <div className="flex items-center gap-2 px-1">
          <FileX2Icon className="text-muted-foreground size-4" />
          <h1 className="text-base font-semibold">Chiusure</h1>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Errore caricamento chiusure: {error}
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden pb-2">
          <div className="flex h-full min-h-0 min-w-max gap-4">
            {loading
              ? Array.from({ length: 4 }).map((_, index) => <ChiusureBoardSkeletonColumn key={index} />)
              : columns.map((column) => (
                  <ChiusureBoardColumn
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

      <ChiusureDetailSheet
        card={selectedCard}
        columns={columns}
        open={Boolean(selectedCard)}
        onOpenChange={(open) => {
          if (!open) setSelectedCardId(null)
        }}
        onStatusChange={moveCard}
      />
    </>
  )
}
