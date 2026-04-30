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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SearchInput } from "@/components/ui/search-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { buildAttachmentPayload, normalizeAttachmentArray } from "@/lib/attachments"
import { updateRecord } from "@/lib/anagrafiche-api"
import { supabase } from "@/lib/supabase-client"
import { cn } from "@/lib/utils"

type ChiusuraAttachmentSlot = "allegato_compilato" | "documenti_chiusura_rapporto"

const CHIUSURA_FORM_URLS = {
  licenziamento: "https://airtable.com/appevZURCPFkSG3CJ/pagdH4TXtF2mRHrHb/form",
  dimissione: "https://airtable.com/appevZURCPFkSG3CJ/pagC4sFam0eGz07Rh/form",
  annullamento: "https://airtable.com/appevZURCPFkSG3CJ/pagW6G5AUa4tJOWYX/form",
} as const

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

function sanitizeFileName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
}

function buildChiusuraDetailsDraft(card: ChiusureBoardCardData | null) {
  return {
    dataFineRapporto: card?.record.data_fine_rapporto ?? "",
    tipoLicenziamento: card?.record.tipo_licenziamento ?? "",
    tipoDecesso: card?.record.tipo_decesso ?? "",
    presenzeUltimoMese: card?.record.presenze_ultimo_mese ?? "",
    motivazione: card?.record.motivazione_cessazione_rapporto ?? "",
    informazioniAggiuntive: card?.record.informazioni_aggiuntive ?? "",
  }
}

