import * as React from "react"
import { FileTextIcon, StickyNoteIcon, TagIcon } from "lucide-react"

import {
  type SupportTicketBoardCardData,
} from "@/hooks/use-support-tickets-board"
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
import { LinkedRapportoSummaryCard } from "@/components/shared/linked-rapporto-summary-card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DetailSheetWrapper } from "@/components/shared/detail-sheet-wrapper"
import { supabase } from "@/lib/supabase-client"
import type { TicketRecord } from "@/types"

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

function sanitizeFileName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
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
  if (!value) return []
  if (Array.isArray(value)) return value
  return [value]
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

  const handleUploadAttachment = React.useCallback(
    async (file: File) => {
      if (!card) return

      setUploadError(null)
      setIsUploadingAttachment(true)

      try {
        const safeName = sanitizeFileName(file.name || "allegato")
        const storagePath = ["support-tickets", card.id, `${Date.now()}-${safeName}`].join("/")

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
      <DetailSheetWrapper
        open={open}
        onOpenChange={onOpenChange}
        title={card?.causale ?? "Dettaglio ticket"}
        subtitle={card?.nomeCompleto ?? "Dettaglio ticket di supporto"}
        rightSlot={
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
        }
      >
        {card ? (
          <div className="mx-auto max-w-5xl space-y-5">
            <LinkedRapportoSummaryCard title={card.nomeCompleto} rapporto={card.rapporto} />

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
        ) : null}
      </DetailSheetWrapper>

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
