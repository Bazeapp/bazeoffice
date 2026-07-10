import type { ColumnDef } from "@tanstack/react-table"

import type { RapportiListItem } from "./list-panel-utils"

export const RAPPORTI_LIST_PANEL_VIEWS_STORAGE_KEY = "gestione-contrattuale.rapporti.saved-views"

export const RAPPORTI_LIST_PANEL_SEARCH_DEBOUNCE_MS = 350

export const RAPPORTI_LIST_PANEL_GROUP_OPTIONS = [
  { label: "Stato rapporto", value: "stato_rapporto" },
  { label: "Stato servizio", value: "stato_servizio" },
  { label: "Stato assunzione", value: "stato_assunzione" },
  { label: "Stato riattivazione", value: "stato_riattivazione" },
  { label: "Tipo contratto", value: "tipo_contratto" },
  { label: "Tipo rapporto", value: "tipo_rapporto" },
] as const

export const RAPPORTI_LIST_PANEL_TABLE_COLUMNS: ColumnDef<RapportiListItem>[] = [
  { accessorKey: "famigliaLabel", header: "Famiglia" },
  { accessorKey: "lavoratoreLabel", header: "Lavoratore" },
  { accessorKey: "stato_rapporto", header: "Stato rapporto" },
  { accessorKey: "stato_servizio", header: "Stato servizio" },
  { accessorKey: "stato_assunzione", header: "Stato assunzione" },
  { accessorKey: "stato_riattivazione", header: "Stato riattivazione" },
  { accessorKey: "tipo_contratto", header: "Tipo contratto" },
  { accessorKey: "tipo_rapporto", header: "Tipo rapporto" },
  { accessorKey: "ore_a_settimana", header: "Ore" },
  { accessorKey: "data_inizio_rapporto", header: "Data inizio" },
]
