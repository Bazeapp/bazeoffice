import type { ResolveCommentStackResult } from "../types/section"
import type { EntityRef } from "../types/entity"
import { entityRefKey } from "./entity-ref"

/** Entity refs represented by explicit accordion sections (focus + ancestors). */
export function collectStackAnchorExclusions(
  stack: ResolveCommentStackResult,
): EntityRef[] {
  return stack.sections.flatMap((section) =>
    section.kind !== "descendants" && section.entityRef ? [section.entityRef] : [],
  )
}

export function collectStackWatchedEntityRefs(
  pageFocus: EntityRef,
  stack: ResolveCommentStackResult,
): EntityRef[] {
  const seen = new Set<string>()
  const refs: EntityRef[] = []

  const push = (ref: EntityRef) => {
    const key = entityRefKey(ref)
    if (seen.has(key)) return
    seen.add(key)
    refs.push(ref)
  }

  push(pageFocus)
  for (const ref of collectStackAnchorExclusions(stack)) {
    push(ref)
  }

  return refs
}

export function stackAnchorExclusionsToRpc(
  exclusions: EntityRef[],
): Array<{ entity_type: string; entity_id: string }> {
  return exclusions.map((ref) => ({
    entity_type: ref.entityType,
    entity_id: ref.entityId,
  }))
}
