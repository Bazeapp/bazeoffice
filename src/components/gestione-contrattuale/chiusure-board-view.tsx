import * as React from "react"
import {
  CalendarIcon,
  CalendarX2Icon,
  FileTextIcon,
  MailIcon,
  PencilIcon,
} from "lucide-react"

import {
  type ChiusureBoardCardData,
  type ChiusureBoardColumnData,
  useChiusureBoard,
} from "@/hooks/use-chiusure-board"
import { AttachmentUploadSlot } from "@/components/shared-next/attachment-upload-slot"
import { DetailSectionBlock } from "@/components/shared-next/detail-section-card"
import {
  KanbanColumnShell,
  KanbanColumnSkeleton,
  type KanbanColumnVisual,
} from "@/components/shared-next/kanban"
import { LinkedRapportoSummaryCard } from "@/components/shared-next/linked-rapporto-summary-card"
import { RecordCard } from "@/components/shared-next/record-card"
import { SectionHeader } from "@/components/shared-next/section-header"
import { Badge } from "@/components/ui/badge"
import { SearchInput } from "@/components/ui/search-input"
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
        <SheetHeader className="border-b bg-surface px-5 py-5">
          <div className="space-y-3">
            <div className="min-w-0">
              <SheetTitle className="truncate text-xl font-semibold">
                {card?.nomeCompleto ?? "Dettaglio chiusura"}
              </SheetTitle>
              <SheetDescription className="sr-only">
                Dettaglio pratica di chiusura con stato, riepilogo rapporto e allegati.
              </SheetDescription>
              <p className="text-muted-foreground mt-1 text-sm">
                Creata il {formatDate(card?.record.data_creazione)}
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
          <section className="h-full overflow-y-auto bg-neutral-150 px-5 py-5">
            <div className="mx-auto max-w-5xl space-y-5">
              <LinkedRapportoSummaryCard title={card.nomeCompleto} rapporto={card.rapporto} />

              <DetailSectionBlock
                title="Dettagli chiusura"
                icon={<FileTextIcon className="size-4" />}
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
                        : getLicenziamentoVariant(card.record.tipo_licenziamento),
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
                icon={<FileTextIcon className="size-4" />}
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

function getColumnVisual(color: string): KanbanColumnVisual {
  switch (color.toLowerCase()) {
    case "violet":
      return { columnClassName: "bg-violet-400", headerClassName: "", iconClassName: "text-violet-500" }
    case "zinc":
      return { columnClassName: "bg-zinc-400", headerClassName: "", iconClassName: "text-zinc-500" }
    case "sky":
      return { columnClassName: "bg-sky-400", headerClassName: "", iconClassName: "text-sky-500" }
    case "lime":
      return { columnClassName: "bg-lime-400", headerClassName: "", iconClassName: "text-lime-500" }
    case "amber":
      return { columnClassName: "bg-amber-400", headerClassName: "", iconClassName: "text-amber-500" }
    case "orange":
      return { columnClassName: "bg-orange-400", headerClassName: "", iconClassName: "text-orange-500" }
    case "green":
      return { columnClassName: "bg-green-400", headerClassName: "", iconClassName: "text-green-500" }
    default:
      return { columnClassName: "", headerClassName: "", iconClassName: "text-muted-foreground/80" }
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
      onClick={onOpen}
      className={cn("cursor-grab transition-opacity active:cursor-grabbing", dragging && "opacity-40")}
    >
      <RecordCard>
        <RecordCard.Header title={card.nomeCompleto} />
        <RecordCard.Body>
          <div>
            <Badge
              className={cn(
                card.tipoColor
                  ? getLookupBadgeClasses(card.tipoColor)
                  : getLicenziamentoVariant(card.record.tipo_licenziamento),
              )}
            >
              {card.tipoLabel}
            </Badge>
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
        </RecordCard.Body>
      </RecordCard>
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
  const visual = getColumnVisual(column.color)

  return (
    <KanbanColumnShell
      columnId={column.id}
      title={column.label}
      countLabel={`${column.cards.length} ${column.cards.length === 1 ? "chiusura" : "chiusure"}`}
      visual={visual}
      isDropTarget={isDropTarget}
      emptyMessage="Nessuna chiusura"
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
          card.email,
          card.motivazione,
          card.tipoLabel,
          card.rapporto?.cognome_nome_datore_proper,
          card.rapporto?.nome_lavoratore_per_url,
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

  const totalChiusure = React.useMemo(
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
            subtitle={`${totalChiusure} ${totalChiusure === 1 ? "chiusura" : "chiusure"}`}
          >
            Chiusure
          </SectionHeader.Title>
          <SectionHeader.Toolbar>
            <SearchInput
              className="md:max-w-sm"
              placeholder="Cerca per famiglia, lavoratore, email, motivazione..."
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              onClear={() => setSearchValue("")}
            />
          </SectionHeader.Toolbar>
        </SectionHeader>

        {error ? (
          <div className="mx-4 mt-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Errore caricamento chiusure: {error}
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden px-4 pb-2 pt-4">
          <div className="flex h-full min-h-0 min-w-max gap-4">
            {loading
              ? Array.from({ length: 4 }).map((_, index) => <ChiusureBoardSkeletonColumn key={index} />)
              : filteredColumns.map((column) => (
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
