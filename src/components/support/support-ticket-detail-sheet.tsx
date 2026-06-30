import * as React from "react"
import { CalendarIcon, FileTextIcon, Link2Icon, Loader2Icon, StickyNoteIcon, TagIcon } from "lucide-react"

import {
  type SupportTicketBoardCardData,
  type SupportTicketLinkedRecord,
} from "@/hooks/use-support-tickets-board"
import {
  resolveSupportTicketStatus,
  resolveSupportTicketTag,
  resolveSupportTicketUrgency,
  type SupportTicketStatusDefinition,
} from "@/components/support/support-ticket-config"
import {
  AttachmentUploadSlot,
} from "@/components/shared-next/attachment-upload-slot"
import type { AttachmentLink } from "@/components/shared-next/attachment-utils"
import { DetailSectionBlock } from "@/components/shared-next/detail-section-card"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  buildAttachmentPayload,
  normalizeAttachmentArray,
} from "@/lib/attachments"
import { updateRecord } from "@/lib/anagrafiche-api"
import { supabase } from "@/lib/supabase-client"
import { cn } from "@/lib/utils"
import type { ChiusuraContrattoRecord, TicketRecord } from "@/types"

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
    timeZone: "Europe/Rome",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

function getStageDotClass(color: string | null | undefined) {
  switch ((color ?? "").toLowerCase()) {
    case "sky":
      return "bg-sky-500"
    case "amber":
      return "bg-amber-500"
    case "orange":
      return "bg-orange-500"
    case "green":
    case "emerald":
      return "bg-emerald-500"
    case "red":
    case "rose":
      return "bg-red-500"
    case "zinc":
    case "gray":
      return "bg-zinc-400"
    default:
      return "bg-muted-foreground/60"
  }
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

function toAttachmentArray(value: TicketRecord["allegati"]) {
  return normalizeAttachmentArray(value)
}

function getLinkedRecordKey(record: SupportTicketLinkedRecord) {
  return `${record.type}:${record.id}`
}

function isChiusuraRecord(record: SupportTicketLinkedRecord["record"]): record is ChiusuraContrattoRecord {
  if (!record) return false
  return "data_fine_rapporto" in record && "motivazione_cessazione_rapporto" in record
}

function getLinkedRecordAccentClassName(accent: SupportTicketLinkedRecord["accent"]) {
  switch (accent) {
    case "rose":
      return "bg-rose-500"
    case "amber":
      return "bg-amber-500"
    case "emerald":
      return "bg-emerald-500"
    case "sky":
      return "bg-sky-500"
    case "violet":
      return "bg-violet-500"
    case "zinc":
      return "bg-zinc-400"
  }
}

function LinkedRecordAccordionItem({
  record,
  rapportoOptions,
  currentRapportoId,
  linkingRapporto,
  linkError,
  onLinkChiusuraRapporto,
}: {
  record: SupportTicketLinkedRecord
  rapportoOptions: Array<{ id: string; label: string }>
  currentRapportoId: string | null
  linkingRapporto: boolean
  linkError: string | null
  onLinkChiusuraRapporto: (record: SupportTicketLinkedRecord, rapportoId: string) => Promise<void>
}) {
  const [selectedRapportoId, setSelectedRapportoId] = React.useState(currentRapportoId ?? "")
  const linkedRecordValue = record.record
  const chiusura: ChiusuraContrattoRecord | null = isChiusuraRecord(linkedRecordValue) ? linkedRecordValue : null

  React.useEffect(() => {
    setSelectedRapportoId(currentRapportoId ?? "")
  }, [currentRapportoId, record?.id])

  return (
    <AccordionItem
      value={getLinkedRecordKey(record)}
      className="overflow-hidden rounded-xl border border-border-subtle bg-surface"
    >
      <AccordionTrigger className="relative px-4 py-3 hover:no-underline">
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute top-0 bottom-0 left-0 w-1",
            getLinkedRecordAccentClassName(record.accent)
          )}
        />
        <div className="min-w-0 flex-1 space-y-2 pr-3 text-left">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-base leading-tight font-semibold">{record.title}</p>
              <p className="text-muted-foreground mt-1 truncate text-sm">{record.subtitle ?? record.id}</p>
            </div>
            <Badge variant="outline" className="shrink-0">
              {record.label}
            </Badge>
          </div>
          <div className="text-muted-foreground flex min-w-0 flex-wrap items-center gap-2 text-xs">
            {record.status ? (
              <Badge variant="secondary" className="rounded-full px-2.5">
                {record.status}
              </Badge>
            ) : null}
            {record.dateLabel ? (
              <span className="flex items-center gap-1.5">
                <CalendarIcon className="size-3.5" />
                {record.dateLabel}
              </span>
            ) : null}
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4">
        <div className="space-y-4 border-t border-border-subtle pt-4">
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="ui-type-label">ID</p>
              <p className="font-medium break-all">{record.id}</p>
            </div>
            <div>
              <p className="ui-type-label">Stato</p>
              <p className="font-medium">{record.status ?? "-"}</p>
            </div>
            <div>
              <p className="ui-type-label">Data</p>
              <p className="font-medium">{record.dateLabel ?? "-"}</p>
            </div>
            <div>
              <p className="ui-type-label">Riferimento</p>
              <p className="font-medium">{record.subtitle ?? "-"}</p>
            </div>
          </div>

          {chiusura ? (
            <>
              <div className="grid gap-3 border-t border-border-subtle pt-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="ui-type-label">Data fine rapporto</p>
                  <p className="font-medium">{formatDate(chiusura.data_fine_rapporto)}</p>
                </div>
                <div>
                  <p className="ui-type-label">Tipo</p>
                  <p className="font-medium">{chiusura.tipo_licenziamento ?? chiusura.tipo_decesso ?? "-"}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="ui-type-label">Motivazione</p>
                  <p className="font-medium">{chiusura.motivazione_cessazione_rapporto ?? "-"}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="ui-type-label">Informazioni aggiuntive</p>
                  <p className="font-medium whitespace-pre-wrap">{chiusura.informazioni_aggiuntive ?? "-"}</p>
                </div>
              </div>

              <div className="space-y-3 border-t border-border-subtle pt-4">
                <p className="ui-type-label">Collega rapporto alla chiusura</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Select value={selectedRapportoId || "__none__"} onValueChange={setSelectedRapportoId}>
                    <SelectTrigger className="min-w-0 flex-1">
                      <SelectValue placeholder="Seleziona rapporto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nessun rapporto selezionato</SelectItem>
                      {rapportoOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    disabled={!selectedRapportoId || selectedRapportoId === "__none__" || linkingRapporto}
                    onClick={() => void onLinkChiusuraRapporto(record, selectedRapportoId)}
                  >
                    {linkingRapporto ? <Loader2Icon className="animate-spin" /> : <Link2Icon />}
                    Collega
                  </Button>
                </div>
                {linkError ? <p className="text-sm font-medium text-red-600">{linkError}</p> : null}
              </div>
            </>
          ) : null}
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}

type SupportTicketDetailSheetProps = {
  card: SupportTicketBoardCardData | null
  stages: SupportTicketStatusDefinition[]
  rapportoOptions: Array<{ id: string; label: string }>
  open: boolean
  onOpenChange: (open: boolean) => void
  onMoveTicket: (ticketId: string, targetStageId: string) => Promise<void>
  onPatchTicket: (ticketId: string, patch: Partial<TicketRecord>) => Promise<void>
  sheetTestId?: string
}

export function SupportTicketDetailSheet({
  card,
  stages,
  rapportoOptions,
  open,
  onOpenChange,
  onMoveTicket,
  onPatchTicket,
  sheetTestId,
}: SupportTicketDetailSheetProps) {
  const [selectedPreview, setSelectedPreview] = React.useState<AttachmentLink | null>(null)
  const [isUploadingAttachment, setIsUploadingAttachment] = React.useState(false)
  const [uploadError, setUploadError] = React.useState<string | null>(null)
  const [linkingChiusuraRapporto, setLinkingChiusuraRapporto] = React.useState(false)
  const [linkChiusuraError, setLinkChiusuraError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) {
      setSelectedPreview(null)
      setIsUploadingAttachment(false)
      setUploadError(null)
      setLinkingChiusuraRapporto(false)
      setLinkChiusuraError(null)
    }
  }, [open])

  const statusConfig =
    stages.find((stage) => stage.id === card?.stage) ?? resolveSupportTicketStatus(card?.stage)
  const tagConfig = resolveSupportTicketTag(card?.tag)
  const urgencyConfig = resolveSupportTicketUrgency(card?.urgenza)
  const TagIconComponent = tagConfig.icon
  const UrgencyIcon = urgencyConfig.icon
  const linkedRapportoOptions = React.useMemo(() => {
    if (!card?.rapporto || rapportoOptions.some((option) => option.id === card.rapporto?.id)) {
      return rapportoOptions
    }

    return [
      {
        id: card.rapporto.id,
        label: card.nomeCompleto,
      },
      ...rapportoOptions,
    ]
  }, [card?.nomeCompleto, card?.rapporto, rapportoOptions])

  const handleUploadAttachment = React.useCallback(
    async (file: File) => {
      if (!card) return

      setUploadError(null)
      setIsUploadingAttachment(true)

      try {
        const safeName = sanitizeFileName(file.name || "allegato")
        const storagePath = ["ticket", card.id, `${Date.now()}-${safeName}`].join("/")

        const uploadResult = await supabase.storage.from("baze-bucket").upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || undefined,
        })

        if (uploadResult.error) {
          throw uploadResult.error
        }

        const payload = buildAttachmentPayload(file, storagePath)

        await onPatchTicket(card.id, {
          allegati: [...toAttachmentArray(card.record.allegati), payload],
        })
      } catch (caughtError) {
        setUploadError(caughtError instanceof Error ? caughtError.message : "Errore caricando allegato")
      } finally {
        setIsUploadingAttachment(false)
      }
    },
    [card, onPatchTicket]
  )

  const handleRemoveAttachment = React.useCallback(
    async (link: AttachmentLink) => {
      if (!card) return

      setUploadError(null)
      setIsUploadingAttachment(true)

      try {
        const nextValue = toAttachmentArray(card.record.allegati).filter(
          (a) => !(link.path && a.path === link.path) && a.name !== link.label,
        )

        if (link.path?.startsWith("baze-bucket/")) {
          await supabase.storage
            .from("baze-bucket")
            .remove([link.path.replace(/^baze-bucket\//, "")])
        }

        await onPatchTicket(card.id, {
          allegati: nextValue.length > 0 ? nextValue : null,
        })
      } catch (caughtError) {
        setUploadError(
          caughtError instanceof Error ? caughtError.message : "Errore rimuovendo allegato",
        )
      } finally {
        setIsUploadingAttachment(false)
      }
    },
    [card, onPatchTicket],
  )

  const handleLinkChiusuraRapporto = React.useCallback(
    async (linkedRecord: SupportTicketLinkedRecord, rapportoId: string) => {
      if (!card || linkedRecord.type !== "chiusura" || !rapportoId || rapportoId === "__none__") return

      setLinkingChiusuraRapporto(true)
      setLinkChiusuraError(null)

      try {
        await updateRecord("rapporti_lavorativi", rapportoId, {
          fine_rapporto_lavorativo_id: linkedRecord.id,
        })
        await onPatchTicket(card.id, {
          chiusura_id: linkedRecord.id,
          rapporto_id: rapportoId,
        })
      } catch (caughtError) {
        setLinkChiusuraError(
          caughtError instanceof Error ? caughtError.message : "Errore collegando rapporto alla chiusura"
        )
      } finally {
        setLinkingChiusuraRapporto(false)
      }
    },
    [card, onPatchTicket]
  )

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-[min(96vw,980px)]! max-w-none! p-0 sm:max-w-none"
          data-testid={sheetTestId}
        >
          <SheetHeader className="border-b bg-surface px-5 py-5">
            <div className="min-w-0 space-y-3">
              <SheetTitle className="max-w-full text-xl leading-snug font-semibold whitespace-normal break-words">
                {card?.causale ?? "Dettaglio ticket"}
              </SheetTitle>
              <SheetDescription className="text-sm">
                {card ? `${tagConfig.label} · aperto il ${card.dataAperturaLabel}` : "Dettaglio ticket di supporto"}
              </SheetDescription>
              {card ? (
                <Select value={card.stage} onValueChange={(value) => void onMoveTicket(card.id, value)}>
                  <SelectTrigger className="h-8 w-auto gap-1.5 rounded-full bg-surface px-2.5 text-xs font-medium">
                    <span
                      className={cn(
                        "size-2 shrink-0 rounded-full",
                        getStageDotClass(statusConfig.color),
                      )}
                    />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        {stage.label}
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
                {card.linkedRecords.length > 0 ? (
                  <DetailSectionBlock
                    title={card.linkedRecords.length === 1 ? "Record collegato" : "Record collegati"}
                    icon={<Link2Icon className="text-muted-foreground size-5" />}
                    contentClassName="space-y-3"
                  >
                    <Accordion type="single" collapsible className="space-y-3">
                      {card.linkedRecords.map((linkedRecord) => (
                        <LinkedRecordAccordionItem
                          key={getLinkedRecordKey(linkedRecord)}
                          record={linkedRecord}
                          rapportoOptions={linkedRapportoOptions}
                          currentRapportoId={card.rapporto?.id ?? card.record.rapporto_id ?? null}
                          linkingRapporto={linkingChiusuraRapporto}
                          linkError={linkChiusuraError}
                          onLinkChiusuraRapporto={handleLinkChiusuraRapporto}
                        />
                      ))}
                    </Accordion>
                  </DetailSectionBlock>
                ) : null}

                <DetailSectionBlock
                  title={card.rapporto ? "Rapporto collegato" : "Collega rapporto"}
                  icon={<FileTextIcon className="text-muted-foreground size-5" />}
                  contentClassName="space-y-3"
                >
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Select
                      value={card.rapporto?.id ?? card.record.rapporto_id ?? "__none__"}
                      onValueChange={(value) =>
                        void onPatchTicket(card.id, {
                          rapporto_id: value === "__none__" ? null : value,
                        })
                      }
                    >
                      <SelectTrigger className="min-w-0 flex-1">
                        <SelectValue placeholder="Seleziona rapporto" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Nessun rapporto collegato</SelectItem>
                        {linkedRapportoOptions.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!card.rapporto && !card.record.rapporto_id}
                      onClick={() => void onPatchTicket(card.id, { rapporto_id: null })}
                    >
                      Rimuovi
                    </Button>
                  </div>
                </DetailSectionBlock>

                <DetailSectionBlock
                  title="Categoria e urgenza"
                  icon={<TagIcon className="text-muted-foreground size-5" />}
                  contentClassName="space-y-4"
                >
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className={tagConfig.colorClassName}>
                      <TagIconComponent className="mr-1 size-3.5" />
                      {tagConfig.label}
                    </Badge>
                    <Badge variant="secondary" className={urgencyConfig.badgeClassName}>
                      <UrgencyIcon className="mr-1 size-3.5" />
                      {urgencyConfig.label}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-2 text-sm">
                    <span>
                      Aperto il: <strong className="text-foreground">{card.dataAperturaLabel}</strong>
                    </span>
                    <span>
                      Assegnatario: <strong className="text-foreground">{card.assegnatario}</strong>
                    </span>
                  </div>
                </DetailSectionBlock>

                {card.note ? (
                  <DetailSectionBlock
                    title="Note"
                    icon={<StickyNoteIcon className="text-muted-foreground size-5" />}
                  >
                    <p className="text-sm whitespace-pre-wrap">{card.note}</p>
                  </DetailSectionBlock>
                ) : null}

                <DetailSectionBlock
                  title="Allegati"
                  icon={<FileTextIcon className="text-muted-foreground size-5" />}
                  contentClassName="space-y-4"
                >
                  <AttachmentUploadSlot
                    label="Allegato ticket"
                    value={normalizeAttachmentValue(card.record.allegati)}
                    onAdd={(file) => void handleUploadAttachment(file)}
                    onRemove={(link) => void handleRemoveAttachment(link)}
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
          className="max-w-[min(96vw,72rem)] border-none bg-neutral-950/90 p-2 shadow-none sm:max-w-[min(96vw,72rem)]"
        >
          <DialogTitle className="sr-only">
            {selectedPreview?.label ?? "Anteprima allegato ticket"}
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
