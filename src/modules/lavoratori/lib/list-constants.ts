/** Primary board table — membership / visible-row filters apply only here. */
export const LAVORATORI_BOARD_REALTIME_TABLE = "lavoratori" as const

/**
 * CDC tables for gate/cerca realtime. Board reload stays scoped to
 * `lavoratori`; related tables drive Pattern B open-detail refresh only.
 */
export const LAVORATORI_REALTIME_TABLES = [
  LAVORATORI_BOARD_REALTIME_TABLE,
  "indirizzi",
  "esperienze_lavoratori",
  "referenze_lavoratori",
  "documenti_lavoratori",
  "selezioni_lavoratori",
] as const

export const DEFAULT_PAGE_SIZE = 50
export const SERVER_QUERY_DEBOUNCE_MS = 700
export const VIEWS_STORAGE_KEY = "lavoratori.cerca.saved-views"
export const ADDRESS_BATCH_SIZE = 120
export const WORKER_LIST_DATA_VERSION = "worker-list-gate-detail-v1"
