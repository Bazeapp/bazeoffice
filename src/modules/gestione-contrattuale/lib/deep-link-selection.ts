import type {
  AssunzioniBoardCardData,
  AssunzioniBoardColumnData,
} from "../types"

/**
 * BAZ-20: what the assunzioni board should do when opened via a deep-link from
 * the rapporto "Datore" card.
 *
 * The board is indexed by `rapporti_lavorativi.id` (a card's `id === rapporto.id`),
 * so the target id matches a card directly with no lookup. Some stages are
 * lazy-loaded ("Contratto firmato", "Non assume con Baze"): if the target card
 * lives in a not-yet-loaded deferred column we must load it before concluding
 * that no assunzione exists.
 */
export type DeepLinkSelectionAction =
  | { type: "select"; card: AssunzioniBoardCardData }
  | { type: "load-deferred"; stageIds: string[] }
  | { type: "wait" }
  | { type: "load-error" }
  | { type: "not-found" }

export function resolveDeepLinkSelection(
  columns: AssunzioniBoardColumnData[],
  targetRapportoId: string,
): DeepLinkSelectionAction {
  const card = columns
    .flatMap((column) => column.cards)
    .find((current) => current.id === targetRapportoId)
  if (card) return { type: "select", card }

  // Deferred columns we can still try to load. Exclude ones that already failed
  // (`loadError`): otherwise they re-qualify as "unloaded" on every re-run and
  // stall the auto-select forever (never selecting, never concluding not-found).
  const loadableDeferred = columns.filter(
    (column) =>
      column.deferred && !column.loaded && !column.loading && !column.loadError,
  )
  if (loadableDeferred.length > 0) {
    return {
      type: "load-deferred",
      stageIds: loadableDeferred.map((column) => column.id),
    }
  }

  // A deferred column is still loading — wait for the re-run rather than
  // falsely concluding the rapporto has no assunzione.
  if (columns.some((column) => column.deferred && column.loading)) {
    return { type: "wait" }
  }

  // Nothing left to load or wait for, but a deferred column failed: the card
  // might have lived there and we couldn't check — surface the failure instead
  // of a misleading "no assunzione".
  if (columns.some((column) => column.deferred && column.loadError)) {
    return { type: "load-error" }
  }

  return { type: "not-found" }
}
