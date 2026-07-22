import { FileTextIcon } from "lucide-react"

import { AttachmentUploadSlot } from "@/components/shared-next/attachment-upload-slot"
import { DetailSectionBlock } from "@/components/shared-next/detail-section-card"
import type { ChiusureDetailSheetViewModel } from "../hooks/use-chiusure-detail-sheet"
import type { ChiusureBoardCardData } from "../types"

export function ChiusureDetailAttachments({
  card,
  uploadingSlot,
  handleUploadAttachment,
  handleRemoveAttachment,
}: Pick<
  ChiusureDetailSheetViewModel,
  "uploadingSlot" | "handleUploadAttachment" | "handleRemoveAttachment"
> & {
  card: ChiusureBoardCardData
}) {
  return (
    <DetailSectionBlock
      title="Allegato chiusura"
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
  )
}
