import { matchesSearchQuery } from "@/lib/search-utils"

import type { PayrollBoardCardData, PayrollBoardColumnData } from "../types"
import { cardMatchesCedoliniFilters, type CedoliniFilters } from "./cedolini-filters"

function getCedolinoSearchFields(card: PayrollBoardCardData) {
  return [
    card.id,
    card.nomeCompleto,
    card.importoLabel,
    card.dataInvioLabel,
    card.mese?.mese_lavorativo_copy,
    card.mese?.data_inizio,
    card.mese?.data_fine,
    card.rapporto?.id,
    card.rapporto?.id_rapporto,
    card.rapporto?.codice_datore_webcolf,
    card.rapporto?.codice_dipendente_webcolf,
    card.rapporto?.cognome_nome_datore_proper,
    card.rapporto?.nome_lavoratore_per_url,
    card.famiglia?.nome,
    card.famiglia?.cognome,
    card.famiglia?.email,
    card.famiglia?.customer_email,
    card.rapporto?.tipo_rapporto,
    card.rapporto?.tipo_contratto,
  ]
}

export function filterCedoliniColumns(
  columns: PayrollBoardColumnData[],
  filters: CedoliniFilters,
  searchValue: string,
): PayrollBoardColumnData[] {
  return columns.map((column) => ({
    ...column,
    cards: column.cards.filter((card) => {
      if (!cardMatchesCedoliniFilters(card, filters)) return false
      return matchesSearchQuery(getCedolinoSearchFields(card), searchValue)
    }),
  }))
}
