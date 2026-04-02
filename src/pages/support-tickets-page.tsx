import { SupportTicketsView } from "@/components/support/support-tickets-view"
import type { SupportTicketType } from "@/components/support/support-ticket-config"

export function SupportTicketsPage({ ticketType }: { ticketType: SupportTicketType }) {
  return <SupportTicketsView ticketType={ticketType} />
}
