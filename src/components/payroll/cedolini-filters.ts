/**
 * Filtri della pipeline cedolini (BAZ-36).
 *
 * Modulo PURO: opzioni, stato (4 gruppi di `Set<string>`), derivazioni per
 * card e predicato `cardMatchesCedoliniFilters`. Nessun React qui — così la
 * logica di filtro è unit-testabile in isolamento, fuori dal componente
 * `payroll-overview-view.tsx` (~1845 righe).
 *
 * Semantica (come `prove-colloqui-view.tsx`, NON come la mappa): un valore
 * deselezionato nasconde le card con quel valore; un gruppo con Set vuoto
 * nasconde tutte le card. Default = tutti selezionati ("tutti flagged").
 */

// --- Forma minima della card su cui filtriamo --------------------------------
// PayrollBoardCardData è strutturalmente assegnabile a questo tipo, ma tenerlo
// stretto rende i fixture di test banali da costruire.
export type CedoliniFilterableCard = {
  record: { caso_particolare?: string | null } | null
  stage: string
  pagamento: { status?: string | null } | null
  richiestaAttivazione: { id: string } | null
  presenzeIrregolari: boolean
}

// --- Gruppi e opzioni --------------------------------------------------------

export type CedoliniFilterGroupKey =
  | "casoParticolare"
  | "statoPagamento"
  | "tipoUtente"
  | "presenze"

export type CedoliniFilterOption = { value: string; label: string }

export const CASO_PARTICOLARE_FILTER_OPTIONS: CedoliniFilterOption[] = [
  { value: "regolare", label: "Regolare" },
  { value: "chiusura", label: "Chiusura" },
  { value: "caso_particolare", label: "Caso particolare" },
]

export const STATO_PAGAMENTO_FILTER_OPTIONS: CedoliniFilterOption[] = [
  { value: "da_pagare", label: "Ancora da pagare" },
  { value: "pagato", label: "Pagato" },
]

export const TIPO_UTENTE_FILTER_OPTIONS: CedoliniFilterOption[] = [
  { value: "abbonamenti", label: "Abbonamenti" },
  { value: "baze_pay", label: "Baze pay" },
]

export const PRESENZE_FILTER_OPTIONS: CedoliniFilterOption[] = [
  { value: "regolari", label: "Regolari" },
  { value: "irregolari", label: "Irregolari" },
]

export const CEDOLINI_FILTER_GROUPS: {
  key: CedoliniFilterGroupKey
  label: string
  options: CedoliniFilterOption[]
}[] = [
  { key: "casoParticolare", label: "Caso particolare", options: CASO_PARTICOLARE_FILTER_OPTIONS },
  { key: "statoPagamento", label: "Stato pagamento", options: STATO_PAGAMENTO_FILTER_OPTIONS },
  { key: "tipoUtente", label: "Tipo utente", options: TIPO_UTENTE_FILTER_OPTIONS },
  { key: "presenze", label: "Presenze", options: PRESENZE_FILTER_OPTIONS },
]

// --- Stato -------------------------------------------------------------------

export type CedoliniFilters = Record<CedoliniFilterGroupKey, Set<string>>

/** Stato iniziale: ogni gruppo con TUTTE le opzioni selezionate. */
export function createDefaultCedoliniFilters(): CedoliniFilters {
  return {
    casoParticolare: new Set(CASO_PARTICOLARE_FILTER_OPTIONS.map((option) => option.value)),
    statoPagamento: new Set(STATO_PAGAMENTO_FILTER_OPTIONS.map((option) => option.value)),
    tipoUtente: new Set(TIPO_UTENTE_FILTER_OPTIONS.map((option) => option.value)),
    presenze: new Set(PRESENZE_FILTER_OPTIONS.map((option) => option.value)),
  }
}

