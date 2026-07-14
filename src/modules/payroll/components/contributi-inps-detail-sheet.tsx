import { Form } from "@/components/ui/form"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { LinkedRapportoSummaryCard } from "@/components/shared-next/linked-rapporto-summary-card"

import { useContributiInpsDetail } from "../hooks/use-contributi-inps-detail"
import type { ContributoInpsDetailSheetProps } from "../types"
import { ContributiInpsDetailAttachments } from "./contributi-inps-detail-attachments"
import { ContributiInpsDetailFields } from "./contributi-inps-detail-fields"
import { ContributiInpsDetailHeader } from "./contributi-inps-detail-header"
import { ContributiInpsDetailSkeleton } from "./contributi-inps-detail-skeleton"

export function ContributoInpsDetailSheet({
  card,
  columns,
  open,
  onOpenChange,
  onStageChange,
  onPatchCard,
  commentAnchorRef,
}: ContributoInpsDetailSheetProps) {
  const detail = useContributiInpsDetail({ card, onStageChange, onPatchCard })

  return (
    <Form {...detail.form}>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          ref={commentAnchorRef}
          side="right"
          className="w-[min(96vw,980px)]! max-w-none! p-0 sm:max-w-none"
          data-testid="contributi-inps-sheet-dialog"
        >
          <ContributiInpsDetailHeader card={card} />

          {card ? (
            <section className="h-full overflow-y-auto bg-surface-muted px-5 py-5">
              <div className="mx-auto max-w-5xl space-y-5">
                <LinkedRapportoSummaryCard title={card.nomeCompleto} rapporto={card.rapporto ?? null} />

                <ContributiInpsDetailFields
                  card={card}
                  columns={columns}
                  stageValue={detail.stageValue}
                  onStageChange={detail.handleStageValueChange}
                />

                <ContributiInpsDetailAttachments
                  attachmentValue={detail.normalizeAttachmentValue(card.record.allegato)}
                  isUploading={detail.isUploadingAttachment}
                  uploadError={detail.uploadError}
                  onUpload={detail.handleUploadAttachment}
                  onRemove={detail.handleRemoveAttachment}
                />
              </div>
            </section>
          ) : (
            <ContributiInpsDetailSkeleton />
          )}
        </SheetContent>
      </Sheet>
    </Form>
  )
}
