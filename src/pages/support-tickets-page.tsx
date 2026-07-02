import { SupportTicketsView, type SupportTicketType } from "@/modules/support"

export function SupportTicketsPage({ ticketType }: { ticketType: SupportTicketType }) {
  return <SupportTicketsView ticketType={ticketType} />
}
