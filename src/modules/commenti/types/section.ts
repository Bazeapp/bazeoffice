import type { EntityRef } from "./entity"

export type CommentSectionKind = "focus" | "ancestor" | "descendants"

export type CommentSection = {
  id: string
  kind: CommentSectionKind
  entityRef: EntityRef | null
  typeLabel: string
  displayName: string
  icon: string
  visibilityHint?: string | null
}

export type ResolveCommentStackInput = {
  focus: EntityRef
  row: Record<string, unknown>
  displayNames?: Record<string, string>
}

export type ResolveCommentStackResult = {
  sections: CommentSection[]
  chipOptions: EntityRef[]
  visibilityHintsByTarget: Record<string, string>
}
