import { SupportTicketsView, type SupportTicketType } from "@/modules/support/components"

export function SupportTicketsPage({ ticketType }: { ticketType: SupportTicketType }) {
  return <SupportTicketsView ticketType={ticketType} />
}
