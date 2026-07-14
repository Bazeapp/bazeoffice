import type { EntityRef } from "../types/entity"

export function commentPageQueryPrefix(pageRef: EntityRef) {
  return ["commenti", pageRef.entityType, pageRef.entityId] as const
}

export function commentCountQueryKey(pageRef: EntityRef) {
  return [...commentPageQueryPrefix(pageRef), "count"] as const
}

export function commentSectionQueryKey(
  pageRef: EntityRef,
  sectionRef: EntityRef,
  cursor?: string | null,
) {
  return [
    ...commentPageQueryPrefix(pageRef),
    "section",
    sectionRef.entityType,
    sectionRef.entityId,
    cursor ?? null,
  ] as const
}

export const COMMENTI_REALTIME_TABLES = ["commenti_scope"] as const