function ChiusureDetailSheet({
  card,
  columns,
  open,
  onOpenChange,
  onStatusChange,
  onCardChange,
}: {
  card: ChiusureBoardCardData | null
  columns: ChiusureBoardColumnData[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onStatusChange: (recordId: string, targetStageId: string) => Promise<void>
  onCardChange: (card: ChiusureBoardCardData) => void
}) {
  const [updatingStatus, setUpdatingStatus] = React.useState(false)
  const [editingDetails, setEditingDetails] = React.useState(false)
  const [savingDetails, setSavingDetails] = React.useState(false)
  const [uploadingSlot, setUploadingSlot] = React.useState<ChiusuraAttachmentSlot | null>(null)
  const [detailsError, setDetailsError] = React.useState<string | null>(null)
  const previousCardIdRef = React.useRef<string | null>(card?.id ?? null)
  const [detailsDraft, setDetailsDraft] = React.useState(() => buildChiusuraDetailsDraft(card))

  React.useEffect(() => {
    const nextDetailsDraft = {
      dataFineRapporto: card?.record.data_fine_rapporto ?? "",
      tipoLicenziamento: card?.record.tipo_licenziamento ?? "",
      tipoDecesso: card?.record.tipo_decesso ?? "",
      presenzeUltimoMese: card?.record.presenze_ultimo_mese ?? "",
      motivazione: card?.record.motivazione_cessazione_rapporto ?? "",
      informazioniAggiuntive: card?.record.informazioni_aggiuntive ?? "",
    }
    const nextCardId = card?.id ?? null
    const isDifferentCard = previousCardIdRef.current !== nextCardId
    previousCardIdRef.current = nextCardId

    if (isDifferentCard) {
      setEditingDetails(false)
      setDetailsError(null)
      setDetailsDraft(nextDetailsDraft)
      return
    }

    if (!editingDetails) {
      setDetailsDraft(nextDetailsDraft)
    }
  }, [
    card?.id,
    card?.record.data_fine_rapporto,
    card?.record.informazioni_aggiuntive,
    card?.record.motivazione_cessazione_rapporto,
    card?.record.presenze_ultimo_mese,
    card?.record.tipo_decesso,
    card?.record.tipo_licenziamento,
    editingDetails,
  ])

  async function handleStatusChange(nextValue: string) {
    if (!card || nextValue === card.stage) return
    try {
      setUpdatingStatus(true)
      await onStatusChange(card.id, nextValue)
    } finally {
      setUpdatingStatus(false)
    }
  }

  async function saveDetailsPatch(patch: Record<string, unknown>) {
    if (!card || Object.keys(patch).length === 0) return

    setSavingDetails(true)
    setDetailsError(null)

    try {
      const response = await updateRecord("chiusure_contratti", card.id, patch)
      const nextRecord = {
        ...card.record,
        ...response.row,
      } as ChiusureBoardCardData["record"]
      onCardChange({
        ...card,
        record: nextRecord,
        motivazione: nextRecord.motivazione_cessazione_rapporto,
        dataFineRapporto: formatDate(nextRecord.data_fine_rapporto),
        tipoLabel: nextRecord.tipo_licenziamento ?? nextRecord.tipo_decesso ?? "-",
      })
    } catch (caughtError) {
      setDetailsError(
        caughtError instanceof Error ? caughtError.message : "Errore salvando chiusura"
      )
    } finally {
      setSavingDetails(false)
    }
  }

  async function handleUploadAttachment(slot: ChiusuraAttachmentSlot, file: File) {
    if (!card) return

    setUploadingSlot(slot)
    setDetailsError(null)

    try {
      const safeName = sanitizeFileName(file.name || "documento")
      const storagePath = [
        "chiusure_contratti",
        card.id,
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
      const nextValue = [...normalizeAttachmentArray(card.record[slot]), payload]
      const response = await updateRecord("chiusure_contratti", card.id, {
        [slot]: nextValue,
      })
      const nextRecord = {
        ...card.record,
        ...response.row,
      } as ChiusureBoardCardData["record"]

      onCardChange({
        ...card,
        record: nextRecord,
      })
    } catch (caughtError) {
      setDetailsError(
        caughtError instanceof Error ? caughtError.message : "Errore caricando allegato chiusura"
      )
    } finally {
      setUploadingSlot(null)
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
          <section className="h-full overflow-y-auto bg-surface-muted px-5 py-5">
            <div className="mx-auto max-w-5xl space-y-5">
              <LinkedRapportoSummaryCard title={card.nomeCompleto} rapporto={card.rapporto} />

              <DetailSectionBlock
                title="Dettagli chiusura"
                icon={<FileTextIcon className="size-4" />}
                action={
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => setEditingDetails((current) => !current)}
                    aria-label="Modifica dettagli chiusura"
                  >
                    <PencilIcon className="size-4" />
                  </button>
                }
                contentClassName="space-y-5"
              >
                {editingDetails ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="ui-type-label">Data fine rapporto</span>
                      <Input
                        type="date"
                        value={detailsDraft.dataFineRapporto}
                        onChange={(event) =>
                          setDetailsDraft((current) => ({
                            ...current,
                            dataFineRapporto: event.target.value,
                          }))
                        }
                        onBlur={() =>
                          void saveDetailsPatch({
                            data_fine_rapporto: detailsDraft.dataFineRapporto || null,
                          })
                        }
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="ui-type-label">Tipo licenziamento/dimissione</span>
                      <Input
                        value={detailsDraft.tipoLicenziamento}
                        onChange={(event) =>
                          setDetailsDraft((current) => ({
                            ...current,
                            tipoLicenziamento: event.target.value,
                          }))
                        }
                        onBlur={() =>
                          void saveDetailsPatch({
                            tipo_licenziamento: detailsDraft.tipoLicenziamento || null,
                          })
                        }
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="ui-type-label">Tipo decesso</span>
                      <Input
                        value={detailsDraft.tipoDecesso}
                        onChange={(event) =>
                          setDetailsDraft((current) => ({
                            ...current,
                            tipoDecesso: event.target.value,
                          }))
                        }
                        onBlur={() =>
                          void saveDetailsPatch({
                            tipo_decesso: detailsDraft.tipoDecesso || null,
                          })
                        }
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="ui-type-label">Presenze ultimo mese</span>
                      <Input
                        value={detailsDraft.presenzeUltimoMese}
                        onChange={(event) =>
                          setDetailsDraft((current) => ({
                            ...current,
                            presenzeUltimoMese: event.target.value,
                          }))
                        }
                        onBlur={() =>
                          void saveDetailsPatch({
                            presenze_ultimo_mese: detailsDraft.presenzeUltimoMese || null,
                          })
                        }
                      />
                    </label>
                    <label className="space-y-2 md:col-span-2">
                      <span className="ui-type-label">Motivazione</span>
                      <Textarea
                        value={detailsDraft.motivazione}
                        onChange={(event) =>
                          setDetailsDraft((current) => ({
                            ...current,
                            motivazione: event.target.value,
                          }))
                        }
                        onBlur={() =>
                          void saveDetailsPatch({
                            motivazione_cessazione_rapporto: detailsDraft.motivazione || null,
                          })
                        }
                      />
                    </label>
                    <label className="space-y-2 md:col-span-2">
                      <span className="ui-type-label">Informazioni aggiuntive</span>
                      <Textarea
                        value={detailsDraft.informazioniAggiuntive}
                        onChange={(event) =>
                          setDetailsDraft((current) => ({
                            ...current,
                            informazioniAggiuntive: event.target.value,
                          }))
                        }
                        onBlur={() =>
                          void saveDetailsPatch({
                            informazioni_aggiuntive:
                              detailsDraft.informazioniAggiuntive || null,
                          })
                        }
                      />
                    </label>
                    {savingDetails ? (
                      <p className="text-muted-foreground text-xs md:col-span-2">
                        Salvataggio in corso...
                      </p>
                    ) : null}
                    {detailsError ? (
                      <p className="text-xs font-medium text-red-600 md:col-span-2">
                        {detailsError}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <>
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
                      <p>
                        <span className="text-muted-foreground">Informazioni aggiuntive:</span>{" "}
                        <span className="font-medium text-foreground">
                          {card.record.informazioni_aggiuntive ?? "-"}
                        </span>
                      </p>
                    </div>
                  </>
                )}
              </DetailSectionBlock>

              <DetailSectionBlock
                title="Allegato chiusura"
                icon={<FileTextIcon className="size-4" />}
                contentClassName="space-y-4"
              >
                <AttachmentUploadSlot
                  label="Lettera dimissioni / licenziamento"
                  value={card.record.allegato_compilato ?? null}
                  onAdd={(file) => void handleUploadAttachment("allegato_compilato", file)}
                  onPreviewOpen={() => {}}
                  isUploading={uploadingSlot === "allegato_compilato"}
                />
                <AttachmentUploadSlot
                  label="Documenti finali di chiusura"
                  value={card.record.documenti_chiusura_rapporto ?? null}
                  onAdd={(file) => void handleUploadAttachment("documenti_chiusura_rapporto", file)}
                  onPreviewOpen={() => {}}
                  isUploading={uploadingSlot === "documenti_chiusura_rapporto"}
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
  const { loading, error, columns, moveCard, updateCard } = useChiusureBoard()
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
          <SectionHeader.Actions>
            <Button variant="outline" asChild>
              <a href={CHIUSURA_FORM_URLS.licenziamento} target="_blank" rel="noreferrer">
                Apri un licenziamento
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href={CHIUSURA_FORM_URLS.dimissione} target="_blank" rel="noreferrer">
                Apri una dimissione
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href={CHIUSURA_FORM_URLS.annullamento} target="_blank" rel="noreferrer">
                Apri un annullamento
              </a>
            </Button>
          </SectionHeader.Actions>
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
        onCardChange={(nextCard) => updateCard(nextCard.id, () => nextCard)}
      />
    </>
  )
}
