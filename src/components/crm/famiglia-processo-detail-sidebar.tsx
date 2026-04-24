import { XIcon } from "lucide-react"

import { FamigliaProcessoDetailContent } from "@/components/crm/famiglia-processo-detail-content"
import { Button } from "@/components/ui/button"
import { Sheet, SheetClose, SheetContent } from "@/components/ui/sheet"
import type {
  CrmPipelineCardData,
  LookupOptionsByField,
} from "@/hooks/use-crm-pipeline-preview"

type FamigliaProcessoDetailSidebarProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  card: CrmPipelineCardData | null
  lookupOptionsByField: LookupOptionsByField
  editMode?: "always" | "toggle"
  onChangeStatoSales?: (processId: string, targetStageId: string) => void | Promise<void>
  onPatchProcess?: (
    processId: string,
    patch: Record<string, unknown>
  ) => void | Promise<void>
  onPatchFamily?: (
    familyId: string,
    patch: Record<string, unknown>
  ) => void | Promise<void>
}

export function FamigliaProcessoDetailSidebar({
  open,
  onOpenChange,
  card,
  lookupOptionsByField,
  editMode = "always",
  onChangeStatoSales,
  onPatchProcess,
  onPatchFamily,
}: FamigliaProcessoDetailSidebarProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="!w-[min(96vw,760px)] !max-w-none overflow-hidden p-0 sm:!max-w-none"
      >
        <FamigliaProcessoDetailContent
          card={card}
          lookupOptionsByField={lookupOptionsByField}
          editMode={editMode}
          onChangeStatoSales={onChangeStatoSales}
          onPatchProcess={onPatchProcess}
          onPatchFamily={onPatchFamily}
          headerAction={
            <SheetClose asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Chiudi dettaglio"
                title="Chiudi dettaglio"
              >
                <XIcon />
              </Button>
            </SheetClose>
          }
        />
      </SheetContent>
    </Sheet>
  )
}
