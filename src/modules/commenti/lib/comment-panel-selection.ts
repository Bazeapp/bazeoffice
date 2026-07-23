import { entityRefKey } from "./entity-ref"
import type { EntityRef } from "../types/entity"
import type {
  CommentSection,
  CommentSectionKind,
  ResolveCommentStackResult,
} from "../types/section"

export type CommentPanelSelection = {
  activeSectionId: string
  targetEntityRef: EntityRef
}

export function getFocusSection(
  stack: ResolveCommentStackResult,
): CommentSection | undefined {
  return stack.sections.find((section) => section.kind === "focus")
}

export function createInitialSelection(
  stack: ResolveCommentStackResult,
  pageFocus: EntityRef,
): CommentPanelSelection {
  const focusSection = getFocusSection(stack)
  // Always open the focus section (ASSUNZIONE on Assunzioni). When focus is
  // pending (`entityRef: null`), keep pageFocus as the chip fallback but the
  // panel must disable composing until the user selects a real section.
  const targetEntityRef = focusSection?.entityRef ?? pageFocus
  return {
    activeSectionId: focusSection?.id ?? stack.sections[0]?.id ?? entityRefKey(pageFocus),
    targetEntityRef,
  }
}

export function selectSection(
  stack: ResolveCommentStackResult,
  sectionId: string,
  currentTarget: EntityRef,
): CommentPanelSelection {
  const section = stack.sections.find((item) => item.id === sectionId)
  if (!section) {
    return { activeSectionId: sectionId, targetEntityRef: currentTarget }
  }
  if (section.entityRef) {
    return { activeSectionId: section.id, targetEntityRef: section.entityRef }
  }
  // Pending / descendants: keep accordion selection but do not pretend the
  // previous writable target is this section.
  return { activeSectionId: section.id, targetEntityRef: currentTarget }
}

export function isPendingFocusSection(section: CommentSection | undefined): boolean {
  return section?.kind === "focus" && section.entityRef === null
}

export function selectTarget(
  stack: ResolveCommentStackResult,
  target: EntityRef,
  currentSectionId: string,
): CommentPanelSelection {
  const section = stack.sections.find(
    (item) =>
      item.entityRef !== null &&
      entityRefKey(item.entityRef) === entityRefKey(target),
  )
  return {
    activeSectionId: section?.id ?? currentSectionId,
    targetEntityRef: target,
  }
}

export function resolveActiveSectionRef(
  stack: ResolveCommentStackResult,
  activeSectionId: string,
): EntityRef | null {
  const section = stack.sections.find((item) => item.id === activeSectionId)
  if (!section || section.kind === "descendants") return null
  return section.entityRef
}

export function resolveActiveSectionKind(
  stack: ResolveCommentStackResult,
  activeSectionId: string,
): CommentSectionKind | null {
  return stack.sections.find((item) => item.id === activeSectionId)?.kind ?? null
}
