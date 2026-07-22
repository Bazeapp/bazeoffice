import type { CrmPipelineStageDefinition } from "../types/crm-pipeline-preview"

export const CRM_REALTIME_TABLES = ["processi_matching", "famiglie", "indirizzi"]
export const CRM_REALTIME_RELOAD_DEBOUNCE_MS = 600

export const STATO_SALES_COLUMN_ORDER = [
  "warm_lead",
  "hot_ingresso",
  "hot_in_attesa_di_primo_contatto",
  "hot_contatto_avvenuto",
  "hot_callback_programmato",
  "hot_decisione_rimandata",
  "hot_call_attivazione_prenotata",
  "hot_call_attivazione_fatta",
  "hot_follow_up_post_call",
  "hot_no_show",
  "cold_ricerca_futura",
  "won_in_attesa_di_conferma",
  "won_ricerca_attivata",
  "lost",
  "out_of_target",
] as const

export const FALLBACK_STATO_SALES_STAGES = [
  {
    id: "won_in_attesa_di_conferma",
    label: "WON - In attesa di conferma",
    color: "emerald",
    sortOrder: null,
  },
] satisfies CrmPipelineStageDefinition[]

export const CRM_PIPELINE_CARD_LIMIT = 5000
export const CRM_PIPELINE_SEARCH_CARD_LIMIT = 50000
export const CLOSED_STAGE_IDS = new Set(["won_ricerca_attivata", "lost", "out_of_target"])
export const PREVENTIVO_ACCEPTANCE_BASE_URL =
  "https://app.bazeapp.com/v2/checkout/accettare-preventivo"

export const ADDRESS_BATCH_SIZE = 150
