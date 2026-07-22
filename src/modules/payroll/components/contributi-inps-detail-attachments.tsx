import * as React from "react"
import { FileTextIcon } from "lucide-react"

import { AttachmentUploadSlot } from "@/components/shared-next/attachment-upload-slot"
import type { AttachmentLink } from "@/components/shared-next/attachment-utils"
import { DetailSectionBlock } from "@/components/shared-next/detail-section-card"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"

type ContributiInpsDetailAttachmentsProps = {
  attachmentValue: unknown
  isUploading: boolean
  uploadError: string | null
  onUpload: (file: File) => void
  onRemove: (link: AttachmentLink) => void
}

export function ContributiInpsDetailAttachments({
  attachmentValue,
  isUploading,
  uploadError,
  onUpload,
  onRemove,
}: ContributiInpsDetailAttachmentsProps) {
  const [selectedPreview, setSelectedPreview] = React.useState<AttachmentLink | null>(null)

  return (
    <>
      <DetailSectionBlock
        title="Allegato"
        icon={<FileTextIcon className="text-muted-foreground size-5" />}
        contentClassName="space-y-4"
      >
        <AttachmentUploadSlot
          label="Allegato PagoPA"
          value={attachmentValue}
          onAdd={(file) => void onUpload(file)}
          onRemove={(link) => void onRemove(link)}
          onPreviewOpen={setSelectedPreview}
          isUploading={isUploading}
        />
        {uploadError ? <p className="text-sm text-red-600">{uploadError}</p> : null}
      </DetailSectionBlock>

      <Dialog open={Boolean(selectedPreview)} onOpenChange={(nextOpen) => !nextOpen && setSelectedPreview(null)}>
        <DialogContent className="max-w-[min(96vw,72rem)] border-none bg-neutral-950/90 p-2 shadow-none sm:max-w-[min(96vw,72rem)]">
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
    </>
  )
}
