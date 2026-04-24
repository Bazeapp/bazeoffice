import * as React from "react"
import { FileTextIcon, StickyNoteIcon, TagIcon } from "lucide-react"

import { getTagClassName } from "@/features/lavoratori/lib/lookup-utils"
import {
  type SupportTicketBoardCardData,
} from "@/hooks/use-support-tickets-board"
import { useRapportoRelatedData } from "@/hooks/use-rapporto-related-data"
import {
  resolveSupportTicketStatus,
  resolveSupportTicketTag,
  resolveSupportTicketUrgency,
  type SupportTicketStatusDefinition,
} from "@/components/support/support-ticket-config"
import {
  AttachmentUploadSlot,
  type AttachmentLink,
} from "@/components/shared/attachment-upload-slot"
import { DetailSectionBlock } from "@/components/shared/detail-section-card"
import { RapportoDetailPanel } from "@/components/gestione-contrattuale/rapporto-detail-panel"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  buildAttachmentPayload,
  normalizeAttachmentArray,
} from "@/lib/attachments"
import { supabase } from "@/lib/supabase-client"
import type { TicketRecord } from "@/types"

function sanitizeFileName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
}

function normalizeToken(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase().replaceAll("_", " ")
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

function getStatusColor(value: string | null | undefined) {
  const token = normalizeToken(value)
  if (!token) return "zinc"
  if (token.includes("attivo")) return "emerald"
  if (token.includes("attiv") || token.includes("in corso") || token.includes("presa in carico")) {
    return "amber"
  }
  if (token.includes("pagato") || token.includes("effettuata") || token.includes("inviato")) {
    return "emerald"
  }
  if (token.includes("todo") || token.includes("to do")) return "sky"
  if (token.includes("chius") || token.includes("annull") || token.includes("cess")) return "zinc"
  return "sky"
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

type SupportTicketDetailSheetProps = {
  card: SupportTicketBoardCardData | null
  stages: SupportTicketStatusDefinition[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onMoveTicket: (ticketId: string, targetStageId: string) => Promise<void>
  onPatchTicket: (ticketId: string, patch: Partial<TicketRecord>) => Promise<void>
}

export function SupportTicketDetailSheet({
  card,
  stages,
  open,
  onOpenChange,
  onMoveTicket,
  onPatchTicket,
}: SupportTicketDetailSheetProps) {
  const [selectedPreview, setSelectedPreview] = React.useState<AttachmentLink | null>(null)
  const [isUploadingAttachment, setIsUploadingAttachment] = React.useState(false)
  const [uploadError, setUploadError] = React.useState<string | null>(null)
  const {
    famiglia,
    lavoratore,
    processi,
    contributi,
    mesi,
    mesiCalendario,
    pagamenti,
    presenze,
    variazioni,
    chiusure,
    loadingRelated,
    lookupColorsByDomain,
    error: rapportoError,
  } = useRapportoRelatedData(card?.rapporto ?? null)

  React.useEffect(() => {
    if (!open) {
      setSelectedPreview(null)
      setIsUploadingAttachment(false)
      setUploadError(null)
    }
  }, [open])

  const statusConfig =
    stages.find((stage) => stage.id === card?.stage) ?? resolveSupportTicketStatus(card?.stage)
  const tagConfig = resolveSupportTicketTag(card?.tag)
  const urgencyConfig = resolveSupportTicketUrgency(card?.urgenza)
  const StatusIcon = statusConfig.icon
  const TagIconComponent = tagConfig.icon
  const UrgencyIcon = urgencyConfig.icon
  const rapportoStatusColor = card?.rapporto
    ? lookupColorsByDomain.get(
        `rapporti_lavorativi.stato_rapporto:${normalizeToken(card.rapporto.stato_rapporto)}`
      ) ?? getStatusColor(card.rapporto.stato_rapporto)
    : "zinc"

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

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-[min(96vw,980px)]! max-w-none! p-0 sm:max-w-none">
          <SheetHeader className="border-b bg-background px-5 py-5">
            <div className="space-y-2">
              <SheetTitle className="truncate text-xl font-semibold">
                {card?.causale ?? "Dettaglio ticket"}
              </SheetTitle>
              <SheetDescription className="text-sm">
                {card?.nomeCompleto ?? "Dettaglio ticket di supporto"}
              </SheetDescription>
              <div className="flex flex-wrap items-center gap-2">
                {card ? (
                  <Select value={card.stage} onValueChange={(value) => void onMoveTicket(card.id, value)}>
                    <SelectTrigger className="min-w-[180px]">
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
                <Badge variant="secondary" className={statusConfig.badgeClassName}>
                  <StatusIcon className="mr-1 size-3.5" />
                  {statusConfig.label}
                </Badge>
                {card?.tipo ? <Badge variant="outline">{card.tipo}</Badge> : null}
              </div>
            </div>
          </SheetHeader>

          {card ? (
            <section className="h-full overflow-y-auto bg-muted/20 px-5 py-5">
              <div className="mx-auto max-w-5xl space-y-5">
                {card.rapporto ? (
                  <Accordion type="single" collapsible className="rounded-2xl border bg-background px-4">
                    <AccordionItem value="rapporto-dettaglio" className="border-none">
                      <AccordionTrigger className="py-4 hover:no-underline">
                        <div className="min-w-0 space-y-3 text-left">
                          <div>
                            <p className="truncate text-base leading-tight font-semibold">
                              {card.nomeCompleto}
                            </p>
                            <div className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                              <span>dal {formatDate(card.rapporto.data_inizio_rapporto)}</span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge className={getTagClassName(rapportoStatusColor)}>
                              {card.rapporto.stato_rapporto ?? "Sconosciuto"}
                            </Badge>
                            {card.rapporto.stato_servizio ? (
                              <Badge variant="outline" className="h-6 rounded-full px-2.5 text-[11px] font-medium">
                                {card.rapporto.stato_servizio}
                              </Badge>
                            ) : null}
                            {card.rapporto.tipo_rapporto ? (
                              <Badge variant="outline" className="h-6 rounded-full px-2.5 text-[11px] font-medium">
                                {card.rapporto.tipo_rapporto}
                              </Badge>
                            ) : null}
                            {card.rapporto.tipo_contratto ? (
                              <Badge variant="secondary" className="h-6 rounded-full px-2.5 text-[11px] font-medium">
                                {card.rapporto.tipo_contratto}
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4">
                        {rapportoError ? (
                          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                            Errore caricamento rapporto: {rapportoError}
                          </div>
                        ) : (
                          <div className="overflow-hidden rounded-2xl border border-border/70 bg-background">
                            <RapportoDetailPanel
                              rapporto={card.rapporto}
                              famiglia={famiglia}
                              lavoratore={lavoratore}
                              processi={processi}
                              contributi={contributi}
                              mesi={mesi}
                              mesiCalendario={mesiCalendario}
                              pagamenti={pagamenti}
                              presenze={presenze}
                              variazioni={variazioni}
                              chiusure={chiusure}
                              loadingRelated={loadingRelated}
                              lookupColorsByDomain={lookupColorsByDomain}
                              hideHeader={true}
                            />
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                ) : null}

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
