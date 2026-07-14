import { ANCESTOR_SECTION_ORDER } from "./consts"
import type { EntityType } from "../types/entity"

export function compareAncestorSections(a: EntityType, b: EntityType): number {
  const indexA = ANCESTOR_SECTION_ORDER.indexOf(a)
  const indexB = ANCESTOR_SECTION_ORDER.indexOf(b)
  const safeA = indexA === -1 ? ANCESTOR_SECTION_ORDER.length : indexA
  const safeB = indexB === -1 ? ANCESTOR_SECTION_ORDER.length : indexB
  return safeA - safeB
}
