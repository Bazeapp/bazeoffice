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

export function commentSectionCountQueryKey(pageRef: EntityRef, sectionRef: EntityRef) {
  return [
    ...commentPageQueryPrefix(pageRef),
    "section-count",
    sectionRef.entityType,
    sectionRef.entityId,
  ] as const
}

export function commentDescendantsQueryKey(
  pageRef: EntityRef,
  excludeAnchors: EntityRef[],
  cursor?: string | null,
) {
  const exclusionKey = excludeAnchors
    .map((ref) => `${ref.entityType}:${ref.entityId}`)
    .sort()
    .join("|")
  return [
    ...commentPageQueryPrefix(pageRef),
    "descendants",
    exclusionKey,
    cursor ?? null,
  ] as const
}

export function commentDescendantsCountQueryKey(
  pageRef: EntityRef,
  excludeAnchors: EntityRef[],
) {
  const exclusionKey = excludeAnchors
    .map((ref) => `${ref.entityType}:${ref.entityId}`)
    .sort()
    .join("|")
  return [...commentPageQueryPrefix(pageRef), "descendants-count", exclusionKey] as const
}

export const COMMENTI_REALTIME_TABLES = ["commenti_scope"] as const
