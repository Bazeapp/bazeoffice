import type * as React from "react"

import { FileTextIcon } from "lucide-react"

import { AssociationSearchField } from "@/components/shared-next/association-search-field"
import { DeleteRecordAction } from "@/components/shared-next/delete-record-action"
import { DetailSectionBlock } from "@/components/shared-next/detail-section-card"
import { LinkedRapportoSummaryCard } from "@/components/shared-next/linked-rapporto-summary-card"
import { Form } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { formatChiusuraDisplayDate } from "../lib/chiusure-board-visual"
import type { ChiusureDetailSheetViewModel } from "../hooks/use-chiusure-detail-sheet"
import { ChiusureDetailAttachments } from "./chiusure-detail-attachments"
import { ChiusureDetailFields } from "./chiusure-detail-fields"
import { ChiusureDetailSheetSkeleton } from "./chiusure-detail-sheet-skeleton"

export function ChiusureDetailSheetContent({
  vm,
  commentAnchorRef,
}: {
  vm: ChiusureDetailSheetViewModel
  commentAnchorRef?: React.RefObject<HTMLDivElement | null>
}) {
  const {
    card,
    columns,
    open,
    onOpenChange,
    onDeleteChiusura,
    updatingStatus,
    handleStatusChange,
    rapportoSearchQuery,
    setRapportoSearchQuery,
    filteredRapportoOptions,
    linkingRapporto,
    handleLinkRapporto,
    editingDetails,
    toggleEditingDetails,
    detailsError,
    form,
    tipoLicenziamentoSelectOptions,
    uploadingSlot,
    handleUploadAttachment,
    handleRemoveAttachment,
  } = vm

  return (
    <Form {...form}>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          ref={commentAnchorRef}
          side="right"
          className="w-[min(96vw,980px)]! max-w-none! p-0 sm:max-w-none"
        >
          <SheetHeader className="border-b bg-surface px-5 py-5">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <SheetTitle className="truncate text-xl font-semibold">
                    {card?.nomeCompleto ?? "Dettaglio chiusura"}
                  </SheetTitle>
                  <SheetDescription className="sr-only">
                    Dettaglio pratica di chiusura con stato, riepilogo rapporto e allegati.
                  </SheetDescription>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Creata il {formatChiusuraDisplayDate(card?.record.creato_il)}
                  </p>
                </div>
                {card && onDeleteChiusura ? (
                  <DeleteRecordAction
                    title="Eliminare questa chiusura?"
                    description="La pratica di chiusura verrà eliminata definitivamente. I rapporti e i ticket collegati verranno scollegati. Questa azione non è reversibile."
                    toastMessages={{
                      loading: "Eliminazione chiusura in corso…",
                      success: "Chiusura eliminata",
                      error: "Errore durante l'eliminazione della chiusura",
                    }}
                    onDelete={async () => {
                      await onDeleteChiusura(card.id)
                      onOpenChange(false)
                    }}
                  />
                ) : null}
              </div>

              {card ? (
                <Select
                  value={card.stage}
                  onValueChange={(value) => void handleStatusChange(value)}
                  disabled={updatingStatus}
                >
                  <SelectTrigger className="h-8 w-auto gap-1.5 rounded-full bg-surface px-3 text-xs font-medium">
                    <SelectValue placeholder="Seleziona stato" />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map((column) => (
                      <SelectItem key={column.id} value={column.id}>
                        {column.label}
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
                <LinkedRapportoSummaryCard title={card.nomeCompleto} rapporto={card.rapporto} />

                <DetailSectionBlock
                  title="Associazione rapporto"
                  icon={<FileTextIcon className="text-muted-foreground size-4" />}
                  contentClassName="space-y-2"
                >
                  <AssociationSearchField
                    query={rapportoSearchQuery}
                    onQueryChange={setRapportoSearchQuery}
                    options={filteredRapportoOptions.map((option) => ({
                      id: option.id,
                      primaryLabel: option.label,
                    }))}
                    selectedId={card.rapporto?.id ?? null}
                    onSelect={(id) => void handleLinkRapporto(id)}
                    onUnlink={() => void handleLinkRapporto(null)}
                    canUnlink={Boolean(card.rapporto)}
                    disabled={linkingRapporto}
                    placeholder="Cerca per famiglia o lavoratore..."
                    emptyMessage="Nessun rapporto trovato."
                  />
                </DetailSectionBlock>

                <ChiusureDetailFields
                  card={card}
                  editingDetails={editingDetails}
                  detailsError={detailsError}
                  tipoLicenziamentoSelectOptions={tipoLicenziamentoSelectOptions}
                  toggleEditingDetails={toggleEditingDetails}
                />

                <ChiusureDetailAttachments
                  card={card}
                  uploadingSlot={uploadingSlot}
                  handleUploadAttachment={handleUploadAttachment}
                  handleRemoveAttachment={handleRemoveAttachment}
                />
              </div>
            </section>
          ) : (
            <ChiusureDetailSheetSkeleton />
          )}
        </SheetContent>
      </Sheet>
    </Form>
  )
}
