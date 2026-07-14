import type { EntityRef } from "./entity"

export type CommentSectionKind = "focus" | "ancestor" | "descendants"

export type CommentSection = {
  id: string
  kind: CommentSectionKind
  entityRef: EntityRef | null
  typeLabel: string
  displayName: string
  icon: string
}
