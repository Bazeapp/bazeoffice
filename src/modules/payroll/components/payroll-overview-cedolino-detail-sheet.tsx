import { Form } from "@/components/ui/form"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { LinkedRapportoSummaryCard } from "@/components/shared-next/linked-rapporto-summary-card"

import { useCedolinoDetail } from "../hooks/use-cedolino-detail"
import type { CedolinoDetailSheetProps } from "../types"
import { PayrollOverviewDetailSkeleton } from "./payroll-overview-board-skeleton"
import { PayrollOverviewCedolinoDetailCedolino } from "./payroll-overview-cedolino-detail-cedolino"
import { PayrollOverviewCedolinoDetailFeedback } from "./payroll-overview-cedolino-detail-feedback"
import { PayrollOverviewCedolinoDetailHeader } from "./payroll-overview-cedolino-detail-header"
import { PayrollOverviewCedolinoDetailPagamento } from "./payroll-overview-cedolino-detail-pagamento"
import { PayrollOverviewCedolinoDetailPresenze } from "./payroll-overview-cedolino-detail-presenze"
import { PayrollOverviewCedolinoDetailRapporto } from "./payroll-overview-cedolino-detail-rapporto"

export function CedolinoDetailSheet({
  card,
  columns,
  open,
  onOpenChange,
  onStageChange,
  onPatchCard,
  onPatchPresence,
}: CedolinoDetailSheetProps) {
  const detail = useCedolinoDetail({ card, onPatchCard, onPatchPresence })

  return (
    <Form {...detail.form}>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-[min(96vw,980px)]! max-w-none! p-0 sm:max-w-none"
          data-testid="cedolini-sheet-dialog"
        >
          <PayrollOverviewCedolinoDetailHeader
            card={card}
            columns={columns}
            onStageChange={onStageChange}
          />

          {card ? (
            <section className="h-full overflow-y-auto bg-surface-muted px-5 py-5">
              <div className="mx-auto max-w-5xl space-y-5">
                <LinkedRapportoSummaryCard
                  title={card.nomeCompleto}
                  rapporto={detail.derived.rapporto ?? null}
                />

                <PayrollOverviewCedolinoDetailRapporto
                  card={card}
                  rapporto={detail.derived.rapporto}
                  famiglia={detail.derived.famiglia}
                />

                <PayrollOverviewCedolinoDetailCedolino
                  card={card}
                  famiglia={detail.derived.famiglia}
                  contractHours={detail.derived.contractHours}
                  workedHours={detail.derived.workedHours}
                  cedolinoPreviewUrl={detail.derived.cedolinoPreviewUrl}
                  showCedolinoPreview={detail.showCedolinoPreview}
                  onToggleCedolinoPreview={detail.toggleCedolinoPreview}
                  uploadingCedolino={detail.uploadingCedolino}
                  uploadError={detail.uploadError}
                  onUploadCedolino={detail.handleUploadCedolino}
                  onRemoveCedolino={detail.handleRemoveCedolino}
                  onPreviewOpen={detail.openAttachmentPreview}
                />

                <PayrollOverviewCedolinoDetailPagamento
                  card={card}
                  derived={detail.derived}
                  runningAutomationId={detail.runningAutomationId}
                  onPatchCard={onPatchCard}
                  onCopyMakeTransactionUrl={detail.handleCopyMakeTransactionUrl}
                  onRunPagamentoAutomation={detail.handleRunPagamentoAutomation}
                />

                <PayrollOverviewCedolinoDetailPresenze
                  card={card}
                  rapporto={detail.derived.rapporto}
                  presenceRows={detail.derived.presenceRows}
                  lastWorkingDay={detail.derived.lastWorkingDay}
                  isRegularPresence={detail.derived.isRegularPresence}
                />

                <PayrollOverviewCedolinoDetailFeedback card={card} />
              </div>
            </section>
          ) : (
            <PayrollOverviewDetailSkeleton />
          )}
        </SheetContent>
      </Sheet>
    </Form>
  )
}
