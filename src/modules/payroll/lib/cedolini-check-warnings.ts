/**
 * Cedolini Controlli — pure grouping/filtering for check-run results (U4).
 *
 * No React/Supabase here: everything is a deterministic function of its
 * inputs so the PRD R2/R3 semantics (fixed category order, multi-group
 * membership, Pronti = `ok`) are unit-testable in isolation from the hook
 * that fetches `cedolino_check_runs` / `cedolino_check_results`.
 */
import { getTipoUtenteFilterValue } from "./cedolini-filters"
import type { PayrollBoardCardData, PayrollBoardColumnData } from "../types"
import {
  CEDOLINO_WARNING_CATEGORIES,
  type CedolinoCheckResultRecord,
  type CedolinoCheckResultStatus,
  type CedolinoCheckRunRecord,
  type CedolinoCheckWarning,
  type CedolinoWarningCategory,
} from "../types/cedolino-check"

export { CEDOLINO_WARNING_CATEGORIES as WARNING_CATEGORIES }

// --- Name/tipo enrichment from the board (no extra RPC) ---------------------

export type MeseLavoratoInfo = {
  nomeCompleto: string
  tipo: "abbonamenti" | "baze_pay"
  importoLabel: string | null
  dataInvioLabel: string | null
}

function toMeseLavoratoInfo(card: PayrollBoardCardData): MeseLavoratoInfo {
  return {
    nomeCompleto: card.nomeCompleto,
    tipo: getTipoUtenteFilterValue(card),
    importoLabel: card.importoLabel,
    dataInvioLabel: card.dataInvioLabel,
  }
}

/**
 * Builds a `mesi_lavorati.id → {nomeCompleto, tipo, ...}` map from the
 * existing payroll board columns (`usePayrollBoard`), so Controlli cards can
 * show datore/lavoratore/tipo without a dedicated RPC (plan U4 approach).
 */
export function buildMeseLavoratoInfoMap(
  columns: PayrollBoardColumnData[],
): Map<string, MeseLavoratoInfo> {
  const map = new Map<string, MeseLavoratoInfo>()
  for (const column of columns) {
    for (const card of column.cards) {
      map.set(card.id, toMeseLavoratoInfo(card))
    }
  }
  return map
}

// --- Check-run card model ----------------------------------------------------

export type CedolinoCheckCard = {
  resultId: string
  meseLavorativoId: string
  status: CedolinoCheckResultStatus
  warnings: CedolinoCheckWarning[]
  details: Record<string, unknown> | null
  info: MeseLavoratoInfo | null
}

function toCedolinoCheckCard(
  result: CedolinoCheckResultRecord,
  infoMap: Map<string, MeseLavoratoInfo>,
): CedolinoCheckCard {
  return {
    resultId: result.id,
    meseLavorativoId: result.mese_lavorativo_id,
    status: result.status,
    warnings: result.warnings ?? [],
    details: result.details ?? null,
    info: infoMap.get(result.mese_lavorativo_id) ?? null,
  }
}

/**
 * Combines raw `cedolino_check_results` rows with the board's id→info map
 * into renderable cards. Single entry point the Controlli hook/view use.
 */
export function buildCedolinoCheckCards(
  results: CedolinoCheckResultRecord[],
  columns: PayrollBoardColumnData[],
): CedolinoCheckCard[] {
  const infoMap = buildMeseLavoratoInfoMap(columns)
  return results.map((result) => toCedolinoCheckCard(result, infoMap))
}

// --- Pronti -------------------------------------------------------------------

export function getProntiCards(cards: CedolinoCheckCard[]): CedolinoCheckCard[] {
  return cards.filter((card) => card.status === "ok")
}

// --- Warning grouping (multi-membership, fixed PRD order) --------------------

const CATEGORY_ORDER_INDEX = new Map<CedolinoWarningCategory, number>(
  CEDOLINO_WARNING_CATEGORIES.map((category, index) => [category, index]),
)

/**
 * Unique warning categories for a single card, in fixed PRD order. Cards with
 * status `warning`/`error` but no recognized category (e.g. a critical error
 * with no structured warning) fall back to "Altri" so they are never lost
 * from the Warning side of the board.
 */
export function getCardWarningCategories(card: CedolinoCheckCard): CedolinoWarningCategory[] {
  if (card.status !== "warning" && card.status !== "error") return []

  const categories = new Set<CedolinoWarningCategory>()
  for (const warning of card.warnings) {
    if (CATEGORY_ORDER_INDEX.has(warning.category)) {
      categories.add(warning.category)
    }
  }
  if (categories.size === 0) {
    categories.add("Altri")
  }

  return CEDOLINO_WARNING_CATEGORIES.filter((category) => categories.has(category))
}

export type CedolinoWarningGroup = {
  category: CedolinoWarningCategory
  cards: CedolinoCheckCard[]
}

/**
 * Groups warning/error cards by fixed category order. A card belonging to
 * multiple categories appears in EACH matching group (PRD R3). Always
 * returns all 7 categories (possibly empty) so the UI can render stable chips.
 */
export function groupWarningsByCategory(cards: CedolinoCheckCard[]): CedolinoWarningGroup[] {
  const byCategory = new Map<CedolinoWarningCategory, CedolinoCheckCard[]>(
    CEDOLINO_WARNING_CATEGORIES.map((category) => [category, []]),
  )

  for (const card of cards) {
    for (const category of getCardWarningCategories(card)) {
      byCategory.get(category)?.push(card)
    }
  }

  return CEDOLINO_WARNING_CATEGORIES.map((category) => ({
    category,
    cards: byCategory.get(category) ?? [],
  }))
}

// --- Category filter chips (multi-select, default all) -----------------------

export function createDefaultWarningCategoryFilter(): Set<CedolinoWarningCategory> {
  return new Set(CEDOLINO_WARNING_CATEGORIES)
}

export function toggleWarningCategoryFilter(
  filter: Set<CedolinoWarningCategory>,
  category: CedolinoWarningCategory,
): Set<CedolinoWarningCategory> {
  const next = new Set(filter)
  if (next.has(category)) {
    next.delete(category)
  } else {
    next.add(category)
  }
  return next
}

export function filterWarningGroups(
  groups: CedolinoWarningGroup[],
  filter: Set<CedolinoWarningCategory>,
): CedolinoWarningGroup[] {
  return groups.filter((group) => filter.has(group.category))
}

// --- Run progress --------------------------------------------------------------

export function getCheckRunProgressPercent(
  run: Pick<CedolinoCheckRunRecord, "checked_count" | "total_count">,
): number {
  if (!run.total_count || run.total_count <= 0) return 0
  return Math.min(100, Math.round((run.checked_count / run.total_count) * 100))
}
