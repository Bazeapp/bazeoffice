import { ExternalLinkIcon, EyeIcon, FileTextIcon } from "lucide-react"

import { FieldInput, FieldTextarea } from "@/components/forms/field-components"
import { AttachmentUploadSlot } from "@/components/shared-next/attachment-upload-slot"
import { DetailSectionBlock } from "@/components/shared-next/detail-section-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { buildFamilyPresenzeUrl } from "@/lib/private-area-url"

import { formatHoursValue, normalizeAttachmentValue } from "../lib"
import type { CedolinoDetailCedolinoProps } from "../types"

export function PayrollOverviewCedolinoDetailCedolino({
  card,
  famiglia,
  contractHours,
  workedHours,
  cedolinoPreviewUrl,
  showCedolinoPreview,
  onToggleCedolinoPreview,
  uploadingCedolino,
  uploadError,
  onUploadCedolino,
  onRemoveCedolino,
  onPreviewOpen,
}: CedolinoDetailCedolinoProps) {
  const presenzeUrl = buildFamilyPresenzeUrl(
    famiglia?.email ?? famiglia?.customer_email,
    famiglia?.id,
  )

  return (
    <DetailSectionBlock
      title="Cedolino"
      icon={<FileTextIcon className="text-muted-foreground size-5" />}
      action={
        presenzeUrl ? (
          <Button variant="outline" size="sm" asChild>
            <a
              href={presenzeUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Apri il calendario presenze della famiglia"
            >
              Apri calendario presenze
              <ExternalLinkIcon className="size-3.5" />
            </a>
          </Button>
        ) : null
      }
      contentClassName="space-y-5"
    >
      <AttachmentUploadSlot
        label="Cedolino"
        value={normalizeAttachmentValue(card.record.cedolino)}
        onAdd={onUploadCedolino}
        onRemove={onRemoveCedolino}
        onPreviewOpen={onPreviewOpen}
        isUploading={uploadingCedolino}
      />
      <div className="space-y-3">
        <Button
          type="button"
          variant="outline"
          disabled={!cedolinoPreviewUrl}
          onClick={onToggleCedolinoPreview}
        >
          <EyeIcon />
          {showCedolinoPreview ? "Nascondi cedolino" : "Vedi cedolino in pagina"}
        </Button>
        {showCedolinoPreview && cedolinoPreviewUrl ? (
          <div className="overflow-hidden rounded-lg border bg-surface">
            <iframe
              src={cedolinoPreviewUrl}
              title="Anteprima cedolino"
              className="h-[min(72vh,760px)] w-full"
            />
          </div>
        ) : null}
      </div>
      {uploadError ? <p className="text-xs font-medium text-red-600">{uploadError}</p> : null}

      <div className="space-y-2">
        <p className="ui-type-label">URL cedolino</p>
        <div className="flex gap-2">
          <FieldInput name="cedolino_url" type="url" placeholder="https://..." />
          {card.record.cedolino_url ? (
            <Button variant="outline" size="icon" asChild>
              <a
                href={card.record.cedolino_url}
                target="_blank"
                rel="noreferrer"
                title="Apri cedolino"
              >
                <ExternalLinkIcon className="size-4" />
              </a>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="ui-type-label">Ore da contratto</p>
          <p className="font-medium">{formatHoursValue(contractHours)}</p>
        </div>
        <div className="space-y-2">
          <p className="ui-type-label">Ore svolte</p>
          <p className="font-medium">{formatHoursValue(workedHours)}</p>
        </div>
        <div className="space-y-2">
          <p className="ui-type-label">Importo busta paga</p>
          <FieldInput name="importo_busta_estratto" type="number" step="0.01" />
        </div>
        <div className="space-y-2">
          <p className="ui-type-label">Cedolino corretto?</p>
          <Badge
            variant={card.record.cedolino_corretto ? "default" : "secondary"}
            className="w-fit rounded-full px-3"
          >
            {card.record.cedolino_corretto ? "Confermato" : "Da verificare"}
          </Badge>
        </div>
      </div>

      <div className="space-y-2">
        <p className="ui-type-label">Note interne</p>
        <FieldTextarea name="note" className="min-h-24 w-full" />
      </div>
    </DetailSectionBlock>
  )
}
