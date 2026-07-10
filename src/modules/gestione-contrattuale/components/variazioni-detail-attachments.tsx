import { FileTextIcon } from "lucide-react"

import { AttachmentUploadSlot } from "@/components/shared-next/attachment-upload-slot"
import { DetailSectionBlock } from "@/components/shared-next/detail-section-card"
import type { VariazioniDetailSheetViewModel } from "../hooks/use-variazioni-detail-sheet"
import type { VariazioniBoardCardData } from "../types"

export function VariazioniDetailAttachments({
  card,
  uploadingSlot,
  uploadError,
  handleUploadAttachment,
  handleRemoveAttachment,
  openAttachmentPreview,
}: Pick<
  VariazioniDetailSheetViewModel,
  | "uploadingSlot"
  | "uploadError"
  | "handleUploadAttachment"
  | "handleRemoveAttachment"
  | "openAttachmentPreview"
> & {
  card: VariazioniBoardCardData
}) {
  return (
    <DetailSectionBlock
      title="Documenti variazione"
      icon={<FileTextIcon className="size-4" />}
      contentClassName="space-y-4"
    >
      <AttachmentUploadSlot
        label="Accordo Variazione"
        value={card.record.accordo_variazione_contrattuale ?? null}
        onAdd={(file) => void handleUploadAttachment("accordo_variazione_contrattuale", file)}
        onRemove={(link) => void handleRemoveAttachment("accordo_variazione_contrattuale", link)}
        onPreviewOpen={openAttachmentPreview}
        isUploading={uploadingSlot === "accordo_variazione_contrattuale"}
      />
      <AttachmentUploadSlot
        label="Ricevuta INPS Variazione"
        value={card.record.ricevuta_inps_variazione_rapporto ?? null}
        onAdd={(file) => void handleUploadAttachment("ricevuta_inps_variazione_rapporto", file)}
        onRemove={(link) => void handleRemoveAttachment("ricevuta_inps_variazione_rapporto", link)}
        onPreviewOpen={openAttachmentPreview}
        isUploading={uploadingSlot === "ricevuta_inps_variazione_rapporto"}
      />
      {uploadError ? (
        <p className="text-xs font-medium text-red-600">{uploadError}</p>
      ) : null}
    </DetailSectionBlock>
  )
}
