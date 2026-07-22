export const RIATTIVAZIONI_BOARD_QUERY_KEY = ["riattivazioni-board"] as const

export const RIATTIVAZIONI_REALTIME_TABLES = [
  "chiusure_contratti",
  "rapporti_lavorativi",
  "famiglie",
  "lavoratori",
] as const

export const EMPTY_SELECT_VALUE = "__empty__"

export const SCONTO_RIATTIVAZIONE_OPTION = "mese gratis"

export type ChiusuraAttachmentSlot = "allegato_compilato" | "documenti_chiusura_rapporto"
