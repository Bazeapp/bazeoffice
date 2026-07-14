import type { EntityRef } from "./entity"

export type ResolveCommentStackInput = {
  focus: EntityRef
  row: Record<string, unknown>
  displayNames?: Record<string, string>
}

export type CommentStackSection = {
  id: string
  kind: "focus" | "ancestor" | "descendants"
  entityRef: EntityRef | null
  typeLabel: string
  displayName: string
  icon: string
  visibilityHint: string | null
}

export type ResolveCommentStackResult = {
  sections: CommentStackSection[]
  chipOptions: EntityRef[]
  visibilityHintsByTarget: Record<string, string>
}

export function entityRefKey(ref: EntityRef): string {
  return `${ref.entityType}:${ref.entityId}`
}
