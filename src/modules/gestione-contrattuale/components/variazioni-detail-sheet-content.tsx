import { CalendarDaysIcon } from "lucide-react"

import { LinkedRapportoSummaryCard } from "@/components/shared-next/linked-rapporto-summary-card"
import { Form } from "@/components/ui/form"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  VARIAZIONE_FAMILY_FIELDS,
  VARIAZIONE_WORKER_FIELDS,
} from "../lib/variazioni-detail-constants"
import type { VariazioniDetailSheetViewModel } from "../hooks/use-variazioni-detail-sheet"
import { VariazioniDetailAnagraficaSection } from "./variazioni-detail-anagrafica-section"
import { VariazioniDetailAttachments } from "./variazioni-detail-attachments"
import { VariazioniDetailRapportoSection } from "./variazioni-detail-rapporto-section"
import { VariazioniDetailSheetSkeleton } from "./variazioni-detail-sheet-skeleton"
import { VariazioniDetailVariazioneSection } from "./variazioni-detail-variazione-section"

export function VariazioniDetailSheetContent({
  vm,
}: {
  vm: VariazioniDetailSheetViewModel
}) {
  const {
    card,
    open,
    onOpenChange,
    form,
    editingDetails,
    setEditingDetails,
    editingRapporto,
    setEditingRapporto,
    detailsError,
    rapportoError,
    uploadingSlot,
    uploadError,
    handleUploadAttachment,
    handleRemoveAttachment,
    openAttachmentPreview,
    handleLavoratoreChange,
    handleFamigliaChange,
    formatVariazioneBoardDate,
  } = vm

  return (
    <Form {...form}>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-[min(96vw,980px)]! max-w-none! p-0 sm:max-w-none"
        >
          <SheetHeader className="border-b bg-surface px-5 py-5">
            <div className="space-y-2">
              <SheetTitle className="truncate text-xl font-semibold">
                {card?.nomeCompleto ?? "Dettaglio variazione"}
              </SheetTitle>
              <SheetDescription className="sr-only">
                Dettaglio pratica di variazione contrattuale con dati del rapporto e documenti.
              </SheetDescription>
              <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <span className="flex items-center gap-1.5">
                  <CalendarDaysIcon className="size-4" />
                  {formatVariazioneBoardDate(card?.record.data_variazione)}
                </span>
              </div>
            </div>
          </SheetHeader>

          {card ? (
            <section className="h-full overflow-y-auto bg-surface-muted px-5 py-5">
              <div className="mx-auto max-w-5xl space-y-5">
                <LinkedRapportoSummaryCard title={card.nomeCompleto} rapporto={card.rapporto} />

                <VariazioniDetailAnagraficaSection
                  title="Dati lavoratore"
                  table="lavoratori"
                  row={card.lavoratore}
                  fields={VARIAZIONE_WORKER_FIELDS}
                  onRowChange={handleLavoratoreChange}
                />

                <VariazioniDetailAnagraficaSection
                  title="Dati famiglia"
                  table="famiglie"
                  row={card.famiglia}
                  fields={VARIAZIONE_FAMILY_FIELDS}
                  onRowChange={handleFamigliaChange}
                />

                <VariazioniDetailVariazioneSection
                  card={card}
                  editingDetails={editingDetails}
                  setEditingDetails={setEditingDetails}
                  detailsError={detailsError}
                  formatVariazioneBoardDate={formatVariazioneBoardDate}
                />

                <VariazioniDetailRapportoSection
                  card={card}
                  editingRapporto={editingRapporto}
                  setEditingRapporto={setEditingRapporto}
                  rapportoError={rapportoError}
                />

                <VariazioniDetailAttachments
                  card={card}
                  uploadingSlot={uploadingSlot}
                  uploadError={uploadError}
                  handleUploadAttachment={handleUploadAttachment}
                  handleRemoveAttachment={handleRemoveAttachment}
                  openAttachmentPreview={openAttachmentPreview}
                />
              </div>
            </section>
          ) : (
            <VariazioniDetailSheetSkeleton />
          )}
        </SheetContent>
      </Sheet>
    </Form>
  )
}
