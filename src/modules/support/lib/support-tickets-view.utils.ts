import { matchesSearchQuery } from "@/lib/search-utils"

import type { SupportTicketType } from "./support-ticket-config"
import type {
  SupportTicketBoardCardData,
  SupportTicketsColumnData,
} from "../types"
import type { SupportTicketStatusDefinition } from "./support-ticket-config"

export function ticketsStageTestId(stageId: string) {
  return stageId.replace(/\s+/g, "_")
}

export function ticketBoardTestIdPrefix(ticketType: SupportTicketType) {
  return ticketType === "Customer" ? "ticket-customer" : "ticket-payroll"
}

export function getSupportTicketSearchFields(card: SupportTicketBoardCardData) {
  return [
    card.id,
    card.causale,
    card.nomeFamiglia,
    card.nomeLavoratore,
    card.tag,
    card.rapporto?.id,
    card.rapporto?.id_rapporto,
    card.rapporto?.cognome_nome_datore_proper,
    card.rapporto?.nome_lavoratore_per_url,
    card.rapporto?.tipo_rapporto,
    card.rapporto?.tipo_contratto,
    ...card.linkedRecords.flatMap((record) => [
      record.id,
      record.label,
      record.title,
      record.subtitle,
      record.status,
    ]),
  ]
}

type FilterSupportTicketCardsInput = {
  search: string
  stageFilter: string
  showClosedTickets: boolean
}

export function filterSupportTicketCards(
  cards: SupportTicketBoardCardData[],
  { search, stageFilter, showClosedTickets }: FilterSupportTicketCardsInput,
) {
  return cards.filter((card) => {
    if (!showClosedTickets && card.stage === "chiuso") return false
    if (stageFilter !== "all" && card.stage !== stageFilter) return false
    return matchesSearchQuery(getSupportTicketSearchFields(card), search)
  })
}

export function buildSupportTicketColumns(
  stages: SupportTicketStatusDefinition[],
  cards: SupportTicketBoardCardData[],
  filteredCards: SupportTicketBoardCardData[],
  showClosedTickets: boolean,
): SupportTicketsColumnData[] {
  return stages.map((stage) => ({
    id: stage.id,
    label: stage.label,
    color: stage.color,
    totalCount: cards.filter((card) => card.stage === stage.id).length,
    cards: filteredCards.filter((card) => card.stage === stage.id),
    deferred: stage.id === "chiuso",
    isLoaded: stage.id !== "chiuso" || showClosedTickets,
    deferredActionLabel: stage.id === "chiuso" ? "Mostra chiusi" : undefined,
  }))
}
