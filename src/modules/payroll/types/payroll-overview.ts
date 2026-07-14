import type { DragEvent, RefObject } from "react"

import type { AttachmentLink } from "@/components/shared-next/attachment-utils"

import type { CedolinoDetailDerived } from "../lib/cedolino-detail-derived"
import type { PayrollBoardCardData, PayrollBoardColumnData } from "./payroll-board"

export type PayrollOverviewDefaultTab = "cedolini" | "contributi-inps"

export type PayrollOverviewViewProps = {
  defaultTab?: PayrollOverviewDefaultTab
}

export type PagamentoAutomationId =
  | "finance-request-invoice-data"
  | "finance-invoice-payment"

export type CedolinoDetailSheetProps = {
  card: PayrollBoardCardData | null
  columns: PayrollBoardColumnData[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onStageChange: (recordId: string, targetStageId: string) => void
  onPatchCard: (recordId: string, patch: Partial<PayrollBoardCardData["record"]>) => void
  onPatchPresence: (
    recordId: string,
    patch: Partial<NonNullable<PayrollBoardCardData["presenze"]>>,
  ) => void
  commentAnchorRef?: RefObject<HTMLDivElement | null>
}

export type PayrollBoardColumnProps = {
  column: PayrollBoardColumnData
  draggingRecordId: string | null
  isDropTarget: boolean
  onOpenCard: (recordId: string) => void
  onDragStartCard: (recordId: string) => void
  onDragEndCard: () => void
  onDragEnterColumn: (columnId: string) => void
  onDragOverColumn: (columnId: string) => void
  onDragLeaveColumn: (event: DragEvent<HTMLDivElement>) => void
  onDropToColumn: (columnId: string, recordId: string | null) => void
}

export type CedolinoDetailHeaderProps = {
  card: PayrollBoardCardData | null
  columns: PayrollBoardColumnData[]
  onStageChange: CedolinoDetailSheetProps["onStageChange"]
}

export type CedolinoDetailRapportoProps = {
  card: PayrollBoardCardData
  rapporto: CedolinoDetailDerived["rapporto"]
  famiglia: CedolinoDetailDerived["famiglia"]
}

export type CedolinoDetailCedolinoProps = {
  card: PayrollBoardCardData
  famiglia: CedolinoDetailDerived["famiglia"]
  contractHours: number | null
  workedHours: number | null
  cedolinoPreviewUrl: string | null
  showCedolinoPreview: boolean
  onToggleCedolinoPreview: () => void
  uploadingCedolino: boolean
  uploadError: string | null
  onUploadCedolino: (file: File) => Promise<void>
  onRemoveCedolino: (link: AttachmentLink) => Promise<void>
  onPreviewOpen: (link: AttachmentLink) => void
}

export type CedolinoDetailPagamentoProps = {
  card: PayrollBoardCardData
  derived: CedolinoDetailDerived
  runningAutomationId: PagamentoAutomationId | null
  onPatchCard: CedolinoDetailSheetProps["onPatchCard"]
  onCopyMakeTransactionUrl: () => void
  onRunPagamentoAutomation: (automationId: PagamentoAutomationId) => void
}

export type CedolinoDetailPresenzeProps = {
  card: PayrollBoardCardData
  rapporto: CedolinoDetailDerived["rapporto"]
  presenceRows: CedolinoDetailDerived["presenceRows"]
  lastWorkingDay: number | null
  isRegularPresence: boolean
}

export type CedolinoDetailFeedbackProps = {
  card: PayrollBoardCardData
}
