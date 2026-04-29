import * as React from "react"
import { FileTextIcon, StickyNoteIcon, TagIcon } from "lucide-react"

import { getTagClassName } from "@/features/lavoratori/lib/lookup-utils"
import { getRapportoStatusColor, resolveRapportoStatus } from "@/features/rapporti/rapporti-status"
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
} from "@/components/shared-next/attachment-upload-slot"
import type { AttachmentLink } from "@/components/shared-next/attachment-utils"
import { DetailSectionBlock } from "@/components/shared-next/detail-section-card"
import { RapportoDetailPanel } from "@/components/gestione-contrattuale/rapporto-detail-panel"
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
import { supabase } from "@/lib/supabase-client"
import { cn } from "@/lib/utils"
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

type SupportTicketDetailSheetProps = {
  card: SupportTicketBoardCardData | null
  stages: SupportTicketStatusDefinition[]
  rapportoOptions: Array<{ id: string; label: string }>
  open: boolean
  onOpenChange: (open: boolean) => void
  onMoveTicket: (ticketId: string, targetStageId: string) => Promise<void>
  onPatchTicket: (ticketId: string, patch: Partial<TicketRecord>) => Promise<void>
}

export function SupportTicketDetailSheet({
  card,
  stages,
  rapportoOptions,
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
  const TagIconComponent = tagConfig.icon
  const UrgencyIcon = urgencyConfig.icon
  const rapportoStatus = card?.rapporto
    ? resolveRapportoStatus(card.rapporto, chiusure[0]?.data_fine_rapporto ?? card.rapporto.data_fine_rapporto)
    : "Sconosciuto"
  const rapportoStatusColor = card?.rapporto
    ? lookupColorsByDomain.get(
        `rapporti_lavorativi.stato_rapporto:${normalizeToken(rapportoStatus)}`
      ) ?? getRapportoStatusColor(rapportoStatus)
    : "zinc"
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

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-[min(96vw,980px)]! max-w-none! p-0 sm:max-w-none">
          <SheetHeader className="border-b bg-surface px-5 py-5">
            <div className="space-y-3">
              <SheetTitle className="truncate text-xl font-semibold">
                {card?.causale ?? "Dettaglio ticket"}
              </SheetTitle>
              <SheetDescription className="text-sm">
                {card?.nomeCompleto ?? "Dettaglio ticket di supporto"}
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
                              {rapportoStatus}
                            </Badge>
                            {card.rapporto.stato_servizio ? (
                              <Badge variant="outline" className="h-6 rounded-full px-2.5 text-2xs font-medium">
                                {card.rapporto.stato_servizio}
                              </Badge>
                            ) : null}
                            {card.rapporto.tipo_rapporto ? (
                              <Badge variant="outline" className="h-6 rounded-full px-2.5 text-2xs font-medium">
                                {card.rapporto.tipo_rapporto}
                              </Badge>
                            ) : null}
                            {card.rapporto.tipo_contratto ? (
                              <Badge variant="secondary" className="h-6 rounded-full px-2.5 text-2xs font-medium">
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
