import type { EntityRef } from "../types/entity"

export function entityRefKey(ref: EntityRef): string {
  return `${ref.entityType}:${ref.entityId}`
}
