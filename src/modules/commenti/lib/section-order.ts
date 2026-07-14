import type { EntityType } from "../commenti.types"

/** Tie-break when ancestor sections share the same depth from focus. */
export const ANCESTOR_SECTION_ORDER: EntityType[] = [
  "candidatura",
  "rapporto",
  "lavoratore",
  "ricerca",
  "famiglia",
  "assunzione",
  "variazione",
  "chiusura",
  "cedolino",
  "contributi",
  "ticket",
]

export function compareAncestorSections(a: EntityType, b: EntityType): number {
  const indexA = ANCESTOR_SECTION_ORDER.indexOf(a)
  const indexB = ANCESTOR_SECTION_ORDER.indexOf(b)
  const safeA = indexA === -1 ? ANCESTOR_SECTION_ORDER.length : indexA
  const safeB = indexB === -1 ? ANCESTOR_SECTION_ORDER.length : indexB
  return safeA - safeB
}