/** Toggle immutabile di un valore in un gruppo (clona il Set). */
export function toggleCedoliniFilter(
  filters: CedoliniFilters,
  group: CedoliniFilterGroupKey,
  value: string,
): CedoliniFilters {
  const next = new Set(filters[group])
  if (next.has(value)) {
    next.delete(value)
  } else {
    next.add(value)
  }
  return { ...filters, [group]: next }
}

// --- Derivazioni per card (pure) ---------------------------------------------

/**
 * Normalizza `mesi_lavorati.caso_particolare` (testo libero). Stessa logica
 * usata dai badge in payroll-overview-view.tsx (`getCedolinoTypeLabel` /
 * `getCedolinoTypeClassName`), che importano questa funzione — così badge e
 * filtro non possono divergere.
 */
export function normalizeCaseFlag(value: string | null | undefined): "no" | "si" | "chiusura" {
  const token = String(value ?? "").trim().toLowerCase()
  if (!token) return "no"
  if (token === "chiusura rapporto") return "chiusura"
  if (["si", "sì", "yes", "true", "caso particolare"].includes(token)) return "si"
  return "no"
}

export function getCasoParticolareFilterValue(
  value: string | null | undefined,
): "regolare" | "caso_particolare" | "chiusura" {
  const flag = normalizeCaseFlag(value)
  if (flag === "chiusura") return "chiusura"
  if (flag === "si") return "caso_particolare"
  return "regolare"
}

/**
 * "Pagato" nel senso del BADGE (stage o esito pagamento). NON applica la
 * regola abbonamento→Pagato: quella vive in `getStatoPagamentoFilterValue`.
 * Stessa logica dell'inline in `PayrollBoardCard`, ora condivisa.
 */
export function isCardPaid(card: Pick<CedoliniFilterableCard, "stage" | "pagamento">): boolean {
  return card.stage === "Pagato" || card.stage === "DONE" || card.pagamento?.status === "succeeded"
}

/** Abbonamento ⇔ il rapporto NON ha una richiesta_attivazione collegata. */
export function isAbbonamentoCard(
  card: Pick<CedoliniFilterableCard, "richiestaAttivazione">,
): boolean {
  return card.richiestaAttivazione == null
}

export function getTipoUtenteFilterValue(
  card: Pick<CedoliniFilterableCard, "richiestaAttivazione">,
): "abbonamenti" | "baze_pay" {
  return isAbbonamentoCard(card) ? "abbonamenti" : "baze_pay"
}

/**
 * Gli abbonamenti non hanno uno stato pagamento → contano sempre come
 * "Pagato" (da issue BAZ-36). Per gli altri vale `isCardPaid`.
 */
export function getStatoPagamentoFilterValue(
  card: Pick<CedoliniFilterableCard, "stage" | "pagamento" | "richiestaAttivazione">,
): "pagato" | "da_pagare" {
  if (isAbbonamentoCard(card)) return "pagato"
  return isCardPaid(card) ? "pagato" : "da_pagare"
}

export function getPresenzeFilterValue(
  card: Pick<CedoliniFilterableCard, "presenzeIrregolari">,
): "regolari" | "irregolari" {
  return card.presenzeIrregolari ? "irregolari" : "regolari"
}

// --- Predicato ---------------------------------------------------------------

/**
 * `true` se la card passa TUTTI e 4 i gruppi (AND). Semantica stretta:
 * un valore deselezionato esclude la card; un gruppo vuoto esclude tutto.
 */
export function cardMatchesCedoliniFilters(
  card: CedoliniFilterableCard,
  filters: CedoliniFilters,
): boolean {
  if (!filters.casoParticolare.has(getCasoParticolareFilterValue(card.record?.caso_particolare))) {
    return false
  }
  if (!filters.statoPagamento.has(getStatoPagamentoFilterValue(card))) return false
  if (!filters.tipoUtente.has(getTipoUtenteFilterValue(card))) return false
  if (!filters.presenze.has(getPresenzeFilterValue(card))) return false
  return true
}
