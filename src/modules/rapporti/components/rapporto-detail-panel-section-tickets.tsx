import { ArrowRightIcon, MessageSquareTextIcon } from "lucide-react"

import { DetailSectionBlock } from "@/components/shared-next/detail-section-card"
import { Button } from "@/components/ui/button"
import type { TicketRecord } from "@/types"

import { formatRapportoDetailDate } from "../lib/rapporto-detail-panel.utils"
import {
  RapportoDetailPanelEmptyLinkedState,
  RapportoDetailPanelListRowCard,
} from "./rapporto-detail-panel-shared"
import { RapportoDetailPanelLinkedRowsSkeleton } from "./rapporto-detail-panel-states"

type RapportoDetailPanelSectionTicketsProps = {
  sectionRef: (element: HTMLDivElement | null) => void
  loadingRelated: boolean
  tickets: TicketRecord[]
  canCreateTicket: boolean
  onOpenCreateTicket: () => void
  onSelectTicket: (ticket: TicketRecord) => void
}

export function RapportoDetailPanelSectionTickets({
  sectionRef,
  loadingRelated,
  tickets,
  canCreateTicket,
  onOpenCreateTicket,
  onSelectTicket,
}: RapportoDetailPanelSectionTicketsProps) {
  return (
    <div ref={sectionRef} className="space-y-4">
      <DetailSectionBlock
        title="Tickets"
        icon={<MessageSquareTextIcon className="size-5" />}
        action={
          canCreateTicket ? (
            <Button type="button" variant="outline" size="sm" onClick={onOpenCreateTicket}>
              Apri un ticket
              <ArrowRightIcon className="size-4" />
            </Button>
          ) : null
        }
        contentClassName="space-y-3 pt-2"
      >
        {loadingRelated ? (
          <RapportoDetailPanelLinkedRowsSkeleton />
        ) : tickets.length > 0 ? (
          tickets.map((ticket) => (
            <RapportoDetailPanelListRowCard
              key={ticket.id}
              title={ticket.causale ?? "Ticket senza causale"}
              subtitle={[
                ticket.tipo ? `Tipo ${ticket.tipo}` : null,
                ticket.data_apertura ? `Aperto il ${formatRapportoDetailDate(ticket.data_apertura)}` : null,
                ticket.urgenza ? `Urgenza ${ticket.urgenza}` : null,
              ]
                .filter(Boolean)
                .join(" • ")}
              rightBadge={ticket.stato ?? undefined}
              onClick={() => onSelectTicket(ticket)}
            />
          ))
        ) : (
          <RapportoDetailPanelEmptyLinkedState
            icon={<MessageSquareTextIcon className="size-8" />}
            label="Nessun ticket collegato"
          />
        )}
      </DetailSectionBlock>
    </div>
  )
}
