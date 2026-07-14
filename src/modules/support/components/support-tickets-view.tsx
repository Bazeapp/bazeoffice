import { PlusIcon } from "lucide-react"
import * as React from "react"

import { SectionHeader } from "@/components/shared-next/section-header"
import { useCommentRouteContext } from "@/modules/commenti/hooks"
import {
  ticketCommentRow,
  ticketDisplayNames,
} from "@/modules/commenti/lib/comment-route-helpers"
import { Button } from "@/components/ui/button"
import { SearchInput } from "@/components/ui/search-input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import type { SupportTicketType } from "../lib"
import { useSupportTicketsView } from "../hooks/use-support-tickets-view"
import { SupportTicketCreateDialog } from "./support-ticket-create-dialog"
import { SupportTicketDetailSheet } from "./support-ticket-detail-sheet"
import { SupportTicketsKanban } from "./support-tickets-kanban"

export function SupportTicketsView({ ticketType }: { ticketType: SupportTicketType }) {
  const view = useSupportTicketsView(ticketType)
  const commentAnchorRef = React.useRef<HTMLDivElement>(null)
  const selectedCard = view.detailSheet.card
  const sourceInterface =
    ticketType === "Payroll" ? "ticket_payroll" : "ticket_customer"

  useCommentRouteContext({
    enabled: view.detailSheet.open && Boolean(selectedCard),
    pageFocus: selectedCard
      ? { entityType: "ticket", entityId: selectedCard.id }
      : null,
    row: selectedCard ? ticketCommentRow(selectedCard) : {},
    sourceInterface,
    anchorRef: commentAnchorRef,
    displayNames: selectedCard ? ticketDisplayNames(selectedCard) : undefined,
  })

  return (
    <section className="ui flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden">
      <SectionHeader>
        <SectionHeader.Title subtitle={view.header.subtitle}>
          {view.header.title}
        </SectionHeader.Title>
        <SectionHeader.Actions>
          <Button
            onClick={view.header.onOpenCreate}
            data-testid={`${view.boardTestIdPrefix}-open-create`}
          >
            <PlusIcon />
            Apri ticket
          </Button>
        </SectionHeader.Actions>
        <SectionHeader.Toolbar>
          <div className="min-w-0 flex-1">
            <SearchInput
              value={view.header.search}
              onChange={(event) => view.header.setSearch(event.target.value)}
              onClear={() => view.header.setSearch("")}
              placeholder="Cerca causale, famiglia o lavoratore"
              data-testid={`${view.boardTestIdPrefix}-search-input`}
            />
          </div>
          <div className="w-50 shrink-0">
            <Select value={view.header.stageFilter} onValueChange={view.header.setStageFilter}>
              <SelectTrigger data-testid={`${view.boardTestIdPrefix}-stage-filter`}>
                <SelectValue placeholder="Tutti gli stati" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli stati</SelectItem>
                {view.header.stages.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id}>
                    {stage.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {view.header.showResetFilters ? (
            <Button
              variant="ghost"
              className="shrink-0"
              onClick={view.header.onResetFilters}
            >
              Reset filtri
            </Button>
          ) : null}
        </SectionHeader.Toolbar>
      </SectionHeader>

      {view.error ? (
        <div className="mx-4 mt-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Errore caricamento ticket: {view.error}
        </div>
      ) : null}

      <SupportTicketsKanban {...view.kanban} />

      <SupportTicketCreateDialog
        open={view.createDialog.open}
        onOpenChange={view.createDialog.onOpenChange}
        defaultTicketType={ticketType}
        rapportoOptions={view.createDialog.rapportoOptions}
        onCreateTicket={view.createDialog.onCreateTicket}
        dialogTestId={view.createDialog.dialogTestId}
      />

      {view.detailSheet.card ? (
        <SupportTicketDetailSheet
          // Remount on ticket switch so debounced inputs reset their local draft.
          key={view.detailSheet.selectedTicketId ?? "__empty__"}
          card={view.detailSheet.card}
          stages={view.detailSheet.stages}
          rapportoOptions={view.detailSheet.rapportoOptions}
          open={view.detailSheet.open}
          onOpenChange={view.detailSheet.onOpenChange}
          onMoveTicket={view.detailSheet.onMoveTicket}
          onPatchTicket={view.detailSheet.onPatchTicket}
          sheetTestId={view.detailSheet.sheetTestId}
          commentAnchorRef={commentAnchorRef}
        />
      ) : null}
    </section>
  )
}
