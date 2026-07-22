import type { AttachmentLink } from "@/components/shared-next/attachment-utils"
import { DetailField } from "@/components/shared-next/detail-section-card"
import { ContributoInpsDetailSheet, CedolinoDetailSheet } from "@/modules/payroll/components"
import type {
  ContributoInpsBoardCardData,
  PayrollBoardCardData,
  PayrollBoardColumnData,
} from "@/modules/payroll/types"
import type { ContributiColumnData } from "@/modules/payroll/components"
import {
  SupportTicketCreateDialog,
  type SupportTicketTag,
  type SupportTicketType,
  type SupportTicketUrgency,
} from "@/modules/support/components"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { updateRecord } from "@/lib/record-crud"
import type { TicketRecord } from "@/types"

import { formatRapportoDetailDate } from "../lib/rapporto-detail-panel.utils"

type RapportoDetailPanelOverlaysProps = {
  rapportoId: string
  relationshipTitle: string
  createTicket: {
    enabled: boolean
    open: boolean
    onOpenChange: (open: boolean) => void
    onCreateTicket: (input: {
      tipo: SupportTicketType
      rapportoId: string
      tag: SupportTicketTag
      urgenza: SupportTicketUrgency
      causale: string
      note: string
    }) => Promise<void>
  }
  cedolino: {
    selectedId: string | null
    card: PayrollBoardCardData | null
    columns: PayrollBoardColumnData[]
    onOpenChange: (open: boolean) => void
  }
  contributo: {
    selectedId: string | null
    card: ContributoInpsBoardCardData | null
    columns: ContributiColumnData[]
    onOpenChange: (open: boolean) => void
  }
  ticket: {
    selected: TicketRecord | null
    onOpenChange: (open: boolean) => void
  }
  preview: {
    selected: AttachmentLink | null
    onOpenChange: (open: boolean) => void
  }
}

export function RapportoDetailPanelOverlays({
  rapportoId,
  relationshipTitle,
  createTicket,
  cedolino,
  contributo,
  ticket,
  preview,
}: RapportoDetailPanelOverlaysProps) {
  return (
    <>
      {createTicket.enabled ? (
        <SupportTicketCreateDialog
          open={createTicket.open}
          onOpenChange={createTicket.onOpenChange}
          defaultTicketType="Customer"
          defaultRapportoId={rapportoId}
          rapportoOptions={[{ id: rapportoId, label: relationshipTitle }]}
          onCreateTicket={createTicket.onCreateTicket}
        />
      ) : null}
      <CedolinoDetailSheet
        key={cedolino.selectedId ?? "__empty__"}
        card={cedolino.card}
        columns={cedolino.columns}
        open={Boolean(cedolino.card)}
        onOpenChange={cedolino.onOpenChange}
        onStageChange={(recordId, targetStageId) => {
          void updateRecord("mesi_lavorati", recordId, {
            stato_mese_lavorativo: targetStageId,
          })
        }}
        onPatchCard={(recordId, patch) => {
          void updateRecord("mesi_lavorati", recordId, patch as Record<string, unknown>)
        }}
        onPatchPresence={(recordId, patch) => {
          void updateRecord("presenze_mensili", recordId, patch as Record<string, unknown>)
        }}
      />
      <ContributoInpsDetailSheet
        key={contributo.selectedId ?? "__empty__"}
        card={contributo.card}
        columns={contributo.columns}
        open={Boolean(contributo.card)}
        onOpenChange={contributo.onOpenChange}
        onStageChange={async (recordId, targetStageId) => {
          await updateRecord("contributi_inps", recordId, {
            stato_contributi_inps: targetStageId,
          })
        }}
        onPatchCard={async (recordId, patch) => {
          await updateRecord("contributi_inps", recordId, patch as Record<string, unknown>)
        }}
      />
      <Dialog open={Boolean(ticket.selected)} onOpenChange={ticket.onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogTitle>{ticket.selected?.causale ?? "Dettaglio ticket"}</DialogTitle>
          {ticket.selected ? (
            <div className="grid gap-4 pt-2 sm:grid-cols-2">
              <DetailField label="Stato" value={ticket.selected.stato ?? "-"} />
              <DetailField label="Tipo" value={ticket.selected.tipo ?? "-"} />
              <DetailField label="Urgenza" value={ticket.selected.urgenza ?? "-"} />
              <DetailField
                label="Data apertura"
                value={formatRapportoDetailDate(ticket.selected.data_apertura)}
              />
              <DetailField label="Creato da" value={ticket.selected.created_by ?? "-"} />
              <DetailField label="ID ticket" value={ticket.selected.id} />
              <div className="sm:col-span-2">
                <DetailField
                  label="Metadati"
                  value={
                    ticket.selected.metadati_migrazione
                      ? JSON.stringify(ticket.selected.metadati_migrazione)
                      : "-"
                  }
                />
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(preview.selected)} onOpenChange={preview.onOpenChange}>
        <DialogContent className="max-w-[min(96vw,72rem)] border-none bg-neutral-950/90 p-2 shadow-none sm:max-w-[min(96vw,72rem)]">
          <DialogTitle className="sr-only">
            {preview.selected?.label ?? "Anteprima documento"}
          </DialogTitle>
          {preview.selected ? (
            <div className="flex max-h-[88vh] items-center justify-center overflow-hidden rounded-lg">
              <img
                src={preview.selected.url}
                alt={preview.selected.label}
                className="max-h-[88vh] w-auto max-w-full object-contain"
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
