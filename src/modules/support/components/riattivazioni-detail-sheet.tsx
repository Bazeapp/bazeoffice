import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Form } from "@/components/ui/form"
import { LinkedRapportoSummaryCard } from "@/components/shared-next/linked-rapporto-summary-card"
import { formatItalianDate } from "@/lib/value-utils"

import { useRiattivazioniDetailSheet } from "../hooks/use-riattivazioni-detail-sheet"
import type {
  RiattivazioneStageId,
  RiattivazioniBoardCardData,
  RiattivazioniBoardColumnData,
} from "../types"
import { RiattivazioniDetailAttachmentsSection } from "./riattivazioni-detail-attachments-section"
import { RiattivazioniDetailChiusuraSection } from "./riattivazioni-detail-chiusura-section"

export type RiattivazioniDetailSheetProps = {
  card: RiattivazioniBoardCardData | null
  columns: RiattivazioniBoardColumnData[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onStatusChange: (recordId: string, targetStageId: RiattivazioneStageId) => Promise<void>
  onCardChange: (card: RiattivazioniBoardCardData) => void
}

export function RiattivazioniDetailSheet({
  card,
  columns,
  open,
  onOpenChange,
  onStatusChange,
  onCardChange,
}: RiattivazioniDetailSheetProps) {
  const detail = useRiattivazioniDetailSheet({ card, onStatusChange, onCardChange })

  return (
    <Form {...detail.form}>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-[min(96vw,900px)]! max-w-none! p-0 sm:max-w-none">
          <SheetHeader className="border-b bg-surface px-5 py-5">
            <div className="space-y-3">
              <div className="min-w-0">
                <SheetTitle className="truncate text-xl font-semibold">
                  {card?.nomeCompleto ?? "Dettaglio riattivazione"}
                </SheetTitle>
                <SheetDescription className="sr-only">
                  Dettaglio riattivazione famiglia con stato, rapporto collegato e dati chiusura.
                </SheetDescription>
                <p className="mt-1 text-sm text-muted-foreground">
                  Chiusura creata il {formatItalianDate(card?.record.creato_il)}
                </p>
              </div>

              {card ? (
                <Select
                  value={card.stage}
                  onValueChange={(next) => void detail.handleStatusChange(next)}
                  disabled={detail.updatingStatus}
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

                <RiattivazioniDetailChiusuraSection card={card} error={detail.detailsError} />

                <RiattivazioniDetailAttachmentsSection
                  card={card}
                  uploadingSlot={detail.uploadingSlot}
                  onUpload={(slot, file) => void detail.handleUploadAttachment(slot, file)}
                  onRemove={(slot, link) => void detail.handleRemoveAttachment(slot, link)}
                />
              </div>
            </section>
          ) : null}
        </SheetContent>
      </Sheet>
    </Form>
  )
}
